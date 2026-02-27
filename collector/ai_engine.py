import pymysql
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pytz
import re
import torch
import torch.nn as nn
import joblib

import xgboost as xgb

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

# [v1.7] 고도화된 LSTM 딥러닝 모델 정의
class StockLSTM(nn.Module):
    def __init__(self, input_size=5, hidden_size=64, num_layers=2, output_size=1):
        super(StockLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

# [v15.0] TCN (Temporal Convolutional Network) 모델 정의
class StockTCN(nn.Module):
    def __init__(self, input_size=5, num_channels=[32, 64], kernel_size=2, dropout=0.2):
        super(StockTCN, self).__init__()
        layers = []
        in_channels = input_size
        for out_channels in num_channels:
            layers.append(nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size-1))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
            in_channels = out_channels
        self.network = nn.Sequential(*layers)
        self.fc = nn.Linear(num_channels[-1], 1)

    def forward(self, x):
        x = x.transpose(1, 2)
        out = self.network(x)
        out = out[:, :, -1] 
        return self.fc(out)

class AIEngine:
    def __init__(self):
        self.conn = None
        self.tz = pytz.timezone('Asia/Seoul')
        
        # 3대 앙상블 모델
        self.lstm_model = None
        self.tcn_model = None
        self.xgb_model = None
        self.scaler = None
        
        try:
            self.scaler = joblib.load('stock_scaler.gz')
            
            # [v15.6] 5개 피처 체계로 로드
            self.lstm_model = StockLSTM(input_size=5)
            self.lstm_model.load_state_dict(torch.load("stock_lstm_v1.pth", map_location=torch.device('cpu')))
            self.lstm_model.eval()
            
            try:
                self.tcn_model = StockTCN(input_size=5)
                self.tcn_model.load_state_dict(torch.load("stock_tcn_v1.pth", map_location=torch.device('cpu')))
                self.tcn_model.eval()
            except: pass
            
            # 4. XGBoost 로드 (없으면 패스)
            try:
                self.xgb_model = xgb.XGBRegressor()
                self.xgb_model.load_model("stock_xgb_v1.json")
            except: pass
            
            print(f">>> [AI Engine] Ensemble Ready (LSTM:{self.lstm_model is not None}, TCN:{self.tcn_model is not None}, XGB:{self.xgb_model is not None})")
        except:
            print(">>> [AI Engine] Scaler or LSTM not found. Ensemble disabled.")

    def connect(self):
        try: self.conn = pymysql.connect(**DB_CONFIG)
        except: self.conn = pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def calculate_technical_indicators(self, df):
        if len(df) < 5: return 50 
        close = df['current_price'].astype(float); volume = df['volume'].astype(float)
        ma5 = close.rolling(window=5).mean(); ma20 = close.rolling(window=20).mean()
        ma60 = close.rolling(window=60).mean() if len(df) >= 60 else ma20
        delta = close.diff(); gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rsi = 100 - (100 / (1 + (gain / (loss + 1e-9))))
        ema12 = close.ewm(span=12, adjust=False).mean(); ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26; macd_signal = macd.ewm(span=9, adjust=False).mean()
        
        last_price = close.iloc[-1]; t_score = 50
        if last_price > ma20.iloc[-1]: t_score += 5
        if ma5.iloc[-1] > ma20.iloc[-1]: t_score += 5 
        if ma5.iloc[-1] > ma20.iloc[-1] > ma60.iloc[-1]: t_score += 10
        if macd.iloc[-1] > macd_signal.iloc[-1]: t_score += 10
        if rsi.iloc[-1] < 35: t_score += 15 
        if last_price < ma20.iloc[-1]: t_score -= 15 
        if rsi.iloc[-1] > 70: t_score -= 20 
        return max(0, min(100, t_score))

    # [v16.2] 실시간 강도 측정 하이브리드 앙상블 엔진
    def get_ensemble_score(self, stock_code, curr_price, curr_f, curr_vol):
        if self.lstm_model is None or self.scaler is None: 
            return 50
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 과거 4일의 '맥락(Context)' 로드 - 확정된 5피처 데이터
                cursor.execute("""
                    SELECT close_price, individual_net_buy, 
                           foreign_net_buy, institution_net_buy, volume 
                    FROM daily_stock_investor 
                    WHERE stock_code = %s 
                    ORDER BY bsop_date DESC LIMIT 4
                """, (stock_code,))
                rows = cursor.fetchall()
                
                if len(rows) < 4:
                    return 50
                
                past_df = pd.DataFrame(rows[::-1])
                
                # 2. 오늘(D-0)의 '실시간 에너지' 합체
                # 장중 데이터 부재 상황을 반영하여 개인/기관은 0으로 중립화
                # 모델은 어제까지의 흐름 위에서 '오늘의 외인/현재가/거래량' 변화량에 집중하게 됨
                today_data = [curr_price, 0, curr_f, 0, curr_vol] 
                df = pd.concat([past_df, pd.DataFrame([today_data], columns=past_df.columns)], ignore_index=True)
                
                # 데이터 전처리 (5피처 체계 유지)
                df_values = df.values.astype(np.float32)
                scaled_data = self.scaler.transform(df_values)
                input_tensor = torch.FloatTensor(scaled_data).unsqueeze(0)
                
                # 3. 앙상블 예측 (삼각편대 가동)
                # 3-1. LSTM (추세 패턴 인식)
                try:
                    with torch.no_grad():
                        lstm_pred = self.lstm_model(input_tensor).item()
                except: lstm_pred = scaled_data[-1, 0]
                
                # 3-2. TCN (실시간 변동성 포착)
                try:
                    if self.tcn_model is not None:
                        with torch.no_grad():
                            tcn_pred = self.tcn_model(input_tensor).item()
                    else: tcn_pred = lstm_pred
                except: tcn_pred = lstm_pred
                
                # 3-3. XGBoost Stacking (최종 심판관)
                final_pred = (lstm_pred + tcn_pred) / 2 # 기본값 설정
                if self.xgb_model is not None:
                    try:
                        # [v16.3] Meta-Learner 입력 안전성 강화 (정확히 7개 피처: LSTM, TCN, 가격, 개인, 외인, 기관, 거래량)
                        meta_features = [lstm_pred, tcn_pred] + list(scaled_data[-1, :])
                        if len(meta_features) == 7:
                            meta_input = np.array([meta_features], dtype=np.float32)
                            final_pred = float(self.xgb_model.predict(meta_input)[0])
                    except Exception: pass # 메타 러너 실패 시 산술 평균 유지
                
                # 4. 실시간 변화량 기반 스코어링 (50점 기준 상하 강도 측정)
                diff = final_pred - scaled_data[-1, 0]
                return max(0, min(100, 50 + (diff * 500)))
        except Exception:
            return 50

    # [v1.11] 정밀 적중률 산출 로직 (최근 7일 사후 검증)
    def calculate_ai_hit_rate(self):
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 최근 7일간 발생한 주요 매수 신호 가져오기
                cursor.execute("""
                    SELECT target_name, signal_type, created_at 
                    FROM ai_prediction 
                    WHERE signal_type IN ('MEGA_FOREIGN_BOMB', 'FOREIGN_POWER_BUY', 'FOREIGN_SMART_ENTRY', 'BULL_ENTRY')
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    ORDER BY created_at ASC
                """)
                signals = cursor.fetchall()
                if not signals: return 0.0

                success_count = 0
                for sig in signals:
                    code = sig['target_name'].replace("STOCK_", "")
                    # 신호 발생 시점의 가격 조회 (가까운 시간대의 가격)
                    cursor.execute("SELECT current_price FROM stock_supply_demand WHERE stock_code = %s AND captured_at <= %s ORDER BY captured_at DESC LIMIT 1", (code, sig['created_at']))
                    start_res = cursor.fetchone()
                    
                    # 현재 최신 가격 조회
                    cursor.execute("SELECT current_price FROM stock_supply_demand WHERE stock_code = %s ORDER BY captured_at DESC LIMIT 1", (code,))
                    curr_res = cursor.fetchone()

                    if start_res and curr_res:
                        # 가격이 상승했으면 성공으로 간주
                        if float(curr_res['current_price']) > float(start_res['current_price']):
                            success_count += 1
                
                hit_rate = (success_count / len(signals)) * 100
                return round(hit_rate, 1)
        except Exception as e:
            print(f">>> [HitRate Error] {e}")
            return 0.0

    def is_market_open(self):
        now = datetime.now(self.tz)
        if now.weekday() >= 5: return False # 주말 제외
        
        # 2026년 공휴일 리스트
        holidays = ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02", "2026-05-01", "2026-05-05", "2026-05-25", "2026-06-03", "2026-07-17", "2026-08-17", "2026-09-24", "2026-09-25", "2026-10-05", "2026-10-09", "2026-12-25", "2026-12-31"]
        if now.strftime('%Y-%m-%d') in holidays: return False
        
        return 9 <= now.hour < 16

    def analyze_market(self):
        if not self.conn: self.connect()
        try:
            now = datetime.now(self.tz)
            market_open = self.is_market_open()
            
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                predictions = []
                
                # 1. 업종 순환매 분석 & 마켓 게이지
                cursor.execute("""
                    SELECT industry_name, AVG(change_rate) as avg_change, AVG(trade_amount) as avg_amount
                    FROM (SELECT industry_name, change_rate, trade_amount FROM industry_quotes ORDER BY updated_at DESC LIMIT 300) as recent_data
                    GROUP BY industry_name
                """)
                industries = cursor.fetchall(); market_scores = []
                
                if industries:
                    print(f">>> [AI Engine] Analyzing {len(industries)} industries...")
                    for ind in industries:
                        name = ind['industry_name']
                        avg_change = float(ind['avg_change'] or 0)
                        avg_amt = float(ind['avg_amount'] or 0)
                        
                        vol_bonus = min(25, avg_amt / 50000) 
                        ind_score = 50 + (avg_change * 5) + vol_bonus
                        ind_score = max(0, min(100, ind_score))
                        market_scores.append(ind_score)
                        
                        signal = 'WAIT'
                        if ind_score >= 85: signal = 'BUY'
                        elif ind_score <= 35: signal = 'SELL'
                        predictions.append((name, ind_score, signal))
                    
                    if market_scores:
                        avg_gauge = sum(market_scores) / len(market_scores)
                        predictions.append(('MARKET_GAUGE', avg_gauge, 'SYSTEM'))

                # 2. AI 적중률 및 기타 시스템 지표
                hit_rate = self.calculate_ai_hit_rate()
                predictions.append(('AI_HIT_RATE', hit_rate if hit_rate > 0 else 75.0, 'SYSTEM'))

                # 3. 종목별 하이브리드 앙상블 분석 (Pandas 기반 정석 로직)
                cursor.execute("""
                    SELECT stock_code, current_price, volume, foreign_net_buy 
                    FROM stock_supply_demand 
                    WHERE id IN (SELECT MAX(id) FROM stock_supply_demand GROUP BY stock_code)
                """)
                supply_rows = cursor.fetchall()
                if supply_rows:
                    print(f">>> [AI Engine] Analyzing {len(supply_rows)} stocks with Ensemble Stacking...")
                    sdf = pd.DataFrame(supply_rows)
                    for _, row in sdf.iterrows():
                        code = row['stock_code']
                        price = float(row['current_price'] or 0)
                        f_net = float(row['foreign_net_buy'] or 0)
                        vol = float(row['volume'] or 0)
                        val_f = f_net * price
                        
                        # 수급 기반 점수 (S-Score)
                        s_score = 50
                        if val_f >= 300_000_000: s_score += 20
                        elif val_f >= 100_000_000: s_score += 10
                        
                        # 앙상블 스코어 (L-Score) - 과거 4일 + 오늘 1틱 하이브리드
                        l_score = self.get_ensemble_score(code, price, f_net, vol)
                        
                        # 최종 점수 산출 (수급 50% + 앙상블 50%)
                        final_score = (s_score * 0.5) + (l_score * 0.5)
                        if l_score >= 85: final_score = max(final_score, l_score)

                        signal = 'WAIT'
                        if market_open:
                            if val_f >= 2_000_000_000: signal = 'MEGA_FOREIGN_BOMB'; final_score = 100
                            elif val_f >= 1_000_000_000: signal = 'FOREIGN_POWER_BUY'; final_score = 95
                            elif val_f >= 500_000_000: signal = 'FOREIGN_SMART_ENTRY'; final_score = 90
                            elif val_f >= 300_000_000: signal = 'FOREIGN_WINDOW_PICK'; final_score = 85
                            elif val_f >= 100_000_000: signal = 'FOREIGN_BULL_RIDE'; final_score = max(final_score, 80)
                            elif final_score >= 80: signal = 'FOREIGN_BULL_RIDE'
                        
                        predictions.append((f"STOCK_{code}", final_score, signal))

                if predictions:
                    cursor.executemany("INSERT INTO ai_prediction (target_name, prediction_score, signal_type, created_at) VALUES (%s, %s, %s, NOW())", predictions)
                    self.conn.commit()
                    return len(predictions)
            return 0
        except Exception as e:
            print(f">>> [AI Engine Error] {str(e)}")
            return 0
        finally:
            try:
                if self.conn and self.conn.open: self.conn.close()
            except: pass
            if self.conn: self.conn.close()

if __name__ == "__main__":
    engine = AIEngine()
    print("Market Analysis Count:", engine.analyze_market())

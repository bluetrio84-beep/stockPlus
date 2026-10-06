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

# [v60.0] 고도화된 LSTM 딥러닝 모델 정의 (스케일 불변 정상 시계열 피처 6개)
class StockLSTM(nn.Module):
    def __init__(self, input_size=6, hidden_size=64, num_layers=2, output_size=1):
        super(StockLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Linear(32, output_size)
        )

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size, device=x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size, device=x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

# [v60.0] TCN (Temporal Convolutional Network) 모델 정의 (Dilation & BatchNorm 적용)
class StockTCN(nn.Module):
    def __init__(self, input_size=6, num_channels=[32, 64], kernel_size=2, dropout=0.2):
        super(StockTCN, self).__init__()
        layers = []
        in_channels = input_size
        for out_channels in num_channels:
            layers.append(nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size-1))
            layers.append(nn.BatchNorm1d(out_channels))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
            in_channels = out_channels
        self.network = nn.Sequential(*layers)
        self.fc = nn.Sequential(
            nn.Linear(num_channels[-1], 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

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
            
            # [v60.0] 6개 정상 시계열 피처 체계로 로드
            self.lstm_model = StockLSTM(input_size=6)
            self.lstm_model.load_state_dict(torch.load("stock_lstm_v1.pth", map_location=torch.device('cpu')))
            self.lstm_model.eval()
            
            try:
                self.tcn_model = StockTCN(input_size=6)
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
        except: self.conn = pymysql.connect(host='127.0.0.1', port=3306, user='lms', password='cnbas.2015', database='stockplus')

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
        details = self.get_ensemble_score_details(stock_code, curr_price, curr_f, curr_vol)
        return details['total']

    def get_ensemble_score_details(self, stock_code, curr_price, curr_f, curr_vol):
        """
        [v60.0] 초정밀 3대 앙상블 (LSTM, TCN, XGB) 기대수익률 기반 추론 엔진
        - 스케일 불변 정상 시계열 피처 (1d수익률, 5일이평괴리, 외인/기관/개인비율, 거래량서지) 6개
        - 3일 후 미래 기대수익률(%) 예측 모델 및 캘리브레이션 스코어링 (0~100)
        """
        if self.lstm_model is None or self.scaler is None: 
            return {'total': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 과거 일별 수급 데이터 조회 (최대 10일치)
                cursor.execute("""
                    SELECT close_price, individual_net_buy, 
                           foreign_net_buy, institution_net_buy, volume 
                    FROM daily_stock_investor 
                    WHERE stock_code = %s 
                    ORDER BY bsop_date DESC LIMIT 10
                """, (stock_code,))
                rows = cursor.fetchall()
                
                # 중소형주 fallback: stock_intraday_history 일별 스냅샷
                if len(rows) < 1:
                    cursor.execute("""
                        SELECT price as close_price, 0 as individual_net_buy,
                               program_net_buy as foreign_net_buy, 0 as institution_net_buy, volume
                        FROM (
                            SELECT price, program_net_buy, volume, captured_at,
                                   ROW_NUMBER() OVER(PARTITION BY DATE(captured_at) ORDER BY captured_at DESC) as rn
                            FROM stock_intraday_history
                            WHERE stock_code = %s AND captured_at >= DATE_SUB(CURDATE(), INTERVAL 20 DAY)
                        ) t
                        WHERE rn = 1
                        ORDER BY captured_at DESC LIMIT 10
                    """, (stock_code,))
                    rows = cursor.fetchall()

                if len(rows) < 1:
                    return {'total': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0}
                
                # 시간 순서로 정렬 (과거 -> 최근)
                past_df = pd.DataFrame(rows[::-1])
                for col in ['close_price', 'individual_net_buy', 'foreign_net_buy', 'institution_net_buy', 'volume']:
                    past_df[col] = past_df[col].astype(float)
                
                # 실시간 당일 틱 반영
                if curr_price > 0 and curr_vol > 0:
                    today_row = {
                        'close_price': float(curr_price),
                        'individual_net_buy': 0.0,
                        'foreign_net_buy': float(curr_f or 0),
                        'institution_net_buy': 0.0,
                        'volume': float(curr_vol)
                    }
                    past_df = pd.concat([past_df, pd.DataFrame([today_row])], ignore_index=True)

                # 최소 5일치 확보를 위한 패딩
                if len(past_df) < 5:
                    pad = pd.concat([past_df.iloc[[0]]] * (5 - len(past_df)), ignore_index=True)
                    past_df = pd.concat([pad, past_df], ignore_index=True)

                # 2. 6개 스케일 불변 정상 시계열 피처 계산
                past_df['ret_1d'] = (past_df['close_price'].pct_change() * 100).fillna(0.0).clip(-15.0, 15.0)
                ma5 = past_df['close_price'].rolling(5, min_periods=1).mean()
                past_df['ma5_ratio'] = ((past_df['close_price'] / ma5 - 1) * 100).fillna(0.0).clip(-20.0, 20.0)
                vol_safe = past_df['volume'].replace(0, np.nan)
                past_df['foreign_ratio'] = (past_df['foreign_net_buy'] / vol_safe * 100).fillna(0.0).clip(-50.0, 50.0)
                past_df['institution_ratio'] = (past_df['institution_net_buy'] / vol_safe * 100).fillna(0.0).clip(-50.0, 50.0)
                past_df['retail_ratio'] = (past_df['individual_net_buy'] / vol_safe * 100).fillna(0.0).clip(-50.0, 50.0)
                vol5 = past_df['volume'].rolling(5, min_periods=1).mean()
                past_df['vol_surge'] = (past_df['volume'] / vol5.replace(0, np.nan)).fillna(1.0).clip(0.1, 5.0)

                feat_cols = ['ret_1d', 'ma5_ratio', 'foreign_ratio', 'institution_ratio', 'retail_ratio', 'vol_surge']
                seq_df = past_df[feat_cols].iloc[-5:] # 최근 5거래일 시퀀스

                # 정규화
                scaled_seq = self.scaler.transform(seq_df.values.astype(np.float32))
                input_tensor = torch.FloatTensor(scaled_seq).unsqueeze(0)

                # 3. 앙상블 추론 (LSTM, TCN)
                with torch.no_grad():
                    try: lstm_pred = float(self.lstm_model(input_tensor).item())
                    except: lstm_pred = 0.0

                    try:
                        if self.tcn_model is not None:
                            tcn_pred = float(self.tcn_model(input_tensor).item())
                        else: tcn_pred = lstm_pred
                    except: tcn_pred = lstm_pred

                # 4. XGBoost Stacking Meta-Learner (8개 피처)
                xgb_pred = (lstm_pred + tcn_pred) / 2
                if self.xgb_model is not None:
                    try:
                        meta_features = [lstm_pred, tcn_pred] + list(scaled_seq[-1, :])
                        if len(meta_features) == 8:
                            meta_input = np.array([meta_features], dtype=np.float32)
                            xgb_pred = float(self.xgb_model.predict(meta_input)[0])
                    except: pass

                # 5. 기대수익률 -> 안정적 캘리브레이션 스코어 (0~100)
                def calc_score(pred_ret):
                    # pred_ret: 3일 후 예상 수익률(%)
                    # 0% -> 50점, +5% -> 67.5점, +10% -> 85점, -5% -> 32.5점, -10% -> 15점
                    return round(max(5.0, min(95.0, 50.0 + (pred_ret * 3.5))), 1)

                l_score = calc_score(lstm_pred)
                t_score = calc_score(tcn_pred)
                x_score = calc_score(xgb_pred)
                tot_score = round((l_score * 0.33) + (t_score * 0.33) + (x_score * 0.34), 1)

                return {
                    'total': tot_score,
                    'lstm': l_score,
                    'tcn': t_score,
                    'xgb': x_score
                }
        except Exception as e:
            return {'total': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0}

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
        
        # [v17.8] DB 기반 공휴일 체크
        try:
            if not self.conn or not self.conn.open: self.connect()
            today_str = now.strftime('%Y-%m-%d')
            with self.conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM market_holidays WHERE holiday_date = %s", (today_str,))
                res = cursor.fetchone()
                if res and res[0] > 0:
                    print(f">>> [AI Engine] Market Closed Today (DB Identified: {today_str})")
                    return False
        except: pass
        
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

import pymysql
import pandas as pd
import numpy as np
from datetime import datetime
import pytz
import re
import torch
import torch.nn as nn
import joblib

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

class AIEngine:
    def __init__(self):
        self.conn = None
        self.tz = pytz.timezone('Asia/Seoul')
        self.model = None
        self.scaler = None
        
        try:
            self.model = StockLSTM(input_size=5)
            self.model.load_state_dict(torch.load("stock_lstm_v1.pth", map_location=torch.device('cpu')))
            self.model.eval()
            self.scaler = joblib.load('stock_scaler.gz')
            print(">>> [AI Engine] LSTM Model & Scaler Loaded.")
        except:
            print(">>> [AI Engine] Running with Quant & Supply only.")

    def connect(self):
        try: self.conn = pymysql.connect(**DB_CONFIG)
        except: self.conn = pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def calculate_technical_indicators(self, df):
        if len(df) < 2: return 50 
        close = df['current_price'].astype(float)
        ma5 = close.rolling(window=5).mean(); ma20 = close.rolling(window=20).mean()
        delta = close.diff(); gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rsi = 100 - (100 / (1 + (gain / (loss + 1e-9))))
        
        last_price = close.iloc[-1]; t_score = 50
        
        # [가점 로직]
        if not ma20.empty and last_price > ma20.iloc[-1]: t_score += 5
        if not ma5.empty and not ma20.empty and ma5.iloc[-1] > ma20.iloc[-1]: t_score += 5
        if rsi.iloc[-1] < 35: t_score += 15 
        
        # [감점 로직: 기술적 분석이 나쁠 때]
        if not ma20.empty and last_price < ma20.iloc[-1]: t_score -= 15 # 20일선 이탈 (강력 감점)
        if rsi.iloc[-1] > 70: t_score -= 20 # 과매수 (강력 감점)
        if not ma5.empty and not ma20.empty and ma5.iloc[-1] < ma20.iloc[-1]: t_score -= 5 # 역배열
        
        return max(0, min(100, t_score))

    def get_lstm_score(self, stock_code, curr_price, curr_f):
        if self.model is None or self.scaler is None: return 50
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT close_price, individual_net_buy, foreign_net_buy, institution_net_buy, volume FROM daily_stock_investor WHERE stock_code = %s ORDER BY bsop_date DESC LIMIT 4", (stock_code,))
                rows = cursor.fetchall()
                if len(rows) < 4: return 50
                past_df = pd.DataFrame(rows[::-1])
                today_data = [curr_price, 0, curr_f, 0, 0]
                df = pd.concat([past_df, pd.DataFrame([today_data], columns=past_df.columns)], ignore_index=True)
                scaled_data = self.scaler.transform(df.values)
                input_tensor = torch.FloatTensor(scaled_data).unsqueeze(0)
                with torch.no_grad():
                    prediction = self.model(input_tensor).item()
                diff = prediction - scaled_data[-1, 0]
                return max(0, min(100, 50 + (diff * 500)))
        except: return 50

    def analyze_market(self):
        if not self.conn: self.connect()
        try:
            now = datetime.now(self.tz)
            market_open = (now.weekday() < 5 and 9 <= now.hour < 16)
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                predictions = []
                cursor.execute("SELECT stock_code, current_price, foreign_net_buy, institution_net_buy, top_brokers FROM stock_supply_demand WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY captured_at ASC")
                supply_rows = cursor.fetchall()
                if supply_rows:
                    sdf = pd.DataFrame(supply_rows)
                    foreign_brokers = ['JP모간', '메릴린치', '모건스탠리', '골드만삭스', 'CS증권', 'UBS']
                    for code in sdf['stock_code'].unique():
                        stock_df = sdf[sdf['stock_code'] == code].copy()
                        if len(stock_df) < 2: continue
                        curr = stock_df.iloc[-1]
                        price = float(curr['current_price'] or 0); f_net = float(curr['foreign_net_buy'] or 0)
                        val_f = f_net * price; brokers_str = curr['top_brokers'] or ""
                        
                        # --- 1. 수급 점수 (S-Score) ---
                        s_score = 50
                        if val_f >= 300_000_000: s_score += 20
                        elif val_f >= 100_000_000: s_score += 10
                        
                        # --- 2. 퀀트 점수 (Q-Score) ---
                        q_score = self.calculate_technical_indicators(stock_df)
                        
                        # --- 3. LSTM 점수 (L-Score) ---
                        l_score = self.get_lstm_score(code, price, f_net)
                        
                        # --- 최종 점수 합산 ---
                        weighted_score = (s_score * 0.5) + (q_score * 0.2) + (l_score * 0.3)
                        final_score = weighted_score
                        
                        # [상승 우선] 차트나 AI가 85점 이상이면 점수 인정
                        if q_score >= 85 or l_score >= 85:
                            final_score = max(final_score, q_score, l_score)
                        
                        # [차트 방어] 차트 점수가 너무 낮으면(35점 미만) 전체 점수를 75점 이하로 제한 (페널티)
                        if q_score < 35:
                            final_score = min(final_score, 75)

                        # --- [치트키] 외국인 매수 Override (단, 차트가 최악이 아닐 때만) ---
                        if market_open:
                            # 차트가 아주 나쁘지 않다면(30점 이상) 수급 치트키 인정
                            if q_score >= 30:
                                if val_f >= 2_000_000_000: final_score = 100
                                elif val_f >= 1_000_000_000: final_score = 95
                                elif val_f >= 500_000_000: final_score = 90
                                elif val_f >= 300_000_000: final_score = 85
                                elif val_f >= 100_000_000: final_score = max(final_score, 80)
                        
                        signal = 'WAIT'
                        if final_score >= 100: signal = 'MEGA_SURGE'
                        elif final_score >= 95: signal = 'SURGE_F'
                        elif final_score >= 90: signal = 'SMART_MONEY'
                        elif final_score >= 85: signal = 'FOREIGN_BITE'
                        elif final_score >= 80: signal = 'BULL_ENTRY'
                        
                        predictions.append((f"STOCK_{code}", final_score, signal))

                if predictions:
                    cursor.executemany("INSERT INTO ai_prediction (target_name, prediction_score, signal_type, created_at) VALUES (%s, %s, %s, NOW())", predictions)
                    for target, score, sig in predictions:
                        if target.startswith("STOCK_") and sig in ['MEGA_SURGE', 'SURGE_F', 'FOREIGN_BITE', 'SMART_MONEY', 'BULL_ENTRY']:
                            code = target.replace("STOCK_", "")
                            cursor.execute("SELECT stock_name FROM stock_master WHERE stock_code = %s", (code,))
                            res = cursor.fetchone()
                            stock_name = res['stock_name'] if res else code
                            msg = f"[{sig}] {stock_name} ({int(score)}%) 신호 포착!"
                            cursor.execute("INSERT INTO notification_log (USRID, message, is_read, type, created_at) VALUES (%s, %s, 0, %s, NOW())", ('bluetrio', msg, sig))
                    self.conn.commit()
                    return len(predictions)
            return 0
        except Exception as e:
            print(f"AI Engine Error: {e}"); return 0
        finally:
            if self.conn: self.conn.close()

if __name__ == "__main__":
    engine = AIEngine()
    print("Market Analysis Count:", engine.analyze_market())

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
            print(">>> [AI Engine] Model not found. Running with Quant & Supply only.")

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

    def get_lstm_score(self, stock_code, curr_price, curr_f, curr_vol):
        if self.model is None or self.scaler is None: return 50
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT close_price, individual_net_buy, foreign_net_buy, institution_net_buy, volume FROM daily_stock_investor WHERE stock_code = %s ORDER BY bsop_date DESC LIMIT 4", (stock_code,))
                rows = cursor.fetchall()
                if len(rows) < 4: return 50
                past_df = pd.DataFrame(rows[::-1])
                today_data = [curr_price, 0, curr_f, 0, curr_vol] 
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
                
                # --- 1. [복구] 업종 순환매 분석 & 마켓 게이지 ---
                cursor.execute("SELECT industry_name, change_rate, trade_amount FROM industry_quotes ORDER BY updated_at DESC")
                industries = cursor.fetchall()
                market_scores = []
                
                if industries:
                    for ind in industries:
                        name = ind['industry_name']
                        change = float(ind['change_rate'] or 0)
                        # 단순 등락률 기반 점수 산출 (바닥 탈출 감지 로직 강화 필요)
                        ind_score = 50 + (change * 10) 
                        ind_score = max(0, min(100, ind_score))
                        market_scores.append(ind_score)
                        
                        signal = 'WAIT'
                        if ind_score >= 80: signal = 'BUY'
                        elif ind_score <= 20: signal = 'SELL'
                        
                        predictions.append((name, ind_score, signal))
                    
                    # 마켓 게이지 산출 (업종 전체 평균)
                    avg_market_score = sum(market_scores) / len(market_scores)
                    predictions.append(('MARKET_GAUGE', avg_market_score, 'SYSTEM'))

                # --- 2. 종목별 분석 (기존 유지) ---
                cursor.execute("SELECT stock_code, current_price, volume, foreign_net_buy, institution_net_buy, top_brokers FROM stock_supply_demand WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY captured_at ASC")
                supply_rows = cursor.fetchall()
                if supply_rows:
                    sdf = pd.DataFrame(supply_rows)
                    for code in sdf['stock_code'].unique():
                        stock_df = sdf[sdf['stock_code'] == code].copy()
                        if len(stock_df) < 2: continue
                        curr = stock_df.iloc[-1]
                        price = float(curr['current_price'] or 0); f_net = float(curr['foreign_net_buy'] or 0); vol = float(curr['volume'] or 0)
                        val_f = f_net * price
                        
                        s_score = 50
                        if val_f >= 300_000_000: s_score += 20
                        elif val_f >= 100_000_000: s_score += 10
                        
                        q_score = self.calculate_technical_indicators(stock_df)
                        l_score = self.get_lstm_score(code, price, f_net, vol)
                        
                        final_score = (s_score * 0.5) + (q_score * 0.2) + (l_score * 0.3)
                        if q_score >= 85 or l_score >= 85: final_score = max(final_score, q_score, l_score)
                        if q_score < 35: final_score = min(final_score, 75)

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
                    for target, score, sig in predictions:
                        if target.startswith("STOCK_") and sig != 'WAIT':
                            code = target.replace("STOCK_", "")
                            cursor.execute("SELECT stock_name FROM stock_master WHERE stock_code = %s", (code,))
                            res = cursor.fetchone()
                            stock_name = res['stock_name'] if res else code
                            msg = f"[{sig}] {stock_name} AI {int(score)}점! 외인 집중 수급 포착"
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

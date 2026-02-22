import pymysql
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timedelta
import pytz

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

class StockLSTM(nn.Module):
    def __init__(self, input_size=2, hidden_size=64, num_layers=2, output_size=1):
        super(StockLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
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

    def connect(self):
        try: self.conn = pymysql.connect(**DB_CONFIG)
        except: self.conn = pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def is_market_open(self):
        now = datetime.now(self.tz)
        if now.weekday() >= 5: return False
        m_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
        m_end = now.replace(hour=15, minute=40, second=0, microsecond=0)
        return m_start <= now <= m_end

    def analyze_market(self):
        if not self.conn: self.connect()
        try:
            market_open = self.is_market_open()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 업종 데이터 분석
                cursor.execute("SELECT * FROM industry_history WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY captured_at ASC")
                rows = cursor.fetchall()
                if not rows: return 0
                
                df = pd.DataFrame(rows)
                predictions = []

                for name in df['industry_name'].unique():
                    sect_df = df[df['industry_name'] == name].copy()
                    if len(sect_df) < 5: continue
                    
                    recent_change = sect_df['change_rate'].iloc[-1]
                    vol_sma = sect_df['trade_volume'].rolling(window=5).mean().iloc[-1]
                    curr_vol = sect_df['trade_volume'].iloc[-1]
                    vol_ratio = curr_vol / vol_sma if vol_sma > 0 else 1.0
                    
                    ai_score = 50 + (recent_change * 10) + (vol_ratio * 5)
                    ai_score = max(0, min(100, ai_score))
                    
                    # [v13 보정] 장중이 아닐 때는 강제 WAIT 처리 (흰색불 방지)
                    signal = 'WAIT'
                    if market_open:
                        if ai_score >= 80: signal = 'BUY'
                        elif ai_score <= 20: signal = 'SELL'
                    
                    predictions.append((name, ai_score, signal))

                # 2. 수급 어노말리 디텍션
                cursor.execute("SELECT stock_code, foreign_net_buy, institution_net_buy FROM stock_supply_demand WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")
                supply_rows = cursor.fetchall()
                if supply_rows:
                    sdf = pd.DataFrame(supply_rows)
                    for code in sdf['stock_code'].unique():
                        stock_df = sdf[sdf['stock_code'] == code].copy()
                        if len(stock_df) < 10: continue
                        f_net = stock_df['foreign_net_buy'].fillna(0).astype(float)
                        i_net = stock_df['institution_net_buy'].fillna(0).astype(float)
                        curr_f, curr_i = f_net.iloc[-1], i_net.iloc[-1]
                        avg_f = f_net[f_net > 0].iloc[:-1].mean() if not f_net[f_net > 0].empty else 0
                        avg_i = i_net[i_net > 0].iloc[:-1].mean() if not i_net[i_net > 0].empty else 0
                        
                        # [수정] 모든 종목에 대해 기본 점수 산출 및 저장
                        # 점수 로직: (현재 수급 / 평균 수급) 비율을 기반으로 50점 기준 조정
                        base_score = 50
                        if avg_f > 0:
                            ratio_f = curr_f / avg_f
                            base_score += (ratio_f - 1) * 10 # 2배면 +10점, 0.5배면 -5점
                        
                        # 기관 수급 가중치
                        if avg_i > 0:
                            ratio_i = curr_i / avg_i
                            base_score += (ratio_i - 1) * 10

                        final_score = max(0, min(100, base_score))
                        signal = 'WAIT'

                        # 어노말리 체크 (기존 로직 유지하되 신호만 덮어쓰기)
                        if market_open:
                            if curr_f > 1000 and curr_i > 1000 and curr_f > (avg_f * 2) and curr_i > (avg_i * 2):
                                signal = 'MEGA_SURGE'; final_score = 100
                            elif curr_f > 2000 and curr_f > (avg_f * 3):
                                signal = 'SURGE_F'; final_score = 99
                            elif curr_i > 2000 and curr_i > (avg_i * 3):
                                signal = 'SURGE_I'; final_score = 99
                            elif final_score >= 80: signal = 'BUY'
                            elif final_score <= 20: signal = 'SELL'
                        
                        predictions.append((f"STOCK_{code}", final_score, signal))

                if predictions:
                    cursor.executemany("INSERT INTO ai_prediction (target_name, prediction_score, signal_type, created_at) VALUES (%s, %s, %s, NOW())", predictions)
                    self.conn.commit()
                    return len(predictions)
            return 0
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return 0
        finally:
            if self.conn: self.conn.close()

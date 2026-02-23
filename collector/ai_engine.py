import pymysql
import pandas as pd
import numpy as np
from datetime import datetime
import pytz
import re

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

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

    # [v1.5] 기술적 지표 계산 함수 (Quant Module)
    def calculate_technical_indicators(self, df):
        if len(df) < 2: return 50 # 데이터 부족 시 중립
        
        close = df['current_price'].astype(float)
        
        # 1. 이동평균선 (MA)
        ma5 = close.rolling(window=5).mean()
        ma20 = close.rolling(window=20).mean()
        ma60 = close.rolling(window=60).mean()
        
        # 2. RSI (상대강도지수)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # 3. MACD
        exp1 = close.ewm(span=12, adjust=False).mean()
        exp2 = close.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal_line = macd.ewm(span=9, adjust=False).mean()
        
        # 4. 볼린저 밴드 (BB)
        std = close.rolling(window=20).std()
        bb_upper = ma20 + (std * 2)
        bb_lower = ma20 - (std * 2)
        
        # 5. Stochastic (스토캐스틱)
        low_min = close.rolling(window=14).min()
        high_max = close.rolling(window=14).max()
        stoch_k = 100 * (close - low_min) / (high_max - low_min)
        
        # [최종 지표 점수화]
        last_price = close.iloc[-1]
        t_score = 50
        
        # 골든크로스 / 정배열 가점
        if not ma20.empty and last_price > ma20.iloc[-1]: t_score += 5
        if not ma5.empty and not ma20.empty and ma5.iloc[-1] > ma20.iloc[-1]: t_score += 5
        
        # RSI 과매수/과매도 (역발상)
        last_rsi = rsi.iloc[-1] if not rsi.empty else 50
        if last_rsi < 30: t_score += 10 # 과매도구간 (반등기대)
        if last_rsi > 70: t_score -= 10 # 과매수구간 (조정주의)
        
        # 볼린저 밴드 위치
        if not bb_lower.empty and last_price < bb_lower.iloc[-1]: t_score += 10 # 하단 돌파
        if not bb_upper.empty and last_price > bb_upper.iloc[-1]: t_score -= 5  # 상단 저항
        
        return max(0, min(100, t_score))

    def analyze_market(self):
        if not self.conn: self.connect()
        try:
            market_open = self.is_market_open()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 업종 데이터 분석
                cursor.execute("SELECT * FROM industry_history WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY captured_at ASC")
                rows = cursor.fetchall()
                predictions = []

                if rows:
                    df = pd.DataFrame(rows)
                    for name in df['industry_name'].unique():
                        sect_df = df[df['industry_name'] == name].copy()
                        if len(sect_df) < 5: continue
                        recent = sect_df.iloc[-1]
                        recent_change = float(recent['change_rate'])
                        ai_score = 50 + (recent_change * 10)
                        ai_score = max(0, min(100, ai_score))
                        signal = 'WAIT'
                        if market_open:
                            if ai_score >= 80 and recent_change > 0: signal = 'BUY'
                            elif ai_score <= 20 and recent_change < 0: signal = 'SELL'
                        predictions.append((name, ai_score, signal))

                # 2. 종목별 퀀트 분석 (MA, RSI, MACD, BB 등 반영)
                cursor.execute("SELECT stock_code, current_price, foreign_net_buy, institution_net_buy, top_brokers, captured_at FROM stock_supply_demand WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY captured_at ASC")
                supply_rows = cursor.fetchall()
                if supply_rows:
                    sdf = pd.DataFrame(supply_rows)
                    foreign_brokers = ['JP모간', '메릴린치', '모건스탠리', '골드만삭스', 'CS증권', 'UBS']
                    
                    for code in sdf['stock_code'].unique():
                        stock_df = sdf[sdf['stock_code'] == code].copy()
                        if len(stock_df) < 2: continue
                        
                        curr = stock_df.iloc[-1]
                        curr_f = float(curr['foreign_net_buy'] or 0)
                        curr_i = float(curr['institution_net_buy'] or 0)
                        brokers_str = curr['top_brokers'] or ""
                        
                        # --- 퀀트 점수 계산 ---
                        quant_score = self.calculate_technical_indicators(stock_df)
                        
                        # --- 수급 점수 계산 ---
                        f_net = stock_df['foreign_net_buy'].fillna(0).astype(float)
                        avg_f = f_net[f_net > 0].mean() if not f_net[f_net > 0].empty else 0
                        
                        supply_score = 50
                        if curr_f > 0: supply_score += 10
                        if curr_i > 0: supply_score += 10
                        
                        # --- 최종 점수 믹스 (수급 60% + 퀀트 40%) ---
                        final_score = (supply_score * 0.6) + (quant_score * 0.4)
                        signal = 'WAIT'
                        is_bite = any(broker in brokers_str for broker in foreign_brokers)
                        
                        if market_open:
                            if curr_f > 2000 and curr_f > (avg_f * 2.5): signal = 'SURGE_F'; final_score = 95
                            elif is_bite and curr_f > 500: signal = 'FOREIGN_BITE'; final_score = 85
                            elif curr_f > 1000 and curr_i > 1000: signal = 'MEGA_SURGE'; final_score = 100
                            elif curr_f > 0 and curr_i > 0 and (curr_f + curr_i) > 1500: signal = 'SMART_MONEY'; final_score = 90
                            elif final_score >= 80: signal = 'BULL_ENTRY'
                            elif final_score <= 25: signal = 'SELL'
                        
                        predictions.append((f"STOCK_{code}", final_score, signal))

                if predictions:
                    cursor.executemany("INSERT INTO ai_prediction (target_name, prediction_score, signal_type, created_at) VALUES (%s, %s, %s, NOW())", predictions)
                    
                    # 중요 알림
                    for target, score, sig in predictions:
                        if target.startswith("STOCK_") and sig in ['MEGA_SURGE', 'SURGE_F', 'FOREIGN_BITE', 'SMART_MONEY', 'BULL_ENTRY']:
                            code = target.replace("STOCK_", "")
                            cursor.execute("SELECT stock_name FROM stock_master WHERE stock_code = %s", (code,))
                            res = cursor.fetchone()
                            stock_name = res['stock_name'] if res else code
                            msg = f"[{sig}] {stock_name} ({int(score)}%) 신호 발생!"
                            cursor.execute("INSERT INTO notification_log (USRID, message, is_read, type, created_at) VALUES (%s, %s, 0, %s, NOW())", ('bluetrio', msg, sig))
                    
                    self.conn.commit()
                    return len(predictions)
            return 0
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return 0
        finally:
            if self.conn: self.conn.close()

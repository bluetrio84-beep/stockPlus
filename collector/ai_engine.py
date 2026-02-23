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

    def analyze_market(self):
        if not self.conn: self.connect()
        try:
            market_open = self.is_market_open()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 업종 데이터 분석 (최근 1시간 내 데이터만 있어도 즉시 분석)
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
                        
                        # AI 점수 단순 계산 (학습 데이터 부족 시 대용)
                        # 기본 50점 + (등락률 * 10)
                        ai_score = 50 + (recent_change * 10)
                        ai_score = max(0, min(100, ai_score))
                        
                        signal = 'WAIT'
                        if market_open:
                            if ai_score >= 80 and recent_change > 0: signal = 'BUY'
                            elif ai_score <= 20 and recent_change < 0: signal = 'SELL'
                            elif recent_change < -2.0: signal = 'SELL' # 급락 시 SELL 강제
                        
                        predictions.append((name, ai_score, signal))

                # 2. 종목 수급 분석
                cursor.execute("SELECT stock_code, foreign_net_buy, institution_net_buy, top_brokers FROM stock_supply_demand WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")
                supply_rows = cursor.fetchall()
                if supply_rows:
                    sdf = pd.DataFrame(supply_rows)
                    foreign_brokers = ['JP모간', '메릴린치', '모건스탠리', '골드만삭스', 'CS증권', 'UBS']
                    
                    for code in sdf['stock_code'].unique():
                        stock_df = sdf[sdf['stock_code'] == code].copy()
                        if len(stock_df) < 5: continue
                        curr = stock_df.iloc[-1]
                        curr_f = float(curr['foreign_net_buy'] or 0)
                        curr_i = float(curr['institution_net_buy'] or 0)
                        brokers_str = curr['top_brokers'] or ""
                        
                        # [v1.2] 적은 데이터로도 어노말리 감지 가능하도록 보정
                        f_net = stock_df['foreign_net_buy'].fillna(0).astype(float)
                        i_net = stock_df['institution_net_buy'].fillna(0).astype(float)
                        avg_f = f_net[f_net > 0].mean() if not f_net[f_net > 0].empty else 0
                        
                        final_score = 50
                        signal = 'WAIT'
                        is_bite = any(broker in brokers_str for broker in foreign_brokers)
                        
                        if market_open:
                            if curr_f > 1000 and curr_i > 1000 and curr_f > (avg_f * 2) and curr_i > (avg_i * 2):
                                signal = 'MEGA_SURGE'; final_score = 100
                            elif curr_f > 2000 and curr_f > (avg_f * 3):
                                signal = 'SURGE_F'; final_score = 99
                            elif curr_i > 2000 and curr_i > (avg_i * 3):
                                signal = 'SURGE_I'; final_score = 99
                            elif curr_f > 0 and curr_i > 0 and (curr_f + curr_i) > 1500: # [v1.4] 양매수 집결 (90%)
                                signal = 'SMART_MONEY'; final_score = 90
                            elif is_bite and curr_f > 500:
                                signal = 'FOREIGN_BITE'; final_score = 85
                            elif final_score >= 80: # [v1.5] 황소 진입 (80%)
                                signal = 'BULL_ENTRY'
                            elif final_score <= 20: signal = 'SELL'
                        
                        predictions.append((f"STOCK_{code}", final_score, signal))

                if predictions:
                    # 기존 신호와 중복되지 않도록 현재 시점의 모든 신호 저장
                    cursor.executemany("INSERT INTO ai_prediction (target_name, prediction_score, signal_type, created_at) VALUES (%s, %s, %s, NOW())", predictions)
                    
                    # [v1.2] 중요 알림(BITE, SURGE)만 notification_log에 추가
                    for target, score, sig in predictions:
                        if target.startswith("STOCK_") and sig in ['MEGA_SURGE', 'SURGE_F', 'FOREIGN_BITE']:
                            code = target.replace("STOCK_", "")
                            cursor.execute("SELECT stock_name FROM stock_master WHERE stock_code = %s", (code,))
                            res = cursor.fetchone()
                            stock_name = res['stock_name'] if res else code
                            msg = f"[{sig}] {stock_name} 수급 신호 포착!"
                            cursor.execute("INSERT INTO notification_log (USRID, message, is_read, type, created_at) VALUES (%s, %s, 0, %s, NOW())", ('bluetrio', msg, sig))
                    
                    self.conn.commit()
                    return len(predictions)
            return 0
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return 0
        finally:
            if self.conn: self.conn.close()

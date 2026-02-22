import pymysql
import time
from datetime import datetime
import os

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

class AIEngine:
    def __init__(self):
        self.conn = None

    def connect(self):
        try:
            self.conn = pymysql.connect(**DB_CONFIG)
        except:
            self.conn = pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def analyze_market(self):
        if not self.conn: self.connect()
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 최근 데이터 가져오기 (각 업종별 최신 5개)
                # MySQL 8.0 미만에서는 Window Function이 느릴 수 있으니 단순하게 전체 조회 후 파이썬에서 처리
                # (데이터 양이 적으므로 가능)
                cursor.execute("SELECT * FROM industry_history WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY captured_at ASC")
                rows = cursor.fetchall()
                
                # 업종별 그룹핑
                grouped = {}
                for r in rows:
                    name = r['industry_name']
                    if name not in grouped: grouped[name] = []
                    grouped[name].append(r)
                
                # 분석
                predictions = []
                for name, history in grouped.items():
                    if len(history) < 2: continue # 데이터 부족
                    
                    # 1. 모멘텀 (최신 등락률 가중치)
                    recent = history[-1]
                    momentum = float(recent['change_rate'])
                    
                    # 2. 거래량 급증 여부 (직전 대비)
                    vol_ratio = 1.0
                    if len(history) >= 2:
                        prev_vol = float(history[-2]['trade_volume'])
                        curr_vol = float(recent['trade_volume'])
                        if prev_vol > 0:
                            vol_ratio = curr_vol / prev_vol
                    
                    # AI Score 계산 (0~100)
                    # 등락률이 높고 거래량이 터지면 점수 급등
                    # 기본 50점 + (등락률 * 10) + (거래량비율 * 5)
                    score = 50 + (momentum * 10) + (vol_ratio * 5)
                    score = max(0, min(100, score)) # 0~100 클램핑
                    
                    signal = 'WAIT'
                    if score >= 80: signal = 'BUY'
                    elif score <= 20: signal = 'SELL'
                    
                    predictions.append((name, score, signal))
                
                # 결과 저장
                if predictions:
                    # 기존 예측 삭제 (최신 상태 유지를 위해) -> 로그성으로 쌓을지 선택. 여기선 쌓자.
                    ins_sql = "INSERT INTO ai_prediction (target_name, prediction_score, signal_type, created_at) VALUES (%s, %s, %s, NOW())"
                    cursor.executemany(ins_sql, predictions)
                    self.conn.commit()
                    return len(predictions)
            
            return 0
                    
        except Exception as e:
            print(f">>> [AI] Error: {e}")
            return 0
        finally:
            self.conn.close()
            self.conn = None

if __name__ == "__main__":
    ai = AIEngine()
    print(">>> v13 AI Engine Started...")
    ai.analyze_market()

import pymysql
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import joblib
import xgboost as xgb
from datetime import datetime
from ai_engine import StockLSTM, StockTCN, AIEngine

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

class NextLeaderEngine(AIEngine):
    def __init__(self):
        super().__init__()
        print(">>> [NextLeader Engine] Initialization Complete.")

    def calculate_turnaround_score(self, row, prev_row):
        """
        바닥 탈출 알고리즘 (Q-Score)
        1. RSI 35 이하 탈출 (20점)
        2. 이평선 수렴도 (10점)
        3. 거래량 스파이크 (15점)
        4. 골든크로스 (10점)
        """
        score = 50.0
        reasons = []

        # 1. RSI 바닥 탈출 (과매도 구간 탈출 신호)
        rsi = float(row['rsi'] or 50)
        prev_rsi = float(prev_row['rsi'] or 50) if prev_row is not None else 50
        if prev_rsi <= 35 and rsi > prev_rsi:
            score += 20 # 25 -> 20 하향
            reasons.append("RSI바닥탈출")
        elif rsi <= 30:
            score += 10
            reasons.append("과매도진입")

        # 2. 이평선 수렴도 (MA5, MA20)
        ma5 = float(row['ma5'] or 0)
        ma20 = float(row['ma20'] or 0)
        if ma5 > 0 and ma20 > 0:
            gap = abs(ma5 - ma20) / ma20
            if gap < 0.02: # 2% 이내 수렴
                score += 10 # 15 -> 10 하향
                reasons.append("이평선수렴")
            if ma5 > ma20 and (prev_row is None or float(prev_row['ma5'] or 0) <= float(prev_row['ma20'] or 0)):
                score += 10 # 10 유지
                reasons.append("골든크로스")

        # 3. 거래량 스파이크 (관심 집중)
        vol = float(row['volume'] or 0)
        prev_vol = float(prev_row['volume'] or 1) if prev_row is not None else 1
        if vol > prev_vol * 2.5: # 거래량 250% 이상 폭발
            score += 15 # 20 -> 15 하향
            reasons.append("거래량폭발")

        return min(100, score), ", ".join(reasons)

    def analyze_next_leaders(self):
        if not self.conn or not self.conn.open: self.connect()
        try:
            # 1. 1,600개 종목의 최신 2틱 데이터 확보 (Collation 충돌 방지 처리)
            query = """
                SELECT h1.*, m.stock_name 
                FROM stock_intraday_history h1
                JOIN stock_master m ON h1.stock_code COLLATE utf8mb4_unicode_ci = m.stock_code COLLATE utf8mb4_unicode_ci
                WHERE h1.id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER(PARTITION BY stock_code ORDER BY captured_at DESC) as rn 
                        FROM stock_intraday_history
                    ) t WHERE rn <= 2
                )
            """
            df_raw = pd.read_sql(query, self.conn)
            if df_raw.empty: return 0

            results = []
            codes = df_raw['stock_code'].unique()
            print(f">>> [NextLeader] Scrutinizing {len(codes)} stocks for the next big move...")

            for code in codes:
                stock_history = df_raw[df_raw['stock_code'] == code].sort_values('captured_at', ascending=True)
                if len(stock_history) < 1: continue
                
                curr = stock_history.iloc[-1]
                prev = stock_history.iloc[0] if len(stock_history) > 1 else None
                
                # A. 알고리즘 점수 (Q-Score)
                algo_score, reason = self.calculate_turnaround_score(curr, prev)
                
                # B. 앙상블 상세 점수 (E-Score Details)
                e_data = self.get_ensemble_score_details(code, float(curr['price']), 0, float(curr['volume']))
                e_score = e_data['total']
                
                # C. 최종 하이브리드 점수
                total_score = (algo_score * 0.6) + (e_score * 0.4)
                
                if algo_score > 60 or e_score > 70:
                    current_price = float(curr['price']) if curr['price'] is not None else 0.0
                    results.append({
                        'code': code,
                        'name': curr['stock_name'],
                        'total': total_score,
                        'algo': algo_score,
                        'lstm': e_data['lstm'],
                        'tcn': e_data['tcn'],
                        'xgb': e_data['xgb'],
                        'ensemble': e_score,
                        'price_at': current_price,
                        'reason': reason if reason else "수급안정"
                    })

            # 2. 점수 순 정렬 후 Top 20 선별
            top_20 = sorted(results, key=lambda x: x['total'], reverse=True)[:20]
            
            # 3. DB 저장 (컬럼 확장 반영)
            with self.conn.cursor() as cursor:
                cursor.execute("DELETE FROM ai_next_leaders WHERE DATE(captured_at) = CURDATE()")
                for item in top_20:
                    sql = """INSERT INTO ai_next_leaders 
                             (stock_code, stock_name, total_score, algo_score, 
                              lstm_score, tcn_score, xgb_score, ensemble_score, 
                              reason, price_at_recom, captured_at) 
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"""
                    cursor.execute(sql, (
                        item['code'], item['name'], item['total'], item['algo'], 
                        item['lstm'], item['tcn'], item['xgb'], item['ensemble'], 
                        item['reason'], item['price_at']
                    ))
            
            self.conn.commit()
            print(f">>> [Success] Top 20 Next Leaders identified and stored.")
            return len(top_20)

        except Exception as e:
            print(f">>> [NextLeader Error] {e}")
            import traceback
            traceback.print_exc()
            return 0
        finally:
            try:
                if self.conn and self.conn.open: self.conn.close()
            except: pass

if __name__ == "__main__":
    engine = NextLeaderEngine()
    count = engine.analyze_next_leaders()
    print(f"Total Next Leaders Saved: {count}")

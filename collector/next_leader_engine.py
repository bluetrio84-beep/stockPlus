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

    def get_financial_boost(self, stock_code):
        """
        [v19.0] 실적 데이터를 기반으로 한 가점 산출
        """
        try:
            if not self.conn or not self.conn.open: self.connect()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = """
                    SELECT revenue, op_profit, net_income, roe 
                    FROM company_financials 
                    WHERE stock_code = %s 
                    ORDER BY report_year DESC, report_code DESC LIMIT 1
                """
                cursor.execute(sql, (stock_code,))
                row = cursor.fetchone()
                if not row: return 0.0, ""
                
                boost = 0.0
                reasons = []
                margin = (float(row['op_profit']) / float(row['revenue'])) * 100 if row['revenue'] > 0 else 0
                if margin > 10: 
                    boost += 5.0
                    reasons.append("고수익")
                if float(row['roe'] or 0) > 15: 
                    boost += 5.0
                    reasons.append("고성장")
                if row['op_profit'] > 0: boost += 2.0
                
                return boost, ",".join(reasons)
        except: return 0.0, ""

    def calculate_turnaround_score(self, row, prev_row):
        score = 50.0
        reasons = []
        rsi = float(row['rsi'] or 50)
        prev_rsi = float(prev_row['rsi'] or 50) if prev_row is not None else 50
        if prev_rsi <= 35 and rsi > prev_rsi:
            score += 20
            reasons.append("RSI바닥탈출")
        elif rsi <= 30:
            score += 10
            reasons.append("과매도진입")
        ma5 = float(row['ma5'] or 0); ma20 = float(row['ma20'] or 0)
        if ma5 > 0 and ma20 > 0:
            gap = abs(ma5 - ma20) / ma20
            if gap < 0.02:
                score += 10
                reasons.append("이평선수렴")
            if ma5 > ma20 and (prev_row is None or float(prev_row['ma5'] or 0) <= float(prev_row['ma20'] or 0)):
                score += 10
                reasons.append("골든크로스")
        vol = float(row['volume'] or 0); prev_vol = float(prev_row['volume'] or 1) if prev_row is not None else 1
        if vol > prev_vol * 2.5:
            score += 15
            reasons.append("거래량폭발")
        return min(100, score), ", ".join(reasons)

    def analyze_next_leaders(self):
        if not self.conn or not self.conn.open: self.connect()
        try:
            # 1. 원본 데이터 수집
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

            # 2. 전략 모드 로드
            strategy_mode = 'STABLE'
            with self.conn.cursor() as cursor:
                cursor.execute("SELECT ai_strategy_mode FROM collector_config WHERE id = 1")
                row = cursor.fetchone()
                if row and row[0]: strategy_mode = row[0]
            
            if strategy_mode == 'AGGRESSIVE': weight_algo, weight_ai, min_threshold = 0.4, 0.6, 55.0
            elif strategy_mode == 'BALANCED': weight_algo, weight_ai, min_threshold = 0.6, 0.4, 65.0
            else: weight_algo, weight_ai, min_threshold = 0.7, 0.3, 80.0

            # 3. [복구] 사용자 피드백(Human 직관) 로드 (v19.0)
            feedback_map = {}
            try:
                with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("""
                        SELECT stock_code, feedback_tag 
                        FROM ai_next_leaders 
                        WHERE feedback_tag IS NOT NULL 
                        AND captured_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    """)
                    f_rows = cursor.fetchall()
                    for f in f_rows:
                        feedback_map[f['stock_code']] = f['feedback_tag']
            except: pass

            results = []
            codes = df_raw['stock_code'].unique()
            print(f">>> [NextLeader] Human-in-the-Loop Analysis for {len(codes)} stocks...")

            for code in codes:
                stock_history = df_raw[df_raw['stock_code'] == code].sort_values('captured_at', ascending=True)
                if len(stock_history) < 1: continue
                curr = stock_history.iloc[-1]; prev = stock_history.iloc[0] if len(stock_history) > 1 else None
                
                # A. 퀀트 점수 (Q)
                algo_score, reason = self.calculate_turnaround_score(curr, prev)
                
                # B. AI 모델 점수 (L, T, X)
                e_data = self.get_ensemble_score_details(code, float(curr['price']), 0, float(curr['volume']))
                
                # C. 실적 가점 (F-Boost)
                f_boost, f_tag = self.get_financial_boost(code)
                if f_tag: reason = f"{f_tag}, {reason}"
                
                # D. 사용자 피드백 가점 (H-Bonus) [v19.1 정밀화]
                intuition_bonus = 0.0
                tag = feedback_map.get(code)
                if tag == '성공' or tag == '매집':
                    intuition_bonus = 5.0
                    reason = f"★직관강화, {reason}"
                elif tag == '시황':
                    intuition_bonus = 0.0 # 시황은 중립
                    reason = f"★시황반영, {reason}"
                elif tag == '노이즈':
                    intuition_bonus = -10.0
                    reason = f"⚠노이즈제외, {reason}"
                elif tag == '실패':
                    intuition_bonus = -15.0
                    reason = f"✖오판주의, {reason}"

                # E. 최종 합산 (실적 가점은 L, T, X 개별 점수에 녹이고 피드백은 최종 점수에 반영)
                lstm_f = max(0, min(100, e_data['lstm'] + f_boost))
                tcn_f = max(0, min(100, e_data['tcn'] + f_boost))
                xgb_f = max(0, min(100, e_data['xgb'] + f_boost))
                
                e_score = (lstm_f + tcn_f + xgb_f) / 3
                total_score = (algo_score * weight_algo) + (e_score * weight_ai)
                total_score = max(0, min(100, total_score + intuition_bonus))

                if total_score >= min_threshold:
                    results.append({
                        'code': code, 'name': curr['stock_name'],
                        'total': round(total_score, 1), 'algo': round(algo_score, 1),
                        'lstm': round(lstm_f, 1), 'tcn': round(tcn_f, 1),
                        'xgb': round(xgb_f, 1), 'ensemble': round(e_score, 1),
                        'price_at': float(curr['price']), 'reason': reason
                    })

            top_20 = sorted(results, key=lambda x: x['total'], reverse=True)[:20]
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
            print(f">>> [Success] Hybrid AI (Quant + DeepLearning + Financial + Human) Sync Complete.")
            return len(top_20)
        except Exception as e:
            print(f">>> [Error] {e}")
            return 0
        finally:
            if self.conn and self.conn.open: self.conn.close()

if __name__ == "__main__":
    engine = NextLeaderEngine()
    engine.analyze_next_leaders()

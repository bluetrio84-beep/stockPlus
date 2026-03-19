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

    def get_program_boost(self, stock_code):
        """
        [v21.0] 프로그램 매매 수급 기반 가점 산출
        """
        try:
            if not self.conn or not self.conn.open: self.connect()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 최근 2개 데이터를 조회하여 순매수세가 강화되는지 확인
                sql = """
                    SELECT program_net_buy 
                    FROM daily_stock_investor 
                    WHERE stock_code = %s 
                    ORDER BY bsop_date DESC LIMIT 2
                """
                cursor.execute(sql, (stock_code,))
                rows = cursor.fetchall()
                if not rows: return 0.0, ""

                boost = 0.0
                reasons = []
                curr_net = int(rows[0]['program_net_buy'] or 0)
                
                # 1. 순매수 양수 여부 (수급 유입)
                if curr_net > 0:
                    boost += 3.0
                    reasons.append("프로그램순매수")
                
                # 2. 전회차 대비 순매수 강화 여부
                if len(rows) > 1 and curr_net > int(rows[1]['program_net_buy'] or 0):
                    boost += 2.0
                    reasons.append("프로그램수급강화")
                
                # 3. 과도한 매도세 방어 (페널티)
                if curr_net < -50000: # 5만 주 이상 프로그램 매도 시
                    boost -= 5.0
                    reasons.append("프로그램이탈")
                    
                return boost, ",".join(reasons)
        except: return 0.0, ""

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
            # 2. [v20.1] AI 전략 및 동적 가중치 로드 (코드 최적화)
            strategy_mode = 'BALANCED'
            w_l, w_t, w_x = 0.2, 0.2, 0.6 # 기본 황금 비율
            try:
                with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("SELECT ai_strategy_mode, weight_lstm, weight_tcn, weight_xgb FROM collector_config WHERE id = 1")
                    cfg = cursor.fetchone()
                    if cfg:
                        strategy_mode = cfg['ai_strategy_mode'] or 'BALANCED'
                        if cfg['weight_lstm'] is not None: w_l = float(cfg['weight_lstm'])
                        if cfg['weight_tcn'] is not None: w_t = float(cfg['weight_tcn'])
                        if cfg['weight_xgb'] is not None: w_x = float(cfg['weight_xgb'])
            except Exception as e:
                print(f">>> [Warning] Failed to load dynamic weights: {e}")

            # 전략별 임계값 설정 (else가 기본 BALANCED 역할을 수행)
            if strategy_mode == 'STABLE': weight_algo, weight_ai, min_threshold = 0.7, 0.3, 80.0
            elif strategy_mode == 'NEUTRAL': weight_algo, weight_ai, min_threshold = 0.5, 0.5, 60.0
            elif strategy_mode == 'AGGRESSIVE': weight_algo, weight_ai, min_threshold = 0.4, 0.6, 55.0
            else: weight_algo, weight_ai, min_threshold = 0.6, 0.4, 65.0

            print(f">>> [NextLeader] Mode: {strategy_mode} | Dynamic Weights: L({int(w_l*100)}%) T({int(w_t*100)}%) X({int(w_x*100)}%)")

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
                
                # D. 프로그램 매매 가점 (P-Boost) [v21.0]
                p_boost, p_tag = self.get_program_boost(code)
                if p_tag: reason = f"{p_tag}, {reason}"
                
                # E. 사용자 피드백 가점 (H-Bonus) [v19.1 정밀화]
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
                # [v20.0] 동적 가중치 (w_l, w_t, w_x) 적용
                lstm_f = max(0, min(100, e_data['lstm'] + f_boost))
                tcn_f = max(0, min(100, e_data['tcn'] + f_boost))
                xgb_f = max(0, min(100, e_data['xgb'] + f_boost))
                
                e_score = (lstm_f * w_l) + (tcn_f * w_t) + (xgb_f * w_x)
                total_score = (algo_score * weight_algo) + (e_score * weight_ai)
                # [v21.0] 프로그램 매매 가점 반영
                total_score = max(0, min(100, total_score + intuition_bonus + p_boost))

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
                for idx, item in enumerate(top_20):
                    is_top10 = 'Y' if idx < 10 else 'N' # [v28.9.17] TOP 10 종목 별도 표시
                    sql = """INSERT INTO ai_next_leaders 
                             (stock_code, stock_name, total_score, algo_score, 
                              lstm_score, tcn_score, xgb_score, ensemble_score, 
                              reason, price_at_recom, is_top10, captured_at) 
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"""
                    cursor.execute(sql, (
                        item['code'], item['name'], item['total'], item['algo'], 
                        item['lstm'], item['tcn'], item['xgb'], item['ensemble'], 
                        item['reason'], item['price_at'], is_top10
                    ))
            self.conn.commit()
            print(f">>> [Success] Hybrid AI (Quant + DeepLearning + Financial + Human) Sync Complete.")
            return len(top_20)
        except Exception as e:
            print(f">>> [Error] {e}")
            return 0
        finally:
            if self.conn and self.conn.open: self.conn.close()

    def optimize_weights(self):
        """
        [v19.4] 주말 자동 가중치 최적화 (Self-Evolving AI)
        최근 7일간의 모델별(LSTM, TCN, XGB) 적중률을 분석하여 가중치를 재분배합니다.
        """
        print(">>> [Auto-Optimization] Starting AI Weight Optimization...")
        try:
            if not self.conn or not self.conn.open: self.connect()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 모델별 최근 7일 적중률 조회
                sql = """
                    SELECT 
                        COALESCE(ROUND(COUNT(CASE WHEN lstm_score >= 50 AND hit_result = 'SUCCESS' THEN 1 END) / NULLIF(COUNT(CASE WHEN lstm_score >= 50 AND hit_result != 'PENDING' THEN 1 END), 0) * 100, 1), 0) as lstm_hr,
                        COALESCE(ROUND(COUNT(CASE WHEN tcn_score >= 50 AND hit_result = 'SUCCESS' THEN 1 END) / NULLIF(COUNT(CASE WHEN tcn_score >= 50 AND hit_result != 'PENDING' THEN 1 END), 0) * 100, 1), 0) as tcn_hr,
                        COALESCE(ROUND(COUNT(CASE WHEN xgb_score >= 50 AND hit_result = 'SUCCESS' THEN 1 END) / NULLIF(COUNT(CASE WHEN xgb_score >= 50 AND hit_result != 'PENDING' THEN 1 END), 0) * 100, 1), 0) as xgb_hr
                    FROM ai_next_leaders
                    WHERE captured_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                """
                cursor.execute(sql)
                hr = cursor.fetchone()
                
                # [v23.2] 데이터 타입 캐스팅 (Decimal -> Float)
                hit_rates = {
                    'lstm': float(hr['lstm_hr']),
                    'tcn': float(hr['tcn_hr']),
                    'xgb': float(hr['xgb_hr'])
                }
                
                # 2. 가중치 계산 (적중률 비례 분배, 최소 20% 보장)
                total_hr = sum(hit_rates.values())
                if total_hr > 0:
                    new_l = max(20, round((hit_rates['lstm'] / total_hr) * 100))
                    new_t = max(20, round((hit_rates['tcn'] / total_hr) * 100))
                    new_x = 100 - new_l - new_t
                else:
                    new_l, new_t, new_x = 20, 20, 60 # 데이터 부족 시 기본 비율

                # [v23.1] 고도화된 가중치 최적화 사유 생성
                best_model = max(hit_rates, key=hit_rates.get).upper()
                hr_info = f"L({hit_rates['lstm']}%), T({hit_rates['tcn']}%), X({hit_rates['xgb']}%)"
                
                if best_model == 'LSTM':
                    analysis = "시계열 추세의 연속성이 뚜렷한 장세가 이어짐에 따라, 장기 기억 기반의 LSTM 모델이 탁월한 수익 궤적을 그려냈습니다. 안정적인 추세 추종을 위해 비중을 상향했습니다."
                elif best_model == 'TCN':
                    analysis = "순간적인 거래량 폭발과 미세한 패턴 변동이 잦은 변동성 장세입니다. 파동 포착에 능한 TCN 모델의 민감도를 극대화하여 단기 슈팅 종목 발굴력을 보강했습니다."
                else:
                    analysis = "시장의 통계적 신뢰도가 중요한 변곡점입니다. 수만 개의 학습 데이터를 기반으로 냉철한 확률을 계산하는 XGBoost(Meta-Learner)의 의사결정 권한을 강화하여 판정의 무결성을 높였습니다."

                tuning_reason = f"[{best_model} 강세 분석] {analysis} (최근 적중률: {hr_info} | 조정 비중: L:{new_l}% T:{new_t}% X:{new_x}%)"
                
                # 3. DB 업데이트 (한글 깨짐 방지 강제 적용)
                with self.conn.cursor() as cursor:
                    cursor.execute("SET NAMES utf8mb4")
                    cursor.execute("""
                        UPDATE collector_config 
                        SET weight_lstm = %s, weight_tcn = %s, weight_xgb = %s, tuning_reason = %s
                        WHERE id = 1
                    """, (new_l / 100.0, new_t / 100.0, new_x / 100.0, tuning_reason))
                    
                    # 로그 기록
                    log_msg = f"[가중치최적화] {tuning_reason}"
                    cursor.execute("INSERT INTO collector_logs (log_level, message, created_at) VALUES ('INFO', %s, NOW())", (log_msg,))
                
                self.conn.commit()
                print(f">>> [Success] AI Weights Optimized: {tuning_reason}")
                
            return True
        except Exception as e:
            print(f">>> [Auto-Optimization Error] {e}")
            return False
        finally:
            if self.conn and self.conn.open: self.conn.close()

if __name__ == "__main__":
    engine = NextLeaderEngine()
    engine.analyze_next_leaders()

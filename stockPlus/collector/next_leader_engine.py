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
        score = 40.0 # [v27.0] 50.0 -> 40.0 하향 (거품 제거)
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

    def get_program_boost(self, stock_code, total_volume, current_price):
        """
        [v30.0] 통합 스마트머니(S-Power) 분석
        비중(Ratio) OR 절대금액(Amount) 중 하나만 충족해도 세력급 수급으로 인정
        """
        try:
            if not self.conn or not self.conn.open: self.connect()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = """
                    SELECT program_net_buy 
                    FROM stock_intraday_history 
                    WHERE stock_code = %s 
                    ORDER BY captured_at DESC LIMIT 2
                """
                cursor.execute(sql, (stock_code,))
                rows = cursor.fetchall()
                if not rows: return 0.0, ""

                boost = 0.0
                reasons = []
                curr_net = int(rows[0]['program_net_buy'] or 0)
                pgm_ratio = (curr_net / total_volume) * 100 if total_volume > 0 else 0
                pgm_amt = curr_net * current_price
                
                # [v33.0] 통합 스마트머니(S-Power) 하이브리드 판정 (기준 상향 및 변별력 강화)
                if pgm_ratio >= 15 or pgm_amt >= 10000000000:
                    boost += 12.5; reasons.append("🔥메가스마트머니")
                elif pgm_ratio >= 10 or pgm_amt >= 5000000000:
                    boost += 10.0; reasons.append("스마트수급폭발")
                elif pgm_ratio >= 5 or pgm_amt >= 2000000000:
                    boost += 7.5; reasons.append("스마트머니유입")
                elif pgm_ratio >= 2 or pgm_amt >= 1000000000:
                    boost += 5.0; reasons.append("프로그램매수")

                # 전회차 대비 순매수 강화 여부 (보너스)
                if len(rows) > 1 and curr_net > int(rows[1]['program_net_buy'] or 0):
                    boost += 3.0; reasons.append("수급강화")
                
                return boost, ",".join(reasons)
        except: return 0.0, ""

    def get_smart_money_score(self, code, price, volume, current_obv):
        """
        [v39.0] 지능형 스마트머니 S-Score (Adaptive Scoring)
        공매도 미대상 종목은 4:3:3 (40:30:30) 레시피로 자동 전환
        """
        try:
            if not self.conn or not self.conn.open: self.connect()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 0. 공매도 데이터 존재 여부 확인
                sql_sd = "SELECT avg_short_price FROM daily_short_selling WHERE stock_code = %s ORDER BY bsop_date DESC LIMIT 1"
                cursor.execute(sql_sd, (code,))
                sd_row = cursor.fetchone()
                has_short = True if sd_row and float(sd_row['avg_short_price'] or 0) > 0 else False

                # 1. 프로그램 순매수 (Max 35 or 40)
                sql_pgm = """
                    SELECT program_net_buy, captured_at 
                    FROM stock_intraday_history 
                    WHERE stock_code = %s AND DATE(captured_at) >= DATE_SUB(CURDATE(), INTERVAL 5 DAY)
                    ORDER BY captured_at DESC
                """
                cursor.execute(sql_pgm, (code,))
                pgm_rows = cursor.fetchall()
                p_score = 0.0
                p_max_base = 30.0 if has_short else 30.0 # 기본 30점 베이스 유지
                if pgm_rows:
                    curr_pgm = float(pgm_rows[0]['program_net_buy'] or 0)
                    pgm_ratio = (curr_pgm / volume) * 100 if volume > 0 else 0
                    # 공매도 없으면 비중 점수 만점을 30점으로 상향 (총 40점 만점)
                    p_limit = 25.0 if has_short else 30.0
                    p_score += min(p_limit, pgm_ratio * 1.7)
                    
                    df_pgm = pd.DataFrame(pgm_rows)
                    df_pgm['date'] = pd.to_datetime(df_pgm['captured_at']).dt.date
                    daily_pgm = df_pgm.groupby('date')['program_net_buy'].sum().reset_index()
                    consecutive_days = 0
                    for val in daily_pgm.sort_values('date', ascending=False)['program_net_buy']:
                        if val > 0: consecutive_days += 1
                        else: break
                    if consecutive_days >= 3: p_score += 10.0
                    elif consecutive_days >= 2: p_score += 5.0

                # 2. 숏스퀴즈 및 공매도 (Max 15 or 0)
                s_score = 0.0
                if has_short:
                    s_boost, _ = self.get_short_cover_boost(code, price)
                    s_score = min(15.0, s_boost)

                # 3. OBV 추세 (Max 25 or 30)
                sql_obv = "SELECT MAX(obv) as max_o, MIN(obv) as min_o FROM stock_intraday_history WHERE stock_code = %s AND captured_at >= DATE_SUB(NOW(), INTERVAL 10 DAY)"
                cursor.execute(sql_obv, (code,))
                o_range = cursor.fetchone()
                o_score = 0.0
                obv_tag = "" 
                if o_range and o_range['max_o'] is not None:
                    max_o, min_o = float(o_range['max_o']), float(o_range['min_o'])
                    o_limit = 20.0 if has_short else 25.0 # 공매도 없으면 5점 상향
                    if max_o > min_o: o_score += min(o_limit, (current_obv - min_o) / (max_o - min_o) * o_limit)
                    
                    sql_prev_max = "SELECT MAX(obv) as p_max FROM stock_intraday_history WHERE stock_code = %s AND captured_at < DATE(NOW()) AND captured_at >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)"
                    cursor.execute(sql_prev_max, (code,))
                    p_max_row = cursor.fetchone()
                    if p_max_row and p_max_row['p_max'] and current_obv > float(p_max_row['p_max']): 
                        o_score += 5.0
                        obv_tag = "💎OBV매집포착"

                # 4. 거래대금 회전율 (Max 25 or 30) [v40.0: 데이터 출처 실시간 테이블로 단일화 & 50억 Floor]
                t_score = 0.0
                current_energy = price * volume
                if current_energy < 5000000000: # [v40.0] 거래대금 50억 미만은 노이즈로 간주 (0점)
                    t_score = 0.0
                else:
                    sql_avg_tr = """
                        SELECT AVG(energy) as avg_tr FROM (
                            SELECT MAX(volume * price) as energy 
                            FROM stock_intraday_history 
                            WHERE stock_code = %s AND captured_at < DATE(NOW())
                            GROUP BY DATE(captured_at)
                            ORDER BY DATE(captured_at) DESC LIMIT 5
                        ) as sub
                    """
                    cursor.execute(sql_avg_tr, (code,))
                    avg_tr_row = cursor.fetchone()
                    if avg_tr_row and avg_tr_row['avg_tr'] and float(avg_tr_row['avg_tr']) > 0:
                        surge = current_energy / float(avg_tr_row['avg_tr'])
                        t_limit = 25.0 if has_short else 30.0
                        t_score = min(t_limit, surge * (t_limit / 3)) # 3배 급증 시 만점

                return round(p_score + s_score + o_score + t_score, 2), obv_tag
        except Exception as e:
            print(f">>> [Ultimate S-Score Error] {e}")
            return 0.0, ""

    def get_short_cover_boost(self, code, current_price):
        """
        [v26.0] 숏커버링 및 숏스퀴즈 정밀 분석 (수집 데이터 기반)
        핵심: 현재가와 공매도 세력 평단가(avg_short_price)의 격차 분석
        """
        try:
            if not self.conn or not self.conn.open: self.connect()
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 공매도 데이터 조회 (평단가 및 누적 비중)
                sql = "SELECT avg_short_price, short_ratio, total_short_ratio FROM daily_short_selling WHERE stock_code = %s ORDER BY bsop_date DESC LIMIT 1"
                cursor.execute(sql, (code,))
                curr = cursor.fetchone()
                if not curr or not curr['avg_short_price']: return 0.0, ""

                avg_price = float(curr['avg_short_price'])
                total_ratio = float(curr['total_short_ratio'] or 0)
                curr_ratio = float(curr['short_ratio'] or 0)

                boost = 0.0
                tags = []

                # A. 숏스퀴즈 압박 점수 (현재가 vs 공매도 평단가)
                # 평단가보다 현재가가 높을수록 세력의 패닉(숏커버) 유도
                if current_price > avg_price:
                    diff_pct = ((current_price - avg_price) / avg_price) * 100
                    # [v44.6] 맥스 가점 하향: 10% 돌파 시 12.5점 (1%당 1.25점)
                    boost += min(12.5, diff_pct * 1.25)
                    if diff_pct > 5.0: tags.append("숏스퀴즈임박")
                    elif diff_pct > 2.0: tags.append("세력손실전환")

                # B. 누적 에너지 가점 (누적 비중이 높을수록 폭발력 증가)
                if total_ratio > 15.0:
                    boost += 7.5  # 10.0 -> 7.5
                    tags.append("고농축공매도")
                elif total_ratio > 10.0:
                    boost += 4.0  # 5.0 -> 4.0

                # C. 공격 중단 가점 (당일 공매도 비중 급감 시)
                if curr_ratio < 3.0 and total_ratio > 8.0:
                    boost += 4.0  # 5.0 -> 4.0
                    tags.append("공매도항복")

                return round(boost, 2), ",".join(tags)
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
                p_boost, p_tag = self.get_program_boost(code, float(curr['volume']), float(curr['price']))
                if p_tag: reason = f"{p_tag}, {reason}"
                
                # E. 공매도 및 숏커버링 가점 (S-Boost) [v25.0]
                s_boost, s_tag = self.get_short_cover_boost(code, float(curr['price']))
                if s_tag: reason = f"{s_tag}, {reason}"
                
                # F. 사용자 피드백 가점 (H-Bonus) [v19.1 정밀화]
                intuition_bonus = 0.0
                tag = feedback_map.get(code)
                if tag == '성공' or tag == '매집':
                    intuition_bonus = 1.0  # [v36.0] 5.0 -> 1.0 하향 (상징적 점수만 유지)
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

                # G. 최종 합산 (가점 역할 분리 및 이중 반영 해소)
                # 퀀트(Q) 점수에 기술적 지표 + 수급(프로그램) + 공매도(숏커버) 데이터 집약 반영
                algo_score = max(0, min(100, algo_score + p_boost + s_boost))

                # AI 모델(L, T, X)은 순수 시계열 예측력 보존 + 펀더멘털 실적 가점(f_boost)만 연계
                lstm_f = max(0, min(100, e_data['lstm'] + f_boost))
                tcn_f = max(0, min(100, e_data['tcn'] + f_boost))
                xgb_f = max(0, min(100, e_data['xgb'] + f_boost))
                
                e_score = (lstm_f * w_l) + (tcn_f * w_t) + (xgb_f * w_x)
                total_score = (algo_score * weight_algo) + (e_score * weight_ai)
                # 최종 합산 및 직관 보너스 적용
                total_score = max(0, min(100, total_score + intuition_bonus))

                # [v44.8] 진정한 바닥 탈출(52주 고점 기준) 눌림목 구제 로직
                # RSI가 높아질수록 삭감하되, 52주 고점 대비 -3% 이상 하락 시 '눌림목'으로 간주하여 필터 제외
                rsi = float(curr['rsi'] or 50)
                price = float(curr['price'])
                
                # 52주 고가 조회 (stock_master에 박제된 정밀 데이터 활용)
                sql_h52 = "SELECT h52_price FROM stock_master WHERE stock_code = %s"
                with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute(sql_h52, (code,))
                    h52_row = cursor.fetchone()
                    h52 = float(h52_row['h52_price']) if h52_row and h52_row['h52_price'] > 0 else price
                
                is_pullback = (price < h52 * 0.85) # [v44.8] 52주 고점 대비 15% 이상 하락 시 눌림목 간주 (바닥 탈출 적극 우대)
                
                if not is_pullback: # 눌림목이 아닐 때만 과열 필터 작동
                    if rsi >= 75:
                        total_score *= 0.7  # 심각과열: -30%
                        reason = f"⚠️심각과열, {reason}"
                    elif rsi >= 65:
                        total_score *= 0.85 # 고점경계: -15%
                        reason = f"⚠️고점경계, {reason}"
                    elif rsi >= 60:
                        total_score *= 0.92 # 주의국면: -8%
                        reason = f"⚠️추세주의, {reason}"
                    elif rsi >= 55:
                        total_score *= 0.95 # 과열시작: -5%
                        reason = f"⚠️과열진입, {reason}"
                # RSI 55 미만이거나 눌림목(Pullback) 구간은 점수 100% 보존

                # [v45.8] 수급 주도주 보호를 위해 스마트머니 점수 선제적 계산
                s_score, obv_tag = self.get_smart_money_score(code, float(curr['price']), float(curr['volume']), float(curr.get('obv', 0)))

                # [v46.4] 리스크 관리 필터: '심각과열' 종목만 전격 배제 (고점경계는 추세로 인정하여 노출)
                is_dangerous = "⚠️심각과열" in reason

                if (total_score >= min_threshold or s_score >= 90.0) and not is_dangerous:
                    if s_score >= 90: reason = f"🔥스마트머니({int(s_score)}%), {reason}"
                    if obv_tag: reason = f"{obv_tag}, {reason}"

                    # [v32.5] 태그 중복 제거 및 클린업 (모든 사유 노출)
                    reason_list = [r.strip() for r in reason.split(',') if r.strip()]
                    unique_reasons = []
                    for r in reason_list:
                        if r not in unique_reasons: unique_reasons.append(r)
                    final_reason = ", ".join(unique_reasons) # 제한 없이 전체 노출

                    results.append({
                        'code': code, 'name': curr['stock_name'],
                        'total': round(total_score, 1), 'algo': round(algo_score, 1),
                        'lstm': round(lstm_f, 1), 'tcn': round(tcn_f, 1),
                        'xgb': round(xgb_f, 1), 'ensemble': round(e_score, 1),
                        'price_at': float(curr['price']), 'reason': final_reason,
                        'smart_score': s_score
                    })

            # [v45.9] 랭킹 필터링 고도화 (종합 TOP 20 + 수급 대장주 합산)
            top_by_total = sorted(results, key=lambda x: x['total'], reverse=True)[:20]
            high_smart_money = [r for r in results if r['smart_score'] >= 90.0]
            
            # 중복 제거하며 두 리스트 합산 (수급 대장주 보호)
            final_list = {item['code']: item for item in (top_by_total + high_smart_money)}.values()
            
            with self.conn.cursor() as cursor:
                cursor.execute("DELETE FROM ai_next_leaders WHERE DATE(captured_at) = CURDATE()")
                for idx, item in enumerate(final_list):
                    is_top10 = 'Y' if idx < 10 else 'N' # [v28.9.17] TOP 10 종목 별도 표시
                    sql = """INSERT INTO ai_next_leaders 
                             (stock_code, stock_name, total_score, algo_score, 
                              lstm_score, tcn_score, xgb_score, ensemble_score, 
                              reason, price_at_recom, is_top10, smart_money_score, captured_at) 
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"""
                    cursor.execute(sql, (
                        item['code'], item['name'], item['total'], item['algo'], 
                        item['lstm'], item['tcn'], item['xgb'], item['ensemble'], 
                        item['reason'], item['price_at'], is_top10, item['smart_score']
                    ))
            self.conn.commit()
            print(f">>> [Success] Hybrid AI (Quant + DeepLearning + Financial + Human) Sync Complete.")
            return len(final_list)
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

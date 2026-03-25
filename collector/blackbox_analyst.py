import pymysql
import json
import random
import re
import requests
import os
import torch
import torch.nn as nn
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
from datetime import datetime
from ai_engine import StockLSTM, StockTCN, AIEngine

DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

class BlackBoxAnalyst:
    def __init__(self):
        self.conn = None
        self.ai = AIEngine()
        self.pos_words = ['공급계약', '최대실적', '흑자전환', '특허취득', 'M&A', '외인매수', '상한가', '기술수출', 'MOU', '유치', '증설', '전망치상향', '승인', '강세']
        self.neg_words = ['유상증자', '배임', '횡령', '영업손실', '하락', '매도세', '공매도', '하향', '적자전환', '압수수색', '과징금', '불성실', '약세', '이탈']
        self.naver_id = os.getenv('NAVER_CLIENT_ID')
        self.naver_secret = os.getenv('NAVER_CLIENT_SECRET')
        self.strategy_config = {'w_algo': 0.6, 'w_ai': 0.4, 'mode': 'DEFENSIVE'}

    def connect(self):
        self.conn = pymysql.connect(**DB_CONFIG)

    def load_config(self):
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT ai_strategy_mode FROM collector_config WHERE id = 1")
                cfg = cursor.fetchone()
                if cfg:
                    mode = cfg['ai_strategy_mode'] or 'DEFENSIVE'
                    self.strategy_config['mode'] = mode
                    if mode == 'NEUTRAL': self.strategy_config['w_algo'], self.strategy_config['w_ai'] = 0.5, 0.5
                    elif mode == 'AGGRESSIVE': self.strategy_config['w_algo'], self.strategy_config['w_ai'] = 0.4, 0.6
                    else: self.strategy_config['w_algo'], self.strategy_config['w_ai'] = 0.6, 0.4
        except: pass

    def fetch_user_holdings(self):
        with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SET NAMES utf8mb4")
            cursor.execute("""
                SELECT h.USRID, h.stock_code, m.stock_name, m.industry_name, h.avg_price, h.quantity 
                FROM holdings h 
                JOIN stock_master m ON h.stock_code = m.stock_code 
                WHERE h.quantity > 0
            """)
            return cursor.fetchall()

    def calculate_smart_money(self, code, price, volume):
        """
        [v39.0] 지능형 스마트머니 S-Score (Adaptive Scoring)
        공매도 미대상 종목은 4:3:3 (40:30:30) 레시피로 자동 전환
        """
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 0. 공매도 데이터 존재 여부 확인
                cursor.execute("SELECT avg_short_price FROM daily_short_selling WHERE stock_code=%s ORDER BY bsop_date DESC LIMIT 1", (code,))
                sd_row = cursor.fetchone()
                has_short = True if sd_row and float(sd_row['avg_short_price'] or 0) > 0 else False

                # 1. 프로그램 (35 or 40)
                cursor.execute("SELECT program_net_buy FROM stock_intraday_history WHERE stock_code=%s AND DATE(captured_at)=CURDATE() ORDER BY id DESC LIMIT 1", (code,))
                row = cursor.fetchone()
                curr_pgm = float(row['program_net_buy'] or 0) if row else 0
                p_limit = 25.0 if has_short else 30.0
                # [v41.4] 마이너스 점수 허용 (사용자 요청: 수급 악화 시각화)
                p_score = min(p_limit, (curr_pgm / volume) * 100 * 1.8) if volume > 0 else 0
                
                cursor.execute("SELECT SUM(program_net_buy) as daily_pgm, DATE(captured_at) as d FROM stock_intraday_history WHERE stock_code=%s GROUP BY d ORDER BY d DESC LIMIT 3", (code,))
                days = cursor.fetchall()
                if len(days) >= 3 and all(float(d['daily_pgm'] or 0) > 0 for d in days): p_score += 10.0
                elif len(days) >= 2 and all(float(d['daily_pgm'] or 0) > 0 for d in days[:2]): p_score += 5.0

                # 2. 숏스퀴즈 (15 or 0)
                s_score = 0.0
                if has_short:
                    avg_p = float(sd_row['avg_short_price'])
                    if price > avg_p:
                        s_score += min(10.0, ((price - avg_p) / avg_p) * 100)
                    s_score += 5.0 # 고농축 베이스 가점

                # 3. OBV (25 or 30)
                cursor.execute("SELECT obv FROM stock_intraday_history WHERE stock_code=%s ORDER BY id DESC LIMIT 1", (code,))
                o_row = cursor.fetchone()
                curr_obv = float(o_row['obv'] or 0) if o_row else 0
                cursor.execute("SELECT MAX(obv) as max_o, MIN(obv) as min_o FROM stock_intraday_history WHERE stock_code=%s AND captured_at >= DATE_SUB(NOW(), INTERVAL 10 DAY)", (code,))
                o_rng = cursor.fetchone()
                o_score = 0.0
                obv_tag = "" 
                if o_rng and o_rng['max_o'] is not None:
                    max_o, min_o = float(o_rng['max_o']), float(o_rng['min_o'])
                    o_limit = 20.0 if has_short else 25.0
                    if max_o > min_o: 
                        o_score += min(o_limit, (curr_obv - min_o) / (max_o - min_o) * o_limit)
                    
                cursor.execute("SELECT MAX(obv) as p_max FROM stock_intraday_history WHERE stock_code=%s AND captured_at < DATE(NOW()) AND captured_at >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)", (code,))
                p_max = cursor.fetchone()
                if p_max and p_max['p_max'] and curr_obv > float(p_max['p_max']): 
                    o_score += 5.0
                    obv_tag = "💎OBV매집포착"

                # 4. 회전율 (25 or 30) [v40.0: 실시간 테이블로 단일화 & 50억 Floor]
                t_score = 0.0
                current_energy = price * volume
                if current_energy < 5000000000: # [v40.0] 거래대금 50억 미만 0점
                    t_score = 0.0
                else:
                    cursor.execute("""
                        SELECT AVG(energy) as avg_tr FROM (
                            SELECT MAX(volume * price) as energy 
                            FROM stock_intraday_history 
                            WHERE stock_code = %s AND captured_at < DATE(NOW())
                            GROUP BY DATE(captured_at)
                            ORDER BY DATE(captured_at) DESC LIMIT 5
                        ) as sub
                    """, (code,))
                    avg_tr_row = cursor.fetchone()
                    if avg_tr_row and avg_tr_row['avg_tr'] and float(avg_tr_row['avg_tr']) > 0:
                        avg_tr = float(avg_tr_row['avg_tr'])
                        t_limit = 25.0 if has_short else 30.0
                        t_score = min(t_limit, (current_energy / avg_tr) * (t_limit / 3))

                return round(max(0, p_score + s_score + o_score + t_score), 2), obv_tag
        except Exception as e:
            print(f">>> [S-Score Error] {e}")
            return 0.0, ""

    def calculate_short_sentiment(self, code, current_price):
        """
        [v25.0] 공매도 및 숏커버링 심리 분석
        """
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = "SELECT short_balance, avg_short_price, short_ratio FROM daily_short_selling WHERE stock_code = %s ORDER BY bsop_date DESC LIMIT 2"
                cursor.execute(sql, (code,))
                rows = cursor.fetchall()
                if len(rows) < 2: return {"status": "중립", "comment": "", "bonus": 0}

                curr = rows[0]; prev = rows[1]
                avg_short_price = float(curr['avg_short_price'] or 0)
                
                status = "중립"
                comment = ""
                bonus = 0

                # 1. 숏커버링 감지 (잔고 감소)
                if float(curr['short_balance'] or 0) < float(prev['short_balance'] or 0):
                    status = "숏커버링"
                    comment = "공매도 세력의 상환(숏커버링)이 시작되었습니다. "
                    bonus = 3.5

                # 2. 숏스퀴즈 가능성 (현재가 > 평단가)
                if avg_short_price > 0 and current_price > avg_short_price:
                    status = "숏스퀴즈임박"
                    comment += f"현재가가 공매도 평단가({int(avg_short_price):,})를 상회하며 세력의 압박이 가중되고 있습니다. "
                    bonus += 5.0

                return {"status": status, "comment": comment, "bonus": bonus}
        except: return {"status": "중립", "comment": "", "bonus": 0}

    def calculate_earnings_momentum(self, code):
        # [v28.7.1] 데이터 무결성 패치: 동일 report_code끼리만 비교 (착시 방지)
        result = {"status": "데이터 대기", "comment": "", "bonus": 0}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("""
                    SELECT op_profit, revenue, report_code FROM company_financials 
                    WHERE stock_code = %s ORDER BY report_year DESC, report_code DESC LIMIT 2
                """, (code,))
                rows = cursor.fetchall()
                if len(rows) < 2: return result
                curr = rows[0]; prev = rows[1]
                if curr['report_code'] != prev['report_code']:
                    # [v28.7.2] 비교 불가 시 절대 수치 기반 벌점/가점제 적용
                    curr_op = float(curr['op_profit'] or 0)
                    if curr_op > 0:
                        return {"status": "흑자 유지", "comment": "현재 수익을 창출하며 안정적인 기초 체력을 유지하고 있습니다.", "bonus": 3}
                    else:
                        return {"status": "적자 지속", "comment": "현재 영업 적자 상태로 펀더멘털 측면의 리스크 관리가 필요합니다.", "bonus": -5}
                curr_op = float(curr['op_profit'] or 0); prev_op = float(prev['op_profit'] or 0)
                if prev_op <= 0 and curr_op > 0:
                    result = {"status": "턴어라운드", "comment": "적자 탈출 및 실적 턴어라운드에 성공하며 기초 체력을 회복했습니다.", "bonus": 10}
                elif curr_op > prev_op * 1.2:
                    result = {"status": "성장 가속", "comment": "전년 동기 대비 영업이익이 20% 이상 급증하며 강력한 성장 모멘텀을 입증했습니다.", "bonus": 7}
                elif curr_op > prev_op:
                    result = {"status": "견조한 실적", "comment": "안정적인 이익 우상향 흐름을 유지하며 펀더멘털 신뢰도를 높이고 있습니다.", "bonus": 3}
                else:
                    result = {"status": "수익성 둔화", "comment": "이익 성장세가 다소 정체되어 수급 및 차트 중심의 대응이 필요한 단계입니다.", "bonus": -2}
            return result
        except: return result

    def get_market_rotation_status(self):
        # [v28.6] 시장 전체 섹터 순환매 흐름 스캔
        rotation_data = {"exit_sectors": [], "entry_sectors": []}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("""
                    SELECT m.industry_name, SUM(sd.foreign_net_buy + sd.institution_net_buy) as total_net_buy
                    FROM stock_supply_demand sd
                    JOIN stock_master m ON sd.stock_code = m.stock_code
                    WHERE sd.captured_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) AND m.industry_name != ''
                    GROUP BY m.industry_name ORDER BY total_net_buy DESC
                """)
                rows = cursor.fetchall()
                if rows:
                    rotation_data["entry_sectors"] = [r['industry_name'] for r in rows[:3]]
                    rotation_data["exit_sectors"] = [r['industry_name'] for r in rows[-3:]]
            return rotation_data
        except: return rotation_data

    def get_multi_whale_accumulation(self, code):
        # [v28.9.8] 독종 쿼리: TRIM 적용으로 공백 오차 차단 및 디버깅 로그 추가
        stats = {"foreigner": {"vol5d": 0, "vol20d": 0, "vol60d": 0}, "institution": {"vol5d": 0, "vol20d": 0, "vol60d": 0}}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("""
                    SELECT foreign_net_buy, institution_net_buy 
                    FROM daily_stock_investor 
                    WHERE TRIM(stock_code) = TRIM(%s) ORDER BY bsop_date DESC LIMIT 60
                """, (code,))
                rows = cursor.fetchall()
                if rows:
                    # 5일 누적
                    stats["foreigner"]["vol5d"] = int(sum(r['foreign_net_buy'] for r in rows[:5]))
                    stats["institution"]["vol5d"] = int(sum(r['institution_net_buy'] for r in rows[:5]))
                    # 20일 누적
                    stats["foreigner"]["vol20d"] = int(sum(r['foreign_net_buy'] for r in rows[:20]))
                    stats["institution"]["vol20d"] = int(sum(r['institution_net_buy'] for r in rows[:20]))
                    # 60일 누적
                    stats["foreigner"]["vol60d"] = int(sum(r['foreign_net_buy'] for r in rows))
                    stats["institution"]["vol60d"] = int(sum(r['institution_net_buy'] for r in rows))
            return stats
        except: return stats

    def calculate_sector_momentum(self, code, industry):
        if not industry: return {"status": "분석불가", "score": 50, "advice": ""}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT AVG(execution_strength) as avg_s FROM stock_supply_demand sd JOIN stock_master m ON sd.stock_code = m.stock_code WHERE m.industry_name = %s AND sd.captured_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)", (industry,))
                avg_s = float(cursor.fetchone()['avg_s'] or 100)
                cursor.execute("SELECT execution_strength FROM stock_supply_demand WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (code,))
                my_s = float(cursor.fetchone()['execution_strength'] or 100)
                ratio = my_s / avg_s
                if ratio > 1.3: return {"status": "섹터 대장주 (Leader)", "score": 90, "advice": f"{industry} 섹터 상승 견인"}
                if ratio > 1.05: return {"status": "섹터 주도주 (Outperformer)", "score": 75, "advice": "섹터 평균 상회"}
                return {"status": "섹터 동조주 (Follower)", "score": 60, "advice": "섹터 흐름 동조"}
        except: return {"status": "분석중", "score": 50, "advice": ""}

    def calculate_whale_cost(self, code, curr_price):
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT price, volume, captured_at FROM stock_intraday_history WHERE stock_code = %s AND captured_at >= DATE_SUB(NOW(), INTERVAL 20 DAY) ORDER BY volume DESC LIMIT 1", (code,))
                anchor = cursor.fetchone()
                if not anchor: return 0, "분석 중"
                cursor.execute("SELECT SUM(price * volume) / SUM(volume) as vwap FROM stock_intraday_history WHERE stock_code = %s AND captured_at >= %s", (code, anchor['captured_at']))
                vwap = float(cursor.fetchone()['vwap'] or anchor['price'])
                diff = ((curr_price - vwap) / vwap) * 100
                advice = "세력 방어선 위 안정적 흐름" if diff > 0 else "세력 매집가 부근 공방"
                return int(vwap), advice
        except: return 0, "분석 중"

    def summarize_news(self, title):
        clean = re.sub(r'\[.*?\]|\(.*?\)', '', title).replace('"', '').replace("'", "").replace("&quot;", "").replace("&amp;", "&").strip()
        if len(clean) > 45: clean = clean[:42] + "..."
        return clean

    def calculate_tactical_tags(self, code, curr_price, curr_vol, f_buy):
        # [v27.0] 기본 시작 점수 40.0으로 하향 (변별력 강화)
        score, tags, s_score = 40.0 + random.uniform(-0.5, 0.5), [], 0.0
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # [v21.8] 프로그램 매수세 필드 추가 조회
                cursor.execute("SELECT price, volume, rsi, ma5, ma20, program_net_buy FROM stock_intraday_history WHERE stock_code = %s ORDER BY id DESC LIMIT 5", (code,))
                history = cursor.fetchall()
                
                if len(history) > 1:
                    # [v45.6] 실시간 스마트머니 4:3:3 정규화 레시피 (프로그램 40 : OBV 30 : 거래량 30)
                    s_score = 0.0
                    
                    # 1. 프로그램 수급 (Max 40.0)
                    curr_pgm = float(history[0]['program_net_buy'] or 0)
                    pgm_ratio = (curr_pgm / curr_vol) * 100 if curr_vol > 0 else 0
                    pgm_amt = curr_price * curr_pgm
                    # A. 비중 점수 (30) - [v46.2] 가중치 1.7 정규화 적용
                    s_score += min(30.0, pgm_ratio * 1.7)
                    
                    if pgm_ratio >= 15 or pgm_amt >= 10000000000: tags.append("🔥메가스마트머니")
                    elif pgm_ratio >= 10 or pgm_amt >= 5000000000: tags.append("스마트수급폭발")
                    elif pgm_ratio >= 5 or pgm_amt >= 2000000000: tags.append("스마트머니유입")
                    elif pgm_ratio >= 2 or pgm_amt >= 1000000000: tags.append("프로그램매수")
                    # B. 연속성/수급강화 (10)
                    if f_buy > 1000: s_score += 10.0; tags.append("수급포착")
                    
                    # 2. OBV 매집 추세 (Max 30.0)
                    cursor.execute("SELECT MAX(obv) as max_o, MIN(obv) as min_o FROM stock_intraday_history WHERE stock_code = %s AND captured_at >= DATE_SUB(NOW(), INTERVAL 10 DAY)", (code,))
                    o_row = cursor.fetchone()
                    if o_row and o_row['max_o'] is not None:
                        curr_obv = float(history[0]['obv'] or 0)
                        max_o, min_o = float(o_row['max_o']), float(o_row['min_o'])
                        if max_o > min_o: 
                            o_ratio = min(25.0, (curr_obv - min_o) / (max_o - min_o) * 25.0)
                            s_score += o_ratio
                        if curr_obv >= max_o: s_score += 5.0; tags.append("💎OBV매집포착")

                    # 3. 거래 폭발력 (Max 30.0)
                    if curr_vol > float(history[1]['volume'] or 1) * 1.5: 
                        s_score += 20.0; tags.append("거래량포착")
                    # 거래대금 50억 Floor 및 급증 가점 (10)
                    if (curr_price * curr_vol) >= 5000000000: s_score += 10.0
                    
                    # 4. 차트 및 재무 가점 (종합 점수용 보너스)
                    t_bonus = 0.0
                    if float(history[0]['rsi'] or 50) <= 45: t_bonus += 15.0; tags.append("RSI바닥탈출")
                    if float(history[0]['ma5'] or 0) > float(history[0]['ma20'] or 0) and (float(history[1]['ma5'] or 0) <= float(history[1]['ma20'] or 0)): t_bonus += 15.0; tags.append("골든크로스")
                    
                    # 최종 종합 점수 합산
                    score += (s_score + t_bonus)
        except Exception as e:
            print(f">>> [BlackBox Score Error] {e}")
        return round(min(100, max(0, score)), 1), tags, round(s_score, 1)

    def get_stock_data(self, stock_code, industry):
        # [v27.0] 초기 점수 40.0으로 통일 (거품 제거)
        data = {
            'quant': 40.0, 'lstm': 40.0, 'tcn': 40.0, 'xgb': 40.0, 'reason': [], 'hit_rate': 70.0, 
            'supply': {'foreign': 0}, 'whale': {'cost': 0, 'advice': ''}, 'sector': {'status': '분석중', 'score': 40, 'advice': ''}, 
            'multiWhale': {'foreigner': {'vol5d': 0, 'vol20d': 0, 'vol60d': 0}, 'institution': {'vol5d': 0, 'vol20d': 0, 'vol60d': 0}}, 
            'earnings': {'status': '분석중', 'comment': '', 'bonus': 0},
            'short_sentiment': {"status": "중립", "comment": "", "bonus": 0}, # [v41.2] 사전 정의
            'smart_money': 0.0
        }
        clean_code = str(stock_code).strip()
        try:
            # [v28.9.12] DB 커서 관리 통합: 모든 쿼리를 하나의 커서 세션 내에서 처리
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT current_price, volume, foreign_net_buy FROM stock_supply_demand WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (clean_code,))
                info = cursor.fetchone()
            
                # 1. 과거 통계 및 실적 분석 (실시간 데이터와 무관)
                data['multiWhale'] = self.get_multi_whale_accumulation(clean_code)
                data['earnings'] = self.calculate_earnings_momentum(clean_code)
                
                # 2. 실시간 데이터 기반 분석
                if info:
                    price, vol, f_buy = float(info['current_price']), float(info['volume']), float(info['foreign_net_buy'] or 0)
                    data['supply'] = {'foreign': int(f_buy)}
                    q_score, tags, s_score = self.calculate_tactical_tags(clean_code, price, vol, f_buy)
                    data['quant'] = q_score; data['reason'] = tags
                    data['smart_money'] = s_score
                    
                    # 세력 평단가 및 섹터 모멘텀
                    w_cost, w_advice = self.calculate_whale_cost(clean_code, price)
                    data['whale'] = {'cost': w_cost, 'advice': w_advice}
                    data['sector'] = self.calculate_sector_momentum(clean_code, industry)
                    
                    # 딥러닝 추론
                    scores = self.ai.get_ensemble_score_details(clean_code, price, f_buy, vol)
                    s_lstm, s_tcn, s_xgb = float(scores['lstm']), float(scores['tcn']), float(scores['xgb'])
                    data['lstm'], data['tcn'] = round(s_lstm, 1), round(s_tcn, 1)
                        
                    # 수급 누적량 기반 가중치 보정
                    mw = data['multiWhale']; mw_adj = 0
                    if mw['foreigner']['vol20d'] > 100000: mw_adj += 3
                    if mw['institution']['vol20d'] > 50000: mw_adj += 3
                    if mw['foreigner']['vol20d'] < -100000: mw_adj -= 3
                    
                    # 종합 점수 산출 (DB 설정 기반)
                    w_algo = self.strategy_config['w_algo']
                    w_ai = self.strategy_config['w_ai']

                    # [v28.9.13] 공격형 모드 전용 수급 폭발 가중치 보정
                    agg_bonus = 0
                    if self.strategy_config['mode'] == 'AGGRESSIVE':
                        if mw['foreigner']['vol5d'] > 0: agg_bonus += 2 # 최근 5일 외인 매집 시 가산
                        if mw['institution']['vol5d'] > 0: agg_bonus += 2 # 최근 5일 기관 매집 시 가산

                    # [v44.8] 진정한 바닥 탈출(52주 고점 기준) 눌림목 구제
                    cursor.execute("SELECT rsi FROM stock_intraday_history WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (clean_code,))
                    h_row = cursor.fetchone()
                    rsi = float(h_row['rsi'] or 50) if h_row else 50

                    cursor.execute("SELECT h52_price FROM stock_master WHERE stock_code=%s", (clean_code,))
                    h52_row = cursor.fetchone()
                    h52 = float(h52_row['h52_price']) if h52_row and h52_row['h52_price'] > 0 else price
                    is_pullback = (price < h52 * 0.85) # [v44.8] 52주 고점 대비 15% 이상 하락 시 눌림목 간주 (바닥 탈출 적극 우대)
                    final_score = (q_score * w_algo) + (s_xgb * w_ai) + mw_adj + data['earnings']['bonus'] + agg_bonus
                    if not is_pullback:
                        if rsi >= 75: final_score *= 0.7; data['reason'].append("⚠️심각과열")
                        elif rsi >= 65: final_score *= 0.85; data['reason'].append("⚠️고점경계")
                        elif rsi >= 60: final_score *= 0.92; data['reason'].append("⚠️추세주의")
                        elif rsi >= 55: final_score *= 0.95; data['reason'].append("⚠️과열진입")

                    data['xgb'] = round(max(0, min(100, final_score)), 1)
                    
                    # [v42.0] 엔진 종합 점수(Total) 및 예상 확률(Probability) 산출
                    # 과거 기록 대신 현재 데이터의 통계적 기대치(자신감)를 출력합니다.
                    data['total_score'] = data['xgb']
                    data['ai_probability'] = round((data['xgb'] * 0.7) + 15.0, 1)
                    
                    # [v23.0] 스마트머니 초정밀 점수 반영 (OBV 태그 포함)
                    s_score, obv_tag = self.calculate_smart_money(clean_code, price, vol)
                    data['smart_money'] = s_score
                    if obv_tag: data['reason'].append(obv_tag)
                    
                    # [v25.0] 공매도 및 숏커버링 심리 분석
                    short_data = self.calculate_short_sentiment(clean_code, price)
                    data['short_sentiment'] = short_data
                    data['xgb'] = round(max(0, min(100, data['xgb'] + short_data['bonus'])), 1)
                
                # 3. AI 적중률 조회 제거 (v42.0 예상 확률로 대체)
                # 데이터가 적은 종목의 '0% 트랩'을 방지하기 위해 라이브 판정으로 전환합니다.
                
        except Exception as e:
            print(f">>> [Error] get_stock_data failed for {stock_code}: {e}")
        return data

    def scrape_realtime_news(self, stock_name):
        if not self.naver_id or not self.naver_secret: return "Neutral", 0, []
        headers = {"X-Naver-Client-Id": self.naver_id, "X-Naver-Client-Secret": self.naver_secret}
        url, params = "https://openapi.naver.com/v1/search/news.json", {"query": stock_name, "display": 10, "sort": "date"}
        score, news_data = 0, []
        try:
            res = requests.get(url, headers=headers, params=params, timeout=5).json()
            for item in res.get('items', []):
                title = item.get('title', '').replace('<b>', '').replace('</b>', '')
                news_data.append({"title": self.summarize_news(title), "link": item.get('link', '')})
                for w in self.pos_words:
                    if w in title: score += 15
                for w in self.neg_words:
                    if w in title: score -= 20
        except: pass
        sentiment = "Positive (🔥)" if score >= 30 else "Negative (❄️)" if score <= -30 else "Neutral"
        return sentiment, score, news_data

    def generate_intelligent_narrative(self, data, name, industry):
        """
        [v44.4] 얼티밋 AI 서사 매트릭스 (Total Score & Reason 통합판)
        종합 점수의 의미와 전술 태그의 배경을 전문가 시각에서 해설합니다.
        """
        try:
            # 1. 고도화된 수치 분석
            f_buy = data['supply']['foreign']
            whale_c = data['whale'].get('cost', 0)
            curr_p = whale_c if whale_c > 0 else 0 # 현재가 대용
            pgm_amt = (f_buy * curr_p) / 100000000 # 억 단위
            s_score = data.get('smart_money', 0)
            short_avg = data['short_sentiment'].get('avg_short_price', 0)
            rsi = data.get('rsi', 50)
            prob = data.get('ai_probability', 50)
            total = data.get('total_score', 0)
            reasons = data.get('reason', [])
            
            # 2. 레이어 1: 오프닝 (시장 국면 & 섹터 위치)
            openings = [
                f"현재 {name}은(는) {industry} 섹터 내에서 가장 날카로운 '수급의 칼날'을 세우고 있습니다.",
                f"데이터가 가리키는 {name}의 현재 위치는 '폭발 전야의 고요함' 그 자체입니다.",
                f"전체 시장의 자금이 조용히, 하지만 확실하게 {name}의 바닥권으로 응집되고 있습니다.",
                f"오늘 {name}에서 포착된 움직임은 단순한 파동을 넘어선 '거대 자본의 설계'된 흔적입니다.",
                f"기술적 완성도와 수급의 질이 완벽한 조화를 이루는 '골든 크로스헤어' 구간입니다.",
                f"현재 {name}은(는) {industry} 산업군의 기류를 바꾸는 '게임 체인저' 역할을 자처하고 있습니다."
            ]
            
            # 3. 레이어 2: 종합 점수 비평 (Total Score 10점 단위 정밀 분석)
            if total >= 95:
                t_critique = f"종합 점수 {total}점은 시장에 단 0.1%만 존재하는 '천상의 타점'입니다. 모든 알고리즘이 완벽한 일치를 보이고 있습니다."
            elif total >= 90:
                t_critique = f"종합 {total}점은 가히 '대장주의 관상'이라 할 만합니다. 퀀트와 AI가 동시에 최상위 등급을 부여한 것은 매우 이례적인 강세 시그널입니다."
            elif total >= 80:
                t_critique = f"종합 {total}점의 고득점은 주도권이 이 종목으로 완전히 넘어왔음을 시사하는 강력한 '수급의 요새'가 구축되었음을 의미합니다."
            elif total >= 70:
                t_critique = f"종합 {total}점으로 상위권에 안착했습니다. 기술적 지표들이 정배열로 정렬되며 '우량한 추세'의 기틀을 마련했습니다."
            elif total >= 60:
                t_critique = f"종합 {total}점은 하방 경직성을 확보하고 반등의 모멘텀을 축적 중인 '적정 가치' 구간임을 나타냅니다."
            elif total >= 50:
                t_critique = f"종합 {total}점대로 중립 이상의 기운을 내뿜고 있습니다. 특정 수급의 트리거가 당겨지는 순간 폭발적 상향이 기대되는 자리입니다."
            else:
                t_critique = f"종합 {total}점의 낮은 점수는 아직 시장의 소외를 의미하며, 보수적인 관점에서 '에너지의 응축'을 더 기다려야 하는 인내의 단계입니다."

            # 4. 레이어 3: 수급의 심연 (S-Score 5점 단위 초정밀 분석)
            if s_score >= 100:
                supply = [f"경이로운 수급입니다. S-Score 100% 만점은 전 시장의 자금을 블랙홀처럼 빨아들이는 '무결점 매집'을 의미합니다. {pgm_amt:.1f}억의 화력은 파괴적입니다."]
            elif s_score >= 95:
                supply = [f"수급 에너지가 {int(s_score)}%에 달하며 '폭발적 임계점'에 도달했습니다. 세력이 시세 분출의 '최종 승인'을 내린 것으로 보이며, {pgm_amt:.1f}억의 프로그램 유입은 압도적입니다."]
            elif s_score >= 90:
                supply = [f"강력한 수급의 질({int(s_score)}%)이 돋보입니다. {pgm_amt:.1f}억 원 규모의 대규모 자금 유입은 주가 상승을 위한 '수급의 요새'를 완벽하게 구축했습니다."]
            elif s_score >= 85:
                supply = [f"상위 1%급의 정예 수급({int(s_score)}%)입니다. {pgm_amt:.1f}억 원의 프로그램 선취매가 바닥권 물량을 완전히 장악하며 시세를 가볍게 만들고 있습니다."]
            elif s_score >= 80:
                supply = [f"수급 지수가 {int(s_score)}%까지 차오르며 공격적인 매집 단계에 진입했습니다. {pgm_amt:.1f}억 원의 우호적인 자금 흐름이 상승의 든든한 보험이 됩니다."]
            elif s_score >= 75:
                supply = [f"매우 양호한 수급 흐름({int(s_score)}%)입니다. 세력이 {pgm_amt:.1f}억 원대를 투입하며 상방 압력을 높이는 '질서 있는 공격'이 전개 중입니다."]
            elif s_score >= 70:
                supply = [f"안정적인 매집 국면({int(s_score)}%)입니다. 기관과 외인이 {pgm_amt:.1f}억 원 규모의 물량을 꾸준히 채워가며 중기적 우상향의 발판을 마련했습니다."]
            elif s_score >= 65:
                supply = [f"수급의 균형이 매수 우위({int(s_score)}%)로 확실히 기울었습니다. {pgm_amt:.1f}억 원의 프로그램 유입은 향후 추세 전환의 핵심 디딤돌입니다."]
            elif s_score >= 60:
                supply = [f"점진적인 수급 강화({int(s_score)}%) 구간입니다. {pgm_amt:.1f}억 원 규모의 자금이 유입되며 하방 경직성을 탄탄하게 다지는 모습입니다."]
            elif s_score >= 55:
                supply = [f"매수세가 서서히 예열되는 {int(s_score)}% 단계입니다. {pgm_amt:.1f}억 원의 유입이 연속성을 띠게 되면 본격적인 수급 장악이 기대됩니다."]
            elif s_score >= 50:
                supply = [f"수급의 중립선을 넘어선 {int(s_score)}% 지점입니다. {pgm_amt:.1f}억 원 규모의 탐색전이 벌어지고 있으며, 세력의 의도가 선명해지고 있습니다."]
            elif s_score >= 45:
                supply = [f"저가 매수세가 유입되는 {int(s_score)}% 구간입니다. 아직은 {pgm_amt:.1f}억 원 규모의 미세한 흐름이나, 반등의 실마리를 찾는 과정입니다."]
            elif s_score >= 40:
                supply = [f"수급이 고개를 드는 {int(s_score)}% 단계입니다. {pgm_amt:.1f}억 원의 자금 유입이 대규모 수급 폭발로 이어지는지 확인이 필요한 변곡점입니다."]
            elif s_score >= 35:
                supply = [f"매수세가 미약하게 감지되는 {int(s_score)}% 지점입니다. {pgm_amt:.1f}억 원 수준의 유입으로는 추세를 돌리기엔 다소 이른 감이 있습니다."]
            elif s_score >= 30:
                supply = [f"수급 에너지가 부족한 {int(s_score)}% 상태입니다. {pgm_amt:.1f}억 원 규모의 정체된 흐름은 시장의 소외를 의미하며 인내심이 요구됩니다."]
            elif s_score >= 25:
                supply = [f"주의가 필요한 수급 지수({int(s_score)}%)입니다. {pgm_amt:.1f}억 원의 미미한 움직임 속에 매도세의 압박이 조금씩 거세지고 있습니다."]
            elif s_score >= 20:
                supply = [f"수급의 공동화 현상({int(s_score)}%)이 우려됩니다. {pgm_amt:.1f}억 원 수준의 낮은 참여도는 주가 방어력을 약화시키는 원인이 됩니다."]
            elif s_score >= 15:
                supply = [f"세력이 관망 중인 {int(s_score)}% 구간입니다. {pgm_amt:.1f}억 원 규모의 미미한 유입으로는 의미 있는 반등을 기대하기 어렵습니다."]
            elif s_score >= 10:
                supply = [f"간신히 숨만 붙어있는 {int(s_score)}%의 수급 상태입니다. {pgm_amt:.1f}억 원의 소극적인 흐름은 보수적인 관점에서의 대응을 권고합니다."]
            elif s_score >= 5:
                supply = [f"수급 에너지가 고갈된 {int(s_score)}% 지점입니다. {pgm_amt:.1f}억 원 규모의 미세한 이탈이 포착되며 하방 리스크가 확대되고 있습니다."]
            else:
                supply = [f"수급 공백 상태({int(s_score)}%)입니다. {pgm_amt:.1f}억 원 규모의 대규모 이탈은 주도 세력이 부재함을 증명하며, 리스크 관리가 최우선입니다."]

            # 5. 레이어 4: 전술 태그 상세 해설 (생략 없이 유지)
            tag_details = []
            for tag in reasons:
                if "스마트수급폭발" in tag: tag_details.append("기관급 대규모 자금이 유입되는 '스마트수급폭발' 현상은 시세의 연속성을 보장하는 핵심 열쇠입니다.")
                if "💎" in tag: tag_details.append("OBV 다이아몬드 매집 포착은 주가는 속여도 돈의 궤적은 속일 수 없음을 입증하는 강력한 지표입니다.")
                if "⚠️과열" in tag: tag_details.append("단기 과열 꼬리표가 붙었으나, 이는 역설적으로 시세의 탄력이 살아있음을 보여주는 '건강한 발열'입니다.")
                if "RSI바닥" in tag: tag_details.append("바닥의 저주를 끝내고 상승으로 고개를 드는 RSI 궤적은 완벽한 '역발상 매수' 기회를 제공합니다.")
                if "이평선수렴" in tag: tag_details.append("이평선 응축은 곧 거대한 발산의 시작이며, 현재 그 변곡점의 한복판에 서 있습니다.")
                if "고수익성" in tag: tag_details.append("탁월한 수익 구조를 바탕으로 한 펀더멘털의 우위는 어떤 하락장에서도 버틸 수 있는 '종목의 맷집'이 됩니다.")

            # 6. 레이어 5: 심리전과 고지전 (생략 없이 유지)
            psychology = []
            if whale_c > 0:
                if curr_p > whale_c * 1.05:
                    psychology.append(f"현재 주가가 주포의 평단가({whale_c:,.0f}원)를 상회하며 '세력의 추가 슈팅' 구간에 진입했습니다.")
                elif curr_p < whale_c * 0.95:
                    psychology.append(f"주가가 세력의 평단가({whale_c:,.0f}원) 아래에 머물러 있는 '역발상 매집' 자리입니다.")
            
            if short_avg > 0:
                gap = ((curr_p - short_avg) / short_avg) * 100
                if gap > 3:
                    psychology.append(f"공매도 세력은 이미 '항복(Surrender)' 직전입니다. 평단가({short_avg:,.0f}원)를 돌파한 시세는 이들의 숏커버링을 강제할 것입니다.")
                elif gap < -10:
                    psychology.append(f"공매도 세력이 수익을 거두며 압박 중이나, 지지선 확인 시 역습의 기회가 올 수 있습니다.")

            # 7. 레이어 6: AI 최종 예보 (확률 5점 단위 초정밀 분석)
            if prob >= 100:
                prediction = [f"AI 신뢰도 100%의 '완벽한 확률'입니다. 수학적, 통계적 모든 지표가 이 종목의 폭등을 확신하고 있습니다."]
            elif prob >= 95:
                prediction = [f"기대 확률 {prob}%는 사실상 확정적인 시세 분출 신호입니다. 망설임이 가장 큰 리스크인 구간입니다."]
            elif prob >= 90:
                prediction = [f"AI 기대 확률이 {prob}%에 달하는 '최고 등급' 신호입니다. 세력의 의도와 차트의 흐름이 완벽하게 일치했습니다."]
            elif prob >= 85:
                prediction = [f"매우 높은 확률({prob}%) 지대에 진입했습니다. 데이터 사이언스가 도출한 최종 결론은 '강력 보유'입니다."]
            elif prob >= 80:
                prediction = [f"안정적인 우상향 독주가 예견되는 {prob}% 확률 구간입니다. 시장의 노이즈를 압도하는 강력한 신뢰도입니다."]
            elif prob >= 75:
                prediction = [f"상승 에너지가 {prob}%까지 응축된 유망 지점입니다. 확신 있는 베팅이 유효한 '골든 에이지' 구간입니다."]
            elif prob >= 70:
                prediction = [f"기대 승률 {prob}%는 매우 매력적인 공격 포인트입니다. 세력의 매집이 완성 단계에 이르렀음을 시사합니다."]
            elif prob >= 65:
                prediction = [f"긍정적인 확률({prob}%) 지표가 쏟아지고 있습니다. 조정 시 적극적인 매수 전략이 수익을 극대화할 것입니다."]
            elif prob >= 60:
                prediction = [f"안착 가능성이 높은 {prob}% 확률 지대입니다. 분할 진입을 통해 리스크를 관리하며 승률을 높일 수 있습니다."]
            elif prob >= 55:
                prediction = [f"중립 이상의 기대치({prob}%)를 형성 중입니다. 세력의 가담 시그널이 확인되며 긍정적인 기류가 감지됩니다."]
            elif prob >= 50:
                prediction = [f"절반의 확률({prob}%)을 넘어선 '변곡점'입니다. 장중 데이터의 미세한 변화가 향후 방향성을 결정할 것입니다."]
            elif prob >= 45:
                prediction = [f"아직은 안개가 자욱한 {prob}%의 확률입니다. 무리한 진입보다는 데이터의 완성도가 높아지는 시점을 기다려야 합니다."]
            elif prob >= 40:
                prediction = [f"신중한 접근을 권고하는 {prob}% 지점입니다. 기술적 반등은 가능하나 추세적 상승을 논하기엔 아직 이릅니다."]
            elif prob >= 35:
                prediction = [f"리스크가 지배하기 시작하는 {prob}% 구간입니다. 수급의 확실한 트리거가 포착될 때까지 관망이 유리합니다."]
            elif prob >= 30:
                prediction = [f"성공 확률이 {prob}%로 낮아지며 경계 국면에 진입했습니다. 보수적인 관점에서의 자본 보호가 우선입니다."]
            elif prob >= 25:
                prediction = [f"매우 낮은 기대 확률({prob}%)입니다. 현재의 수급 구조로는 상방 돌파가 힘겨워 보이는 '데드 존' 구간입니다."]
            elif prob >= 20:
                prediction = [f"리스크가 극대화된 {prob}% 지대입니다. 세력의 확실한 이탈 징후가 포착되므로 철저한 대비가 필요합니다."]
            elif prob >= 15:
                prediction = [f"데이터가 경고하는 {prob}% 확률입니다. 자본을 지키는 것이 최우선이며, 종목 교체 매매가 현명한 선택입니다."]
            elif prob >= 10:
                prediction = [f"최악의 가성비를 보이는 {prob}% 확률입니다. AI는 이 종목에 대해 '위험' 수준의 경고를 보내고 있습니다."]
            elif prob >= 5:
                prediction = [f"존재 자체가 리스크인 {prob}% 확률 구간입니다. 모든 지표가 하락을 가리키는 '퍼펙트 스톰' 전야입니다."]
            else:
                prediction = [f"데이터가 거부하는 {prob}% 확률입니다. AI는 이 종목에 대해 '절대 진입 금지' 판정을 내렸습니다."]

            # 8. 최종 서사 조립 (다차원 랜덤 조합)
            body = " ".join(random.sample(psychology + tag_details, min(len(psychology + tag_details), 2))) if (psychology + tag_details) else ""
            res = f"{random.choice(openings)} {t_critique} {random.choice(supply)} {body} {random.choice(prediction)}"
            return res
        except Exception as e:
            return f"지휘 보고: {name} 종목은 현재 데이터 기반의 정밀 분석 중이며, {industry} 섹터의 핵심 흐름을 충실히 반영하고 있습니다."

    def execute(self):
        self.connect()
        self.ai.connect()
        try:
            self.load_config()
            holdings = self.fetch_user_holdings()
            if not holdings: return
            rotation = self.get_market_rotation_status()
            user_insights = {}
            for h in holdings:
                uid, code, name, industry = h['USRID'], h['stock_code'], h['stock_name'], h['industry_name']
                if uid not in user_insights: user_insights[uid] = []
                data = self.get_stock_data(code, industry)
                sentiment, s_score, news_list = self.scrape_realtime_news(name)
                final_xgb = round(max(0, min(100, data['xgb'] + (s_score/10))), 1)
                
                # [v44.0] 지능형 서사 엔진 호출 (기존 템플릿 대체)
                interpretation = self.generate_intelligent_narrative(data, name, industry)
                
                # [v32.5] 태그 중복 제거 및 클린업
                full_reason_list = [r.strip() for r in data['reason'] if r.strip()]
                unique_reasoning = []
                for r in full_reason_list:
                    if r not in unique_reasoning: unique_reasoning.append(r)
                
                insight_obj = {
                    "stockCode": code, "stockName": name, "industry": industry,
                    "total_score": data.get('total_score', 0),
                    "ai_probability": data.get('ai_probability', 0),
                    "radar": {"quant": data['quant'], "lstm": data['lstm'], "tcn": data['tcn'], "xgb": final_xgb, "smart": data.get('smart_money', 0), "interpretation": interpretation},
                    "reasoning": unique_reasoning + [f"News: {sentiment}", f"예상확률: {data.get('ai_probability', 0)}%", f"Earnings: {data['earnings']['status']}"],
                    "hitRate": data.get('ai_probability', 0), "scenario": f"분석 결과, 향후 3거래일 내 수급 폭발 확률 {int(final_xgb*1.1)}%로 산출됨.",
                    "deep": { "news": news_list[:6], "supply": data['supply'], "whale": data['whale'], "sector": data['sector'], "multiWhale": data['multiWhale'], "earnings": data['earnings'] }
                }
                user_insights[uid].append(insight_obj)
            with self.conn.cursor() as cursor:
                cursor.execute("SET NAMES utf8mb4")
                for uid, insights in user_insights.items():
                    json_str = json.dumps(insights, ensure_ascii=False)
                    cursor.execute("DELETE FROM user_market_insight WHERE USRID = %s AND insight_type = 'BLACKBOX'", (uid,))
                    cursor.execute("INSERT INTO user_market_insight (USRID, insight_type, insight_text, created_at) VALUES (%s, 'BLACKBOX', %s, NOW())", (uid, json_str))
            self.conn.commit()
            print(f">>> [BlackBox] v28.9.12 Advanced Integrated Intelligence completed.")
        finally:
            if self.conn: self.conn.close()

if __name__ == "__main__":
    # [Cache-Breaker] v28.9.12: Final Indentation & Cursor Management Fix
    analyst = BlackBoxAnalyst()
    analyst.execute()

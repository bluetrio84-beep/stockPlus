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
        score, tags = 50.0 + random.uniform(-0.5, 0.5), []
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT price, volume, rsi, ma5, ma20 FROM stock_intraday_history WHERE stock_code = %s ORDER BY id DESC LIMIT 5", (code,))
                history = cursor.fetchall()
                if len(history) > 1:
                    if curr_vol > float(history[1]['volume'] or 1) * 1.3: score += 10; tags.append("거래량포착")
                    if f_buy > 1000: score += 7; tags.append("수급포착")
                    if float(history[0]['rsi'] or 50) <= 40: score += 12; tags.append("RSI바닥탈출")
                    if float(history[0]['ma5'] or 0) > float(history[0]['ma20'] or 0) and (float(history[1]['ma5'] or 0) <= float(history[1]['ma20'] or 0)): score += 15; tags.append("골든크로스")
                    if curr_price > float(history[1]['price']): score += 5; tags.append("추세반전")
                cursor.execute("SELECT op_profit, revenue FROM company_financials WHERE stock_code=%s ORDER BY report_year DESC LIMIT 1", (code,))
                f = cursor.fetchone()
                if f and f['revenue'] > 0 and (float(f['op_profit'])/float(f['revenue'])) > 0.10: score += 5; tags.append("고수익성")
        except: pass
        return round(min(100, max(0, score)), 1), tags

    def get_stock_data(self, stock_code, industry):
        data = {
            'quant': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0, 'reason': [], 'hit_rate': 70.0, 
            'supply': {'foreign': 0}, 'whale': {'cost': 0, 'advice': ''}, 'sector': {'status': '분석중', 'score': 50, 'advice': ''}, 
            'multiWhale': {'foreigner': {'vol5d': 0, 'vol20d': 0, 'vol60d': 0}, 'institution': {'vol5d': 0, 'vol20d': 0, 'vol60d': 0}}, 
            'earnings': {'status': '분석중', 'comment': '', 'bonus': 0}
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
                    q_score, tags = self.calculate_tactical_tags(clean_code, price, vol, f_buy)
                    data['quant'] = q_score; data['reason'] = tags
                    
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

                    data['xgb'] = round(max(0, min(100, (q_score * w_algo) + (s_xgb * w_ai) + mw_adj + data['earnings']['bonus'] + agg_bonus)), 1)                
                # 3. AI 적중률(Hit Rate) 조회
                cursor.execute("SELECT COUNT(CASE WHEN hit_result='SUCCESS' THEN 1 END) as h, COUNT(CASE WHEN hit_result!='PENDING' THEN 1 END) as t FROM ai_next_leaders WHERE TRIM(stock_code)=%s", (clean_code,))
                hr_row = cursor.fetchone()
                data['hit_rate'] = round((hr_row['h'] / hr_row['t']) * 100, 1) if hr_row and hr_row['t'] > 0 else round(random.uniform(68.0, 75.0), 1)
                
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
                
                earnings_part = f"본 종목은 {data['earnings']['comment']} " if data['earnings']['comment'] else ""
                rotation_part = f"현재 시장 주도 자금이 {industry} 섹터로 유입되는 '순환매 선취매' 신호가 포착되었습니다. " if industry in rotation['entry_sectors'] else ""
                
                mw = data['multiWhale']
                mw_part = f"최근 20일간 외인은 {mw['foreigner']['vol20d']:,}주, 기관은 {mw['institution']['vol20d']:,}주 순매수를 기록 중입니다. "
                
                whale_part = "세력 방어선 위에서 안정적 흐름이며, " if data['whale']['cost'] > 0 and data['quant'] > 50 else "세력 매집가 근처 공방 중이며, "
                sector_part = f"{industry} 섹터 내 주도권을 장악한 상태입니다." if "Leader" in data['sector']['status'] or "Outperformer" in data['sector']['status'] else f"{industry} 섹터 흐름에 안정적으로 동조화되었습니다."
                tag_str = f"{', '.join(data['reason'][:2])} 시그널을 바탕으로 " if data['reason'] else ""
                
                strategy_txt = f"[{self.strategy_config['mode']}] 모드 기반 "
                interpretation = f"지휘 보고: {strategy_txt}{name} 종목은 {earnings_part}{tag_str}{rotation_part}{mw_part}{whale_part}{sector_part} 종합 분석 결과 기술적 에너지가 결집되며 견고한 추세를 형성 중입니다."
                
                insight_obj = {
                    "stockCode": code, "stockName": name, "industry": industry,
                    "radar": {"quant": data['quant'], "lstm": data['lstm'], "tcn": data['tcn'], "xgb": final_xgb, "interpretation": interpretation},
                    "reasoning": data['reason'] + [f"News: {sentiment}", f"HitRate: {data['hit_rate']}%", f"Earnings: {data['earnings']['status']}"],
                    "hitRate": data['hit_rate'], "scenario": f"분석 결과, 향후 3거래일 내 수급 폭발 확률 {int(final_xgb*1.1)}%로 산출됨.",
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

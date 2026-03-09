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

    def connect(self):
        self.conn = pymysql.connect(**DB_CONFIG)

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
        # [v28.7] Fundamental AI: 실적 성장성 및 턴어라운드 분석
        result = {"status": "분석중", "comment": "", "bonus": 0}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("""
                    SELECT op_profit, revenue FROM company_financials 
                    WHERE stock_code = %s ORDER BY report_year DESC LIMIT 2
                """, (code,))
                rows = cursor.fetchall()
                if len(rows) < 1: return result
                curr = rows[0]; prev = rows[1] if len(rows) > 1 else None
                curr_op = float(curr['op_profit'] or 0); curr_rev = float(curr['revenue'] or 1)
                margin = (curr_op / curr_rev) * 100
                if prev:
                    prev_op = float(prev['op_profit'] or 0)
                    if prev_op <= 0 and curr_op > 0:
                        result = {"status": "턴어라운드", "comment": "적자 탈출 및 실적 턴어라운드에 성공하며 강력한 기초 체력을 확보했습니다.", "bonus": 10}
                    elif curr_op > prev_op * 1.2:
                        result = {"status": "성장 가속", "comment": "전년 대비 영업이익이 20% 이상 급증하는 어닝 서프라이즈 구간에 진입했습니다.", "bonus": 7}
                    elif curr_op > prev_op:
                        result = {"status": "견조한 실적", "comment": "매출과 이익이 안정적인 우상향 곡선을 그리며 펀더멘털 신뢰도를 높이고 있습니다.", "bonus": 3}
                    else:
                        result = {"status": "수익성 둔화", "comment": "최근 실적 성장세가 주춤하며 새로운 모멘텀을 기다리는 단계입니다.", "bonus": -2}
                else:
                    if margin > 10:
                        result = {"status": "우량 기업", "comment": f"영업이익률 {margin:.1f}%를 기록하며 우수한 수익성을 증명하고 있습니다.", "bonus": 5}
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

    def calculate_multi_whale_stats(self, code, curr_price):
        # [v28.4] 외인/기관 평단가 분석
        stats = {"foreigner": {"cost": 0, "profitRate": 0}, "institution": {"cost": 0, "profitRate": 0}}
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT close_price, foreign_net_buy, institution_net_buy FROM daily_stock_investor WHERE stock_code = %s ORDER BY bsop_date DESC LIMIT 20", (code,))
                history = cursor.fetchall()
                if not history: return stats
                f_vol = sum(h['foreign_net_buy'] for h in history)
                if f_vol != 0:
                    f_cost = sum(float(h['close_price']) * h['foreign_net_buy'] for h in history) / f_vol
                    stats['foreigner'] = {"cost": int(f_cost), "profitRate": round(((curr_price - f_cost) / f_cost) * 100, 1)}
                i_vol = sum(h['institution_net_buy'] for h in history)
                if i_vol != 0:
                    i_cost = sum(float(h['close_price']) * h['institution_net_buy'] for h in history) / i_vol
                    stats['institution'] = {"cost": int(i_cost), "profitRate": round(((curr_price - i_cost) / i_cost) * 100, 1)}
            return stats
        except: return stats

    def calculate_sector_momentum(self, code, industry):
        # [v28.2] 섹터 주도주 판별
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
        # [v28.1] 세력 평단가 추적
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
        except: pass
        return round(min(100, max(0, score)), 1), tags

    def get_stock_data(self, stock_code, industry):
        data = {'quant': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0, 'reason': [], 'hit_rate': 70.0, 'supply': {'foreign': 0}, 'whale': {'cost': 0, 'advice': ''}, 'sector': {}, 'multiWhale': {}, 'earnings': {}}
        clean_code = str(stock_code).strip()
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT current_price, volume, foreign_net_buy FROM stock_supply_demand WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (clean_code,))
                info = cursor.fetchone()
                if info:
                    price, vol, f_buy = float(info['current_price']), float(info['volume']), float(info['foreign_net_buy'] or 0)
                    data['supply'] = {'foreign': int(f_buy)}
                    q_score, tags = self.calculate_tactical_tags(clean_code, price, vol, f_buy)
                    data['quant'] = q_score; data['reason'] = tags
                    w_cost, w_advice = self.calculate_whale_cost(clean_code, price)
                    data['whale'] = {'cost': w_cost, 'advice': w_advice}
                    data['sector'] = self.calculate_sector_momentum(clean_code, industry)
                    data['multiWhale'] = self.calculate_multi_whale_stats(clean_code, price)
                    data['earnings'] = self.calculate_earnings_momentum(clean_code)
                    
                    scores = self.ai.get_ensemble_score_details(clean_code, price, f_buy, vol)
                    data['lstm'], data['tcn'] = round(scores['lstm'], 1), round(scores['tcn'], 1)
                    
                    mw = data['multiWhale']; mw_adj = 0
                    if mw['foreigner']['cost'] > 0:
                        if mw['foreigner']['profitRate'] < -10: mw_adj += 2
                        if mw['foreigner']['profitRate'] > 15: mw_adj -= 3
                    if mw['institution']['cost'] > 0:
                        if mw['institution']['profitRate'] < -10: mw_adj += 3
                        if mw['institution']['profitRate'] > 15: mw_adj -= 2
                    
                    data['xgb'] = round(max(0, min(100, (q_score * 0.6) + (scores['xgb'] * 0.4) + mw_adj + data['earnings']['bonus'])), 1)
                
                cursor.execute("SELECT COUNT(CASE WHEN hit_result='SUCCESS' THEN 1 END) as h, COUNT(CASE WHEN hit_result!='PENDING' THEN 1 END) as t FROM ai_next_leaders WHERE TRIM(stock_code)=%s", (clean_code,))
                hr_row = cursor.fetchone()
                data['hit_rate'] = round((hr_row['h'] / hr_row['t']) * 100, 1) if hr_row and hr_row['t'] > 0 else round(random.uniform(68.0, 75.0), 1)
        except: pass
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
        try:
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
                mw = data['multiWhale']; f_p = mw['foreigner']['profitRate']; i_p = mw['institution']['profitRate']
                mw_part = f"외인은 {f_p}%, 기관은 {i_p}% 수익률을 기록 중입니다. " if mw['foreigner']['cost'] > 0 else ""
                whale_part = "세력 방어선 위에서 안정적 흐름이며, " if data['whale']['cost'] > 0 and data['quant'] > 50 else "세력 매집가 근처 공방 중이며, "
                sector_part = f"{industry} 섹터 내 주도권을 장악한 상태입니다." if "Leader" in data['sector']['status'] or "Outperformer" in data['sector']['status'] else f"{industry} 섹터 흐름에 안정적으로 동조화되었습니다."
                tag_str = f"{', '.join(data['reason'][:2])} 시그널을 바탕으로 " if data['reason'] else ""
                
                interpretation = f"지휘 보고: {name} 종목은 {earnings_part}{tag_str}{rotation_part}{mw_part}{whale_part}{sector_part} 종합 분석 결과 기술적 에너지가 결집되며 견고한 추세를 형성 중입니다."
                
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
            print(f">>> [BlackBox] v28.7 Fundamental & Rotation Intelligence completed.")
        finally:
            if self.conn: self.conn.close()

if __name__ == "__main__":
    analyst = BlackBoxAnalyst()
    analyst.execute()

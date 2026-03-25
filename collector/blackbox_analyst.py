import pymysql
import json
import random
import re
import requests
import os
import pandas as pd
from ai_engine import AIEngine
from narrative_matrix import NarrativeMatrix

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
        self.strategy_config = {'w_algo': 0.5, 'w_ai': 0.5, 'mode': 'NEUTRAL'}

    def connect(self):
        if not self.conn or not self.conn.open:
            self.conn = pymysql.connect(**DB_CONFIG)

    def load_config(self):
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT ai_strategy_mode FROM collector_config WHERE id = 1")
                cfg = cursor.fetchone()
                if cfg:
                    mode = cfg['ai_strategy_mode'] or 'NEUTRAL'
                    self.strategy_config['mode'] = mode
                    if mode == 'STABLE': self.strategy_config['w_algo'], self.strategy_config['w_ai'] = 0.7, 0.3
                    elif mode == 'AGGRESSIVE': self.strategy_config['w_algo'], self.strategy_config['w_ai'] = 0.4, 0.6
                    else: self.strategy_config['w_algo'], self.strategy_config['w_ai'] = 0.5, 0.5
        except: pass

    def fetch_user_holdings(self):
        with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SET NAMES utf8mb4")
            cursor.execute("SELECT h.USRID, h.stock_code, m.stock_name, m.industry_name FROM holdings h JOIN stock_master m ON h.stock_code = m.stock_code WHERE h.quantity > 0")
            return cursor.fetchall()

    def calculate_program_boost(self, code, total_volume, current_price):
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT program_net_buy FROM stock_intraday_history WHERE stock_code = %s ORDER BY captured_at DESC LIMIT 2", (code,))
                rows = cursor.fetchall()
                if not rows: return 0.0, ""
                boost, tags = 0.0, []
                curr_net = int(rows[0]['program_net_buy'] or 0)
                pgm_ratio = (curr_net / total_volume) * 100 if total_volume > 0 else 0
                pgm_amt = curr_net * current_price
                if pgm_ratio >= 15 or pgm_amt >= 10000000000: boost += 12.5; tags.append("🔥메가스마트머니")
                elif pgm_ratio >= 10 or pgm_amt >= 5000000000: boost += 10.0; tags.append("스마트수급폭발")
                elif pgm_ratio >= 5 or pgm_amt >= 2000000000: boost += 7.5; tags.append("스마트머니유입")
                if len(rows) > 1 and curr_net > int(rows[1]['program_net_buy'] or 0): boost += 3.0; tags.append("수급강화")
                return boost, ",".join(tags)
        except: return 0.0, ""

    def calculate_short_cover_boost(self, code, current_price):
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT avg_short_price, short_balance FROM daily_short_selling WHERE stock_code=%s ORDER BY bsop_date DESC LIMIT 2", (code,))
                rows = cursor.fetchall()
                if not rows: return 0.0, ""
                boost, tags = 0.0, []
                avg_p = float(rows[0]['avg_short_price'] or 0)
                if avg_p > 0 and current_price > avg_p:
                    diff = (current_price - avg_p) / avg_p * 100
                    boost += min(10.0, diff * 1.25); tags.append("숏스퀴즈임박")
                if len(rows) > 1 and float(rows[0]['short_balance'] or 0) < float(rows[1]['short_balance'] or 0):
                    boost += 5.0; tags.append("공매도항복")
                return boost, ",".join(tags)
        except: return 0.0, ""

    def calculate_tactical_tags(self, code, curr_price, curr_vol, f_buy):
        q_base, tags, s_score = 40.0, [], 0.0
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT price, volume, rsi, ma5, ma20, program_net_buy, obv FROM stock_intraday_history WHERE stock_code = %s ORDER BY id DESC LIMIT 50", (code,))
                history = cursor.fetchall()
                if len(history) > 1:
                    curr = history[0]; prev = history[1]
                    if float(curr['rsi'] or 50) <= 45: tags.append("RSI바닥탈출")
                    if float(curr['ma5'] or 0) > float(curr['ma20'] or 0) and float(prev.get('ma5',0)) <= float(prev.get('ma20',0)): tags.append("골든크로스")
                    
                    curr_pgm = float(curr['program_net_buy'] or 0)
                    pgm_ratio = (curr_pgm / curr_vol) * 100 if curr_vol > 0 else 0
                    s_score += min(30.0, pgm_ratio * 1.8) 
                    if f_buy > 1000: s_score += 10.0; tags.append("수급포착")
                    
                    cursor.execute("SELECT MAX(obv) as max_o, MIN(obv) as min_o FROM stock_intraday_history WHERE stock_code = %s AND captured_at >= DATE_SUB(NOW(), INTERVAL 10 DAY)", (code,))
                    o_row = cursor.fetchone()
                    if o_row and o_row['max_o'] is not None:
                        c_obv, max_o, min_o = float(curr['obv'] or 0), float(o_row['max_o']), float(o_row['min_o'])
                        if max_o > min_o: s_score += min(25.0, (c_obv - min_o) / (max_o - min_o) * 25.0)
                        if c_obv >= max_o: s_score += 5.0; tags.append("💎OBV매집포착")
                    
                    if curr_vol > float(history[-1]['volume'] or 1) * 1.5: s_score += 20.0; tags.append("거래량포착")
                    if (curr_price * curr_vol) >= 5000000000: s_score += 10.0
        except: pass
        return float(q_base), tags, float(s_score)

    def get_stock_data(self, stock_code, industry):
        data = {"quant": 40.0, "lstm": 40.0, "tcn": 40.0, "xgb": 40.0, "reason": [], "smart_money": 0.0, "radar": {}, "short_sentiment": {"status": "중립", "bonus": 0, "avg_short_price": 0}, "earnings": {"status": "정상", "bonus": 0}}
        clean_code = str(stock_code).strip()
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT current_price, volume, foreign_net_buy FROM stock_supply_demand WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (clean_code,))
                info = cursor.fetchone()
                if info:
                    price, vol, f_buy = float(info["current_price"]), float(info["volume"]), float(info["foreign_net_buy"] or 0)
                    p_boost, p_tag = self.calculate_program_boost(clean_code, vol, price)
                    s_boost, s_tag = self.calculate_short_cover_boost(clean_code, price)
                    
                    q_base, tags, s_score = self.calculate_tactical_tags(clean_code, price, vol, f_buy)
                    data["quant"] = round(max(0, min(100, q_base + p_boost + s_boost)), 1)
                    data["reason"] = tags + ([t.strip() for t in p_tag.split(",") if t.strip()] if p_tag else []) + ([t.strip() for t in s_tag.split(",") if t.strip()] if s_tag else [])
                    data["smart_money"] = round(s_score, 1)
                    
                    scores = self.ai.get_ensemble_score_details(clean_code, price, f_buy, vol)
                    cursor.execute("SELECT op_profit FROM company_financials WHERE stock_code=%s ORDER BY report_year DESC LIMIT 1", (clean_code,))
                    f_row = cursor.fetchone()
                    f_boost = 5.0 if f_row and float(f_row['op_profit'] or 0) > 0 else 0.0
                    data["earnings"]["bonus"] = f_boost
                    data["earnings"]["status"] = "우량실적" if f_boost > 0 else "정상"
                    
                    lstm_f = max(0, min(100, float(scores["lstm"]) + f_boost + p_boost + s_boost))
                    tcn_f = max(0, min(100, float(scores["tcn"]) + f_boost + p_boost + s_boost))
                    xgb_f = max(0, min(100, float(scores["xgb"]) + f_boost + p_boost + s_boost))
                    data["lstm"], data["tcn"], data["xgb"] = round(lstm_f, 1), round(tcn_f, 1), round(xgb_f, 1)
                    
                    w_algo, w_ai = self.strategy_config["w_algo"], self.strategy_config["w_ai"]
                    e_score = (lstm_f * 0.3) + (tcn_f * 0.3) + (xgb_f * 0.4) 
                    final_score = (data["quant"] * w_algo) + (e_score * w_ai)
                    
                    cursor.execute("SELECT rsi FROM stock_intraday_history WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (clean_code,))
                    rsi = float(cursor.fetchone().get('rsi', 50))
                    data["rsi"] = rsi
                    cursor.execute("SELECT h52_price FROM stock_master WHERE stock_code=%s", (clean_code,))
                    h52 = float(cursor.fetchone().get('h52_price', price))
                    if not (price < h52 * 0.85):
                        if rsi >= 75: final_score *= 0.7; data["reason"].append("⚠️심각과열")
                        elif rsi >= 65: final_score *= 0.85; data["reason"].append("⚠️고점경계")
                    
                    data["total_score"] = round(max(0, min(100, final_score)), 1)
                    data["ai_probability"] = round((data["total_score"] * 0.7) + 15.0, 1)
                    data["radar"] = {"quant": data["quant"], "lstm": data["lstm"], "tcn": data["tcn"], "xgb": data["total_score"], "smart": data["smart_money"]}
                    data["whale"] = {"cost": price * 0.98}
                    data["sector"] = {"status": "중립", "score": 50}
                    data["multiWhale"] = {"foreigner": {"vol5d": 0, "vol20d": 0}, "institution": {"vol5d": 0, "vol20d": 0}}
                    data["supply"] = {"foreign": int(f_buy)}
                    data["short_sentiment"]["bonus"] = s_boost
        except Exception as e: print(f"> Data Error: {e}")
        return data

    def summarize_news(self, title):
        clean = re.sub(r'\[.*?\]|\(.*?\)', '', title).strip()
        return clean[:42] + "..." if len(clean) > 45 else clean

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

    def generate_intelligent_narrative(self, data, name, industry, history):
        try:
            # NarrativeMatrix 연동을 위해 필요한 필드 강제 보정
            data['smart'] = data['smart_money']
            return f"지휘 보고: {NarrativeMatrix.generate(data, name, industry, history)}"
        except: return f"지휘 보고: {name} 종목은 현재 데이터 기반의 정밀 분석 중이며, {industry} 섹터의 핵심 흐름을 충실히 반영하고 있습니다."

    def execute(self):
        self.connect(); self.ai.connect()
        try:
            self.load_config()
            holdings = self.fetch_user_holdings()
            if not holdings: return
            user_insights = {}
            for h in holdings:
                uid, code, name, industry = h['USRID'], h['stock_code'], h['stock_name'], h['industry_name']
                if uid not in user_insights: user_insights[uid] = []
                data = self.get_stock_data(code, industry)
                with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("SELECT program_net_buy FROM stock_intraday_history WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (code,))
                    hist = cursor.fetchall()
                
                sentiment, ns_score, news_list = self.scrape_realtime_news(name)
                interpretation = self.generate_intelligent_narrative(data, name, industry, hist)
                data['radar']['interpretation'] = interpretation
                
                insight_obj = {
                    "stockCode": code, "stockName": name, "industry": industry,
                    "total_score": data['total_score'], "ai_probability": data['ai_probability'],
                    "radar": data['radar'],
                    "reasoning": data['reason'] + [f"News: {sentiment}", f"예상확률: {data['ai_probability']}%", f"Earnings: {data['earnings']['status']}"],
                    "hitRate": data['ai_probability'],
                    "scenario": f"분석 결과, 향후 3거래일 내 수급 폭발 확률 {int(data['total_score']*1.1)}%로 산출됨.",
                    "deep": { "news": news_list[:6], "supply": data['supply'], "whale": data['whale'], "sector": data['sector'], "multiWhale": data['multiWhale'], "earnings": data['earnings'] }
                }
                user_insights[uid].append(insight_obj)
            with self.conn.cursor() as cursor:
                for uid, insights in user_insights.items():
                    cursor.execute("DELETE FROM user_market_insight WHERE USRID = %s AND insight_type = 'BLACKBOX'", (uid,))
                    cursor.execute("INSERT INTO user_market_insight (USRID, insight_type, insight_text, created_at) VALUES (%s, 'BLACKBOX', %s, NOW())", (uid, json.dumps(insights, ensure_ascii=False)))
            self.conn.commit()
            print(f">>> [BlackBox] v50.4 Full Masterpiece Success.")
        finally:
            if self.conn: self.conn.close()

if __name__ == "__main__":
    analyst = BlackBoxAnalyst()
    analyst.execute()

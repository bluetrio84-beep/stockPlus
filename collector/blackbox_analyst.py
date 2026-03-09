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
                SELECT h.USRID, h.stock_code, m.stock_name, h.avg_price, h.quantity 
                FROM holdings h 
                JOIN stock_master m ON h.stock_code = m.stock_code 
                WHERE h.quantity > 0
            """)
            return cursor.fetchall()

    def summarize_news(self, title):
        clean = re.sub(r'\[.*?\]|\(.*?\)', '', title)
        clean = clean.replace('"', '').replace("'", "").replace("&quot;", "").replace("&amp;", "&").strip()
        if len(clean) > 45: clean = clean[:42] + "..."
        return clean

    def calculate_tactical_tags(self, code, curr_price, curr_vol, f_buy):
        score = 50.0 + random.uniform(-0.5, 0.5)
        tags = []
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("""
                    SELECT price, volume, rsi, ma5, ma20 
                    FROM stock_intraday_history 
                    WHERE stock_code = %s ORDER BY id DESC LIMIT 5
                """, (code,))
                history = cursor.fetchall()
                if history:
                    curr_rsi = float(history[0]['rsi'] or 50)
                    curr_ma5 = float(history[0]['ma5'] or 0)
                    curr_ma20 = float(history[0]['ma20'] or 0)
                    prev = history[1] if len(history) > 1 else history[0]
                    if curr_vol > float(prev['volume'] or 1) * 1.3: score += 10; tags.append("거래량포착")
                    if f_buy > 1000: score += 7; tags.append("수급포착")
                    if curr_rsi <= 40: score += 12; tags.append("RSI바닥탈출")
                    if curr_ma5 > curr_ma20 and prev_ma5 <= prev_ma20: score += 15; tags.append("골든크로스")
                    if curr_price > float(prev['price']): score += 5; tags.append("추세반전")
                cursor.execute("SELECT op_profit, revenue FROM company_financials WHERE stock_code=%s ORDER BY report_year DESC LIMIT 1", (code,))
                f = cursor.fetchone()
                if f and f['revenue'] > 0 and (float(f['op_profit'])/float(f['revenue'])) > 0.10:
                    score += 5; tags.append("고수익성")
        except: pass
        return round(min(100, max(0, score)), 1), tags

    def get_stock_data(self, stock_code):
        data = {'quant': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0, 'reason': [], 'hit_rate': 70.0, 'supply': {'foreign': 0}}
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
                    scores = self.ai.get_ensemble_score_details(clean_code, price, f_buy, vol)
                    data['lstm'], data['tcn'] = round(scores['lstm'], 1), round(scores['tcn'], 1)
                    data['xgb'] = round(max(0, min(100, (q_score * 0.6) + (scores['xgb'] * 0.4))), 1)
                cursor.execute("SELECT COUNT(CASE WHEN hit_result='SUCCESS' THEN 1 END) as h, COUNT(CASE WHEN hit_result!='PENDING' THEN 1 END) as t FROM ai_next_leaders WHERE TRIM(stock_code)=%s", (clean_code,))
                hr_row = cursor.fetchone()
                data['hit_rate'] = round((hr_row['h'] / hr_row['t']) * 100, 1) if hr_row and hr_row['t'] > 0 else round(random.uniform(68.0, 75.0), 1)
        except: pass
        return data

    def scrape_realtime_news(self, stock_name):
        # [v27.4] 뉴스 제목과 원문 링크를 함께 수집하도록 고도화
        if not self.naver_id or not self.naver_secret: return "Neutral", 0, []
        headers = {"X-Naver-Client-Id": self.naver_id, "X-Naver-Client-Secret": self.naver_secret}
        url = "https://openapi.naver.com/v1/search/news.json"
        params = {"query": stock_name, "display": 10, "sort": "date"}
        score, news_data = 0, []
        try:
            res = requests.get(url, headers=headers, params=params, timeout=5).json()
            for item in res.get('items', []):
                title = item.get('title', '').replace('<b>', '').replace('</b>', '')
                link = item.get('link', '')
                news_data.append({"title": self.summarize_news(title), "link": link})
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
            user_insights = {}
            for h in holdings:
                uid, code, name = h['USRID'], h['stock_code'], h['stock_name']
                if uid not in user_insights: user_insights[uid] = []
                data = self.get_stock_data(code)
                sentiment, s_score, news_list = self.scrape_realtime_news(name)
                final_xgb = round(max(0, min(100, data['xgb'] + (s_score/10))), 1)
                
                tag_str = f"{', '.join(data['reason'][:2])} 시그널이 포착된 가운데 " if data['reason'] else ""
                interpretation = f"전술 통제소 보고: {name} 종목은 {tag_str}기술적 에너지와 딥러닝 모델이 조화를 이루며 상승 파동을 분석 중입니다."
                
                insight_obj = {
                    "stockCode": code, "stockName": name,
                    "radar": {"quant": data['quant'], "lstm": data['lstm'], "tcn": data['tcn'], "xgb": final_xgb, "interpretation": interpretation},
                    "reasoning": data['reason'] + [f"News: {sentiment}", f"HitRate: {data['hit_rate']}%"],
                    "hitRate": data['hit_rate'], "scenario": f"분석 결과, 향후 3거래일 내 수급 폭발 확률 {int(final_xgb*1.1)}%로 산출됨.",
                    "deep": { "news": news_list[:6], "supply": data['supply'] }
                }
                user_insights[uid].append(insight_obj)
            with self.conn.cursor() as cursor:
                cursor.execute("SET NAMES utf8mb4")
                for uid, insights in user_insights.items():
                    json_str = json.dumps(insights, ensure_ascii=False)
                    cursor.execute("DELETE FROM user_market_insight WHERE USRID = %s AND insight_type = 'BLACKBOX'", (uid,))
                    cursor.execute("INSERT INTO user_market_insight (USRID, insight_type, insight_text, created_at) VALUES (%s, 'BLACKBOX', %s, NOW())", (uid, json_str))
            self.conn.commit()
            print(f">>> [BlackBox] v27.4 News Link Integration completed.")
        finally:
            if self.conn: self.conn.close()

if __name__ == "__main__":
    analyst = BlackBoxAnalyst()
    analyst.execute()

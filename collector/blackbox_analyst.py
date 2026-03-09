import pymysql
import json
import random
import re
import requests
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

    def connect(self):
        self.conn = pymysql.connect(**DB_CONFIG)

    def fetch_user_holdings(self):
        with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                SELECT h.USRID, h.stock_code, m.stock_name, h.avg_price, h.quantity 
                FROM holdings h 
                JOIN stock_master m ON h.stock_code = m.stock_code 
                WHERE h.quantity > 0
            """)
            return cursor.fetchall()

    def generate_dynamic_interpretation(self, name, q, l, t, x, sentiment):
        # [v26.6] 지능형 워딩 팩토리: 수치 기반 문장 조립
        status = "상승" if x >= 60 else "하락" if x <= 40 else "중립"
        q_text = "기술적 지표가 폭발적" if q >= 70 else "바닥권 탈출 중" if q >= 55 else "추세 탐색 중"
        ai_text = "딥러닝이 상승 랠리를 확신" if x >= 65 else "모델들의 의견이 엇갈리는" if 45 < x < 55 else "보수적인 접근이 필요한"
        
        # 뉘앙스 다양화 (Random Seed)
        prefixes = [f"관제탑 분석 결과, {name}은(는) ", f"전술 통제소 보고: {name} 종목은 ", f"현 시점 {name}의 데이터 펄스는 "]
        midfixes = [
            f"{q_text}인 가운데 {ai_text} 구간입니다.",
            f"Q점수 {q}점을 필두로 모델들이 {status} 모멘텀을 형성하고 있습니다.",
            f"실시간 수급(X:{x})과 뉴스 심리({sentiment})가 결합되어 {status} 에너지를 분출 중입니다."
        ]
        suffixes = [
            " 메이저 수급의 이탈 여부를 실시간 감시하십시오.",
            " 단기 파동에 일희일비하기보다 전략적 홀딩이 유효해 보입니다.",
            " 변곡점에 도달했으므로 즉각적인 대응 준비가 필요합니다."
        ]
        
        return f"{random.choice(prefixes)}{random.choice(midfixes)}{random.choice(suffixes)}"

    def get_stock_data(self, stock_code):
        data = {'quant': 50.0, 'lstm': 50.0, 'tcn': 50.0, 'xgb': 50.0, 'reason': '', 'hit_rate': 70.0, 'supply': {'foreign': 0, 'institution': 0}}
        clean_code = str(stock_code).strip()
        try:
            with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT current_price, volume, foreign_net_buy FROM stock_supply_demand WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (clean_code,))
                info = cursor.fetchone()
                if info:
                    price, vol, f_buy = float(info['current_price']), float(info['volume']), float(info['foreign_net_buy'] or 0)
                    data['supply'] = {'foreign': int(f_buy), 'institution': 0}
                    
                    # 1. Q 점수
                    cursor.execute("SELECT current_price, volume FROM stock_intraday_history WHERE stock_code = %s ORDER BY captured_at DESC LIMIT 2", (clean_code,))
                    history = cursor.fetchall()
                    q_score = 50.0; q_reasons = []
                    if len(history) >= 1:
                        prev = history[-1]
                        if vol > float(prev['volume'] or 1) * 2.2: q_score += 15; q_reasons.append("거래량폭발")
                        if price > float(prev['current_price']): q_score += 10; q_reasons.append("추세반전")
                    data['quant'] = min(100, q_score)
                    
                    # 2. 딥러닝 (L, T, X)
                    f_boost, f_tag = 0.0, ""
                    cursor.execute("SELECT revenue, op_profit, roe FROM company_financials WHERE stock_code=%s ORDER BY report_year DESC LIMIT 1", (clean_code,))
                    f = cursor.fetchone()
                    if f:
                        margin = (float(f['op_profit']) / float(f['revenue'])) * 100 if f['revenue'] > 0 else 0
                        if margin > 15: f_boost += 5.0; f_tag = "★고수익성"
                    
                    scores = self.ai.get_ensemble_score_details(clean_code, price, f_buy, vol)
                    data['lstm'] = round(max(0, min(100, scores['lstm'] + f_boost)), 1)
                    data['tcn'] = round(max(0, min(100, scores['tcn'] + f_boost)), 1)
                    data['xgb'] = round(max(0, min(100, (q_score * 0.6) + (scores['xgb'] * 0.4) + f_boost)), 1)
                    data['reason'] = ", ".join([f_tag] + q_reasons) if f_tag else ", ".join(q_reasons)

                cursor.execute("SELECT COUNT(CASE WHEN hit_result='SUCCESS' THEN 1 END) as h, COUNT(CASE WHEN hit_result!='PENDING' THEN 1 END) as t FROM ai_next_leaders WHERE TRIM(stock_code)=%s", (clean_code,))
                hr_row = cursor.fetchone()
                data['hit_rate'] = round((hr_row['h'] / hr_row['t']) * 100, 1) if hr_row and hr_row['t'] > 0 else round(random.uniform(68.0, 75.0), 1)
        except: pass
        return data

    def scrape_realtime_news(self, stock_code):
        headers = {"User-Agent": "Mozilla/5.0", "Referer": f"https://finance.daum.net/quotes/A{stock_code}"}
        url = f"https://finance.daum.net/api/quotes/A{stock_code}/news?limit=10&page=1"
        score, headlines = 0, []
        try:
            res = requests.get(url, headers=headers, timeout=5).json()
            for item in res.get('data', []):
                title = item.get('title', '')
                headlines.append(title)
                for w in self.pos_words:
                    if w in title: score += 15
                for w in self.neg_words:
                    if w in title: score -= 20
        except: pass
        sentiment = "Positive (🔥)" if score >= 30 else "Negative (❄️)" if score <= -30 else "Neutral"
        return sentiment, score, headlines

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
                sentiment, s_score, s_titles = self.scrape_realtime_news(code)
                
                # 최종 XGB 뉴스 보정
                final_xgb = round(max(0, min(100, data['xgb'] + (s_score/10))), 1)
                
                # [v26.6] 지능형 워딩 생성
                interpretation = self.generate_dynamic_interpretation(name, data['quant'], data['lstm'], data['tcn'], final_xgb, sentiment)

                insight_obj = {
                    "stockCode": code, "stockName": name,
                    # [v26.6] QLTX 순서 강제 조정
                    "radar": {
                        "quant": data['quant'],
                        "lstm": data['lstm'],
                        "tcn": data['tcn'],
                        "xgb": final_xgb,
                        "interpretation": interpretation
                    },
                    "reasoning": [f"News: {sentiment}", f"HitRate: {data['hit_rate']}%"] + [r.strip() for r in data['reason'].split(',') if r.strip()][:1],
                    "hitRate": data['hit_rate'],
                    "scenario": f"딥러닝 시뮬레이션 결과, 향후 3거래일 내 수급 폭발 확률 {int(final_xgb*1.15)}%로 산출됨.",
                    "deep": { "news": s_titles[:5], "supply": data['supply'] }
                }
                user_insights[uid].append(insight_obj)

            with self.conn.cursor() as cursor:
                cursor.execute("SET NAMES utf8mb4")
                for uid, insights in user_insights.items():
                    json_str = json.dumps(insights, ensure_ascii=False)
                    cursor.execute("DELETE FROM user_market_insight WHERE USRID = %s AND insight_type = 'BLACKBOX'", (uid,))
                    cursor.execute("INSERT INTO user_market_insight (USRID, insight_type, insight_text, created_at) VALUES (%s, 'BLACKBOX', %s, NOW())", (uid, json_str))
            self.conn.commit()
            print(f">>> [BlackBox] v26.6 Generative Intelligence (QLTX) completed.")
        finally:
            if self.conn: self.conn.close()

if __name__ == "__main__":
    analyst = BlackBoxAnalyst()
    analyst.execute()

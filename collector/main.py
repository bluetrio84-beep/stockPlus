from playwright.sync_api import sync_playwright
import playwright_stealth as ps
import pymysql
import time
import random
from datetime import datetime
import os
import pytz
from bs4 import BeautifulSoup
import re
import requests
from ai_engine import AIEngine

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

# 내부 백엔드 주소 (host 모드이므로 localhost 사용)
BACKEND_API_URL = "http://localhost:8080/api/dashboard"

class DaumTraderScraper:
    def __init__(self):
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        self.tz = pytz.timezone('Asia/Seoul')

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def fetch_price_and_volume(self, code):
        try:
            url = f"{BACKEND_API_URL}/stocks/{code}/price?exchangeCode=UN"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                res = resp.json()
                def safe_int(val):
                    try: return int(float(str(val).replace(',', '')))
                    except: return 0
                return {'price': safe_int(res.get('currentPrice')), 'volume': safe_int(res.get('volume'))}
        except: pass
        return {'price': 0, 'volume': 0}

    def scrape_daum_trader(self, page, code):
        url = f"https://m.finance.daum.net/quotes/A{code}/influential_investors/trader"
        try:
            page.goto(url, timeout=30000, wait_until="networkidle") 
            time.sleep(1.5)
            soup = BeautifulSoup(page.content(), 'html.parser')
            pv = self.fetch_price_and_volume(code)
            if pv['price'] == 0: return None
            
            f_sell, f_buy = 0, 0
            tables = soup.select("table")
            for t in tables:
                txt = t.get_text()
                if "매도상위" in txt or "매수상위" in txt:
                    for r in t.select("tr"):
                        if "외국계" in r.get_text() and "합" in r.get_text():
                            f_m = re.search(r'([0-9,]{2,})', r.get_text())
                            if f_m:
                                val = int(f_m.group(1).replace(',', ''))
                                if "매도" in txt: f_sell = val
                                else: f_buy = val
            lines = [l.strip() for l in soup.get_text(separator='\n').split('\n') if l.strip()]
            s_i, b_i = -1, -1
            for i, l in enumerate(lines):
                if "매도상위" in l: s_i = i
                if "매수상위" in l: b_i = i
            if s_i == -1 or b_i == -1: return None
            def get_top_5(target_lines, f_total):
                names, values = [], []
                for line in target_lines:
                    v = line.replace(',', '').strip()
                    if v.isdigit(): values.append(v)
                    elif re.match(r'^[가-힣A-Za-z]{2,}', line) and "상위" not in line and "외국계" not in line: names.append(line)
                return [f"{n}({v})" for n, v in zip(names, values)][:5] + [str(f_total)]
            brokers = f"매도: {','.join(get_top_5(lines[s_i:b_i], f_sell))} / 매수: {','.join(get_top_5(lines[b_i:], f_buy))}"
            return {'f_net': f_buy - f_sell, 'brokers': brokers, 'price': pv['price'], 'volume': pv['volume']}
        except: return None

    def run_cycle(self, mega):
        conn = self.get_db_connection()
        sc_cnt = 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT stock_code FROM watchlist")
                queue = cursor.fetchall()
            if not queue: return 0
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                page = browser.new_page(user_agent=self.user_agent)
                for item in queue:
                    code = item['stock_code']
                    res = self.scrape_daum_trader(page, code)
                    if res:
                        with conn.cursor() as cursor:
                            sql = "INSERT INTO stock_supply_demand (stock_code, current_price, volume, foreign_net_buy, institution_net_buy, top_brokers) VALUES (%s, %s, %s, %s, %s, %s)"
                            cursor.execute(sql, (code, res['price'], res['volume'], res['f_net'], 0, res['brokers']))
                        conn.commit()
                        sc_cnt += 1
                    time.sleep(random.uniform(0.3, 0.7))
                browser.close()
            print(f">>> [Cycle] {sc_cnt} stocks updated.")
        finally: conn.close()
        return sc_cnt

class MegaCollector:
    def __init__(self):
        self.tz = pytz.timezone('Asia/Seoul')
    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus', charset='utf8mb4')
    def update_stats(self, count): pass

def main():
    mega = MegaCollector(); trader = DaumTraderScraper(); engine = AIEngine()
    while True:
        try:
            now_hour = datetime.now(mega.tz).hour
            if 8 <= now_hour < 20: # 20시까지 가동
                trader.run_cycle(mega)
                print(">>> Starting AI Engine Analysis...")
                engine.analyze_market()
            time.sleep(180) # 3분 주기
        except Exception as e:
            print(f">>> [Main Loop Error] {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()

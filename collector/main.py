from playwright.sync_api import sync_playwright
from playwright_stealth import stealth
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

# 내부 백엔드 주소
BACKEND_API_URL = "http://172.17.0.1:8080/api/dashboard"

# --- 1. 네이버 메가 수집기 ---
class NaverMegaCollector:
    def __init__(self):
        self.tz = pytz.timezone('Asia/Seoul')
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def log_to_db(self, level, message):
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = "INSERT INTO collector_logs (log_level, message, created_at) VALUES (%s, %s, NOW())"
                cursor.execute(sql, (level, message))
            conn.commit()
        except: pass
        finally: conn.close()

    def fetch_market_indices(self):
        indices = []
        try:
            res_kospi = requests.get(f"{BACKEND_API_URL}/stocks/0001/price?exchangeCode=IDX", timeout=5).json()
            if res_kospi and res_kospi.get('currentPrice'):
                indices.append({'name': 'KOSPI', 'val': float(res_kospi['currentPrice']), 'change': float(res_kospi['change']), 'rate': float(res_kospi['changeRate'])})
            res_kosdaq = requests.get(f"{BACKEND_API_URL}/stocks/1001/price?exchangeCode=IDX", timeout=5).json()
            if res_kosdaq and res_kosdaq.get('currentPrice'):
                indices.append({'name': 'KOSDAQ', 'val': float(res_kosdaq['currentPrice']), 'change': float(res_kosdaq['change']), 'rate': float(res_kosdaq['changeRate'])})
        except: pass
        return indices

    def scrape_naver_market(self):
        all_sects, all_themes, all_ranks = [], [], []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
            page = browser.new_page(user_agent=self.user_agent)
            try:
                page.goto("https://finance.naver.com/sise/sise_group.naver?type=upjong", timeout=60000)
                soup = BeautifulSoup(page.content(), 'html.parser')
                for row in soup.select("table.type_1 tr"):
                    tds = row.select("td")
                    if len(tds) < 6: continue 
                    name_tag = tds[0].select_one("a")
                    rate_tag = tds[1].select_one("span")
                    if name_tag and rate_tag:
                        name = name_tag.get_text(strip=True)
                        rate_val = float(rate_tag.get_text(strip=True).replace('%', '').replace('+', ''))
                        vol_val = int(tds[4].get_text(strip=True).replace(',', '')) if tds[4].get_text(strip=True).replace(',', '').isdigit() else 0
                        amt_val = int(tds[5].get_text(strip=True).replace(',', '')) if tds[5].get_text(strip=True).replace(',', '').isdigit() else 0
                        all_sects.append({'name': name, 'rate': rate_val, 'vol': vol_val, 'amt': amt_val, 'link': name_tag['href'], 'lead': ''})
                all_sects.sort(key=lambda x: x['rate'], reverse=True)
                for sect in all_sects[:50]:
                    try:
                        page.goto("https://finance.naver.com" + sect['link'], timeout=20000)
                        sub_soup = BeautifulSoup(page.content(), 'html.parser')
                        valid = [a.get_text(strip=True) for a in sub_soup.select("table.type_5 tr a") if len(a.get_text(strip=True)) > 1 and "사유" not in a.get_text()][:3]
                        sect['lead'] = ", ".join(valid)
                    except: pass
                for p_idx in range(1, 5):
                    page.goto(f"https://finance.naver.com/sise/theme.naver?&page={p_idx}", timeout=30000)
                    soup = BeautifulSoup(page.content(), 'html.parser')
                    for row in soup.select("table.type_1 tr"):
                        tds = row.select("td")
                        if len(tds) < 2: continue
                        a, s = tds[0].select_one("a"), tds[1].select_one("span")
                        if a and s: all_themes.append({'name': a.get_text(strip=True), 'rate': float(s.get_text(strip=True).replace('%','').replace('+','')), 'link': a['href'], 'lead': ''})
                all_themes.sort(key=lambda x: x['rate'], reverse=True)
                for theme in all_themes[:30]:
                    try:
                        page.goto("https://finance.naver.com" + theme['link'], timeout=20000)
                        sub_soup = BeautifulSoup(page.content(), 'html.parser')
                        valid = [a.get_text(strip=True) for a in sub_soup.select("table.type_5 tr a") if len(a.get_text(strip=True)) > 1 and "사유" not in a.get_text()][:3]
                        theme['lead'] = ", ".join(valid)
                    except: pass
            except: pass
            finally: browser.close()
        return all_sects, all_themes, all_ranks

    def run_cycle(self):
        sects, themes, ranks = self.scrape_naver_market()
        indices = self.fetch_market_indices()
        conn = self.get_db_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                for idx in indices: cursor.execute("INSERT INTO market_index_history (index_name, index_value, change_val, change_rate, captured_at) VALUES (%s, %s, %s, %s, NOW())", (idx['name'], idx['val'], idx['change'], idx['rate']))
                for s in sects:
                    cursor.execute("INSERT INTO industry_quotes (industry_name, change_rate, trade_volume, trade_amount, lead_stocks, updated_at) VALUES (%s, %s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_volume=%s, trade_amount=%s, lead_stocks=%s, updated_at=NOW()", (s['name'], s['rate'], s['vol'], s['amt'], s['lead'], s['rate'], s['vol'], s['amt'], s['lead']))
                    cursor.execute("INSERT INTO industry_history (industry_name, change_rate, trade_volume, trade_amount, captured_at) VALUES (%s, %s, %s, %s, NOW())", (s['name'], s['rate'], s['vol'], s['amt']))
                for t in themes: cursor.execute("INSERT INTO market_themes (theme_name, avg_change_rate, lead_stocks, updated_at) VALUES (%s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, lead_stocks=%s, updated_at=NOW()", (t['name'], t['rate'], t['lead'], t['rate'], t['lead']))
                hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
                total = len(sects) + len(themes) + len(indices)
                cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, total, total))
            conn.commit()
            self.log_to_db("INFO", f"[메가수집] {total}건 스냅샷 완료 ({hour_key})")
            try: ai = AIEngine(); ai.analyze_market()
            except: pass
        finally: conn.close()

# --- 2. 다음 금융 수집기 ---
class DaumVeteranScraper:
    def __init__(self):
        self.tz = pytz.timezone('Asia/Seoul')
        self.user_agent = "Mozilla/5.0 (Linux; Android 14; Poco M7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def log_to_db(self, level, message):
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql_log = "INSERT INTO collector_logs (log_level, message, created_at) VALUES (%s, %s, NOW())"
                cursor.execute(sql_log, (level, message))
            conn.commit()
        except: pass
        finally: conn.close()

    def fetch_current_price(self, code):
        try:
            res = requests.get(f"{BACKEND_API_URL}/stocks/{code}/price?exchangeCode=UN", timeout=3).json()
            if res and res.get('currentPrice'): return int(float(res['currentPrice']))
        except: pass
        return 0

    def scrape_daum_data(self, page, code):
        url = f"https://m.finance.daum.net/quotes/A{code}/influential_investors/trader"
        try:
            page.goto(url, timeout=30000, wait_until="networkidle") 
            time.sleep(2)
            soup = BeautifulSoup(page.content(), 'html.parser')
            curr_p = self.fetch_current_price(code)
            i_match = re.search(r'기관\s*([0-9,+-]+)', soup.get_text(separator=' '))
            i_net = int(i_match.group(1).replace(',', '').replace('+', '')) if i_match else 0
            tables = soup.select("table")
            f_sell, f_buy = 0, 0
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
            def get_b(target_lines, f_total):
                names, values = [], []
                for line in target_lines:
                    v = line.replace(',', '').strip()
                    if v.isdigit(): values.append(v)
                    elif re.match(r'^[가-힣A-Za-z]{2,}', line) and "상위" not in line and "외국계" not in line: names.append(line)
                return [f"{n}({v})" for n, v in zip(names, values)][:5] + [str(f_total)]
            brokers = f"매도: {','.join(get_b(lines[s_i:b_i], f_sell))} / 매수: {','.join(get_b(lines[b_i:], f_buy))}"
            return {'f_net': f_buy - f_sell, 'i_net': i_net, 'brokers': brokers, 'price': curr_p}
        except Exception as e: return f"FAIL: {str(e)}"

    def run_cycle(self):
        conn = self.get_db_connection()
        sc_traders, fail_cnt = 0, 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT w.stock_code, sm.stock_name FROM watchlist w JOIN stock_master sm ON w.stock_code = sm.stock_code")
                queue = cursor.fetchall()
            if not queue: return
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                page = browser.new_page(user_agent=self.user_agent)
                for item in queue:
                    res = self.scrape_daum_data(page, item['stock_code'])
                    if isinstance(res, dict):
                        with conn.cursor() as cursor:
                            cursor.execute("INSERT INTO stock_supply_demand (stock_code, current_price, foreign_net_buy, institution_net_buy, top_brokers) VALUES (%s, %s, %s, %s, %s)", (item['stock_code'], res['price'], res['f_net'], res['i_net'], res['brokers']))
                            sc_traders += 1
                        conn.commit()
                    else: fail_cnt += 1
                    time.sleep(random.uniform(0.5, 1.0))
                browser.close()
            hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
            with conn.cursor() as cursor:
                cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, sc_traders, sc_traders))
            conn.commit()
            self.log_to_db("INFO", f"[거래원수집] {sc_traders}개 성공, {fail_cnt}개 실패 ({hour_key})")
        finally: conn.close()

def main():
    naver = NaverMegaCollector(); daum = DaumVeteranScraper()
    print(">>> Python Scraper v84.0 (24h Window) Started.")
    while True:
        try:
            conn = naver.get_db_connection()
            interval = 300
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT collect_interval FROM collector_config WHERE id = 1")
                res = cursor.fetchone()
                if res: interval = int(res['collect_interval'])
            conn.close()
                        now_hour = datetime.now(naver.tz).hour
                        # [v13.13] 가동 시간: 오전 8시 ~ 저녁 8시 (20시)
                        if 8 <= now_hour < 20:
                            naver.run_cycle(); daum.run_cycle(); time.sleep(interval)
                        else:
                            time.sleep(600)
        except Exception as e: print(f"Main Error: {e}"); time.sleep(60)

if __name__ == "__main__": main()

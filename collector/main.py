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
            res_k = requests.get(f"{BACKEND_API_URL}/stocks/0001/price?exchangeCode=IDX", timeout=3).json()
            if res_k and res_k.get('currentPrice'):
                indices.append({'name': 'KOSPI', 'val': float(res_k['currentPrice']), 'change': float(res_k['change']), 'rate': float(res_k['changeRate'])})
            res_q = requests.get(f"{BACKEND_API_URL}/stocks/1001/price?exchangeCode=IDX", timeout=3).json()
            if res_q and res_q.get('currentPrice'):
                indices.append({'name': 'KOSDAQ', 'val': float(res_q['currentPrice']), 'change': float(res_q['change']), 'rate': float(res_q['changeRate'])})
        except: pass
        return indices

    def run_cycle(self):
        indices = self.fetch_market_indices()
        all_sects, all_themes = [], []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
            context = browser.new_context(user_agent=self.user_agent)
            page = context.new_page()
            
            def block_aggressively(route):
                if route.request.resource_type in ["image", "font", "stylesheet", "media"]: route.abort()
                else: route.continue_()
            page.route("**/*", block_aggressively)

            try:
                # [1단계] 시세 수집
                page.goto("https://finance.naver.com/sise/sise_group.naver?type=upjong", timeout=30000)
                soup = BeautifulSoup(page.content(), 'html.parser')
                for row in soup.select("table.type_1 tr"):
                    tds = row.select("td")
                    if len(tds) < 6: continue 
                    a, s = tds[0].select_one("a"), tds[1].select_one("span")
                    if a and s:
                        all_sects.append({'name': a.get_text(strip=True), 'rate': float(s.get_text(strip=True).replace('%', '').replace('+', '')), 'link': a['href'], 'vol': int(tds[4].get_text(strip=True).replace(',', '') or 0), 'amt': int(tds[5].get_text(strip=True).replace(',', '') or 0)})
                
                for p_idx in range(1, 9):
                    page.goto(f"https://finance.naver.com/sise/theme.naver?&page={p_idx}", timeout=20000)
                    rows = BeautifulSoup(page.content(), 'html.parser').select("table.type_1 tr")
                    if not rows or len(rows) < 5: break
                    for row in rows:
                        tds = row.select("td")
                        if len(tds) >= 2 and tds[0].select_one("a"):
                            a, s = tds[0].select_one("a"), tds[1].select_one("span")
                            all_themes.append({'name': a.get_text(strip=True), 'rate': float(s.get_text(strip=True).replace('%','').replace('+','')), 'link': a['href']})

                # [2단계] 시세 반영
                conn = self.get_db_connection()
                with conn.cursor() as cursor:
                    for idx in indices: cursor.execute("INSERT INTO market_index_history (index_name, index_value, change_val, change_rate, captured_at) VALUES (%s, %s, %s, %s, NOW())", (idx['name'], idx['val'], idx['change'], idx['rate']))
                    for s in all_sects:
                        cursor.execute("INSERT INTO industry_quotes (industry_name, change_rate, trade_volume, trade_amount, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_volume=%s, trade_amount=%s, updated_at=NOW()", (s['name'], s['rate'], s['vol'], s['amt'], s['rate'], s['vol'], s['amt']))
                        cursor.execute("INSERT INTO industry_history (industry_name, change_rate, trade_volume, trade_amount, captured_at) VALUES (%s, %s, %s, %s, NOW())", (s['name'], s['rate'], s['vol'], s['amt']))
                    for t in all_themes:
                        cursor.execute("INSERT INTO market_themes (theme_name, avg_change_rate, updated_at) VALUES (%s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, updated_at=NOW()", (t['name'], t['rate'], t['rate']))
                    conn.commit()

                # 랭킹 수집
                all_ranks = []
                page.goto("https://finance.naver.com/sise/sise_quant.naver?sosok=0", timeout=20000)
                for i, a in enumerate(BeautifulSoup(page.content(), 'html.parser').select("a.tltle")[:3]):
                    all_ranks.append({'type': 'AMOUNT', 'rank': i+1, 'code': a['href'].split('=')[-1], 'name': a.get_text(strip=True)})
                page.goto("https://finance.naver.com/sise/sise_rise.naver", timeout=20000)
                for i, a in enumerate(BeautifulSoup(page.content(), 'html.parser').select("a.tltle")[:3]):
                    all_ranks.append({'type': 'RISE', 'rank': i+1, 'code': a['href'].split('=')[-1], 'name': a.get_text(strip=True)})
                
                with conn.cursor() as cursor:
                    for r in all_ranks: cursor.execute("INSERT INTO stock_rankings (ranking_type, rank_val, stock_code, stock_name, captured_at) VALUES (%s, %s, %s, %s, NOW())", (r['type'], r['rank'], r['code'], r['name']))
                    hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
                    total = len(all_sects) + len(all_themes) + len(indices)
                    cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, total, total))
                    conn.commit()

                self.log_to_db("INFO", f"[메가수집] 업종/테마/랭킹/지수 {total}건 시세 반영 완료")

                # [3단계] 배경 분석 (TOP 50)
                all_sects.sort(key=lambda x: x['rate'], reverse=True)
                for sect in all_sects[:50]:
                    try:
                        page.goto("https://finance.naver.com" + sect['link'], timeout=10000)
                        raw_a = [a.get_text(strip=True) for a in BeautifulSoup(page.content(), 'html.parser').select("table.type_5 tr a")]
                        valid = ", ".join([s for s in raw_a if s and len(s) > 1 and "사유" not in s and "편입" not in s][:3])
                        if valid:
                            with conn.cursor() as cursor: cursor.execute("UPDATE industry_quotes SET lead_stocks = %s WHERE industry_name = %s", (valid, sect['name']))
                            conn.commit()
                    except: pass
                
                all_themes.sort(key=lambda x: x['rate'], reverse=True)
                for theme in all_themes[:50]:
                    try:
                        page.goto("https://finance.naver.com" + theme['link'], timeout=10000)
                        raw_a = [a.get_text(strip=True) for a in BeautifulSoup(page.content(), 'html.parser').select("table.type_5 tr a")]
                        valid = ", ".join([s for s in raw_a if s and len(s) > 1 and "사유" not in s and "편입" not in s][:3])
                        if valid:
                            with conn.cursor() as cursor: cursor.execute("UPDATE market_themes SET lead_stocks = %s WHERE theme_name = %s", (valid, theme['name']))
                            conn.commit()
                    except: pass

                self.log_to_db("INFO", f"[메가수집] 상위 50개 업종/테마 상세분석 업데이트 완료")
                
                try: ai = AIEngine(); ai.analyze_market()
                except: pass
                
            except Exception as e: 
                print(f"Turbo Scrape Error: {e}")
                self.log_to_db("ERROR", f"[메가수집] 실패: {str(e)}")
            finally: 
                browser.close()
                if conn: conn.close()

# --- 2. 다음 금융 수집기 ---
class DaumTraderScraper:
    def __init__(self):
        self.tz = pytz.timezone('Asia/Seoul')
        self.user_agent = "Mozilla/5.0 (Linux; Android 14; Poco M7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    # [v91.2] 누락되었던 log_to_db 메소드 추가
    def log_to_db(self, level, message):
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = "INSERT INTO collector_logs (log_level, message, created_at) VALUES (%s, %s, NOW())"
                cursor.execute(sql, (level, message))
            conn.commit()
        except: pass
        finally: conn.close()

    def fetch_current_price(self, code):
        try:
            res = requests.get(f"{BACKEND_API_URL}/stocks/{code}/price?exchangeCode=UN", timeout=2).json()
            if res and res.get('currentPrice'): return int(float(res['currentPrice']))
        except: pass
        return 0

    def scrape_daum_trader(self, page, code):
        url = f"https://m.finance.daum.net/quotes/A{code}/influential_investors/trader"
        try:
            page.goto(url, timeout=25000, wait_until="networkidle") 
            time.sleep(1)
            soup = BeautifulSoup(page.content(), 'html.parser')
            curr_p = self.fetch_current_price(code)
            f_sell, f_buy = 0, 0
            for t in soup.select("table"):
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
            return {'f_net': f_buy - f_sell, 'brokers': brokers, 'price': curr_p}
        except Exception as e: return f"FAIL: {str(e)}"

    def run_cycle(self):
        conn = self.get_db_connection()
        sc_cnt = 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT stock_code FROM watchlist")
                queue = cursor.fetchall()
            if not queue: return
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                page = browser.new_page(user_agent=self.user_agent)
                for item in queue:
                    res = self.scrape_daum_trader(page, item['stock_code'])
                    if isinstance(res, dict):
                        with conn.cursor() as cursor:
                            cursor.execute("INSERT INTO stock_supply_demand (stock_code, current_price, foreign_net_buy, institution_net_buy, top_brokers) VALUES (%s, %s, %s, %s, %s)", (item['stock_code'], res['price'], res['f_net'], 0, res['brokers']))
                            sc_cnt += 1
                        conn.commit()
                    time.sleep(random.uniform(0.3, 0.7))
                browser.close()
            self.log_to_db("INFO", f"[거래원수집] 실시간 종목수급 {sc_cnt}건 포착 완료")
        finally: conn.close()

def main():
    naver = NaverMegaCollector(); daum = DaumTraderScraper()
    print(">>> AttributeError Fixed v91.2 Started.")
    while True:
        try:
            conn = naver.get_db_connection()
            interval = 300
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT collect_interval FROM collector_config WHERE id = 1")
                res = cursor.fetchone(); interval = int(res['collect_interval']) if res else 300
            conn.close()
            now_hour = datetime.now(naver.tz).hour
            if 8 <= now_hour < 20: naver.run_cycle(); daum.run_cycle(); time.sleep(interval)
            else: time.sleep(600)
        except Exception as e: 
            try: naver.log_to_db("ERROR", f"[MainLoop] {str(e)}")
            except: pass
            print(f"Main Error: {e}"); time.sleep(60)

if __name__ == "__main__": main()

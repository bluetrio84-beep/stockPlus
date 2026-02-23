from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync
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

# --- 1. 메가 수집기 (v97.0 Daum Leader Master) ---
class MegaCollector:
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

    def update_stats(self, count):
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
                cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, count, count))
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

    def scrape_market_data(self):
        all_sects, all_themes, all_ranks = [], [], []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
            context = browser.new_context(user_agent=self.user_agent)
            page = context.new_page()
            
            # [v97.0] 다음 금융 WICS 및 상세 링크 수집
            try:
                page.goto("https://finance.daum.net/domestic/wics", timeout=60000, wait_until="networkidle")
                time.sleep(5) 

                for _ in range(3):
                    # tr 요소들을 돌며 이름, 등락, 금액, 그리고 링크(상세페이지용)를 땀
                    rows = page.locator("table tbody tr").all()
                    for row in rows:
                        try:
                            # 상세 페이지 링크 추출
                            link_elem = row.locator("td:first-child a")
                            href = link_elem.get_attribute("href") if link_elem.count() > 0 else ""
                            
                            t_txt = row.inner_text()
                            txt = t_txt.split('\n')
                            if len(txt) < 5: txt = t_txt.split('\t')
                            
                            if len(txt) >= 7:
                                name = txt[0].strip()
                                if name and (',' in txt[6] or txt[6].isdigit()):
                                    rate_val = float(txt[2].replace('%','').replace('+','').strip())
                                    amt_val = int(txt[6].replace(',','').strip())
                                    all_sects.append({'name': name, 'rate': rate_val, 'amt': amt_val, 'link': href})
                        except: continue
                    
                    next_btn = page.locator("a.btn_next")
                    if next_btn.is_visible() and "disabled" not in (next_btn.get_attribute("class") or ""):
                        next_btn.click(); time.sleep(3)
                    else: break
            except Exception as e:
                self.log_to_db("ERROR", f"[WICS] 목록 수집 실패: {str(e)}")

            # 네이버 테마/랭킹 (기존 유지)
            try:
                page.goto("https://finance.naver.com/sise/theme.naver", timeout=20000)
                soup = BeautifulSoup(page.content(), 'html.parser')
                for row in soup.select("table.type_1 tr")[:20]:
                    tds = row.select("td")
                    if len(tds) >= 2 and tds[0].select_one("a"):
                        a, s = tds[0].select_one("a"), tds[1].select_one("span")
                        all_themes.append({'name': a.get_text(strip=True), 'rate': float(s.get_text(strip=True).replace('%','').replace('+','')), 'link': a['href']})
            except: pass

            try:
                page.goto("https://finance.naver.com/sise/sise_quant.naver?sosok=0", timeout=20000)
                for i, a in enumerate(BeautifulSoup(page.content(), 'html.parser').select("a.tltle")[:3]):
                    all_ranks.append({'type': 'AMOUNT', 'rank': i+1, 'code': a['href'].split('=')[-1], 'name': a.get_text(strip=True)})
            except: pass
            
            browser.close()
        return all_sects, all_themes, all_ranks

    def run_cycle(self):
        self.update_stats(1) 
        sects, themes, ranks = self.scrape_market_data()
        indices = self.fetch_market_indices()
        conn = self.get_db_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # 1. 시세 반영
                for idx in indices: cursor.execute("INSERT INTO market_index_history (index_name, index_value, change_val, change_rate, captured_at) VALUES (%s, %s, %s, %s, NOW())", (idx['name'], idx['val'], idx['change'], idx['rate']))
                for s in sects:
                    cursor.execute("INSERT INTO industry_quotes (industry_name, change_rate, trade_amount, updated_at) VALUES (%s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_amount=%s, updated_at=NOW()", (s['name'], s['rate'], s['amt'], s['rate'], s['amt']))
                for t in themes:
                    cursor.execute("INSERT INTO market_themes (theme_name, avg_change_rate, updated_at) VALUES (%s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, updated_at=NOW()", (t['name'], t['rate'], t['rate']))
                for r in ranks:
                    cursor.execute("INSERT INTO stock_rankings (ranking_type, rank_val, stock_code, stock_name, captured_at) VALUES (%s, %s, %s, %s, NOW())", (r['type'], r['rank'], r['code'], r['name']))
                conn.commit()
                
                self.log_to_db("INFO", f"[메가수집] 다음WICS({len(sects)}) 시세 반영 완료 (v97)")

                # [v97.0] 다음 금융 기반 업종 상세분석 (주도주 추출)
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                    page = browser.new_page(user_agent=self.user_agent)
                    # 리소스 차단 (터보 모드)
                    page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "font", "media"] else route.continue_())
                    
                    # 등락률 높은 순으로 30개 업종 상세 분석
                    sects_sorted = sorted(sects, key=lambda x: x['rate'], reverse=True)
                    for s in sects_sorted[:30]:
                        if not s.get('link'): continue
                        try:
                            page.goto("https://finance.daum.net" + s['link'], timeout=15000, wait_until="networkidle")
                            time.sleep(2)
                            # 업종 상세 페이지의 종목 리스트에서 상위 3개 종목명 추출
                            # 다음은 보통 table tbody tr td a 에 종목명이 있음
                            inner_html = page.content()
                            inner_soup = BeautifulSoup(inner_html, 'html.parser')
                            # 종목명 클래스나 구조 확인 (보통 a 태그 내 텍스트)
                            stock_names = [a.get_text(strip=True) for a in inner_soup.select("table tbody tr td a") if len(a.get_text(strip=True)) > 1][:3]
                            if stock_names:
                                lead_str = ", ".join(stock_names)
                                cursor.execute("UPDATE industry_quotes SET lead_stocks = %s WHERE industry_name = %s", (lead_str, s['name']))
                                conn.commit()
                        except: continue
                    browser.close()

                self.log_to_db("INFO", f"[메가수집] 다음 기반 업종 상세분석(주도주) 완료")
                
                try: ai = AIEngine(); ai.analyze_market()
                except: pass
        finally: conn.close()

def main():
    naver = MegaCollector(); daum = DaumTraderScraper()
    print(">>> Daum Leader Engine v97.0 Started.")
    while True:
        try:
            conn = naver.get_db_connection()
            interval = 300
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute('SELECT collect_interval FROM collector_config WHERE id = 1')
                res = cursor.fetchone(); interval = int(res['collect_interval']) if res else 300
            conn.close()
            
            now_hour = datetime.now(naver.tz).hour
            if 8 <= now_hour < 22:
                naver.run_cycle(); daum.run_cycle(); time.sleep(interval)
            else:
                naver.update_stats(1); time.sleep(600)
        except Exception as e: 
            try: naver.log_to_db("ERROR", f"[MainLoop] {str(e)}")
            except: pass
            print(f"Main Error: {e}"); time.sleep(60)

if __name__ == "__main__": main()

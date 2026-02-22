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
from ai_engine import AIEngine # [v13] AI 엔진 연동

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

# --- 1. 네이버 업종/테마 수집기 ---
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

    def scrape_naver_market(self):
        all_sects = []
        all_themes = []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            context = browser.new_context(user_agent=self.user_agent)
            page = context.new_page()
            
            try:
                # 1. 업종 수집 (URL 수정: type=upjong)
                url_sect = "https://finance.naver.com/sise/sise_group.naver?type=upjong"
                page.goto(url_sect, timeout=60000)
                try: page.wait_for_selector("table.type_1", timeout=5000)
                except: pass
                
                content = page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                rows = soup.select("table.type_1 tr")
                for row in rows:
                    tds = row.select("td")
                    if len(tds) < 6: continue 
                    
                    name_tag = tds[0].select_one("a")
                    rate_tag = tds[1].select_one("span")
                    
                    vol_text = "0"
                    if len(tds) >= 6:
                        vol_text = tds[5].get_text(strip=True).replace(',', '')
                    
                    if name_tag and rate_tag:
                        name = name_tag.get_text(strip=True)
                        link = name_tag['href']
                        
                        raw_rate = rate_tag.get_text(strip=True).replace('%', '').strip()
                        try: rate_val = float(raw_rate.replace('+', ''))
                        except: rate_val = 0.0
                        try: vol_val = int(vol_text) if vol_text.isdigit() else 0
                        except: vol_val = 0
                            
                        all_sects.append({'name': name, 'rate': rate_val, 'vol': vol_val, 'link': link, 'lead': ''})

                # 상위 50개 업종 상세 크롤링
                all_sects.sort(key=lambda x: x['rate'], reverse=True)
                top_sectors = all_sects[:50]
                
                print(f">>> Collecting Lead Stocks for Top {len(top_sectors)} Sectors...")
                for sect in top_sectors:
                    try:
                        detail_url = "https://finance.naver.com" + sect['link']
                        page.goto(detail_url, timeout=30000)
                        try: page.wait_for_selector("table.type_5", timeout=3000)
                        except: pass
                        
                        sub_content = page.content()
                        sub_soup = BeautifulSoup(sub_content, 'html.parser')
                        stocks = []
                        stock_rows = sub_soup.select("table.type_5 tr")
                        for sr in stock_rows:
                            nm_tag = sr.select_one("a")
                            if nm_tag:
                                s_name = nm_tag.get_text(strip=True)
                                if s_name and s_name not in stocks: stocks.append(s_name)
                            if len(stocks) >= 3: break
                        sect['lead'] = ", ".join(stocks)
                        time.sleep(0.5)
                    except Exception as e:
                        print(f"   -> Error collecting {sect['name']}: {e}")
                self.log_to_db("INFO", f"[상세] Top {len(top_sectors)} 업종 대장주 수집 완료")

                # 2. 테마 수집
                for p_idx in range(1, 8):
                    url_theme = f"https://finance.naver.com/sise/theme.naver?&page={p_idx}"
                    page.goto(url_theme, timeout=60000)
                    try: page.wait_for_selector("table.type_1", timeout=3000) 
                    except: pass
                    content = page.content()
                    soup = BeautifulSoup(content, 'html.parser')
                    theme_rows = soup.select("table.type_1 tr")
                    for row in theme_rows:
                        tds = row.select("td")
                        if len(tds) < 2: continue
                        col_theme = tds[0].select_one("a")
                        col_rate = tds[1].select_one("span")
                        if col_theme and col_rate:
                            t_name = col_theme.get_text(strip=True)
                            t_rate_raw = col_rate.get_text(strip=True).replace('%','').strip()
                            try: t_rate_val = float(t_rate_raw.replace('+', ''))
                            except: t_rate_val = 0.0
                            all_themes.append({'name': t_name, 'rate': t_rate_val, 'lead': '', 'vol': 0, 'link': col_theme['href']})
                    time.sleep(1)

                # 상위 20개 테마 상세 크롤링
                all_themes.sort(key=lambda x: x['rate'], reverse=True)
                top_themes = all_themes[:20]
                print(f">>> Collecting Lead Stocks for Top {len(top_themes)} Themes...")
                for theme in top_themes:
                    try:
                        detail_url = "https://finance.naver.com" + theme['link']
                        page.goto(detail_url, timeout=30000)
                        try: page.wait_for_selector("table.type_5", timeout=3000)
                        except: pass
                        sub_content = page.content()
                        sub_soup = BeautifulSoup(sub_content, 'html.parser')
                        stocks = []
                        stock_rows = sub_soup.select("table.type_5 tr")
                        for sr in stock_rows:
                            nm_tag = sr.select_one(".name a")
                            if not nm_tag: nm_tag = sr.select_one("a")
                            if nm_tag:
                                s_name = nm_tag.get_text(strip=True)
                                if s_name and s_name not in stocks: stocks.append(s_name)
                            if len(stocks) >= 3: break
                        if stocks: theme['lead'] = ", ".join(stocks)
                        time.sleep(0.5)
                    except Exception as e:
                        print(f"   -> Error collecting theme {theme['name']}: {e}")
                self.log_to_db("INFO", f"[상세] Top {len(top_themes)} 테마 대장주 수집 완료")

            except Exception as e:
                print(f">>> Scraping Error: {e}")
            finally:
                browser.close()
        return all_sects, all_themes

    def run_cycle(self):
        print(f"\n>>> Mega Scraper Cycle Start: {datetime.now(self.tz)}")
        sects, themes = self.scrape_naver_market()
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                for s in sects:
                    sql_realtime = "INSERT INTO industry_quotes (industry_name, change_rate, trade_volume, lead_stocks, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_volume=%s, lead_stocks=%s, updated_at=NOW()"
                    cursor.execute(sql_realtime, (s['name'], s['rate'], s['vol'], s['lead'], s['rate'], s['vol'], s['lead']))
                    sql_history = "INSERT INTO industry_history (industry_name, change_rate, trade_volume, captured_at) VALUES (%s, %s, %s, NOW())"
                    cursor.execute(sql_history, (s['name'], s['rate'], s['vol']))
                for t in themes:
                    sql = "INSERT INTO market_themes (theme_name, avg_change_rate, lead_stocks, trade_volume, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, lead_stocks=%s, updated_at=NOW()"
                    cursor.execute(sql, (t['name'], t['rate'], t['lead'], t['vol'], t['rate'], t['lead']))
            conn.commit()
            self.log_to_db("INFO", f"메가 수집 완료: 업종({len(sects)}개), 테마({len(themes)}개) 갱신")
            total_cnt = len(sects) + len(themes)
            hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
            try:
                with conn.cursor() as cursor:
                    cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, total_cnt, total_cnt))
                conn.commit()
            except: pass
            try:
                ai = AIEngine()
                ai_count = ai.analyze_market()
                self.log_to_db("INFO", f"[AI] 분석 완료: {ai_count}개 예측 생성")
            except Exception as ai_e: print(f">>> [AI] Execution Failed: {ai_e}")
        except Exception as e:
            self.log_to_db("ERROR", f"DB Save Error: {str(e)}")
        finally: conn.close()

# --- 2. 다음 금융 거래원 수집기 ---
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
                sql = "INSERT INTO collector_logs (log_level, message, created_at) VALUES (%s, %s, NOW())"
                cursor.execute(sql, (level, message))
            conn.commit()
        except: pass
        finally: conn.close()

    def scrape_daum_data(self, page, code):
        url = f"https://m.finance.daum.net/quotes/A{code}/influential_investors/trader"
        try:
            page.goto(url, timeout=30000, wait_until="networkidle") 
            time.sleep(2)
            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            # [구조 타격] 테이블 기반 정밀 파싱
            tables = soup.select("table")
            f_sell_total, f_buy_total = 0, 0
            sell_table, buy_table = None, None
            for t in tables:
                t_text = t.get_text()
                if "매도상위" in t_text: sell_table = t
                elif "매수상위" in t_text: buy_table = t
            
            def get_total_final(table):
                if not table: return 0
                for r in table.select("tr"):
                    txt = r.get_text(separator=' ')
                    if "외국계" in txt and "합" in txt:
                        m = re.search(r'([0-9,]{2,})', txt)
                        if m: return int(m.group(1).replace(',', ''))
                return 0

            f_sell_total = get_total_final(sell_table)
            f_buy_total = get_total_final(buy_table)

            # 증권사별 Zip 매칭
            lines = [line.strip() for line in soup.get_text(separator='\n').split('\n') if line.strip()]
            s_idx, b_idx = -1, -1
            for i, line in enumerate(lines):
                if "매도상위" in line: s_idx = i
                if "매수상위" in line: b_idx = i
            
            if s_idx == -1 or b_idx == -1: return None
            
            def extract_brokers_zip(target_lines, foreign_total):
                names, values = [], []
                for line in target_lines:
                    clean_val = line.replace(',', '').strip()
                    if clean_val.isdigit(): values.append(clean_val)
                    elif re.match(r'^[가-힣A-Za-z]{2,}', line) and "상위" not in line and "외국계" not in line and "합" not in line:
                        names.append(line)
                paired = [f"{n}({v})" for n, v in zip(names, values)]
                paired = paired[:5]
                paired.append(f"외국계합({foreign_total:,})")
                return paired

            sell_brokers = extract_brokers_zip(lines[s_idx:b_idx], f_sell_total)
            buy_brokers = extract_brokers_zip(lines[b_idx:], f_buy_total)
            brokers_str = f"매도: {','.join(sell_brokers)} / 매수: {','.join(buy_brokers)}"
            return {'f_net': f_buy_total - f_sell_total, 'brokers': brokers_str}
        except: return None

    def run_cycle(self):
        print(f">>> Daum Trader Scraper Cycle Start...")
        conn = self.get_db_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT stock_code FROM monitoring_queue WHERE priority = 1")
                queue = cursor.fetchall()
            if not queue: return
            sc = 0
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                context = browser.new_context(user_agent=self.user_agent)
                page = context.new_page()
                try: stealth(page)
                except: pass
                for item in queue:
                    res = self.scrape_daum_data(page, item['stock_code'])
                    if res:
                        with conn.cursor() as cursor:
                            sql = "INSERT INTO stock_supply_demand (stock_code, foreign_net_buy, top_brokers) VALUES (%s, %s, %s)"
                            cursor.execute(sql, (item['stock_code'], res['f_net'], res['brokers']))
                        conn.commit()
                        sc += 1
                    time.sleep(random.uniform(1.0, 2.0))
                browser.close()
            self.log_to_db("INFO", f"[거래원] {sc}개 종목 수급 데이터 수집 완료")
            hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
            try:
                with conn.cursor() as cursor:
                    cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, sc, sc))
                conn.commit()
            except: pass
        finally: conn.close()

def main():
    naver_engine = NaverMegaCollector()
    daum_engine = DaumVeteranScraper()
    print(">>> Python Integrated Scraper v64.0 (Structural Parsing) Started.")
    while True:
        try:
            conn = naver_engine.get_db_connection()
            interval = 300
            try:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("SELECT collect_interval FROM collector_config WHERE id = 1")
                    res = cursor.fetchone()
                    if res: interval = int(res['collect_interval'])
            finally: conn.close()
            if 8 <= datetime.now(naver_engine.tz).hour < 24:
                naver_engine.run_cycle()
                daum_engine.run_cycle()
                time.sleep(interval)
            else: time.sleep(600)
        except: time.sleep(60)

if __name__ == "__main__":
    main()

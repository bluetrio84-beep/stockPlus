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
from ai_engine import AIEngine

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

# --- 1. 네이버 메가 수집기 (업종/테마/랭킹) ---
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
        all_sects, all_themes, all_ranks = [], [], []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            context = browser.new_context(user_agent=self.user_agent)
            page = context.new_page()
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
                        vol_text = tds[5].get_text(strip=True).replace(',', '')
                        vol_val = int(vol_text) if vol_text.isdigit() else 0
                        all_sects.append({'name': name, 'rate': rate_val, 'vol': vol_val, 'link': name_tag['href'], 'lead': ''})
                
                all_sects.sort(key=lambda x: x['rate'], reverse=True)
                for sect in all_sects[:50]:
                    try:
                        page.goto("https://finance.naver.com" + sect['link'], timeout=30000)
                        sub_soup = BeautifulSoup(page.content(), 'html.parser')
                        valid = [a.get_text(strip=True) for a in sub_soup.select("table.type_5 tr a") if len(a.get_text(strip=True)) > 1][:3]
                        sect['lead'] = ", ".join(valid)
                        time.sleep(0.2)
                    except: pass

                # 랭킹 수집 (Top 50)
                try:
                    page.goto("https://finance.naver.com/sise/sise_quant.naver?sosok=0", timeout=30000)
                    soup = BeautifulSoup(page.content(), 'html.parser')
                    for i, row in enumerate(soup.select("table.type_2 tr")[2:52]):
                        a = row.select_one("a.tltle")
                        if a: all_ranks.append({'type': 'AMOUNT', 'rank': i+1, 'code': a['href'].split('=')[-1], 'name': a.get_text(strip=True)})
                except: pass

                try:
                    page.goto("https://finance.naver.com/sise/sise_rise.naver", timeout=30000)
                    soup = BeautifulSoup(page.content(), 'html.parser')
                    for i, row in enumerate(soup.select("table.type_2 tr")[2:52]):
                        a = row.select_one("a.tltle")
                        if a: all_ranks.append({'type': 'RISE', 'rank': i+1, 'code': a['href'].split('=')[-1], 'name': a.get_text(strip=True)})
                except: pass

            except Exception as e: print(f"Scrape Error: {e}")
            finally: browser.close()
        return all_sects, all_themes, all_ranks

    def run_cycle(self):
        sects, themes, ranks = self.scrape_naver_market()
        conn = self.get_db_connection()
        sc_added = 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                for s in sects:
                    cursor.execute("INSERT INTO industry_quotes (industry_name, change_rate, trade_volume, lead_stocks, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_volume=%s, lead_stocks=%s, updated_at=NOW()", (s['name'], s['rate'], s['vol'], s['lead'], s['rate'], s['vol'], s['lead']))
                    cursor.execute("SELECT change_rate FROM industry_history WHERE industry_name = %s ORDER BY captured_at DESC LIMIT 1", (s['name'],))
                    last = cursor.fetchone()
                    if not last or float(last['change_rate']) != s['rate']:
                        cursor.execute("INSERT INTO industry_history (industry_name, change_rate, trade_volume, captured_at) VALUES (%s, %s, %s, NOW())", (s['name'], s['rate'], s['vol']))
                        sc_added += 1
                if ranks:
                    cursor.execute("DELETE FROM stock_rankings WHERE captured_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)")
                    for r in ranks:
                        cursor.execute("INSERT INTO stock_rankings (ranking_type, rank_val, stock_code, stock_name, captured_at) VALUES (%s, %s, %s, %s, NOW())", (r['type'], r['rank'], r['code'], r['name']))
            conn.commit()
            self.log_to_db("INFO", f"[메가수집] 업종/랭킹 체크 완료 (신규 히스토리: {sc_added}개)")
            try:
                ai = AIEngine()
                ai.analyze_market()
            except: pass
        finally: conn.close()

# --- 2. 다음 금융 거래원 수집기 ---
class DaumVeteranScraper:
    def __init__(self):
        self.tz = pytz.timezone('Asia/Seoul')
        self.user_agent = "Mozilla/5.0 (Linux; Android 14; Poco M7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"
        self.previous_stocks = set() # [v13.4] 이전 관심종목 리스트 기억

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
            full_text = soup.get_text(separator=' ')
            i_net = 0
            i_match = re.search(r'기관\s*([0-9,+-]+)', full_text)
            if i_match:
                try:
                    i_net_str = i_match.group(1).replace(',', '')
                    if i_net_str.startswith('+'): i_net = int(i_net_str[1:])
                    else: i_net = int(i_net_str)
                except: pass
            tables = soup.select("table")
            f_sell_total, f_buy_total = 0, 0
            sell_table, buy_table = None, None
            for t in tables:
                txt = t.get_text()
                if "매도상위" in txt: sell_table = t
                elif "매수상위" in txt: buy_table = t
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
            def extract_brokers_zip(target_lines, foreign_total):
                names, values = [], []
                for line in target_lines:
                    clean_val = line.replace(',', '').replace(' ', '').strip()
                    if clean_val.isdigit(): values.append(clean_val)
                    elif re.match(r'^[가-힣A-Za-z]{2,}', line) and "상위" not in line and "외국계" not in line and "합" not in line:
                        names.append(line)
                paired = [f"{n}({v})" for n, v in zip(names, values)][:5]
                paired.append(str(foreign_total))
                return paired
            lines = [line.strip() for line in soup.get_text(separator='\n').split('\n') if line.strip()]
            s_idx, b_idx = -1, -1
            for i, line in enumerate(lines):
                if "매도상위" in line: s_idx = i
                if "매수상위" in line: b_idx = i
            if s_idx == -1 or b_idx == -1: return None
            sell_brokers = extract_brokers_zip(lines[s_idx:b_idx], f_sell_total)
            buy_brokers = extract_brokers_zip(lines[b_idx:], f_buy_total)
            brokers_str = f"매도: {','.join(sell_brokers)} / 매수: {','.join(buy_brokers)}"
            return {'f_net': f_buy_total - f_sell_total, 'i_net': i_net, 'brokers': brokers_str}
        except: return None

    def run_cycle(self):
        conn = self.get_db_connection()
        sc_traders = 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT w.stock_code FROM watchlist w JOIN users u ON w.USRID = u.USRID WHERE u.role = 'ADMIN'")
                queue = cursor.fetchall()
            
            if not queue: return
            
            current_stocks = set(q['stock_code'] for q in queue)
            # [v13.4] 관심종목 구성이 바뀌었는지 체크
            is_list_changed = (current_stocks != self.previous_stocks)
            if is_list_changed:
                self.log_to_db("INFO", f"[수급감시] 관심종목 변경 감지 ({len(self.previous_stocks)} -> {len(current_stocks)}) - 강제 수집 모드")
                self.previous_stocks = current_stocks

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
                            # 관심종목이 바뀌었거나 데이터 수치가 변했으면 무조건 저장
                            cursor.execute("SELECT foreign_net_buy, institution_net_buy FROM stock_supply_demand WHERE stock_code = %s ORDER BY id DESC LIMIT 1", (item['stock_code'],))
                            last = cursor.fetchone()
                            
                            is_new_data = not last or int(last['foreign_net_buy']) != res['f_net'] or int(last['institution_net_buy']) != res['i_net']
                            
                            # [핵심] 리스트 자체가 바뀌었거나(신규 종목 포함), 데이터 수치가 변했으면 인서트
                            if is_list_changed or is_new_data:
                                cursor.execute("INSERT INTO stock_supply_demand (stock_code, foreign_net_buy, institution_net_buy, top_brokers) VALUES (%s, %s, %s, %s)", (item['stock_code'], res['f_net'], res['i_net'], res['brokers']))
                                sc_traders += 1
                        conn.commit()
                    time.sleep(random.uniform(1.0, 2.0))
                browser.close()
            
            self.log_to_db("INFO", f"[거래원수집] {len(queue)}개 종목 체크 완료 (신규 기록: {sc_traders}개)")
        finally: conn.close()

def main():
    naver = NaverMegaCollector()
    daum = DaumVeteranScraper()
    print(">>> Python Scraper v71.0 (Watchlist Change Detection) Started.")
    while True:
        try:
            conn = naver.get_db_connection()
            interval = 300
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT collect_interval FROM collector_config WHERE id = 1")
                res = cursor.fetchone()
                if res: interval = int(res['collect_interval'])
            conn.close()
            if 8 <= datetime.now(naver.tz).hour < 24:
                naver.run_cycle()
                daum.run_cycle()
                time.sleep(interval)
            else: time.sleep(600)
        except Exception as e:
            print(f"Main Error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()

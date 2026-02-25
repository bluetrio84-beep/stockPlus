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

# --- 1. 메가 수집기 (업종/테마/지수/랭킹) ---
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
        if count <= 0: return
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
                sql = "INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s"
                cursor.execute(sql, (hour_key, count, count))
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

    def scrape_lists(self, page):
        all_sects, all_themes, all_ranks = [], [], []
        try:
            page.goto("https://finance.daum.net/domestic/wics", timeout=60000, wait_until="networkidle")
            time.sleep(3) 
            for pg in range(1, 4):
                if pg > 1:
                    try:
                        btn = page.locator(f"xpath=//a[text()='{pg}']")
                        if btn.is_visible(): btn.click(); time.sleep(2)
                        else: break
                    except: break
                rows = page.locator("tr").all()
                for row in rows:
                    try:
                        txt = row.inner_text().split('\n')
                        if len(txt) < 5: txt = row.inner_text().split('\t')
                        if len(txt) >= 7:
                            name = txt[0].strip()
                            if name and name != '업종명':
                                a_tag = row.locator("a").first
                                href = a_tag.get_attribute("href") if a_tag.count() > 0 else ""
                                rate_str = next((p for p in txt if '%' in p), "0.0")
                                rate_m = re.search(r'([-+]?\d*\.?\d+)', rate_str)
                                rate_val = float(rate_m.group(1)) if rate_m else 0.0
                                all_sects.append({'name': name, 'rate': rate_val, 'amt': int(txt[6].replace(',','')), 'link': href})
                    except: continue
        except: pass

        try:
            for p_idx in range(1, 10):
                page.goto(f"https://finance.naver.com/sise/theme.naver?&page={p_idx}", timeout=20000)
                try: page.wait_for_selector("table.type_1", timeout=10000)
                except: break
                soup = BeautifulSoup(page.content(), 'html.parser')
                valid_rows = [r for r in soup.select("table.type_1 tr") if r.select_one("td.col_type1")]
                if not valid_rows: break
                for row in valid_rows:
                    tds = row.select("td")
                    if len(tds) >= 2 and tds[0].select_one("a"):
                        a, s = tds[0].select_one("a"), tds[1].select_one("span")
                        all_themes.append({'name': a.get_text(strip=True), 'rate': float(s.get_text(strip=True).replace('%','').replace('+','')), 'link': a['href']})
        except: pass

        try:
            page.goto("https://finance.naver.com/sise/sise_quant.naver?sosok=0", timeout=20000); time.sleep(1)
            soup_r = BeautifulSoup(page.content(), 'html.parser')
            for i, a in enumerate(soup_r.select("a.tltle")[:3]):
                all_ranks.append({'type': 'AMOUNT', 'rank': i+1, 'code': a.get('href').split('=')[-1], 'name': a.get_text(strip=True)})
        except: pass
        return all_sects, all_themes, all_ranks

    def run_quick_sync(self, page):
        sects, themes, ranks = self.scrape_lists(page)
        indices = self.fetch_market_indices()
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                for idx in indices: cursor.execute("INSERT INTO market_index_history (index_name, index_value, change_val, change_rate, captured_at) VALUES (%s, %s, %s, %s, NOW())", (idx['name'], idx['val'], idx['change'], idx['rate']))
                for s in sects: cursor.execute("INSERT INTO industry_quotes (industry_name, change_rate, trade_amount, detail_url, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_amount=%s, detail_url=%s, updated_at=NOW()", (s['name'], s['rate'], s['amt'], s['link'], s['rate'], s['amt'], s['link']))
                for t in themes: cursor.execute("INSERT INTO market_themes (theme_name, avg_change_rate, updated_at) VALUES (%s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, updated_at=NOW()", (t['name'], t['rate'], t['rate']))
                for r in ranks: cursor.execute("INSERT INTO stock_rankings (ranking_type, rank_val, stock_code, stock_name, captured_at) VALUES (%s, %s, %s, %s, NOW())", (r['type'], r['rank'], r['code'], r['name']))
                conn.commit()
                self.log_to_db("INFO", f"[메가수집] WICS({len(sects)})/테마({len(themes)})/지수({len(indices)}) 반영 완료")
        finally: conn.close()
        return sects, themes, (len(sects) + len(themes) + len(indices))

    def run_deep_analysis(self, page, sects, themes):
        if not sects: return 0
        conn = self.get_db_connection()
        upd_cnt = 0
        try:
            with conn.cursor() as cursor:
                for s in sects[:50]: # 주요 업종 우선 분석
                    if not s.get('link'): continue
                    try:
                        url = "https://finance.daum.net" + s['link'] if not s['link'].startswith('http') else s['link']
                        page.goto(url, timeout=10000, wait_until="commit")
                        time.sleep(1)
                        rows = page.locator("tr").all()
                        stock_items = []
                        for row in rows:
                            try:
                                parts = [pt.strip() for pt in re.split(r'[\n\t]', row.inner_text()) if pt.strip()]
                                if len(parts) >= 3:
                                    name = parts[0]
                                    rate_str = next((p for p in parts if '%' in p), "")
                                    rate_m = re.search(r'([-+]?\d*\.?\d+)', rate_str)
                                    if name and rate_m and name != '종목명' and len(name) > 1:
                                        stock_items.append(f"{name}({'+' if float(rate_m.group(1))>0 else ''}{rate_m.group(1)}%)")
                            except: continue
                            if len(stock_items) >= 5: break
                        if stock_items:
                            cursor.execute("UPDATE industry_quotes SET lead_stocks = %s WHERE industry_name = %s", (", ".join(stock_items), s['name']))
                            upd_cnt += 1
                    except: continue
                conn.commit()
            self.log_to_db("INFO", f"[메가수집] (테마/업종)주도주 전수 갱신 완료")
        finally: conn.close()
        return upd_cnt

class DaumTraderScraper:
    def __init__(self):
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        self.tz = pytz.timezone('Asia/Seoul')

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='localhost', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def fetch_price_and_volume(self, code):
        try:
            res = requests.get(f"{BACKEND_API_URL}/stocks/{code}/price?exchangeCode=UN", timeout=3).json()
            def safe_int(val):
                try: return int(float(str(val).replace(',', '')))
                except: return 0
            return {'price': safe_int(res.get('currentPrice')), 'volume': safe_int(res.get('volume'))}
        except: return {'price': 0, 'volume': 0}

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

    def run_cycle(self, page, mega):
        conn = self.get_db_connection()
        sc_cnt = 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT stock_code FROM watchlist")
                queue = cursor.fetchall()
            for item in queue:
                res = self.scrape_daum_trader(page, item['stock_code'])
                if res:
                    with conn.cursor() as cursor:
                        cursor.execute("INSERT INTO stock_supply_demand (stock_code, current_price, volume, foreign_net_buy, institution_net_buy, top_brokers) VALUES (%s, %s, %s, %s, %s, %s)", (item['stock_code'], res['price'], res['volume'], res['f_net'], 0, res['brokers']))
                    conn.commit(); sc_cnt += 1
                time.sleep(random.uniform(0.3, 0.7))
            mega.log_to_db("INFO", f"[거래원수집] 실시간 종목수급 {sc_cnt}건 포착 완료")
        finally: conn.close()
        return sc_cnt

def main():
    mega = MegaCollector(); trader = DaumTraderScraper(); engine = AIEngine()
    while True:
        try:
            conn = mega.get_db_connection()
            interval = 180
            try:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute('SELECT collect_interval FROM collector_config WHERE id = 1')
                    res = cursor.fetchone()
                    if res: interval = int(res['collect_interval'])
            finally: conn.close()

            now_hour = datetime.now(mega.tz).hour
            if 8 <= now_hour < 20: 
                start_time = datetime.now()
                mega.log_to_db("INFO", f"[수집시작] 통합 수집 사이클 가동 (주기: {interval}s)")
                total_collected = 0
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                    context = browser.new_context(user_agent=mega.user_agent)
                    page = context.new_page()
                    try:
                        if hasattr(ps, 'stealth') and callable(ps.stealth): ps.stealth(page)
                        elif hasattr(ps, 'stealth') and hasattr(ps.stealth, 'stealth'): ps.stealth.stealth.stealth(page)
                    except: pass
                    sects, themes, q_cnt = mega.run_quick_sync(page)
                    total_collected += q_cnt
                    t_cnt = trader.run_cycle(page, mega)
                    total_collected += t_cnt
                    d_cnt = mega.run_deep_analysis(page, sects, themes)
                    total_collected += d_cnt
                    browser.close()
                engine.analyze_market()
                mega.update_stats(total_collected)
                duration = (datetime.now() - start_time).seconds
                mega.log_to_db("INFO", f"[수집완료] {total_collected}건 처리 완료 ({duration}초 소요)")
            time.sleep(interval)
        except Exception as e:
            mega.log_to_db("ERROR", f"[치명적오류] {str(e)}")
            time.sleep(60)

if __name__ == "__main__":
    main()

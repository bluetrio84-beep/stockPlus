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
import subprocess
from ai_engine import AIEngine
from next_leader_engine import NextLeaderEngine

# DB 설정 (Host 모드 기준)
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

BACKEND_API_URL = "http://127.0.0.1:8080/api/dashboard"

class MegaCollector:
    def __init__(self):
        self.tz = pytz.timezone('Asia/Seoul')
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='127.0.0.1', port=3306, user='lms', password='cnbas.2015', database='stockplus')

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
                sql = "INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s"
                cursor.execute(sql, (hour_key, count, count))
            conn.commit()
            print(f">>> [Stats Update] Hour: {hour_key}, Added: {count}")
        except Exception as e: print(f">>> [Stats Update Error] {e}")
        finally: conn.close()

    def sync_market_cap(self):
        self.log_to_db("INFO", "[마스터갱신] 전 종목 시가총액/실적 업데이트 시작")
        conn = self.get_db_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # [v19.0] 전 종목 대상 업데이트 및 실적 수집
                cursor.execute("SELECT stock_code FROM stock_master")
                stocks = cursor.fetchall()
            
            total = len(stocks)
            print(f">>> [Sync] Updating Market Cap & Financials for {total} stocks...")
            
            for i, s in enumerate(stocks):
                code = s['stock_code']
                try:
                    res = requests.get(f"{BACKEND_API_URL}/stocks/{code}/price?exchangeCode=UN", timeout=5).json()
                    m_cap = int(float(str(res.get('marketCap', '0')).replace(',', '')))
                    ind_name = res.get('industryName', '')
                    h52 = float(res.get('high52w', '0') or 0)
                    l52 = float(res.get('low52w', '0') or 0)
                    
                    if m_cap > 0 or ind_name:
                        with conn.cursor() as cursor:
                            cursor.execute("""
                                UPDATE stock_master 
                                SET market_cap = %s, h52_price = %s, l52_price = %s
                                -- industry_name = %s  [v44.7] 업종명 덮어쓰기 방지를 위해 주석 처리
                                WHERE stock_code = %s
                            """, (m_cap, h52, l52, code))
                        conn.commit()
                    
                    # [v19.0] 실적 데이터 동기화 API 호출 추가
                    try:
                        requests.get(f"{BACKEND_API_URL.replace('/dashboard', '/admin/intelligence')}/sync-financials/{code}", timeout=10)
                    except: pass
                except: continue
                if (i+1) % 100 == 0: print(f">>> [Sync] Progress: {i+1}/{total}")
                time.sleep(0.1)
            
            self.log_to_db("INFO", f"[마스터갱신] {total}개 종목 시가총액 업데이트 완료")
        finally: conn.close()

    def fetch_market_indices(self):
        indices = []
        try:
            # 국내 지수 (백엔드 연동) - 메인 수집기는 이 작업만 빠르게 수행
            res_k = requests.get(f"{BACKEND_API_URL}/stocks/0001/price?exchangeCode=IDX", timeout=3).json()
            if res_k and res_k.get('currentPrice'):
                indices.append({'name': 'KOSPI', 'val': float(res_k['currentPrice']), 'change': float(res_k['change']), 'rate': float(res_k['changeRate'])})
            res_q = requests.get(f"{BACKEND_API_URL}/stocks/1001/price?exchangeCode=IDX", timeout=3).json()
            if res_q and res_q.get('currentPrice'):
                indices.append({'name': 'KOSDAQ', 'val': float(res_q['currentPrice']), 'change': float(res_q['change']), 'rate': float(res_q['changeRate'])})
        except: pass
        return indices

    def scrape_lists(self, page):
        all_sects, all_themes = [], []
        try:
            page.goto("https://finance.daum.net/domestic/wics", timeout=30000, wait_until="networkidle")
            time.sleep(3) 
            for pg in range(1, 4):
                if pg > 1:
                    try:
                        btn = page.locator(f"xpath=//a[text()='{pg}']")
                        if btn.is_visible(timeout=3000): btn.click(); time.sleep(2)
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
        return all_sects, all_themes

    def run_quick_sync(self):
        sects, themes, sc_cnt = [], [], 0
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                context = browser.new_context(user_agent=self.user_agent)
                try:
                    page = context.new_page()
                    sects, themes = self.scrape_lists(page)
                    indices = self.fetch_market_indices() # [v15.1] 원복: 무거운 스크래핑 제외
                    sc_cnt = len(sects) + len(themes) + len(indices)
                    conn = self.get_db_connection()
                    try:
                        with conn.cursor() as cursor:
                            for idx in indices: cursor.execute("INSERT INTO market_index_history (index_name, index_value, change_val, change_rate, captured_at) VALUES (%s, %s, %s, %s, NOW())", (idx['name'], idx['val'], idx['change'], idx['rate']))
                            for s in sects: cursor.execute("INSERT INTO industry_quotes (industry_name, change_rate, trade_amount, detail_url, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_amount=%s, detail_url=%s, updated_at=NOW()", (s['name'], s['rate'], s['amt'], s['link'], s['rate'], s['amt'], s['link']))
                            for t in themes: cursor.execute("INSERT INTO market_themes (theme_name, avg_change_rate, updated_at) VALUES (%s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, updated_at=NOW()", (t['name'], t['rate'], t['rate']))
                            conn.commit()
                            self.log_to_db("INFO", f"[메가수집] WICS({len(sects)})/테마({len(themes)})/지수({len(indices)}) 반영 완료")
                    finally: conn.close()
                finally: context.close(); browser.close()
        except Exception as e: print(f">>> [Quick Sync Error] {e}")
        return sects, themes, sc_cnt

    def run_deep_analysis(self, sects, themes):
        upd_cnt = 0
        if sects:
            chunk_size = 20
            for i in range(0, len(sects), chunk_size):
                chunk = sects[i:i + chunk_size]
                try:
                    with sync_playwright() as p:
                        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                        context = browser.new_context(user_agent=self.user_agent)
                        try:
                            page = context.new_page()
                            conn = self.get_db_connection()
                            try:
                                with conn.cursor() as cursor:
                                    for s in chunk:
                                        if not s.get('link'): continue
                                        try:
                                            url = "https://finance.daum.net" + s['link'] if not s['link'].startswith('http') else s['link']
                                            page.goto(url, timeout=15000, wait_until="commit")
                                            time.sleep(1); rows = page.locator("tr").all()
                                            stock_items = []
                                            for row in rows:
                                                try:
                                                    parts = [pt.strip() for pt in re.split(r'[\n\t]', row.inner_text()) if pt.strip()]
                                                    if len(parts) >= 3:
                                                        name = parts[0]; rate_str = next((p for p in parts if '%' in p), "")
                                                        rate_m = re.search(r'([-+]?\d*\.?\d+)', rate_str)
                                                        if name and rate_m and name != '종목명':
                                                            raw_val = float(rate_m.group(1)); sign = "+" if raw_val > 0 else ""
                                                            stock_items.append(f"{name}({sign}{raw_val:.2f}%)")
                                                except: continue
                                                if len(stock_items) >= 5: break
                                            if stock_items:
                                                cursor.execute("UPDATE industry_quotes SET lead_stocks = %s WHERE industry_name = %s", (", ".join(stock_items), s['name']))
                                                upd_cnt += 1
                                        except: continue
                                    conn.commit()
                            finally: conn.close()
                        finally: context.close(); browser.close()
                except: continue
        if themes:
            themes_sorted = sorted(themes, key=lambda x: x['rate'], reverse=True)[:100]
            chunk_size = 25
            for i in range(0, len(themes_sorted), chunk_size):
                chunk = themes_sorted[i:i + chunk_size]
                try:
                    with sync_playwright() as p:
                        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                        context = browser.new_context(user_agent=self.user_agent)
                        try:
                            page = context.new_page()
                            conn = self.get_db_connection()
                            try:
                                with conn.cursor() as cursor:
                                    for t in chunk:
                                        if not t.get('link'): continue
                                        try:
                                            page.goto("https://finance.naver.com" + t['link'], timeout=15000, wait_until="commit")
                                            page.wait_for_selector("table.type_5", timeout=5000)
                                            raw_stocks = page.locator("td.name a").all_inner_texts()
                                            valid = ", ".join([s.strip() for s in raw_stocks if s and len(s.strip()) > 1][:3])
                                            if valid:
                                                cursor.execute("UPDATE market_themes SET lead_stocks = %s WHERE theme_name = %s", (valid, t['name']))
                                                upd_cnt += 1
                                        except: continue
                                    conn.commit()
                            finally: conn.close()
                        finally: context.close(); browser.close()
                except: continue
        self.log_to_db("INFO", f"[메가수집] (테마/업종)주도주 전수 갱신 완료")
        return upd_cnt

class DaumTraderScraper:
    def __init__(self):
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        self.tz = pytz.timezone('Asia/Seoul')

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='127.0.0.1', port=3306, user='lms', password='cnbas.2015', database='stockplus')

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
            page.goto(url, timeout=15000, wait_until="commit") 
            time.sleep(1.5); soup = BeautifulSoup(page.content(), 'html.parser')
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
                    elif re.match(r'^[가-힣A-Za-z]{2,}', line) and "상위" not in line: names.append(line)
                return [f"{n}({v})" for n, v in zip(names, values)][:5] + [str(f_total)]
            brokers = f"매도: {','.join(get_top_5(lines[s_i:b_i], f_sell))} / 매수: {','.join(get_top_5(lines[b_i:], f_buy))}"
            return {'f_net': f_buy - f_sell, 'brokers': brokers, 'price': pv['price'], 'volume': pv['volume']}
        except: return None

    def run_relay_cycle(self, mega):
        conn = self.get_db_connection()
        total_sc_cnt = 0
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT DISTINCT stock_code FROM watchlist")
                queue = cursor.fetchall()
            if not queue: return 0
            chunk_size = 25
            for i in range(0, len(queue), chunk_size):
                chunk = queue[i:i + chunk_size]
                try:
                    with sync_playwright() as p:
                        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                        context = browser.new_context(user_agent=self.user_agent)
                        try:
                            page = context.new_page()
                            for item in chunk:
                                try:
                                    if page.is_closed(): break 
                                    res = self.scrape_daum_trader(page, item['stock_code'])
                                    if res:
                                        with conn.cursor() as cursor:
                                            cursor.execute("INSERT INTO stock_supply_demand (stock_code, current_price, volume, foreign_net_buy, institution_net_buy, top_brokers) VALUES (%s, %s, %s, %s, %s, %s)", (item['stock_code'], res['price'], res['volume'], res['f_net'], 0, res['brokers']))
                                        conn.commit(); total_sc_cnt += 1
                                except: continue
                                time.sleep(random.uniform(0.3, 0.7))
                        finally: context.close(); browser.close()
                except: continue
            mega.log_to_db("INFO", f"[거래원수집] 실시간 종목수급 {total_sc_cnt}건 완료")
        finally: conn.close()
        return total_sc_cnt

def main():
    mega = MegaCollector(); trader = DaumTraderScraper(); engine = AIEngine()
    next_engine = NextLeaderEngine() 
    last_sync_date = ""
    last_next_leader_date = "" 
    last_snapshot_date = "" 
    
    while True:
        try:
            now = datetime.now(mega.tz)
            now_str = now.strftime('%Y-%m-%d')
            now_hour, now_min, now_weekday = now.hour, now.minute, now.weekday()

            # [v18.4] 실시간 정책 조회 (주말/공휴일 가동 여부)
            policy = {'weekend': 'N', 'holiday': 'Y'}
            conn = mega.get_db_connection()
            try:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("SELECT collect_on_weekend, collect_on_holiday FROM collector_config WHERE id = 1")
                    res = cursor.fetchone()
                    if res:
                        policy['weekend'] = res['collect_on_weekend']
                        policy['holiday'] = res['collect_on_holiday']
            finally: conn.close()

            # [v18.3] 주말(토:5, 일:6) 완전 정지 로직 (v19.4 주말 최적화 추가)
            if now_weekday >= 5 and policy['weekend'] == 'N':
                # [v19.4] 일요일 21:00 ~ 21:05 사이에 차주 가중치 자동 최적화 수행
                if now_weekday == 6 and now_hour == 21 and 0 <= now_min <= 5:
                    mega.log_to_db("INFO", "[지능가동] 주말 AI 가중치 자동 최적화 시작")
                    next_engine.optimize_weights()
                    mega.log_to_db("INFO", "[지능완료] 주말 AI 가중치 자동 최적화 반영 성공")
                    time.sleep(360) # 중복 실행 방지 (6분 휴식)

                if now_min == 0: print(f">>> [Weekend] 주말 휴식 중... (Policy: {policy['weekend']})")
                time.sleep(60); continue

            # 2. 공휴일 체크 (설정이 'N'이면 정지)
            is_holiday = False
            conn = mega.get_db_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT COUNT(*) FROM market_holidays WHERE holiday_date = %s", (now_str,))
                    is_holiday = cursor.fetchone()[0] > 0
            finally: conn.close()

            if is_holiday and policy['holiday'] == 'N':
                if now_min == 0: print(f">>> [Holiday] 공휴일({now_str}) 휴식 중... (Policy: {policy['holiday']})")
                time.sleep(60); continue

            # [v18.1] 06:30 로컬 뉴스 수집 (기능 구현 전까지 주석 처리)
            # if now_hour == 6 and 30 <= now_min <= 35 and last_snapshot_date != now_str:
            #     mega.log_to_db("INFO", "[수집시작] 박달동 로컬 호재 뉴스 수집 (06시 30분)")
            #     subprocess.run(["python3", "snapshot_engine.py", "--mode", "local_news"])

            # 3. [23:00] 어제의 잔상 기록 (히트맵)
            if now_hour == 23 and 0 <= now_min <= 5 and last_snapshot_date != now_str:
                mega.log_to_db("INFO", "[스냅샷] 히트맵 캡처 시작 (23시)")
                subprocess.run(["python3", "snapshot_engine.py", "--mode", "heatmap"])
                last_snapshot_date = now_str

            # 4. [07:00] 오늘의 바닥 탈출 분석
            if now_hour == 7 and 0 <= now_min <= 10 and last_next_leader_date != now_str:
                try:
                    mega.log_to_db("INFO", "[분석가동] Next Leaders 1,600개 전수조사 시작 (07시)")
                    next_engine.analyze_next_leaders()
                    last_next_leader_date = now_str
                except Exception as e:
                    mega.log_to_db("ERROR", f"[분석실패] {str(e)}")

            # 5. [07:20] 오늘의 유망주 랭킹 리스트 스냅샷 (v19.4 시간 앞당김)
            if now_hour == 7 and 20 <= now_min <= 25:
                if last_next_leader_date == now_str:
                    mega.log_to_db("INFO", "[스냅샷] Next Leaders 랭킹 리스트 캡처 시작 (07시 20분)")
                    subprocess.run(["python3", "snapshot_engine.py", "--mode", "ranking"])

            # 6. [07:30] 데일리 매거진 선제 생성 (v19.4 08:15에서 이동)
            # 8시 데이터 초기화 전, 어제의 종가 데이터를 Gemini가 분석하도록 시간을 앞당김.
            if now_hour == 7 and 30 <= now_min <= 35:
                if last_next_leader_date == now_str:
                    mega.log_to_db("INFO", "[리포트] 데일리 매거진 선제적 생성 트리거 (07시 30분)")
                    subprocess.run(["python3", "snapshot_engine.py", "--mode", "trigger_report"])

            # 7. [20:30] 시총 갱신
            if now_hour == 20 and now_min == 30 and last_sync_date != now_str:
                mega.sync_market_cap()
                last_sync_date = now_str

            # 8. 실시간 수집 (정책에 따라 가동)
            if 8 <= now_hour < 16:
                conn = mega.get_db_connection(); interval = 300
                try:
                    with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                        cursor.execute('SELECT collect_interval FROM collector_config WHERE id = 1')
                        res = cursor.fetchone()
                        if res: interval = int(res['collect_interval'])
                finally: conn.close()

                start_time = datetime.now()
                mega.log_to_db("INFO", f"[수집시작] 통합 수집 사이클 가동 (주기: {interval}s)")
                
                # [v35.90] 최우선 순위 가동: AI 관제탑 블랙박스 분석 (09:00 ~ 16:59)
                if 9 <= now_hour <= 16:
                    try:
                        mega.log_to_db("INFO", "[지능가동] AI 관제탑 블랙박스 정밀 분석 수행")
                        subprocess.run(["python3", "blackbox_analyst.py"])
                        mega.log_to_db("INFO", "[지능완료] AI 관제탑 정밀 분석 및 리포트 생성 완료")
                    except Exception as e:
                        mega.log_to_db("ERROR", f"[분석오류] {str(e)}")

                total_collected = 0
                try:
                    sects, themes, q_cnt = mega.run_quick_sync()
                    total_collected += (q_cnt if q_cnt else 0)
                except: pass
                try:
                    t_cnt = trader.run_relay_cycle(mega)
                    total_collected += (t_cnt if t_cnt else 0)
                except: pass
                try:
                    s_list = sects if 'sects' in locals() else []
                    t_list = themes if 'themes' in locals() else []
                    d_cnt = mega.run_deep_analysis(s_list, t_list)
                    total_collected += (d_cnt if d_cnt else 0)
                except: pass
                try:
                    duration = (datetime.now() - start_time).seconds
                    mega.update_stats(total_collected)
                    mega.log_to_db("INFO", f"[수집완료] {total_collected}건 처리 완료 ({duration}초 소요)")
                    engine.analyze_market()
                except: pass
                time.sleep(interval)
            else:
                time.sleep(60) 
        except Exception as e:
            mega.log_to_db("ERROR", f"[치명적오류] {str(e)}")
            time.sleep(60)

if __name__ == "__main__":
    main()

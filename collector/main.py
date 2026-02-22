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

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

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
                try:
                    page.wait_for_selector("table.type_1", timeout=5000)
                except: pass
                
                content = page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                rows = soup.select("table.type_1 tr")
                for row in rows:
                    tds = row.select("td")
                    if len(tds) < 6: continue 
                    
                    name_tag = tds[0].select_one("a")
                    rate_tag = tds[1].select_one("span")
                    
                    # 거래대금 추출
                    vol_text = "0"
                    if len(tds) >= 6:
                        vol_text = tds[5].get_text(strip=True).replace(',', '')
                    
                    if name_tag and rate_tag:
                        name = name_tag.get_text(strip=True)
                        link = name_tag['href'] # 상세 링크 확보
                        
                        raw_rate = rate_tag.get_text(strip=True).replace('%', '').strip()
                        try:
                            rate_val = float(raw_rate.replace('+', ''))
                        except: rate_val = 0.0
                        
                        try:
                            vol_val = int(vol_text) if vol_text.isdigit() else 0
                        except: vol_val = 0
                            
                        all_sects.append({'name': name, 'rate': rate_val, 'vol': vol_val, 'link': link, 'lead': ''})

                # [New] 상위 50개 업종 상세 크롤링 (주도주 확보)
                # 등락률 내림차순 정렬
                all_sects.sort(key=lambda x: x['rate'], reverse=True)
                top_sectors = all_sects[:50]
                
                print(f">>> Collecting Lead Stocks for Top {len(top_sectors)} Sectors...")
                for sect in top_sectors:
                    try:
                        detail_url = "https://finance.naver.com" + sect['link']
                        page.goto(detail_url, timeout=30000)
                        # 상세 페이지 로딩 대기
                        try: page.wait_for_selector("table.type_5", timeout=3000)
                        except: pass
                        
                        sub_content = page.content()
                        sub_soup = BeautifulSoup(sub_content, 'html.parser')
                        
                        # 구성 종목 테이블 (보통 type_5)
                        # 등락률 순 정렬되어 있다고 가정하거나, 상위 3개만 추출
                        stocks = []
                        stock_rows = sub_soup.select("table.type_5 tr")
                        for sr in stock_rows:
                            nm_tag = sr.select_one("a")
                            if nm_tag:
                                s_name = nm_tag.get_text(strip=True)
                                if s_name and s_name not in stocks:
                                    stocks.append(s_name)
                            if len(stocks) >= 3: break
                        
                        sect['lead'] = ", ".join(stocks)
                        # print(f"   -> {sect['name']}: {sect['lead']}")
                        time.sleep(0.5) # 밴 방지용 짧은 텀
                    except Exception as e:
                        print(f"   -> Error collecting {sect['name']}: {e}")

                # 2. 테마 수집 (1~7페이지 루프)
                for p_idx in range(1, 8):
                    url_theme = f"https://finance.naver.com/sise/theme.naver?&page={p_idx}"
                    page.goto(url_theme, timeout=60000)
                    try:
                        page.wait_for_selector("table.type_1", timeout=3000) 
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
                            try:
                                t_rate_val = float(t_rate_raw.replace('+', ''))
                            except: t_rate_val = 0.0
                                
                            lead_stocks = ""
                            if len(tds) >= 7:
                                leads = [a.get_text(strip=True) for a in tds[-1].select("a")]
                                lead_stocks = ", ".join(leads)
                            
                            all_themes.append({'name': t_name, 'rate': t_rate_val, 'lead': lead_stocks, 'vol': 0, 'link': col_theme['href']})
                            
                    time.sleep(1)

                # [New] 상위 20개 테마 상세 크롤링 (종목명 잘림 방지)
                # 등락률 내림차순 정렬
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
                        # 테마 상세 페이지 종목 테이블
                        stock_rows = sub_soup.select("table.type_5 tr")
                        for sr in stock_rows:
                            nm_tag = sr.select_one(".name a") # 테마 상세는 클래스가 .name
                            if not nm_tag: nm_tag = sr.select_one("a") # 혹시 몰라 백업
                            
                            if nm_tag:
                                s_name = nm_tag.get_text(strip=True)
                                if s_name and s_name not in stocks:
                                    stocks.append(s_name)
                            if len(stocks) >= 3: break
                        
                        if stocks:
                            theme['lead'] = ", ".join(stocks)
                        time.sleep(0.5)
                    except Exception as e:
                        print(f"   -> Error collecting theme {theme['name']}: {e}")

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
                # 업종 저장 (lead_stocks 추가)
                for s in sects:
                    sql = "INSERT INTO industry_quotes (industry_name, change_rate, trade_volume, lead_stocks, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE change_rate=%s, trade_volume=%s, lead_stocks=%s, updated_at=NOW()"
                    cursor.execute(sql, (s['name'], s['rate'], s['vol'], s['lead'], s['rate'], s['vol'], s['lead']))
                
                # 테마 저장
                for t in themes:
                    sql = "INSERT INTO market_themes (theme_name, avg_change_rate, lead_stocks, trade_volume, updated_at) VALUES (%s, %s, %s, %s, NOW()) ON DUPLICATE KEY UPDATE avg_change_rate=%s, lead_stocks=%s, updated_at=NOW()"
                    cursor.execute(sql, (t['name'], t['rate'], t['lead'], t['vol'], t['rate'], t['lead']))
                    
            conn.commit()
            
            self.log_to_db("INFO", f"메가 수집 완료: 업종({len(sects)}개), 테마({len(themes)}개) 갱신")
            print(f">>> [SUCCESS] Saved: {len(sects)} Industries, {len(themes)} Themes.")
            
        except Exception as e:
            self.log_to_db("ERROR", f"DB Save Error: {str(e)}")
            print(f">>> DB Error: {e}")
        finally: 
            conn.close()

def main():
    engine = NaverMegaCollector()
    print(">>> Python Scraper v55.3 (Dynamic Interval) Started.")
    while True:
        try:
            # [수정] 매 사이클마다 DB에서 수집 주기(collect_interval)를 읽어옴
            conn = engine.get_db_connection()
            interval = 300 # 기본값 5분
            try:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("SELECT collect_interval FROM collector_config WHERE id = 1")
                    res = cursor.fetchone()
                    if res: interval = int(res['collect_interval'])
            finally: conn.close()

            now = datetime.now(engine.tz)
            if 8 <= now.hour < 24:
                engine.run_cycle()
                print(f">>> Sleeping for {interval} seconds as per system config...")
                time.sleep(interval)
            else:
                time.sleep(600)
        except Exception as e:
            print(f"Main Loop Error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()

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
            page.goto(url, timeout=60000, wait_until="networkidle")
            time.sleep(4)
            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')
            all_text = soup.get_text(separator=' ')
            
            # 정규표현식으로 (증권사명) (거래량) 추출
            broker_pattern = re.compile(r'([가-힣]{2,10}(?:증권|투자|인베스트|제이피|모간|메릴|씨티|골드만|노무라|에스지))\s*([0-9,]+)')
            
            # 1. 매도 상위 (보통 텍스트 앞부분에 위치)
            sell_part = all_text.split("매수")[0] if "매수" in all_text else all_text
            sell_brokers = []
            sell_found = broker_pattern.findall(sell_part)
            for name, vol in sell_found[:5]:
                sell_brokers.append(f"{name}({vol})")
            
            # 2. 매수 상위 (매수 키워드 이후)
            buy_part = all_text.split("매수")[-1] if "매수" in all_text else ""
            buy_brokers = []
            buy_found = broker_pattern.findall(buy_part)
            for name, vol in buy_found[:5]:
                buy_brokers.append(f"{name}({vol})")

            # 3. 외국계 합 (매도/매수 각각 추출)
            f_sell_total = 0
            f_buy_total = 0
            
            # 매도쪽 외국계 합
            f_sell_match = re.search(r'외국계 합\s*([0-9,]+)', sell_part)
            if f_sell_match: f_sell_total = int(f_sell_match.group(1).replace(',', ''))
            
            # 매수쪽 외국계 합
            f_buy_match = re.search(r'외국계 합\s*([0-9,]+)', buy_part)
            if f_buy_match: f_buy_total = int(f_buy_match.group(1).replace(',', ''))

            # 최종 문자열 포맷팅 (매도/매수 구분)
            brokers_str = f"매도: {','.join(sell_brokers)} / 매수: {','.join(buy_brokers)}"
            
            # DB에는 순매수량(매수합 - 매도합)을 저장하거나, 매수합을 저장 (여기선 매수합 저장)
            f_net = f_buy_total - f_sell_total

            print(f">>> [FULL DATA] {code} | Net: {f_net} | {brokers_str}")
            return {'f_net': f_net, 'brokers': brokers_str}
            
        except Exception as e:
            return None

    def run_cycle(self):
        now_str = datetime.now(self.tz).strftime('%Y-%m-%d %H:%M')
        print(f"\n>>> Cycle Start: {now_str}")
        
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
                    time.sleep(random.uniform(1.5, 3.0))
                browser.close()
            
            self.log_to_db("INFO", f"정기 스캔 완료: {sc}개 종목 풀데이터(매도/매수) 수집됨")
            
            hour_key = datetime.now(self.tz).strftime('%Y-%m-%d %H')
            with conn.cursor() as cursor:
                cursor.execute("INSERT INTO collector_hourly_stats (stat_hour, row_count) VALUES (%s, %s) ON DUPLICATE KEY UPDATE row_count = row_count + %s", (hour_key, sc, sc))
            conn.commit()
        finally: conn.close()

def main():
    engine = DaumVeteranScraper()
    print(">>> Python Scraper v47.1 (Full Broker Data) Started.")
    while True:
        try:
            conn = engine.get_db_connection()
            try:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute("SELECT collect_interval FROM collector_config WHERE id=1")
                    interval = int(cursor.fetchone()['collect_interval'])
            except: interval = 180
            finally: conn.close()

            now = datetime.now(engine.tz)
            if 8 <= now.hour < 20:
                engine.run_cycle()
                time.sleep(interval)
            else:
                time.sleep(600)
        except Exception as e:
            time.sleep(60)

if __name__ == "__main__":
    main()

import os
import time
import argparse
import pymysql
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright

# DB 설정 (Host 모드 기준)
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

# 캡처 옵션 (Host 모드 최적화)
BASE_URL = "http://127.0.0.1:80/stockPlus" 
SAVE_DIR = "/app/snapshots"

class SnapshotEngine:
    def __init__(self):
        self.save_path = SAVE_DIR
        if not os.path.exists(self.save_path):
            os.makedirs(self.save_path, exist_ok=True)

    def get_db_connection(self):
        try: return pymysql.connect(**DB_CONFIG)
        except: return pymysql.connect(host='127.0.0.1', port=3306, user='lms', password='cnbas.2015', database='stockplus')

    def log_to_db(self, message):
        print(f">>> [SnapshotEngine] {message}", flush=True)
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = "INSERT INTO collector_logs (log_level, message, created_at) VALUES (%s, %s, NOW())"
                cursor.execute(sql, ("INFO", f"[스냅샷] {message}"))
            conn.commit()
        except: pass
        finally: conn.close()

    def do_login(self, page):
        """[v18.0] bluetrio 계정 자동 로그인"""
        try:
            print(f">>> [Login] Accessing {BASE_URL}/login ...", flush=True)
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=60000)
            page.fill('input[placeholder="아이디를 입력하세요"]', 'bluetrio')
            page.fill('input[placeholder="비밀번호를 입력하세요"]', 'cnbas.2015')
            page.click('button:has-text("로그인")')
            page.wait_for_timeout(5000) 
            print(">>> [Login] Success as Admin(bluetrio)", flush=True)
            return True
        except Exception as e:
            print(f">>> [Login] Failed: {str(e)}", flush=True)
            return False

    def capture_heatmap(self):
        self.log_to_db("업종 등락 히트맵 촬영 시작")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            context = browser.new_context(viewport={'width': 1400, 'height': 1200})
            page = context.new_page()
            try:
                if self.do_login(page):
                    page.goto(f"{BASE_URL}/admin/intel", wait_until="networkidle", timeout=60000)
                    page.wait_for_selector("#industry-heatmap-area", timeout=30000)
                    time.sleep(5) 
                    target_path = f"{self.save_path}/heatmap_latest.png"
                    page.locator("#industry-heatmap-area").screenshot(path=target_path)
                    self.log_to_db(f"히트맵 촬영 완료: {target_path}")
            except Exception as e: self.log_to_db(f"히트맵 촬영 실패: {str(e)}")
            finally: browser.close()

    def capture_ranking_list(self):
        """[v18.0] Next Leaders 랭킹 리스트 촬영 (10등까지 최적화)"""
        self.log_to_db("Next Leaders 랭킹 리스트 촬영 시작")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            # 10개 리스트가 딱 맞게 담기도록 높이 920 설정
            context = browser.new_context(viewport={'width': 1400, 'height': 920})
            page = context.new_page()
            try:
                if self.do_login(page):
                    page.goto(f"{BASE_URL}/admin/next-leaders", wait_until="networkidle", timeout=60000)
                    page.wait_for_selector("#next-leader-ranking-area", timeout=30000)
                    time.sleep(5) 
                    target_path = f"{self.save_path}/ranking_latest.png"
                    page.locator("#next-leader-ranking-area").screenshot(path=target_path)
                    self.log_to_db(f"랭킹 리스트 촬영 완료: {target_path}")
                else: self.log_to_db("로그인 실패로 촬영을 중단합니다.")
            except Exception as e: self.log_to_db(f"랭킹 리스트 촬영 실패: {str(e)}")
            finally: browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["heatmap", "ranking"], required=True)
    args = parser.parse_args()

    engine = SnapshotEngine()
    if args.mode == "heatmap": engine.capture_heatmap()
    else: engine.capture_ranking_list()

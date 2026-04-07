import os
import time
import argparse
import pymysql
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright
import requests
from bs4 import BeautifulSoup
# import playwright_stealth as ps # 문제 발생 시 주석 해제하여 사용

# DB 설정 (Host 모드 기준)
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

# 캡처 옵션 (Host 모드 및 HTTPS 대응)
BASE_URL = "https://stockplus.158.180.66.45.nip.io" 
BACKEND_API_URL = "http://127.0.0.1:8080/api/dashboard"
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
        """[v18.0 Premium] 히트맵 1270px 최종 정밀 캡처"""
        self.log_to_db("업종 등락 히트맵 1270px 최종 촬영 시작")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            # [v16.22 Patch] ignore_https_errors=True 추가 (HTTPS 인증서 이슈 돌파)
            context = browser.new_context(
                viewport={'width': 1400, 'height': 1600},
                ignore_https_errors=True
            )
            page = context.new_page()
            # ps.stealth(page) # 자동화 탐지 우회 필요 시 주석 해제
            
            try:
                if self.do_login(page):
                    page.goto(f"{BASE_URL}/admin/intel", wait_until="networkidle", timeout=60000)
                    # 촬영 전 레이아웃 조정
                    page.evaluate("""() => {
                        const area = document.querySelector('#industry-heatmap-area');
                        if (area) {
                            area.style.height = 'auto';
                            area.style.minHeight = '1270px'; 
                            area.style.maxHeight = 'none';
                            area.style.overflow = 'visible';
                            area.style.display = 'flex';
                            area.style.flexDirection = 'column';
                            const grid = area.querySelector('.grid');
                            if (grid) {
                                grid.style.display = 'grid';
                                grid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
                                grid.style.gap = '16px';
                                grid.style.flex = '1'; 
                                const boxes = grid.querySelectorAll('div[class*="bg-"]');
                                boxes.forEach(box => {
                                    box.style.aspectRatio = '1.4 / 1'; 
                                    box.style.padding = '20px';
                                    const span = box.querySelector('span');
                                    if (span) span.style.fontSize = '10px'; 
                                    const rate = box.querySelector('div span');
                                    if (rate) rate.style.fontSize = '12px'; 
                                });
                            }
                        }
                        document.body.style.height = 'auto';
                        document.body.style.overflow = 'visible';
                    }""")
                    page.wait_for_selector("#industry-heatmap-area", timeout=30000)
                    time.sleep(5) 
                    target_path = f"{self.save_path}/heatmap_latest.png"
                    heatmap_element = page.locator("#industry-heatmap-area")
                    box = heatmap_element.bounding_box()
                    if box:
                        box['height'] = 1270
                        page.screenshot(path=target_path, clip=box)
                        self.log_to_db(f"1270px 최종 촬영 완료: {target_path}")
                    else: heatmap_element.screenshot(path=target_path)
                else: self.log_to_db("로그인 실패로 촬영을 중단합니다.")
            except Exception as e: self.log_to_db(f"히트맵 촬영 실패: {str(e)}")
            finally: browser.close()

    def capture_ranking_list(self):
        """[v18.0] Next Leaders 랭킹 리스트 정밀 크롭 촬영 (여백 제거 + 폰트 상향)"""
        self.log_to_db("Next Leaders 랭킹 리스트 정밀 촬영 시작")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            # [v16.22 Patch] ignore_https_errors=True 추가
            context = browser.new_context(
                viewport={'width': 1400, 'height': 1200},
                ignore_https_errors=True
            )
            page = context.new_page()
            # ps.stealth(page)
            
            try:
                if self.do_login(page):
                    page.goto(f"{BASE_URL}/admin/next-leaders", wait_until="networkidle", timeout=60000)
                    page.evaluate("""() => {
                        const area = document.querySelector('#next-leader-ranking-area');
                        if (area) {
                            const allText = area.querySelectorAll('span, div, td, th');
                            allText.forEach(el => {
                                const currentSize = window.getComputedStyle(el).fontSize;
                                const newSize = (parseFloat(currentSize) + 2) + 'px';
                                el.style.fontSize = newSize;
                            });
                            const rows = area.querySelectorAll('tr');
                            rows.forEach(row => {
                                row.style.height = 'auto';
                                row.style.paddingTop = '4px';
                                row.style.paddingBottom = '4px';
                            });
                        }
                    }""")
                    page.wait_for_selector("#next-leader-ranking-area", timeout=30000)
                    time.sleep(5) 
                    target_path = f"{self.save_path}/ranking_latest.png"
                    ranking_element = page.locator("#next-leader-ranking-area")
                    box = ranking_element.bounding_box()
                    if box:
                        box['height'] -= 200
                        page.screenshot(path=target_path, clip=box)
                        self.log_to_db(f"랭킹 리스트 정밀 촬영 완료 (Font+2px, Height-200): {target_path}")
                    else: ranking_element.screenshot(path=target_path)
                else: self.log_to_db("로그인 실패로 촬영을 중단합니다.")
            except Exception as e: self.log_to_db(f"랭킹 리스트 촬영 실패: {str(e)}")
            finally: browser.close()

    def trigger_magazine_generation(self):
        """[v18.2] 백엔드에 매거진 선제적 생성 요청 (07:30 최적화)"""
        self.log_to_db("데일리 매거진 선제적 생성 트리거 시작")
        try:
            # 백엔드 API 호출하여 캐시 생성 유도
            res = requests.get(f"{BACKEND_API_URL.replace('/api/dashboard', '/api/admin')}/magazine/data", timeout=120)
            if res.ok:
                self.log_to_db("데일리 매거진 생성 및 캐싱 완료 (07:30)")
            else:
                self.log_to_db(f"매거진 생성 트리거 실패: {res.status_code}")
        except Exception as e:
            self.log_to_db(f"매거진 생성 트리거 중 오류: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["heatmap", "ranking", "trigger_report"], required=True)
    args = parser.parse_args()
    engine = SnapshotEngine()
    if args.mode == "heatmap": engine.capture_heatmap()
    elif args.mode == "ranking": engine.capture_ranking_list()
    elif args.mode == "trigger_report": engine.trigger_magazine_generation()

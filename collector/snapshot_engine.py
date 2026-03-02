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
        """[v18.0 Premium] 히트맵 1270px 최종 정밀 캡처"""
        self.log_to_db("업종 등락 히트맵 1270px 최종 촬영 시작")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            # 뷰포트를 타겟 높이보다 넉넉하게 설정
            context = browser.new_context(viewport={'width': 1400, 'height': 1600})
            page = context.new_page()
            try:
                if self.do_login(page):
                    page.goto(f"{BASE_URL}/admin/intel", wait_until="networkidle", timeout=60000)
                    
                    # 1. 1270px 높이 강제 및 폰트 10px 조정
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
                        box['height'] = 1270 # 정확히 1270으로 크롭
                        page.screenshot(path=target_path, clip=box)
                        self.log_to_db(f"1270px 최종 촬영 완료: {target_path}")
                    else:
                        heatmap_element.screenshot(path=target_path)
                else: self.log_to_db("로그인 실패로 촬영을 중단합니다.")
            except Exception as e: self.log_to_db(f"히트맵 촬영 실패: {str(e)}")
            finally: browser.close()

    def capture_ranking_list(self):
        """[v18.0] Next Leaders 랭킹 리스트 정밀 크롭 촬영 (여백 제거 + 폰트 상향)"""
        self.log_to_db("Next Leaders 랭킹 리스트 정밀 촬영 시작")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            # 10개 항목에 딱 맞는 타이트한 뷰포트
            context = browser.new_context(viewport={'width': 1400, 'height': 1200})
            page = context.new_page()
            try:
                if self.do_login(page):
                    page.goto(f"{BASE_URL}/admin/next-leaders", wait_until="networkidle", timeout=60000)
                    
                    # [v18.0] 촬영 전 폰트 크기 2px 상향 조정
                    page.evaluate("""() => {
                        const area = document.querySelector('#next-leader-ranking-area');
                        if (area) {
                            // 모든 텍스트 요소의 폰트 크기를 상대적으로 2px 상향
                            const allText = area.querySelectorAll('span, div, td, th');
                            allText.forEach(el => {
                                const currentSize = window.getComputedStyle(el).fontSize;
                                const newSize = (parseFloat(currentSize) + 2) + 'px';
                                el.style.fontSize = newSize;
                            });
                            // 테이블 행 높이도 소폭 조정하여 겹침 방지
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
                    
                    # 실제 테이블 영역만 칼같이 잘라내기 (여백 총 200px 감산)
                    box = ranking_element.bounding_box()
                    if box:
                        box['height'] -= 200 # 추가 80px 감산 (총 200px 제거)
                        page.screenshot(path=target_path, clip=box)
                        self.log_to_db(f"랭킹 리스트 정밀 촬영 완료 (Font+2px, Height-200): {target_path}")
                    else:
                        ranking_element.screenshot(path=target_path)
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

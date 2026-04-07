import pymysql
import requests
import time
from datetime import datetime, timedelta

DB_CONFIG = {'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'}
BACKEND_URL = "http://localhost:8080/api/dashboard" # 백엔드 API 주소

def get_db_conn():
    return pymysql.connect(**DB_CONFIG)

def fetch_past_data(stock_code):
    # 백엔드의 KIS 서비스 기능을 활용하거나 직접 KIS API 호출 (여기서는 백엔드 토큰 활용 가정)
    # 실제 운영 환경에서는 백엔드에 '과거 데이터 수집 엔드포인트'를 하나 만드는 것이 깔끔함
    # 우선은 백엔드를 통해 현재가와 수급을 가져오는 구조를 확장하여 구현
    print(f">>> Fetching data for {stock_code} from 20260109...")
    
    # 1월 9일부터 오늘까지의 일별 데이터를 가져오는 로직 (실제 KIS API 호출 부분)
    # 실제로는 백엔드에 구현된 KisStockService의 기능을 REST로 호출하거나
    # 파이썬에서 직접 KIS API를 쏘는 방식을 사용합니다.
    
    # [임시/예시] 실제 구현 시에는 KIS '일별 주가' API를 사용합니다.
    # 여기서는 구조만 잡고, 실제 데이터는 백엔드와 연동하여 긁어오도록 구성합니다.
    pass

def run_dump():
    conn = get_db_conn()
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SELECT stock_code FROM watchlist GROUP BY stock_code")
            stocks = cursor.fetchall()
            
        print(f">>> Total {len(stocks)} stocks to process.")
        # 각 종목별로 1/9 ~ 오늘까지의 데이터를 수집하여 daily_stock_investor에 INSERT/IGNORE
        # (실제 KIS API 연동 코드가 들어가야 함)
    finally:
        conn.close()

if __name__ == "__main__":
    print(">>> Starting Historical Data Dump (Since 2026-01-09)...")
    # run_dump() # 실제 실행 시 주석 해제

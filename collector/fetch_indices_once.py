import sys
import os
import requests
import pymysql
from datetime import datetime

# DB 설정 (컨테이너 내부 통신 기준)
DB_CONFIG = {
    'host': 'mysql', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def get_db_connection():
    return pymysql.connect(**DB_CONFIG)

def fetch_and_save():
    print(">>> [Sync] Starting Global Index Sync via Public API...")
    indices = []
    
    try:
        # 1. 환율 및 지수 수집 (안정적인 우회 경로 활용)
        # S&P 500 (^GSPC), Nasdaq (^IXIC), USD/KRW (USDKRW=X)
        targets = {
            'S&P 500': 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1m&range=1d',
            'Nasdaq': 'https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?interval=1m&range=1d',
            'USD/KRW': 'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1m&range=1d'
        }
        
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        for name, url in targets.items():
            try:
                res = requests.get(url, headers=headers, timeout=10).json()
                meta = res['chart']['result'][0]['meta']
                current = meta['regularMarketPrice']
                prev_close = meta['previousClose']
                change = current - prev_close
                rate = (change / prev_close) * 100
                
                indices.append({
                    'name': name,
                    'val': round(current, 2),
                    'change': round(change, 2),
                    'rate': round(rate, 2)
                })
                print(f"   - Captured {name}: {current}")
            except: 
                print(f"   - Failed to capture {name}")
                continue

        # 2. DB 저장
        if indices:
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    for idx in indices:
                        cursor.execute("""
                            INSERT INTO market_index_history 
                            (index_name, index_value, change_val, change_rate, captured_at) 
                            VALUES (%s, %s, %s, %s, NOW())
                        """, (idx['name'], idx['val'], idx['change'], idx['rate']))
                    conn.commit()
                print(">>> [Success] All Data Saved.")
            finally:
                conn.close()
                
    except Exception as e:
        print(f">>> [Fatal Error] {e}")

if __name__ == "__main__":
    fetch_and_save()

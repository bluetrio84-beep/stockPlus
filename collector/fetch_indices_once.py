import sys
import os
import requests
import pymysql
import re
from datetime import datetime

# DB 설정 (지능형 전환: 도커 내부 'mysql' -> 실패 시 '127.0.0.1')
DB_CONFIGS = [
    {'host': 'mysql', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'},
    {'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'}
]

def get_db_connection():
    for config in DB_CONFIGS:
        try:
            return pymysql.connect(**config)
        except:
            continue
    raise Exception("Could not connect to any MySQL instance.")

def fetch_google_finance(symbol, name):
    """Google Finance를 통한 실시간 지수/환율 수집"""
    url = f'https://www.google.com/finance/quote/{symbol}'
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        # 현재가 및 전일종가 파싱
        match = re.search(r'data-last-price=\"([\d,.]+)\"', res.text)
        prev_match = re.search(r'data-last-normal-market-day-price=\"([\d,.]+)\"', res.text)
        
        if match:
            current = float(match.group(1).replace(',', ''))
            prev = float(prev_match.group(1).replace(',', '')) if prev_match else current
            change = current - prev
            rate = (change / prev) * 100 if prev != 0 else 0
            return {'name': name, 'val': round(current, 2), 'change': round(change, 2), 'rate': round(rate, 2)}
    except Exception as e:
        print(f"   - Failed to fetch {name} from Google: {e}")
    return None

def fetch_and_save():
    print(">>> [Sync] Starting Global Index Sync via Google Finance...")
    indices = []
    
    # 수집 대상 정의 (구글 파이낸스 심볼)
    targets = [
        {'name': 'S&P 500', 'symbol': '.INX:INDEXSP'},
        {'name': 'Nasdaq', 'symbol': '.IXIC:INDEXNASDAQ'},
        {'name': 'USD/KRW', 'symbol': 'USD-KRW'}
    ]
    
    for t in targets:
        data = fetch_google_finance(t['symbol'], t['name'])
        if data:
            indices.append(data)
            print(f"   - Captured {data['name']}: {data['val']} ({data['change']})")

    # DB 저장
    if indices:
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                for idx in indices:
                    cursor.execute("""
                        INSERT INTO market_index_history 
                        (index_name, index_value, change_val, change_rate, captured_at) 
                        VALUES (%s, %s, %s, %s, NOW())
                    """, (idx['name'], idx['val'], idx['change'], idx['rate']))
                conn.commit()
            print(">>> [Success] All Data Saved to DB.")
        except Exception as e:
            print(f">>> [DB Error] {e}")
        finally:
            if 'conn' in locals() and conn.open: conn.close()

if __name__ == "__main__":
    fetch_and_save()

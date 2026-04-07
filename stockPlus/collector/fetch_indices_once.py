import sys
import os
import requests
import pymysql
import re
import json
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
    """Google Finance 구조화된 데이터를 통한 실시간 지수/환율 수집 (v16.37)"""
    url = f'https://www.google.com/finance/quote/{symbol}'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        
        # [v16.37] AF_initDataCallback 내부의 핵심 데이터 배열 추출
        # 패턴: [현재가, 등락폭, 등락률, ...]
        # 특정 심볼 뒤에 오는 첫 번째 숫자 배열을 찾음
        clean_symbol = symbol.split(':')[0].replace('.', '\\.')
        pattern = rf'\"{clean_symbol}\",.*?\[([\d\.-]+),([\d\.-]+),([\d\.-]+)'
        match = re.search(pattern, res.text)
        
        if match:
            current = float(match.group(1))
            change = float(match.group(2))
            rate = float(match.group(3))
            print(f"   [Found] {name}: {current} ({change} / {rate}%)")
            return {'name': name, 'val': round(current, 2), 'change': round(change, 2), 'rate': round(rate, 2)}
        else:
            # Fallback: 기존 data-last-price 방식 시도
            price_match = re.search(r'data-last-price=\"([\d,.]+)\"', res.text)
            if price_match:
                current = float(price_match.group(1).replace(',', ''))
                print(f"   [Fallback] {name}: {current} (Change not found)")
                return {'name': name, 'val': round(current, 2), 'change': 0.0, 'rate': 0.0}
                
    except Exception as e:
        print(f"   - Failed to fetch {name} from Google: {e}")
    return None

def fetch_and_save():
    print(f">>> [Sync] Global Index Sync via Google Data Engine... ({datetime.now()})")
    indices = []
    
    # 수집 대상 정의
    targets = [
        {'name': 'S&P 500', 'symbol': '.INX:INDEXSP'},
        {'name': 'Nasdaq', 'symbol': '.IXIC:INDEXNASDAQ'},
        {'name': 'USD/KRW', 'symbol': 'USD-KRW'}
    ]
    
    for t in targets:
        data = fetch_google_finance(t['symbol'], t['name'])
        if data:
            indices.append(data)

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
            print(">>> [Success] Accurate Data Saved to DB.")
        except Exception as e:
            print(f">>> [DB Error] {e}")
        finally:
            if 'conn' in locals() and conn.open: conn.close()

if __name__ == "__main__":
    fetch_and_save()

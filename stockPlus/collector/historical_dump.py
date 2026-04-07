import pymysql
import requests
import time
import json
from datetime import datetime

# 설정 (보안상 환경변수에서 읽어오거나 직접 설정)
APP_KEY = "PSXBF1Xl7ocxTWS9C2LW1y1xFpSqZFXPkZ1w"
APP_SECRET = "CetFK6D1LlbULLSdmrs68UzbAN/LDA0lyEgrXxx3fgw0KbSRKulCtAwL3hs/N4abplVrFpvLWOWW35NOLraF+UlHkY3trrZ20+m56Vm60PJPPaIq5wIY+zcnAi/2d11/kla5yEaTvyHzWYFL/jr5Xc8dYJ4aUZudRG4FS8Y/0zQraoF5XQg="
DB_CONFIG = {'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'}
API_URL = "https://openapi.koreainvestment.com:9443"

def get_access_token():
    url = f"{API_URL}/oauth2/tokenP"
    body = {"grant_type": "client_credentials", "appkey": APP_KEY, "appsecret": APP_SECRET}
    res = requests.post(url, json=body).json()
    return res.get('access_token')

def get_watchlist_codes():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT stock_code FROM watchlist")
            return [row[0] for row in cursor.fetchall()]
    finally: conn.close()

def save_to_db(stocks_data):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            sql = """
            INSERT IGNORE INTO daily_stock_investor 
            (stock_code, bsop_date, close_price, individual_net_buy, foreign_net_buy, institution_net_buy, volume)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.executemany(sql, stocks_data)
        conn.commit()
    finally: conn.close()

def fetch_historical(token, code):
    url = f"{API_URL}/uapi/domestic-stock/v1/quotations/inquire-investor"
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": APP_KEY,
        "appsecret": APP_SECRET,
        "tr_id": "FHKST01010900",
        "custtype": "P"
    }
    params = {
        "FID_COND_MRKT_DIV_CODE": "J",
        "FID_INPUT_ISCD": code
    }
    
    try:
        res = requests.get(url, headers=headers, params=params).json()
        if 'output' in res:
            data_list = []
            for d in res['output']:
                date = d['stck_bsop_date']
                if date >= "20260109":
                    data_list.append((
                        code, date, float(d['stck_clpr']), 
                        int(d['prsn_ntby_qty']), int(d['frgn_ntby_qty']), 
                        int(d['orgn_ntby_qty']), int(d['acml_vol'])
                    ))
            return data_list
    except Exception as e:
        print(f"Error fetching {code}: {e}")
    return []

def main():
    token = get_access_token()
    if not token:
        print("Failed to get access token.")
        return

    codes = get_watchlist_codes()
    print(f"Starting dump for {len(codes)} stocks...")
    
    all_data = []
    for i, code in enumerate(codes):
        print(f"[{i+1}/{len(codes)}] Fetching {code}...")
        data = fetch_historical(token, code)
        if data:
            all_data.extend(data)
        
        # KIS API 스로틀링 방지 (초당 5건 제한)
        time.sleep(0.2)
        
        # 10개 종목마다 DB 저장
        if (i + 1) % 10 == 0:
            save_to_db(all_data)
            all_data = []
            print(f"Saved progress...")

    if all_data:
        save_to_db(all_data)
    print(">>> Historical Data Dump Completed!")

if __name__ == "__main__":
    main()

import requests
import pymysql
import time
import sys

# DB 설정 (charset과 use_unicode 명시)
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 
    'database': 'stockplus', 'charset': 'utf8mb4', 'use_unicode': True
}
BACKEND_API_URL = "http://127.0.0.1:8080/api/dashboard"

def repair():
    print(">>> [Deep-Repair] Connecting to DB with UTF8MB4...")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        # 세션 인코딩 강제 설정
        with conn.cursor() as cursor:
            cursor.execute("SET NAMES utf8mb4")
            cursor.execute("SET CHARACTER SET utf8mb4")
            cursor.execute("SET character_set_connection=utf8mb4")
            
            cursor.execute("SELECT stock_code, stock_name FROM stock_master")
            stocks = cursor.fetchall()
        
        total = len(stocks)
        print(f">>> [Deep-Repair] Target stocks: {total}")
        
        for i, s in enumerate(stocks):
            code = s[0] # DictCursor가 아님
            try:
                resp = requests.get(f"{BACKEND_API_URL}/stocks/{code}/price?exchangeCode=UN", timeout=5)
                # 응답 인코딩 확실히 지정
                resp.encoding = 'utf-8'
                res = resp.json()
                
                m_cap = int(float(str(res.get('marketCap', '0')).replace(',', '')))
                # 업종명 한글 보존 처리
                ind_name = str(res.get('industryName', '')).strip()
                
                if m_cap > 0 or ind_name:
                    with conn.cursor() as cursor:
                        sql = "UPDATE stock_master SET market_cap = %s, industry_name = %s WHERE stock_code = %s"
                        cursor.execute(sql, (m_cap, ind_name, code))
                    conn.commit()
                
                if (i+1) % 100 == 0:
                    print(f"--- [OK] {i+1}/{total}: {s[1]} -> {ind_name}")
                    sys.stdout.flush()
                
                time.sleep(0.03) # 속도 상향
            except: continue
            
        print("\n>>> [Success] Deep Repair Finished!")
    except Exception as e:
        print(f">>> [Critical Error] {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    repair()

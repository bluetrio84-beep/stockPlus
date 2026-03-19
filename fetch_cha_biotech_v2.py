import os
import requests
import json

APP_KEY = os.getenv('KIS_APP_KEY')
APP_SECRET = os.getenv('KIS_APP_SECRET')
API_URL = "https://openapi.koreainvestment.com:9443"

def get_token():
    url = f"{API_URL}/oauth2/tokenP"
    headers = {"Content-Type": "application/json"}
    body = {
        "grant_type": "client_credentials",
        "appkey": APP_KEY,
        "appsecret": APP_SECRET
    }
    res = requests.post(url, headers=headers, data=json.dumps(body))
    return res.json().get('access_token')

def fetch_investor(token, code):
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
    res = requests.get(url, headers=headers, params=params)
    return res.json()

if __name__ == "__main__":
    token = get_token()
    if token:
        data = fetch_investor(token, "085660")
        if 'output' in data and len(data['output']) > 0:
            # 첫 번째 아이템의 모든 키값을 출력
            print("Fields in response:", list(data['output'][0].keys()))
            # 특정 키가 있는지 확인
            pgm_fields = [k for k in data['output'][0].keys() if 'pgm' in k.lower()]
            print("PGM related fields:", pgm_fields)
            if pgm_fields:
                for f in pgm_fields:
                    print(f"{f}: {data['output'][0][f]}")
        else:
            print("Output not found or empty.")
    else:
        print("Failed to get token.")

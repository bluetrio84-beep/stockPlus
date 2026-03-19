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
        # 상위 1개 아이템만 상세히 출력
        if 'output' in data and len(data['output']) > 0:
            print(json.dumps(data['output'][0], indent=2, ensure_ascii=False))
        else:
            print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("Failed to get token.")

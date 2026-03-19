import os
import requests
import json

# 이미 쉘에 잡혀있는 값을 그대로 사용
APP_KEY = os.environ.get('KIS_APP_KEY')
APP_SECRET = os.environ.get('KIS_APP_SECRET')
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

def fetch_program_trading(token, code):
    # TR_ID를 FHKST01010109 (종목별 프로그램 매매추이)로 설정
    url = f"{API_URL}/uapi/domestic-stock/v1/quotations/program-trade-by-stock"
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": APP_KEY,
        "appsecret": APP_SECRET,
        "tr_id": "FHKST01010109",
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
        # 차바이오텍 (085660) 프로그램 매매 조회
        data = fetch_program_trading(token, "085660")
        if 'output' in data and len(data['output']) > 0:
            print(">>> 차바이오텍 프로그램 매매 (실제 데이터):")
            print(json.dumps(data['output'][0], indent=2, ensure_ascii=False))
        else:
            print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("Failed to get token.")

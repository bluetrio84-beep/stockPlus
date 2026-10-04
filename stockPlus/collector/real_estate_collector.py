"""
StockPlus 부동산 시장 동향 통합 수집 엔진 (v16.72)
- KB부동산 & 한국부동산원(REB) 주간/월간/연간 지표 동기화
- 전국 시·군·구 165개 전수 변동률 추적
- 최근 아파트 실거래가(신고가, 급락, 상승거래) 상시 수집 및 적재
"""

import pymysql
from real_estate_full_collector import populate_all_historical_periods, populate_real_estate_transactions

DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def get_db():
    return pymysql.connect(**DB_CONFIG)

def collect_kb_real_estate():
    """KB부동산 주간/월간 시세 동향 수집"""
    print(">>> [Collector] KB부동산 주간/월간 시세 동향 정기 수집...")
    populate_all_historical_periods()

def collect_reb_real_estate():
    """한국부동산원(REB) 주간 시세 동향 수집"""
    print(">>> [Collector] 한국부동산원(REB) 주간 시세 동향 정기 수집...")
    # 시계열 함수에서 KB와 REB를 동시에 완벽 적재
    pass

def collect_real_estate_transactions():
    """최신 아파트 실거래가 상시 수집"""
    print(">>> [Collector] 아파트 실거래가(신고가/급락/상승) 정기 상시 수집...")
    populate_real_estate_transactions()

if __name__ == '__main__':
    collect_kb_real_estate()
    collect_real_estate_transactions()

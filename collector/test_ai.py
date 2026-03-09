from ai_engine import AIEngine
import pymysql

ai = AIEngine()
ai.connect()
code = '069620' # 대웅제약
# 실제 테이블 데이터 조회
with ai.conn.cursor(pymysql.cursors.DictCursor) as cursor:
    cursor.execute("SELECT current_price, volume, foreign_net_buy FROM stock_supply_demand WHERE stock_code=%s ORDER BY id DESC LIMIT 1", (code,))
    info = cursor.fetchone()
    if info:
        res = ai.get_ensemble_score_details(code, float(info['current_price']), float(info['foreign_net_buy']), float(info['volume']))
        print(f">>> [TEST] Result for {code}: {res}")

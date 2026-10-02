import pymysql

DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def migrate_db():
    conn = pymysql.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        # 1. period_type 컬럼 추가 (WEEKLY, MONTHLY, YEARLY)
        print(">>> 1. Checking period_type in real_estate_weekly_trend...")
        try:
            cur.execute("ALTER TABLE real_estate_weekly_trend ADD COLUMN period_type VARCHAR(20) DEFAULT 'WEEKLY' AFTER source_type")
            cur.execute("ALTER TABLE real_estate_weekly_trend ADD INDEX idx_source_period_date (source_type, period_type, base_date)")
            print(">>> period_type added successfully to real_estate_weekly_trend")
        except Exception as e:
            print(">>> real_estate_weekly_trend note:", e)

        print(">>> 2. Checking period_type in real_estate_market_summary...")
        try:
            cur.execute("ALTER TABLE real_estate_market_summary ADD COLUMN period_type VARCHAR(20) DEFAULT 'WEEKLY' AFTER source_type")
            cur.execute("ALTER TABLE real_estate_market_summary ADD INDEX idx_summary_period (source_type, period_type, base_date)")
            print(">>> period_type added successfully to real_estate_market_summary")
        except Exception as e:
            print(">>> real_estate_market_summary note:", e)

        cur.execute("UPDATE real_estate_weekly_trend SET period_type = 'WEEKLY' WHERE period_type IS NULL OR period_type = ''")
        cur.execute("UPDATE real_estate_market_summary SET period_type = 'WEEKLY' WHERE period_type IS NULL OR period_type = ''")
        conn.commit()
    conn.close()
    print(">>> DB Migration completed.")

if __name__ == '__main__':
    migrate_db()

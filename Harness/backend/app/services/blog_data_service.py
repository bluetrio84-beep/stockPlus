import pymysql
import json
import logging
from typing import Dict, Any, List
from app.core.config import settings

logger = logging.getLogger("blog_data_service")

class BlogDataService:
    def __init__(self):
        # StockPlus DB connection settings (same MySQL container: projects-mysql-1)
        self.db_host = settings.DB_HOST
        self.db_port = settings.DB_PORT
        self.db_user = "root"
        self.db_password = settings.DB_PASSWORD
        self.db_name = "stockplus"

    def _get_connection(self):
        return pymysql.connect(
            host=self.db_host,
            port=self.db_port,
            user=self.db_user,
            password=self.db_password,
            database=self.db_name,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )

    def fetch_daily_quant_data(self) -> Dict[str, Any]:
        """StockPlus DB에서 오늘 자 퀀트 시장 데이터 (테마, 업종, 수급, AI예측) 수집"""
        result = {
            "themes": [],
            "sectors": [],
            "supply_demand": [],
            "ai_leaders": [],
            "market_index": []
        }
        
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                # 1. 핫 테마 TOP 10 (상승률 기준)
                try:
                    cursor.execute("""
                        SELECT theme_name, avg_change_rate as change_rate, lead_stocks, updated_at
                        FROM market_themes
                        ORDER BY avg_change_rate DESC
                        LIMIT 10
                    """)
                    result["themes"] = cursor.fetchall() or []
                except Exception as e:
                    logger.error(f"Error fetching market_themes: {e}")

                # 2. WICS 업종 주도주 TOP 10
                try:
                    cursor.execute("""
                        SELECT industry_name, change_rate, lead_stocks, updated_at
                        FROM industry_quotes
                        ORDER BY change_rate DESC
                        LIMIT 10
                    """)
                    result["sectors"] = cursor.fetchall() or []
                except Exception as e:
                    logger.error(f"Error fetching industry_quotes: {e}")

                # 3. 수급 특이 종목 (외국인 + 기관 순매수)
                try:
                    cursor.execute("""
                        SELECT s.stock_code, COALESCE(m.stock_name, s.stock_code) as stock_name, 
                               s.foreign_net_buy, s.institution_net_buy as inst_net_buy, s.current_price, s.captured_at
                        FROM stock_supply_demand s
                        LEFT JOIN stock_master m ON s.stock_code = m.stock_code
                        ORDER BY s.captured_at DESC, (s.foreign_net_buy + s.institution_net_buy) DESC
                        LIMIT 10
                    """)
                    result["supply_demand"] = cursor.fetchall() or []
                except Exception as e:
                    logger.error(f"Error fetching stock_supply_demand: {e}")

                # 3.5. 외국인 연속 매집 TOP 10 (당일 순매수 + 5일/20일 누적 수급)
                try:
                    cursor.execute("""
                        SELECT s.stock_code, COALESCE(m.stock_name, s.stock_code) as stock_name,
                               s.foreign_net_buy, s.foreign_5d, s.foreign_20d,
                               s.institution_net_buy, s.current_price, s.execution_strength
                        FROM stock_supply_demand s
                        LEFT JOIN stock_master m ON s.stock_code = m.stock_code
                        ORDER BY s.captured_at DESC, s.foreign_net_buy DESC
                        LIMIT 10
                    """)
                    result["foreigner_top10"] = cursor.fetchall() or []
                except Exception as e:
                    logger.error(f"Error fetching foreigner_top10: {e}")

                # 4. AI 다음 주도주 예측 (ai_next_leaders)
                try:
                    cursor.execute("""
                        SELECT stock_code, stock_name, 'Ensemble/LSTM' as model_type, total_score as confidence_score, hit_result as predicted_signal, captured_at as created_at
                        FROM ai_next_leaders
                        ORDER BY total_score DESC
                        LIMIT 5
                    """)
                    result["ai_leaders"] = cursor.fetchall() or []
                except Exception as e:
                    logger.error(f"Error fetching ai_next_leaders: {e}")

                # 5. 시장 지수 (market_index_history)
                try:
                    cursor.execute("""
                        SELECT index_name, index_value as current_val, change_val, change_rate, captured_at
                        FROM market_index_history
                        ORDER BY captured_at DESC
                        LIMIT 4
                    """)
                    result["market_index"] = cursor.fetchall() or []
                except Exception as e:
                    logger.error(f"Error fetching market_index_history: {e}")

            conn.close()
        except Exception as e:
            logger.error(f"Failed to connect to StockPlus DB: {e}")

        return result

blog_data_service = BlogDataService()

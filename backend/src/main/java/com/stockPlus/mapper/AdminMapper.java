package com.stockPlus.mapper;

import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.Map;

@Mapper
public interface AdminMapper {

    // --- 1. 수집기 설정 및 로그 ---
    @Select("SELECT * FROM collector_config WHERE id = 1")
    Map<String, Object> getCollectorConfig();

    @Update("UPDATE collector_config SET collect_interval = #{interval} WHERE id = 1")
    void updateCollectInterval(int interval);

    @Select("SELECT * FROM collector_logs ORDER BY id DESC LIMIT 100")
    List<Map<String, Object>> getCollectorLogs();

    // 프론트엔드(AdminDashboard.jsx) 규격에 맞춰 필드명 별칭(AS) 적용
    @Select("SELECT stat_hour as hour, row_count as count FROM collector_hourly_stats ORDER BY stat_hour DESC LIMIT 24")
    List<Map<String, Object>> getHourlyStats();

    // --- 2. 수집 데이터 현황 (Admin Dashboard용) ---
    
    // 수급/거래원 (종목명 JOIN 및 캡처시간 별칭)
    @Select("SELECT sd.*, sm.stock_name, sd.captured_at as captured_at " +
            "FROM stock_supply_demand sd " +
            "JOIN stock_master sm ON sd.stock_code = sm.stock_code " +
            "ORDER BY sd.id DESC LIMIT 50")
    List<Map<String, Object>> getCollectedData();

    // 랭킹 (실제 stock_rankings 테이블에서 데이터 로드)
    @Select("SELECT stock_code, stock_name, ranking_type, rank_val as rank_value, captured_at " +
            "FROM stock_rankings ORDER BY id DESC LIMIT 50")
    List<Map<String, Object>> getRecentRankings();

    // 테마 (avg_change_rate -> change_rate 별칭)
    @Select("SELECT theme_name, avg_change_rate as change_rate, updated_at as captured_at " +
            "FROM market_themes ORDER BY avg_change_rate DESC LIMIT 50")
    List<Map<String, Object>> getRecentThemes();

    // 업종 (change_rate, captured_at 별칭)
    @Select("SELECT industry_name, change_rate, updated_at as captured_at " +
            "FROM industry_quotes ORDER BY change_rate DESC LIMIT 50")
    List<Map<String, Object>> getRecentIndustries();

    // --- 3. v12/v13 인텔리전스 쿼리 (Intelligence Dashboard용) ---
    
    @Select("SELECT i.*, " +
            "CASE WHEN WEEKDAY(NOW()) >= 5 OR HOUR(NOW()) < 9 OR HOUR(NOW()) >= 16 THEN 'WAIT' " +
            "     ELSE COALESCE(latest_sig.signal_type, 'WAIT') END as ai_signal " +
            "FROM industry_quotes i " +
            "LEFT JOIN (" +
            "  SELECT target_name, signal_type " +
            "  FROM ai_prediction " +
            "  WHERE id IN (SELECT MAX(id) FROM ai_prediction GROUP BY target_name)" +
            ") latest_sig ON i.industry_name = latest_sig.target_name " +
            "ORDER BY i.change_rate DESC")
    List<Map<String, Object>> getIndustryHeatmap();

    @Select("SELECT theme_name, " +
            "COALESCE(SUM(avg_change_rate), 0) as total_score, " +
            "GROUP_CONCAT(DISTINCT lead_stocks SEPARATOR ', ') as lead_stocks " +
            "FROM market_themes " +
            "WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 3 DAY) " +
            "GROUP BY theme_name " +
            "ORDER BY total_score DESC")
    List<Map<String, Object>> getThemePersistence();

    @Select("SELECT sm.stock_name, sd.foreign_net_buy, sd.top_brokers " +
            "FROM stock_supply_demand sd JOIN stock_master sm ON sd.stock_code = sm.stock_code " +
            "WHERE sd.captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) " +
            "ORDER BY sd.foreign_net_buy DESC LIMIT 10")
    List<Map<String, Object>> getMarketLeaders();

    @Select("SELECT ap.*, sm.stock_name " +
            "FROM ai_prediction ap " +
            "INNER JOIN (" +
            "  SELECT target_name, MAX(id) as max_id " +
            "  FROM ai_prediction " +
            "  WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) " +
            "  GROUP BY target_name" +
            ") latest ON ap.id = latest.max_id " +
            "JOIN stock_master sm ON ap.target_name = CONCAT('STOCK_', sm.stock_code) " +
            "WHERE (WEEKDAY(NOW()) < 5 AND HOUR(NOW()) >= 9 AND HOUR(NOW()) < 16) " +
            "ORDER BY ap.id DESC LIMIT 10")
    List<Map<String, Object>> getLatestAiSignals();

    @Select("SELECT COUNT(CASE WHEN change_rate > 0 THEN 1 END) as rising_count, " +
            "COUNT(CASE WHEN change_rate < 0 THEN 1 END) as falling_count, " +
            "COUNT(CASE WHEN change_rate = 0 THEN 1 END) as steady_count " +
            "FROM industry_quotes")
    Map<String, Object> getMarketBreadth();

    @Select("SELECT * FROM stock_supply_demand WHERE stock_code = #{stockCode} ORDER BY id DESC LIMIT 1")
    Map<String, Object> getLatestStockSupplyDemand(String stockCode);
}

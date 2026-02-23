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

    @Select("SELECT stat_hour as hour, row_count as count FROM collector_hourly_stats ORDER BY stat_hour DESC LIMIT 24")
    List<Map<String, Object>> getHourlyStats();

    // --- 2. 수집 데이터 현황 ---
    @Select("SELECT sd.*, sm.stock_name, sd.captured_at as captured_at " +
            "FROM stock_supply_demand sd " +
            "JOIN stock_master sm ON sd.stock_code = sm.stock_code " +
            "ORDER BY sd.id DESC LIMIT 50")
    List<Map<String, Object>> getCollectedData();

    @Select("SELECT stock_code, stock_name, ranking_type, rank_val as rank_value, captured_at " +
            "FROM stock_rankings ORDER BY id DESC LIMIT 50")
    List<Map<String, Object>> getRecentRankings();

    @Select("SELECT theme_name, avg_change_rate as change_rate, updated_at as captured_at " +
            "FROM market_themes ORDER BY avg_change_rate DESC LIMIT 50")
    List<Map<String, Object>> getRecentThemes();

    @Select("SELECT industry_name, change_rate, updated_at as captured_at " +
            "FROM industry_quotes ORDER BY change_rate DESC LIMIT 50")
    List<Map<String, Object>> getRecentIndustries();

    // --- 3. v12/v13 인텔리전스 및 대시보드 쿼리 ---
    
    @Select("SELECT i.*, " +
            "CASE WHEN latest_sig.created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'WAIT' " +
            "     WHEN WEEKDAY(NOW()) >= 5 OR HOUR(NOW()) < 9 OR HOUR(NOW()) >= 16 THEN 'WAIT' " +
            "     ELSE COALESCE(latest_sig.signal_type, 'WAIT') END as ai_signal, " +
            "COALESCE(latest_sig.prediction_score, 50) as ai_score, " +
            "COALESCE(latest_sig.prediction_score - prev_sig.prev_score, 0) as score_diff " +
            "FROM industry_quotes i " +
            "LEFT JOIN (" +
            "  SELECT target_name, signal_type, prediction_score, created_at " +
            "  FROM ai_prediction " +
            "  WHERE id IN (SELECT MAX(id) FROM ai_prediction GROUP BY target_name)" +
            ") latest_sig ON i.industry_name = latest_sig.target_name " +
            "LEFT JOIN (" +
            "  SELECT target_name, prediction_score as prev_score " +
            "  FROM ai_prediction " +
            "  WHERE id IN (SELECT MAX(id) FROM ai_prediction WHERE created_at <= DATE_SUB(NOW(), INTERVAL 20 HOUR) GROUP BY target_name)" +
            ") prev_sig ON i.industry_name = prev_sig.target_name " +
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

    // [v13.19] 실시간 AI 수급 포착: 최신성 강화 (15분 제한 & 상태 즉시 반영)
    @Select("SELECT ap.*, sm.stock_name " +
            "FROM ai_prediction ap " +
            "INNER JOIN (" +
            "  SELECT target_name, MAX(id) as max_id " +
            "  FROM ai_prediction " +
            "  WHERE created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE) " +
            "  GROUP BY target_name" +
            ") latest ON ap.id = latest.max_id " +
            "JOIN stock_master sm ON ap.target_name = CONCAT('STOCK_', sm.stock_code) " +
            "WHERE ap.signal_type NOT IN ('WAIT', 'NORMAL') " +
            "ORDER BY ap.id DESC LIMIT 10")
    List<Map<String, Object>> getLatestAiSignals();

    @Select("SELECT COUNT(CASE WHEN change_rate > 0 THEN 1 END) as rising_count, " +
            "COUNT(CASE WHEN change_rate < 0 THEN 1 END) as falling_count, " +
            "COUNT(CASE WHEN change_rate = 0 THEN 1 END) as steady_count " +
            "FROM industry_quotes")
    Map<String, Object> getMarketBreadth();

    @Select("SELECT * FROM stock_supply_demand WHERE stock_code = #{stockCode} ORDER BY id DESC LIMIT 1")
    Map<String, Object> getLatestStockSupplyDemand(String stockCode);

    @Select("(SELECT 'AMOUNT' as type, stock_name, stock_code FROM stock_rankings WHERE ranking_type = 'AMOUNT' AND captured_at = (SELECT MAX(captured_at) FROM stock_rankings WHERE ranking_type = 'AMOUNT') ORDER BY rank_val ASC LIMIT 3) " +
            "UNION ALL " +
            "(SELECT 'RISE' as type, stock_name, stock_code FROM stock_rankings WHERE ranking_type = 'RISE' AND captured_at = (SELECT MAX(captured_at) FROM stock_rankings WHERE ranking_type = 'RISE') ORDER BY rank_val ASC LIMIT 3)")
    List<Map<String, Object>> getTopRankings();

    @Select("SELECT " +
            "COALESCE(ROUND((COUNT(CASE WHEN i.change_rate > 0 THEN 1 END) / NULLIF(COUNT(*), 0)) * 100, 1), 0) as hit_rate " +
            "FROM ai_prediction ap " +
            "JOIN industry_quotes i ON ap.target_name = i.industry_name " +
            "WHERE ap.signal_type = 'BUY' " +
            "AND ap.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    Double getAiHitRate();
}

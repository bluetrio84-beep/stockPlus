package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import java.util.List;
import java.util.Map;

@Mapper
public interface AdminMapper {
    @Select("SELECT * FROM collector_config WHERE id = 1")
    Map<String, Object> getCollectorConfig();

    @Update("UPDATE collector_config SET collect_interval = #{interval}, last_heartbeat = NOW() WHERE id = 1")
    void updateCollectInterval(int interval);

    @Select("SELECT * FROM collector_logs ORDER BY id DESC LIMIT 100")
    List<Map<String, Object>> getCollectorLogs();

    @Select("SELECT stat_hour as hour, row_count as count FROM collector_hourly_stats ORDER BY stat_hour DESC LIMIT 24")
    List<Map<String, Object>> getHourlyStats();

    @Select("SELECT sd.*, sm.stock_name FROM stock_supply_demand sd LEFT JOIN stock_master sm ON sd.stock_code = sm.stock_code ORDER BY sd.id DESC LIMIT 30")
    List<Map<String, Object>> getCollectedData();

    @Select("SELECT r.ranking_type, r.rank_val as rank_value, r.stock_code, COALESCE(m.stock_name, r.stock_name, r.stock_code) as stock_name, r.captured_at " +
            "FROM stock_rankings r LEFT JOIN stock_master m ON (r.stock_code COLLATE utf8mb4_unicode_ci) = (m.stock_code COLLATE utf8mb4_unicode_ci) " +
            "ORDER BY r.id DESC LIMIT 30")
    List<Map<String, Object>> getRecentRankings();

    @Select("SELECT theme_name, avg_change_rate as change_rate, lead_stocks, updated_at as captured_at FROM market_themes ORDER BY updated_at DESC LIMIT 50")
    List<Map<String, Object>> getRecentThemes();

    @Select("SELECT industry_name, change_rate, lead_stocks, updated_at as captured_at FROM industry_quotes ORDER BY updated_at DESC LIMIT 50")
    List<Map<String, Object>> getRecentIndustries();

    @Select("SELECT industry_name, change_rate, lead_stocks FROM industry_quotes ORDER BY change_rate DESC LIMIT 200")
    List<Map<String, Object>> getIndustryHeatmap();

    // [v12] 테마 지속성 분석 (최신 대장주 필드 포함 + 300개 한도 확대)
    @Select("SELECT m1.theme_name, COALESCE(SUM(m1.avg_change_rate), 0) as total_score, COUNT(*) as appearance_count, " +
            "(SELECT lead_stocks FROM market_themes m2 WHERE m2.theme_name = m1.theme_name ORDER BY updated_at DESC LIMIT 1) as lead_stocks " +
            "FROM market_themes m1 " +
            "WHERE m1.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) " +
            "GROUP BY m1.theme_name ORDER BY total_score DESC LIMIT 300")
    List<Map<String, Object>> getThemePersistence();

    @Select("SELECT sm.stock_name, sd.foreign_net_buy, sd.top_brokers " +
            "FROM stock_supply_demand sd JOIN stock_master sm ON sd.stock_code = sm.stock_code " +
            "WHERE sd.captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) " +
            "ORDER BY sd.foreign_net_buy DESC LIMIT 10")
    List<Map<String, Object>> getMarketLeaders();

    @Select("SELECT COUNT(CASE WHEN change_rate > 0 THEN 1 END) as rising_count, " +
            "COUNT(CASE WHEN change_rate < 0 THEN 1 END) as falling_count, " +
            "COUNT(CASE WHEN change_rate = 0 THEN 1 END) as steady_count " +
            "FROM industry_quotes WHERE updated_at = (SELECT MAX(updated_at) FROM industry_quotes)")
    Map<String, Object> getMarketBreadth();
}

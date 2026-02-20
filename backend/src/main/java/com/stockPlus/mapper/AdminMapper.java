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

    // [정밀 보정] 1. 수급 (id, captured_at 존재)
    @Select("SELECT sd.*, sm.stock_name FROM stock_supply_demand sd LEFT JOIN stock_master sm ON sd.stock_code = sm.stock_code ORDER BY sd.id DESC LIMIT 30")
    List<Map<String, Object>> getCollectedData();

    // [정밀 보정] 2. 랭킹 (인코딩 충돌 해결을 위해 COLLATE 추가)
    @Select("SELECT r.ranking_type, r.rank_val as rank_value, r.stock_code, COALESCE(m.stock_name, r.stock_name, r.stock_code) as stock_name, r.captured_at " +
            "FROM stock_rankings r LEFT JOIN stock_master m ON (r.stock_code COLLATE utf8mb4_unicode_ci) = (m.stock_code COLLATE utf8mb4_unicode_ci) " +
            "ORDER BY r.id DESC LIMIT 30")
    List<Map<String, Object>> getRecentRankings();

    // [정밀 보정] 3. 테마 (updated_at 사용)
    @Select("SELECT theme_name, avg_change_rate as change_rate, lead_stocks, updated_at as captured_at FROM market_themes ORDER BY updated_at DESC LIMIT 30")
    List<Map<String, Object>> getRecentThemes();

    // [정밀 보정] 4. 업종 (updated_at 사용)
    @Select("SELECT industry_name, change_rate, lead_stocks, updated_at as captured_at FROM industry_quotes ORDER BY updated_at DESC LIMIT 30")
    List<Map<String, Object>> getRecentIndustries();
}

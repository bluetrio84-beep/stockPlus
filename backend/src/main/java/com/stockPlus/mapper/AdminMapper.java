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

    @Update("UPDATE collector_config SET ai_strategy_mode = #{mode} WHERE id = 1")
    void updateAiStrategy(@Param("mode") String mode);

    @Select("SELECT index_name, index_value, change_val, change_rate FROM market_index_history WHERE id IN (SELECT MAX(id) FROM market_index_history GROUP BY index_name)")
    List<Map<String, Object>> getLatestIndices();

    @Select("SELECT content FROM ai_daily_report WHERE report_date = #{date}")
    String getDailyReport(@Param("date") String date);

    @Insert("INSERT INTO ai_daily_report (report_date, content) VALUES (#{date}, #{content})")
    void insertDailyReport(@Param("date") String date, @Param("content") String content);

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

    // [v16.5] 드릴다운 Step 1: 업종별 주도주 문자열 조회
    @Select("SELECT lead_stocks FROM industry_quotes WHERE industry_name = #{industryName} ORDER BY updated_at DESC LIMIT 1")
    String getLeadStocksByIndustryName(@Param("industryName") String industryName);

    // [v16.5] 드릴다운 Step 2: 종목명 목록을 기반으로 실시간 시세 및 AI 점수 조회
    @Select("<script>" +
            "SELECT m.stock_name as name, m.stock_code as code, " +
            "0.0 as x, " + 
            "COALESCE(p.prediction_score, 50) as y, " +
            "COALESCE(s.volume, 0) as volume, " +
            "COALESCE(s.foreign_net_buy * s.current_price, 0) as z, " +
            "COALESCE(p.signal_type, 'WAIT') as ai_signal " +
            "FROM stock_master m " +
            "LEFT JOIN ( " +
            "  SELECT stock_code, current_price, volume, foreign_net_buy " +
            "  FROM stock_supply_demand " +
            "  WHERE id IN (SELECT MAX(id) FROM stock_supply_demand GROUP BY stock_code) " +
            ") s ON m.stock_code = s.stock_code " +
            "LEFT JOIN ( " +
            "  SELECT target_name, prediction_score, signal_type " +
            "  FROM ai_prediction " +
            "  WHERE id IN (SELECT MAX(id) FROM ai_prediction GROUP BY target_name) " +
            ") p ON CONCAT('STOCK_', m.stock_code) = p.target_name " +
            "WHERE " +
            "<foreach item='item' collection='names' separator=' OR '>" +
            "  m.stock_name LIKE CONCAT('%', #{item}, '%') " +
            "</foreach>" +
            "ORDER BY m.market_cap DESC" +
            "</script>")
    List<Map<String, Object>> getStocksByNames(@Param("names") List<String> names);

    @Select("SELECT * FROM ai_next_leaders WHERE DATE(captured_at) = #{date} ORDER BY total_score DESC")
    List<Map<String, Object>> getNextLeadersByDate(@Param("date") String date);

    // [v17.7] AI 모델별 성적표 및 사후 복기 데이터 조회
    @Select("SELECT " +
            "  'LSTM' as model_name, " +
            "  COALESCE(ROUND(COUNT(CASE WHEN lstm_score >= 70 AND hit_result = 'SUCCESS' THEN 1 END) / NULLIF(COUNT(CASE WHEN lstm_score >= 70 AND hit_result != 'PENDING' THEN 1 END), 0) * 100, 1), 0) as hit_rate, " +
            "  30 as weight " +
            "FROM ai_next_leaders " +
            "UNION ALL " +
            "SELECT " +
            "  'TCN' as model_name, " +
            "  COALESCE(ROUND(COUNT(CASE WHEN tcn_score >= 70 AND hit_result = 'SUCCESS' THEN 1 END) / NULLIF(COUNT(CASE WHEN tcn_score >= 70 AND hit_result != 'PENDING' THEN 1 END), 0) * 100, 1), 0) as hit_rate, " +
            "  40 as weight " +
            "FROM ai_next_leaders " +
            "UNION ALL " +
            "SELECT " +
            "  'XGB' as model_name, " +
            "  COALESCE(ROUND(COUNT(CASE WHEN xgb_score >= 70 AND hit_result = 'SUCCESS' THEN 1 END) / NULLIF(COUNT(CASE WHEN xgb_score >= 70 AND hit_result != 'PENDING' THEN 1 END), 0) * 100, 1), 0) as hit_rate, " +
            "  30 as weight " +
            "FROM ai_next_leaders")
    List<Map<String, Object>> getAiModelPerformance();

    @Select("SELECT stock_code, stock_name, total_score, price_at_recom, price_after_3d, hit_result, DATE_FORMAT(captured_at, '%m.%d') as date " +
            "FROM ai_next_leaders " +
            "WHERE hit_result != 'PENDING' " +
            "ORDER BY captured_at DESC LIMIT 10")
    List<Map<String, Object>> getPastRecommendations();

    // [v17.8] 공휴일 관리 (Dynamic Market Schedule)
    @Select("SELECT * FROM market_holidays WHERE holiday_year = #{year} ORDER BY holiday_date ASC")
    List<Map<String, Object>> getHolidaysByYear(@Param("year") int year);

    @Insert("INSERT INTO market_holidays (holiday_date, holiday_name, holiday_year) VALUES (#{holiday_date}, #{holiday_name}, #{holiday_year})")
    void insertHoliday(Map<String, Object> holiday);

    @Update("UPDATE market_holidays SET holiday_date = #{holiday_date}, holiday_name = #{holiday_name}, holiday_year = #{holiday_year} WHERE id = #{id}")
    void updateHoliday(Map<String, Object> holiday);

    @Delete("DELETE FROM market_holidays WHERE id = #{id}")
    void deleteHoliday(@Param("id") int id);

    @Select("SELECT COUNT(*) FROM market_holidays WHERE holiday_date = #{date}")
    int checkIsHoliday(@Param("date") String date);
}

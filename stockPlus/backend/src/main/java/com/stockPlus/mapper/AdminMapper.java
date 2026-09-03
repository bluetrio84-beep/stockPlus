package com.stockPlus.mapper;

import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.Map;

@Mapper
public interface AdminMapper {

    List<String> getAllStockCodes();

    // --- 1. 수집기 설정 및 로그 ---
    Map<String, Object> getCollectorConfig();

    void updateCollectInterval(int interval);

    void updateAiStrategy(@Param("mode") String mode);

    void updateCollectorPolicy(@Param("weekend") String weekend, @Param("holiday") String holiday);

    List<Map<String, Object>> getLatestIndices();

    String getDailyReport(@Param("date") String date);

    void insertDailyReport(@Param("date") String date, @Param("content") String content);

    List<Map<String, Object>> getCollectorLogs();

    List<Map<String, Object>> getHourlyStats();

    // --- 2. 수집 데이터 현황 ---
    List<Map<String, Object>> getCollectedData();

    List<Map<String, Object>> getRecentRankings();

    List<Map<String, Object>> getRecentThemes();

    List<Map<String, Object>> getRecentIndustries();

    // --- 3. v12/v13 인텔리전스 및 대시보드 쿼리 ---
    
    List<Map<String, Object>> getIndustryHeatmap();

    List<Map<String, Object>> getThemePersistence();

    List<Map<String, Object>> getMarketLeaders();

    List<Map<String, Object>> getLatestAiSignals();

    Map<String, Object> getMarketBreadth();

    Map<String, Object> getLatestStockSupplyDemand(String stockCode);

    List<Map<String, Object>> getTopRankings();

    Double getAiHitRate();

    // [v16.5] 드릴다운 Step 1: 업종별 주도주 문자열 조회
    String getLeadStocksByIndustryName(@Param("industryName") String industryName);

    // [v16.5] 드릴다운 Step 2: 종목명 목록을 기반으로 실시간 시세 및 AI 점수 조회
    List<Map<String, Object>> getStocksByNames(@Param("names") List<String> names);

    List<Map<String, Object>> getNextLeadersByDate(@Param("date") String date);

    void updateNextLeaderFeedback(@Param("stockCode") String stockCode, @Param("date") String date, @Param("feedbackTag") String feedbackTag);

    void insertFinancials(Map<String, Object> data);

    // [v17.7] AI 모델별 성적표 및 사후 복기 데이터 조회
    List<Map<String, Object>> getAiModelPerformance();

    List<Map<String, Object>> getPastRecommendations();

    // [v17.8] 공휴일 관리 (Dynamic Market Schedule)
    List<Map<String, Object>> getHolidaysByYear(@Param("year") int year);

    void insertHoliday(Map<String, Object> holiday);

    void updateHoliday(Map<String, Object> holiday);

    void deleteHoliday(@Param("id") int id);

    int checkIsHoliday(@Param("date") String date);

    // [v23.5] 스마트머니 90점 돌파 종목 조회 (최근 30일)
    List<Map<String, Object>> getSmartMoneyStocks();

    // [v16.53] 세력 잠행 매집 추적 종목 조회
    List<Map<String, Object>> getStealthAccumulationStocks();

    // [v16.50] AI 백테스트 종합 요약 통계
    Map<String, Object> getAiPerformanceSummary();

    // [v16.50] 장중 실시간 급상승 Next Leaders Top 10
    List<Map<String, Object>> getLiveNextLeaders();
}

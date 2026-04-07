package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface AiUsageMapper {
    // [v16.25] AI 사용량 로그 저장
    void insertUsageLog(
        @Param("usrId") String usrId,
        @Param("requestType") String requestType,
        @Param("modelName") String modelName,
        @Param("promptTokens") int promptTokens,
        @Param("completionTokens") int completionTokens,
        @Param("totalTokens") int totalTokens
    );

    // [v16.25] 최근 사용량 통계 조회 (차트용)
    List<Map<String, Object>> getDailyUsageStats();
    List<Map<String, Object>> getUsageByType();
}

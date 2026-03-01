package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.Map;

@Mapper
public interface DailyInvestorMapper {
    /**
     * 일별 주가 및 투자자 데이터를 저장하거나, 이미 존재하면 업데이트합니다.
     */
    void insertOrUpdateDailyInvestor(Map<String, Object> params);

    // [v17.7] AI 사후 복기 관련
    java.util.List<Map<String, Object>> getPendingReviewLeaders();
    void updateLeaderHitResult(@Param("id") Long id, @Param("hitResult") String hitResult, @Param("priceAfter3d") Double priceAfter3d);
}

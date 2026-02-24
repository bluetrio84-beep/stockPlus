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
}

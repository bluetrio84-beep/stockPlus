package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMarketInsightMapper {
    // 특정 타입의 최신 인사이트 조회
    String findLatestByType(@Param("usrId") String usrId, @Param("type") String type);
    
    // 인사이트 저장
    int insert(@Param("usrId") String usrId, @Param("type") String type, @Param("insightText") String insightText);
}

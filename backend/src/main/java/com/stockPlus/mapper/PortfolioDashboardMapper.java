package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface PortfolioDashboardMapper {
    List<Map<String, Object>> getMyPortfolioHoldings(@Param("usrid") String usrid);
    String getLatestMyInsight(@Param("usrid") String usrid);
}

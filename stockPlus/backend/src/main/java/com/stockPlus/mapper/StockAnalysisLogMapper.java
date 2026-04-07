package com.stockPlus.mapper;

import com.stockPlus.domain.StockAnalysisLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface StockAnalysisLogMapper {
    List<StockAnalysisLog> findByUsrIdAndStockCode(@Param("usrId") String usrId, @Param("stockCode") String stockCode);
    int insert(StockAnalysisLog log);
}

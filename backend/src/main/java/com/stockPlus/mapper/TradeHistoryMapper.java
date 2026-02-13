package com.stockPlus.mapper;

import com.stockPlus.domain.TradeHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TradeHistoryMapper {
    List<TradeHistory> findByUsrIdAndStockCode(@Param("usrId") String usrId, @Param("stockCode") String stockCode);
    TradeHistory findById(Long id);
    void insert(TradeHistory history);
    void deleteById(Long id);
}

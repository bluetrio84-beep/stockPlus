package com.stockPlus.mapper;

import com.stockPlus.domain.StockInfo;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StockInfoMapper {
    StockInfo findByStockCode(String stockCode);
    int upsert(StockInfo stockInfo); // Insert or Update
}

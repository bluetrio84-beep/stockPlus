package com.stockPlus.mapper;

import com.stockPlus.domain.StockMaster;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface StockMasterMapper {
    List<StockMaster> searchStocks(@Param("keyword") String keyword);

    @org.apache.ibatis.annotations.Select("SELECT * FROM stock_master WHERE stock_code = #{stockCode} LIMIT 1")
    StockMaster findByStockCode(String stockCode);

    @org.apache.ibatis.annotations.Insert("INSERT INTO stock_master (stock_code, stock_name, exchange_code, market_type) VALUES (#{stockCode}, #{stockName}, #{exchangeCode}, #{marketType})")
    void insert(StockMaster master);
}

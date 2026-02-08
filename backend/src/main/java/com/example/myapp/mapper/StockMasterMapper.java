package com.example.myapp.mapper;

import com.example.myapp.domain.StockMaster;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface StockMasterMapper {
    List<StockMaster> searchStocks(@Param("keyword") String keyword);

    @org.apache.ibatis.annotations.Select("SELECT * FROM stock_master WHERE stock_code = #{stockCode} LIMIT 1")
    StockMaster findByStockCode(String stockCode);
}

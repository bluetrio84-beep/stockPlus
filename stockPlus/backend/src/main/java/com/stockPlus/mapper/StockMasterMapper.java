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

    @org.apache.ibatis.annotations.Update("UPDATE stock_master SET stock_name = #{stockName}, exchange_code = #{exchangeCode}, market_type = #{marketType} WHERE stock_code = #{stockCode}")
    void update(StockMaster master);

    @org.apache.ibatis.annotations.Delete("DELETE FROM stock_master WHERE stock_code = #{stockCode}")
    void delete(String stockCode);

    @org.apache.ibatis.annotations.Select("SELECT * FROM stock_master ORDER BY market_cap DESC LIMIT #{limit} OFFSET #{offset}")
    List<StockMaster> findAllPaged(@Param("limit") int limit, @Param("offset") int offset);

    @org.apache.ibatis.annotations.Select("SELECT * FROM stock_master WHERE market_type = #{marketType} ORDER BY market_cap DESC LIMIT #{limit} OFFSET #{offset}")
    List<StockMaster> findByMarketPaged(@Param("marketType") String marketType, @Param("limit") int limit, @Param("offset") int offset);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM stock_master")
    int countAll();

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM stock_master WHERE market_type = #{marketType}")
    int countByMarket(@Param("marketType") String marketType);
}

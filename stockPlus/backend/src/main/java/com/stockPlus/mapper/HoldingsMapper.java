package com.stockPlus.mapper;

import com.stockPlus.domain.Holdings;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface HoldingsMapper {
    List<Holdings> findByUsrId(String usrId);
    Optional<Holdings> findByUsrIdAndStockCode(@Param("usrId") String usrId, @Param("stockCode") String stockCode);
    void insert(Holdings holdings);
    void update(Holdings holdings);
    void delete(@Param("usrId") String usrId, @Param("stockCode") String stockCode);
}

package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import java.util.Map;

@Mapper
public interface ShortSellingMapper {
    /**
     * 공매도 데이터를 저장하거나, 이미 존재하면 업데이트합니다.
     */
    void insertOrUpdateShortSelling(Map<String, Object> params);
}

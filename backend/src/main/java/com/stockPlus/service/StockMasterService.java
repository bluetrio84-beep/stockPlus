package com.stockPlus.service;

import com.stockPlus.domain.StockMaster;
import com.stockPlus.mapper.StockMasterMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 주식 종목 마스터 데이터(종목코드, 종목명 등)에 대한 비즈니스 로직을 처리하는 서비스입니다.
 * 현재는 단순 조회 및 검색 기능을 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class StockMasterService {
    private final StockMasterMapper stockMasterMapper; // 종목 마스터 DB 접근 매퍼

    /**
     * 키워드로 주식 종목을 검색합니다. (종목코드 또는 종목명)
     * @param keyword 검색어
     * @return 검색된 종목 리스트
     */
    public List<StockMaster> searchStocks(String keyword) {
        return stockMasterMapper.searchStocks(keyword);
    }
}

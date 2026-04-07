package com.stockPlus.controller;

import com.stockPlus.domain.StockMaster;
import com.stockPlus.service.StockMasterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.nio.charset.StandardCharsets;

/**
 * 주식 종목 마스터 데이터(종목코드, 종목명 등)를 조회하는 컨트롤러입니다.
 * 종목 검색 기능을 제공합니다.
 */
@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 모든 도메인 허용
public class StockMasterController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StockMasterController.class);

    private final StockMasterService stockMasterService; // 종목 마스터 서비스

    /**
     * 종목명 또는 종목코드로 주식을 검색합니다.
     * GET /api/stocks/search?keyword=삼성
     *
     * @param keyword 검색어 (종목명 또는 코드)
     * @return 검색된 종목 리스트
     */
    @GetMapping("/search")
    public List<StockMaster> searchStocks(@RequestParam("keyword") String keyword) {
        log.info("Stock Search Request - Keyword: [{}], Length: {}", keyword, keyword.length());
        
        // 디버깅: 입력된 검색어의 HEX 값 확인 (한글 인코딩 이슈 추적용)
        if (keyword != null) {
            StringBuilder hex = new StringBuilder();
            for (byte b : keyword.getBytes(StandardCharsets.UTF_8)) {
                hex.append(String.format("%02X ", b));
            }
            log.info("Keyword HEX: {}", hex.toString());
        }

        // 서비스 계층을 통해 검색 수행
        List<StockMaster> results = stockMasterService.searchStocks(keyword);
        log.info("Stock Search Results - Count: {}", results.size());
        return results;
    }
}

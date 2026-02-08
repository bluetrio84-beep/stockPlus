package com.example.myapp.controller;

import com.example.myapp.domain.StockMaster;
import com.example.myapp.service.StockMasterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class StockMasterController {

    private final StockMasterService stockMasterService;

    @GetMapping("/search")
    public List<StockMaster> searchStocks(@RequestParam("keyword") String keyword) {
        log.info("Stock Search Request - Keyword: [{}], Length: {}", keyword, keyword.length());
        
        // 디버깅: HEX 값 확인
        if (keyword != null) {
            StringBuilder hex = new StringBuilder();
            for (byte b : keyword.getBytes(StandardCharsets.UTF_8)) {
                hex.append(String.format("%02X ", b));
            }
            log.info("Keyword HEX: {}", hex.toString());
        }

        List<StockMaster> results = stockMasterService.searchStocks(keyword);
        log.info("Stock Search Results - Count: {}", results.size());
        return results;
    }
}

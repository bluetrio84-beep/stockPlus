package com.stockPlus.controller;

import com.stockPlus.domain.Holdings;
import com.stockPlus.domain.TradeHistory;
import com.stockPlus.service.HoldingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/holdings")
@RequiredArgsConstructor
public class HoldingsController {

    private final HoldingsService holdingsService;

    @GetMapping
    public ResponseEntity<List<Holdings>> getMyHoldings(Authentication authentication) {
        // [v36.63] Zero-Trust: 인증된 사용자 객체에서 안전하게 사용자 ID 추출
        if (authentication == null) return ResponseEntity.status(401).build();
        String usrId = authentication.getName();
        return ResponseEntity.ok(holdingsService.getHoldings(usrId));
    }

    @GetMapping("/{stockCode}/history")
    public ResponseEntity<List<TradeHistory>> getTradeHistory(
            Authentication authentication,
            @PathVariable String stockCode) {
        if (authentication == null) return ResponseEntity.status(401).build();
        String usrId = authentication.getName();
        return ResponseEntity.ok(holdingsService.getTradeHistory(usrId, stockCode));
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<?> deleteTrade(
            Authentication authentication,
            @PathVariable Long id) {
        if (authentication == null) return ResponseEntity.status(401).build();
        String usrId = authentication.getName();
        holdingsService.deleteTrade(id, usrId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/history/{id}")
    public ResponseEntity<?> updateTrade(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        
        try {
            if (authentication == null) return ResponseEntity.status(401).build();
            String usrId = authentication.getName();
            int quantity = Integer.parseInt(payload.get("quantity").toString());
            BigDecimal price = new BigDecimal(payload.get("price").toString());
            LocalDate tradeDate = LocalDate.parse(payload.get("tradeDate").toString());

            holdingsService.updateTrade(id, usrId, quantity, price, tradeDate);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(HoldingsController.class).error("Update Trade Error: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> addTrade(
            Authentication authentication,
            @RequestBody Map<String, Object> payload) {
        
        if (authentication == null) return ResponseEntity.status(401).build();
        String usrId = authentication.getName();
        String stockCode = (String) payload.get("stockCode");
        String stockName = (String) payload.get("stockName");
        int quantity = Integer.parseInt(payload.get("quantity").toString());
        BigDecimal price = new BigDecimal(payload.get("price").toString());
        
        // 날짜 파라미터 처리 (없으면 오늘)
        LocalDate tradeDate = payload.containsKey("tradeDate") 
                ? LocalDate.parse(payload.get("tradeDate").toString()) 
                : LocalDate.now();

        holdingsService.addTrade(usrId, stockCode, stockName, quantity, price, tradeDate);
        return ResponseEntity.ok().build();
    }
}

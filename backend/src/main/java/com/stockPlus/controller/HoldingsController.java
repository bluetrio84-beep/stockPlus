package com.stockPlus.controller;

import com.stockPlus.domain.Holdings;
import com.stockPlus.domain.TradeHistory;
import com.stockPlus.service.HoldingsService;
import com.stockPlus.security.JwtUtil;
import lombok.RequiredArgsConstructor;
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
    private final JwtUtil jwtUtil;

    @GetMapping
    public ResponseEntity<List<Holdings>> getMyHoldings(@RequestHeader("Authorization") String token) {
        String usrId = jwtUtil.extractUsername(token.substring(7));
        return ResponseEntity.ok(holdingsService.getHoldings(usrId));
    }

    @GetMapping("/{stockCode}/history")
    public ResponseEntity<List<TradeHistory>> getTradeHistory(
            @RequestHeader("Authorization") String token,
            @PathVariable String stockCode) {
        String usrId = jwtUtil.extractUsername(token.substring(7));
        return ResponseEntity.ok(holdingsService.getTradeHistory(usrId, stockCode));
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<?> deleteTrade(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        String usrId = jwtUtil.extractUsername(token.substring(7));
        holdingsService.deleteTrade(id, usrId);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<?> addTrade(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> payload) {
        
        String usrId = jwtUtil.extractUsername(token.substring(7));
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

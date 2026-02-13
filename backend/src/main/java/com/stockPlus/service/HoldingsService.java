package com.stockPlus.service;

import com.stockPlus.domain.Holdings;
import com.stockPlus.domain.TradeHistory;
import com.stockPlus.mapper.HoldingsMapper;
import com.stockPlus.mapper.TradeHistoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HoldingsService {

    private final HoldingsMapper holdingsMapper;
    private final TradeHistoryMapper tradeHistoryMapper;

    public List<Holdings> getHoldings(String usrId) {
        return holdingsMapper.findByUsrId(usrId);
    }

    public List<TradeHistory> getTradeHistory(String usrId, String stockCode) {
        return tradeHistoryMapper.findByUsrIdAndStockCode(usrId, stockCode);
    }

    /**
     * 매매 내역 삭제 - 보유 현황 역계산 및 업데이트
     */
    @Transactional
    public void deleteTrade(Long historyId, String usrId) {
        TradeHistory history = tradeHistoryMapper.findById(historyId);
        if (history == null || !history.getUsrId().equals(usrId)) return;

        Holdings holding = holdingsMapper.findByUsrIdAndStockCode(usrId, history.getStockCode()).orElse(null);
        if (holding != null) {
            int newQty = holding.getQuantity() - history.getQuantity();
            
            if (newQty <= 0) {
                // 수량이 0이 되면 보유 종목 삭제
                holdingsMapper.delete(usrId, history.getStockCode());
            } else {
                // 평단가 역계산: (현재총액 - 삭제할총액) / 남은수량
                BigDecimal currentTotal = holding.getAvgPrice().multiply(BigDecimal.valueOf(holding.getQuantity()));
                BigDecimal deleteTotal = history.getPrice().multiply(BigDecimal.valueOf(history.getQuantity()));
                BigDecimal newAvgPrice = currentTotal.subtract(deleteTotal).divide(BigDecimal.valueOf(newQty), 2, RoundingMode.HALF_UP);
                
                holding.setQuantity(newQty);
                holding.setAvgPrice(newAvgPrice);
                holdingsMapper.update(holding);
            }
        }
        
        tradeHistoryMapper.deleteById(historyId);
    }

    /**
     * 매매 내역 추가 (매수) - 평단가 재계산 및 내역 저장
     */
    @Transactional
    public void addTrade(String usrId, String stockCode, String stockName, int quantity, BigDecimal price, LocalDate tradeDate) {
        // 1. 개별 매매 내역 기록
        TradeHistory history = TradeHistory.builder()
                .usrId(usrId)
                .stockCode(stockCode)
                .tradeDate(tradeDate)
                .quantity(quantity)
                .price(price)
                .build();
        tradeHistoryMapper.insert(history);

        // 2. 보유 합계(Holdings) 업데이트
        Holdings existing = holdingsMapper.findByUsrIdAndStockCode(usrId, stockCode).orElse(null);

        if (existing == null) {
            // 신규 매수
            Holdings newHolding = Holdings.builder()
                    .usrId(usrId)
                    .stockCode(stockCode)
                    .stockName(stockName)
                    .quantity(quantity)
                    .avgPrice(price)
                    .build();
            holdingsMapper.insert(newHolding);
        } else {
            // 추가 매수 (평단가 계산)
            // (기존수량 * 기존평단가 + 신규수량 * 신규단가) / (기존수량 + 신규수량)
            BigDecimal oldTotal = existing.getAvgPrice().multiply(BigDecimal.valueOf(existing.getQuantity()));
            BigDecimal newTotal = price.multiply(BigDecimal.valueOf(quantity));
            int totalQty = existing.getQuantity() + quantity;

            BigDecimal newAvgPrice = oldTotal.add(newTotal).divide(BigDecimal.valueOf(totalQty), 2, RoundingMode.HALF_UP);

            existing.setQuantity(totalQty);
            existing.setAvgPrice(newAvgPrice);
            holdingsMapper.update(existing);
        }
    }
}

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

        processRollbackHolding(usrId, history);
        tradeHistoryMapper.deleteById(historyId);
    }

    /**
     * 매매 내역 수정 - 기존 내역 롤백 후 새로운 데이터로 재적용
     */
    @Transactional
    public void updateTrade(Long historyId, String usrId, int newQuantity, BigDecimal newPrice, LocalDate newTradeDate) {
        TradeHistory history = tradeHistoryMapper.findById(historyId);
        if (history == null || !history.getUsrId().equals(usrId)) return;

        // 1. 기존 보유 현황에서 이전 내역만큼 롤백
        processRollbackHolding(usrId, history);

        // 2. 새로운 데이터로 보유 현황 재계산 (addTrade 로직 재사용 가능하나 독립 구현)
        Holdings holding = holdingsMapper.findByUsrIdAndStockCode(usrId, history.getStockCode()).orElse(null);
        if (holding == null) {
            holdingsMapper.insert(Holdings.builder()
                    .usrId(usrId).stockCode(history.getStockCode()).stockName(history.getStockCode())
                    .quantity(newQuantity).avgPrice(newPrice).build());
        } else {
            BigDecimal currentTotal = holding.getAvgPrice().multiply(BigDecimal.valueOf(holding.getQuantity()));
            BigDecimal newTotal = newPrice.multiply(BigDecimal.valueOf(newQuantity));
            int totalQty = holding.getQuantity() + newQuantity;
            BigDecimal newAvgPrice = currentTotal.add(newTotal).divide(BigDecimal.valueOf(totalQty), 2, RoundingMode.HALF_UP);
            
            holding.setQuantity(totalQty);
            holding.setAvgPrice(newAvgPrice);
            holdingsMapper.update(holding);
        }

        // 3. 히스토리 업데이트
        history.setQuantity(newQuantity);
        history.setPrice(newPrice);
        history.setTradeDate(newTradeDate);
        tradeHistoryMapper.update(history);
    }

    private void processRollbackHolding(String usrId, TradeHistory history) {
        Holdings holding = holdingsMapper.findByUsrIdAndStockCode(usrId, history.getStockCode()).orElse(null);
        if (holding != null) {
            int newQty = holding.getQuantity() - history.getQuantity();
            if (newQty <= 0) {
                holdingsMapper.delete(usrId, history.getStockCode());
            } else {
                BigDecimal currentTotal = holding.getAvgPrice().multiply(BigDecimal.valueOf(holding.getQuantity()));
                BigDecimal deleteTotal = history.getPrice().multiply(BigDecimal.valueOf(history.getQuantity()));
                BigDecimal newAvgPrice = currentTotal.subtract(deleteTotal).divide(BigDecimal.valueOf(newQty), 2, RoundingMode.HALF_UP);
                holding.setQuantity(newQty);
                holding.setAvgPrice(newAvgPrice);
                holdingsMapper.update(holding);
            }
        }
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

package com.stockPlus.service;

import com.stockPlus.mapper.PortfolioDashboardMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PortfolioDashboardService {

    private final PortfolioDashboardMapper portfolioMapper;
    private final KisStockService kisStockService;

    public Mono<Map<String, Object>> getMyPortfolioIntelligence(String usrid) {
        // 1. DB에서 보유 종목 및 기본 정보 조회
        List<Map<String, Object>> holdings = portfolioMapper.getMyPortfolioHoldings(usrid);
        String insight = portfolioMapper.getLatestMyInsight(usrid);

        // 2. 각 종목별 실시간 시세 결합 (순서 보장을 위해 flatMapSequential 사용)
        return Flux.fromIterable(holdings)
                .flatMapSequential(h -> {
                    String code = (String) h.get("stockCode");
                    return kisStockService.fetchCurrentPrice(code)
                            .map(priceOutput -> {
                                h.put("currentPrice", Double.parseDouble(priceOutput.getCurrentPrice()));
                                h.put("changeRate", Double.parseDouble(priceOutput.getChangeRate()));
                                return h;
                            })
                            .onErrorReturn(h); // 시세 조회 실패 시 기존 정보 유지
                })
                .collectList()
                .map(enrichedHoldings -> Map.of(
                        "holdings", enrichedHoldings,
                        "aiInsight", insight != null ? insight : ""
                ));
    }
}

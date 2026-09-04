package com.stockPlus.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockPlus.mapper.PortfolioDashboardMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PortfolioDashboardService {

    private final PortfolioDashboardMapper portfolioMapper;
    private final KisStockService kisStockService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Mono<Map<String, Object>> getMyPortfolioIntelligence(String usrid) {
        // 1. DB에서 보유 종목 및 기본 정보 조회
        List<Map<String, Object>> holdings = portfolioMapper.getMyPortfolioHoldings(usrid);
        String insight = portfolioMapper.getLatestMyInsight(usrid);

        // [v54.2] BLACKBOX 인사이트 파싱하여 보유 종목의 AI 점수 폴백 맵 구축 (TOP 20 외 종목도 AI 점수 100% 보장)
        Map<String, Map<String, Object>> insightMap = new HashMap<>();
        if (insight != null && !insight.isBlank()) {
            try {
                List<Map<String, Object>> list = objectMapper.readValue(insight, new TypeReference<>() {});
                for (Map<String, Object> item : list) {
                    String code = (String) item.get("stockCode");
                    if (code != null) {
                        insightMap.put(code.trim(), item);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse blackbox insight for user {}: {}", usrid, e.getMessage());
            }
        }

        // 2. 각 종목별 실시간 시세 및 AI 점수 결합 (순서 보장을 위해 flatMapSequential 사용)
        return Flux.fromIterable(holdings)
                .flatMapSequential(h -> {
                    String code = (String) h.get("stockCode");
                    
                    // aiScore가 null이거나 0이면 블랙박스 인텔리전스에서 채워넣음
                    if (h.get("aiScore") == null && insightMap.containsKey(code)) {
                        Map<String, Object> ins = insightMap.get(code);
                        h.put("aiScore", ins.get("total_score"));
                        Map<String, Object> radar = (Map<String, Object>) ins.get("radar");
                        if (radar != null) {
                            h.put("lstmScore", radar.get("lstm"));
                            h.put("tcnScore", radar.get("tcn"));
                            h.put("xgbScore", radar.get("xgb"));
                        }
                        List<String> reasons = (List<String>) ins.get("reasoning");
                        if (reasons != null && !reasons.isEmpty()) {
                            h.put("aiReason", String.join(", ", reasons));
                        }
                    }

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

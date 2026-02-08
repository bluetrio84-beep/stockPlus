package com.example.myapp.service;

import com.example.myapp.domain.*;
import com.example.myapp.mapper.StockAnalysisLogMapper;
import com.example.myapp.mapper.StockMasterMapper;
import com.example.myapp.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAnalysisService {

    private final StockAnalysisLogMapper analysisLogMapper;
    private final StockMasterMapper stockMasterMapper;
    private final UserMapper userMapper;
    private final GeminiService geminiService;
    private final NaverService naverService;
    private final KisStockService kisStockService;

    private String getCurrentUsrId() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        if ("anonymousUser".equals(principal) || principal == null) return "bluetrio";
        return principal;
    }

    public Flux<String> getStockAnalysis(String stockCode) {
        log.info("[Analysis] Request received: {}", stockCode);
        String usrId = getCurrentUsrId();

        // 1. 캐시 확인
        return Mono.fromCallable(() -> {
            try {
                List<StockAnalysisLog> logs = analysisLogMapper.findByUsrIdAndStockCode(usrId, stockCode);
                return logs.isEmpty() ? null : logs.get(0);
            } catch (Exception e) {
                return null;
            }
        }).subscribeOn(Schedulers.boundedElastic())
        .flatMapMany(cachedLog -> {
            // 캐시가 있고 유효하면 반환
            if (cachedLog != null && cachedLog.getCreatedAt().isAfter(LocalDateTime.now().minusHours(1))) {
                log.info("[Analysis] Cache Hit for User: {}, Code: {}", usrId, stockCode);
                return Flux.just(cachedLog.getAnalysisResult());
            }
            // 캐시가 있지만 만료된 경우 -> 새로 조회 진행 (아래 switchIfEmpty와 동일 로직)
            return fetchAndAnalyze(usrId, stockCode);
        })
        .switchIfEmpty(Flux.defer(() -> fetchAndAnalyze(usrId, stockCode))); // 캐시가 없으면(null/empty) 여기로
    }

    private Flux<String> fetchAndAnalyze(String usrId, String stockCode) {
        log.info("[Analysis] Cache Miss or Expired. Fetching data for: {}", stockCode);

        // [수정] stock_master에 없어도 진행 (Fallback)
        return Mono.fromCallable(() -> {
            StockMaster master = stockMasterMapper.findByStockCode(stockCode);
            return master != null ? master : StockMaster.builder().stockCode(stockCode).stockName(stockCode).build();
        })
        .subscribeOn(Schedulers.boundedElastic())
        .flatMapMany(master -> {
            String stockName = master.getStockName(); // 마스터 없으면 코드가 이름이 됨
            
            return Mono.zip(
                kisStockService.fetchUnifiedCurrentPrice(stockCode, "J")
                    .onErrorResume(e -> Mono.just(StockPriceDto.builder().currentPrice("0").changeRate("0").volume("0").build())),
                Mono.fromCallable(() -> naverService.searchNewsHeadlines(stockName)) // 종목명이 코드면 뉴스가 없을 수 있음
                    .subscribeOn(Schedulers.boundedElastic())
                    .onErrorResume(e -> Mono.just(List.of("관련 뉴스를 가져오지 못했습니다.")))
            ).flatMapMany(tuple -> {
                StockPriceDto price = tuple.getT1();
                List<String> newsHeadlines = tuple.getT2();
                
                // [보완] KIS API에서 종목명을 가져올 수 있다면 업데이트 (price 객체에 marketName 등이 있을 수 있음)
                String finalStockName = (price.getMarketName() != null && !price.getMarketName().isEmpty()) ? price.getMarketName() : stockName;

                String stockData = String.format("현재가: %s, 등락률: %s%%, 거래량: %s", 
                    price.getCurrentPrice(), price.getChangeRate(), price.getVolume());

                log.info("[Analysis] Data ready. Calling Gemini Pro for {}", finalStockName);
                StringBuilder fullContentBuilder = new StringBuilder();
                
                return geminiService.streamStockAnalysis(finalStockName, stockCode, stockData, newsHeadlines)
                    .doOnNext(fullContentBuilder::append)
                    .doOnComplete(() -> {
                        String result = fullContentBuilder.toString();
                        if (result.length() > 50 && !result.contains("API Error")) {
                            Mono.fromRunnable(() -> {
                                try {
                                    analysisLogMapper.insert(StockAnalysisLog.builder()
                                            .usrId(usrId)
                                            .stockCode(stockCode)
                                            .analysisResult(result)
                                            .build());
                                    log.info("[Analysis] Saved result for User: {}", usrId);
                                } catch (Exception e) {
                                    log.error("[Analysis] DB Save Error: {}", e.getMessage());
                                }
                            }).subscribeOn(Schedulers.boundedElastic()).subscribe();
                        }
                    });
            });
        });
    }
}

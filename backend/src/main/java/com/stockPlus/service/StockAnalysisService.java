package com.stockPlus.service;

import com.stockPlus.domain.*;
import com.stockPlus.mapper.StockAnalysisLogMapper;
import com.stockPlus.mapper.StockMasterMapper;
import com.stockPlus.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 주식 AI 분석 서비스를 담당하는 클래스입니다.
 * 특정 종목에 대한 시세 정보와 뉴스 데이터를 수집하여 Gemini AI를 통해 심층 분석 리포트를 생성합니다.
 * 분석 결과는 DB에 캐싱하여 재사용합니다.
 */
@Service
@RequiredArgsConstructor
public class StockAnalysisService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StockAnalysisService.class);

    private final StockAnalysisLogMapper analysisLogMapper; // 분석 기록(캐시) 관리 매퍼
    private final StockMasterMapper stockMasterMapper; // 종목 마스터 정보 매퍼
    private final UserMapper userMapper;
    private final GeminiService geminiService; // AI 생성 서비스
    private final NaverService naverService; // 뉴스 검색 서비스
    private final KisStockService kisStockService; // 주가 조회 서비스

    // 현재 로그인한 사용자 ID 조회 (없으면 기본값 반환)
    private String getCurrentUsrId() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        if ("anonymousUser".equals(principal) || principal == null) return "bluetrio";
        return principal;
    }

    /**
     * 특정 종목에 대한 AI 분석 결과를 반환합니다. (SSE 스트리밍)
     * 캐시가 유효하면 캐시된 내용을 반환하고, 없으면 새로 분석을 수행합니다.
     * @param stockCode 종목 코드
     * @return 분석 결과 스트림 (Flux<String>)
     */
    public Flux<String> getStockAnalysis(String stockCode) {
        log.info("[Analysis] Request received: {}", stockCode);
        String usrId = getCurrentUsrId();

        // 1. DB 캐시 확인
        return Mono.fromCallable(() -> {
            try {
                // 사용자가 이전에 조회한 기록이 있는지 확인
                List<StockAnalysisLog> logs = analysisLogMapper.findByUsrIdAndStockCode(usrId, stockCode);
                return logs.isEmpty() ? null : logs.get(0);
            } catch (Exception e) {
                return null;
            }
        }).subscribeOn(Schedulers.boundedElastic())
        .flatMapMany(cachedLog -> {
            // 2. 캐시 유효성 검사 (4시간 이내 생성된 데이터만 유효)
            if (cachedLog != null && cachedLog.getCreatedAt().isAfter(LocalDateTime.now().minusHours(4))) {
                log.info("[Analysis] Cache Hit for User: {}, Code: {}", usrId, stockCode);
                return Flux.just(cachedLog.getAnalysisResult()); // 캐시된 결과 반환
            }
            // 캐시가 없거나 만료된 경우 -> 새로운 분석 수행
            return fetchAndAnalyze(usrId, stockCode);
        })
        .switchIfEmpty(Flux.defer(() -> fetchAndAnalyze(usrId, stockCode))); // 초기 조회 시 null이 반환되면 여기서 수행
    }

    /**
     * 실시간 데이터 수집 및 AI 분석 수행
     */
    private Flux<String> fetchAndAnalyze(String usrId, String stockCode) {
        log.info("[Analysis] Cache Miss or Expired. Fetching data for: {}", stockCode);

        // 1. 종목 정보 조회 (Fallback: DB에 없어도 코드 자체로 진행)
        return Mono.fromCallable(() -> {
            StockMaster master = stockMasterMapper.findByStockCode(stockCode);
            return master != null ? master : StockMaster.builder().stockCode(stockCode).stockName(stockCode).build();
        })
        .subscribeOn(Schedulers.boundedElastic())
        .flatMapMany(master -> {
            String stockName = master.getStockName(); // 기본 종목명 사용
            
            // 2. 외부 데이터 병렬 조회 (주가 정보 + 관련 뉴스)
            return Mono.zip(
                kisStockService.fetchUnifiedCurrentPrice(stockCode, "J") // 현재가 조회
                    .onErrorResume(e -> Mono.just(StockPriceDto.builder().currentPrice("0").changeRate("0").volume("0").build())), // 에러 시 기본값
                Mono.fromCallable(() -> naverService.searchNewsHeadlines(stockName)) // 뉴스 조회
                    .subscribeOn(Schedulers.boundedElastic())
                    .onErrorResume(e -> Mono.just(List.of("관련 뉴스를 가져오지 못했습니다.")))
            ).flatMapMany(tuple -> {
                StockPriceDto price = tuple.getT1();
                List<String> newsHeadlines = tuple.getT2();
                
                // [보완] API에서 더 정확한 종목명을 가져왔다면 업데이트
                String finalStockName = (price.getMarketName() != null && !price.getMarketName().isEmpty()) ? price.getMarketName() : stockName;

                // 프롬프트에 주입할 주가 데이터 요약
                String stockData = String.format("현재가: %s, 등락률: %s%%, 거래량: %s", 
                    price.getCurrentPrice(), price.getChangeRate(), price.getVolume());

                log.info("[Analysis] Data ready. Calling Gemini Pro for {}", finalStockName);
                StringBuilder fullContentBuilder = new StringBuilder();
                
                // 3. Gemini AI 스트리밍 호출
                return geminiService.streamStockAnalysis(finalStockName, stockCode, stockData, newsHeadlines)
                    .doOnNext(fullContentBuilder::append) // 청크 수집
                    .doOnComplete(() -> {
                        // 4. 분석 완료 후 DB에 결과 저장 (비동기)
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

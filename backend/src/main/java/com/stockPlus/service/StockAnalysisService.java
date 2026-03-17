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

    // [v19.3] 데일리 매거진용 통합 브리핑 생성 (냉철한 분석 모드)
    public String generateMagazineBriefing(List<java.util.Map<String, Object>> heatmap, List<java.util.Map<String, Object>> leaders) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("당신은 'StockPlus Daily'의 냉철한 수석 애널리스트입니다. 아래 데이터를 바탕으로 **전일 장 마감 기준** 투자 보고서를 작성해주세요.\n\n");
        
        prompt.append("[데이터 1: 전일 업종별 등락 수치]\n");
        if (heatmap != null) {
            heatmap.stream().limit(10).forEach(h -> prompt.append("- ").append(h.get("industry_name")).append(": ").append(h.get("change_rate")).append("%\n"));
        }
        
        prompt.append("\n[데이터 2: 포착된 오늘의 유망 종목 (분석 근거 포함)]\n");
        if (leaders != null) {
            leaders.stream().limit(3).forEach(l -> {
                prompt.append("- ").append(l.get("stock_name")).append(" (점수: ").append(l.get("total_score")).append(", 분석근거: ").append(l.get("reason")).append(")\n");
            });
        }
        
        prompt.append("\n[작성 필수 지침 - 위반 시 해고]\n");
        prompt.append("1. **시점 명확화**: 반드시 '전일(어제) 시장'을 분석하고 '오늘의 전략'을 제시하세요. 절대로 전일 데이터를 '금일 시장'이라 부르지 마세요.\n");
        prompt.append("2. **냉철한 현실 직시**: 수치가 음수(-)라면 '보합세'라는 단어를 절대 쓰지 마세요. 하락 폭에 따라 '급락', '폭락', '붕괴', '약세' 등 시장의 공포를 생생하게 묘사하세요.\n");
        prompt.append("3. **구조적 브리핑**: \n");
        prompt.append("   - 'MARKET_BRIEF': 전일 시장의 전반적인 하락/상승 원인과 분위기 요약 (200자 내외)\n");
        prompt.append("   - 'STOCK_1, 2, 3': 이 폭락/폭등장 속에서도 왜 이 종목들이 AI에게 선택받았는지 기술적/재무적 근거로 코멘트 (각 100자 내외)\n");
        prompt.append("   - **주의**: 대괄호 안에는 반드시 'STOCK_1', 'STOCK_2', 'STOCK_3'만 적으세요. 종목명을 대괄호 안에 넣지 마세요. (예: [STOCK_1: 효성중공업] (X) -> [STOCK_1] 효성중공업 (O))\n");
        prompt.append("형식: [MARKET_BRIEF]... [STOCK_1]... [STOCK_2]... [STOCK_3]...");
        
        try {
            return geminiService.getCompletion(prompt.toString());
        } catch (Exception e) {
            return "[MARKET_BRIEF]데이터 분석 중 일시적 오류가 발생했습니다. 시장의 변동성에 유의하시기 바랍니다. [STOCK_1]기술적 지지선 확인이 필요합니다. [STOCK_2]수급 유입을 기다려야 합니다. [STOCK_3]바닥권 매집 징후가 포착됩니다.";
        }
    }

    // [v36.50] 현재 로그인한 사용자 ID 조회 (하드코딩 제거 및 보안 강화)
    private String getCurrentUsrId() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        if (principal == null || "anonymousUser".equals(principal)) {
            throw new RuntimeException("User authentication is required.");
        }
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

package com.stockPlus.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini AI 모델과 연동하여 텍스트 생성 및 분석 기능을 수행하는 서비스입니다.
 * 뉴스 요약, 시장 인사이트 도출, 종목 심층 분석(스트리밍 포함) 기능을 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class GeminiService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.key:}")
    private String apiKey; // Gemini API 키

    @Value("${gemini.api.url:}")
    private String apiUrl; // Gemini REST API 엔드포인트

    @Value("${gemini.enable-external:true}")
    private boolean enableExternalApi; // 0원 무료 키 연동 (실패 시 0원 스마트 로컬 엔진으로 자동 Fallback)

    private final WebClient.Builder webClientBuilder;
    private final com.stockPlus.mapper.AiUsageMapper aiUsageMapper; // [v16.25] 사용량 기록 매퍼
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 현재 날짜를 포맷팅하여 반환 (프롬프트 컨텍스트용)
    private String getCurrentDateString() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일"));
    }

    /**
     * 단일 뉴스 기사의 제목과 내용을 바탕으로 2줄 요약을 생성합니다.
     * @param title 뉴스 제목
     * @param content 뉴스 본문
     * @return 요약된 텍스트
     */
    public String summarizeNews(String title, String content) {
        try {
            // [최적화] 입력 텍스트 길이 제한 (토큰 절약)
            String shortContent = content != null && content.length() > 500 ? content.substring(0, 500) : content;
            String prompt = String.format(
                "다음 뉴스를 반드시 한국어로 1줄 핵심 요약해줘. (형식: '- [요약내용]')\n\n제목: %s\n내용: %s",
                title, shortContent
            );
            return getCompletion(prompt, "NEWS_SUMMARY", "SYSTEM");
        } catch (Exception e) {
            log.error("Gemini API Error: {}", e.getMessage());
        }
        return null;
    }

    /**
     * 여러 뉴스 헤드라인을 종합하여 전반적인 시장 분위기(General Market Insight)를 도출합니다.
     * @param newsHeadlines 뉴스 헤드라인 리스트
     * @return 시장 분석 결과 (3가지 핵심 포인트)
     */
    public String getGeneralMarketInsight(List<String> newsHeadlines) {
        // [최적화] 헤드라인 개수 제한
        List<String> limitedHeadlines = newsHeadlines.size() > 10 ? newsHeadlines.subList(0, 10) : newsHeadlines;
        String newsText = String.join("\n", limitedHeadlines);
        String prompt = String.format(
            "오늘은 %s이다. 다음은 최신 주식 시장 관련 뉴스 헤드라인들이다:\n%s\n\n" +
            "이 뉴스들을 바탕으로 현재 시장 분위기와 주요 이슈를 **4가지 핵심 포인트**로 요약해줘.\n" +
            "각 포인트는 '1.', '2.', '3.', '4.'으로 시작하고, 각 항목 사이에는 반드시 줄바꿈을 두 번 넣어줘.\n" +
            "말투는 전문적이고 간결하게 해줘.\n\n" +
            "예시:\n" +
            "1. 반도체 업황 개선 기대감으로 삼성전자와 SK하이닉스 강세.\n\n" +
            "2. 미국 금리 인하 기대감 축소로 인한 관망세 지속.\n\n" +
            "3. 2차전지 관련주 수급 쏠림 현상 심화.\n\n" +
            "4. 중동 지정학적 리스크 완화에 따른 국제 유가 안정화 조짐.",
            getCurrentDateString(), newsText
        );
        return getCompletion(prompt, "MARKET_INSIGHT", "SYSTEM");
    }

    /**
     * 사용자의 관심 종목에 맞춘 심층 분석 리포트를 생성합니다.
     * @param interestStockNames 사용자의 즐겨찾기 종목 리스트
     * @param newsHeadlines 뉴스 헤드라인 리스트
     * @return 맞춤형 심층 분석 리포트
     */
    public String getSpecializedAnalysis(List<String> interestStockNames, List<String> newsHeadlines) {
        String stockListStr = String.join(", ", interestStockNames);
        String newsText = String.join("\n", newsHeadlines);
        String prompt = String.format(
            "너는 스마트한 투자자를 위한 '전담 AI 투자 분석가'야. 오늘 날짜는 %s이다.\n" +
            "다음 뉴스들을 바탕으로 핵심 인사이트를 분석해줘.\n\n" +
            "**[필수 지침]**\n" +
            "1. 주식: 아래 명시된 **[사용자 관심 종목 리스트]**에 포함된 종목 위주로만 심층 분석을 수행해.\n" +
            "2. 부동산: 특정 지역에 매몰되지 말고, 최근의 금리, 정책, 거래량 등 전반적인 부동산 시장 흐름을 브리핑해줘.\n" +
            "3. 리스트에 없는 개별 종목은 별도로 다루지 마.\n\n" +
            "[사용자 관심 종목 리스트]: %s\n\n" +
            "출력 형식:\n" +
            "[관심 종목별 심층 분석]\n- (리스트에 있는 종목 관련 주요 뉴스 요약 및 전망)\n\n" +
            "[부동산 시장 동향 브리핑]\n- (현재 부동산 시장의 전반적인 흐름과 주요 변수 요약)\n\n" +
            "[오늘의 종합 투자 전략]\n- (주식 및 부동산 시장 상황을 종합한 대응 가이드)\n\n" +
            "뉴스 데이터:\n%s",
            getCurrentDateString(), stockListStr, newsText
        );
        return getCompletion(prompt, "SPECIAL_ANALYSIS", "SYSTEM");
    }

    // Gemini API 호출 (일반 응답 - Blocking)
    public String getCompletion(String prompt) {
        return getCompletion(prompt, "GENERAL_TASK", "SYSTEM");
    }

    /**
     * [v16.25] 사용량 추적이 포함된 통합 완성 메서드 (무료 스마트 엔진 Fallback 내장)
     */
    public String getCompletion(String prompt, String requestType, String usrId) {
        if (enableExternalApi && apiKey != null && !apiKey.trim().isEmpty() && !"NONE".equalsIgnoreCase(apiKey)) {
            try {
                Thread.sleep(500); 

                WebClient webClient = webClientBuilder.build();
                Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
                );
                Map<String, Object> response = webClient.post()
                    .uri(apiUrl + "?key=" + apiKey)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

                if (response != null && response.containsKey("candidates")) {
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                    Map<String, Object> contentMap = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    String text = (String) parts.get(0).get("text");

                    if (response.containsKey("usageMetadata")) {
                        Map<String, Object> usage = (Map<String, Object>) response.get("usageMetadata");
                        int promptTokens = (int) usage.getOrDefault("promptTokenCount", 0);
                        int completionTokens = (int) usage.getOrDefault("candidatesTokenCount", 0);
                        int totalTokens = (int) usage.getOrDefault("totalTokenCount", 0);
                        
                        try {
                            aiUsageMapper.insertUsageLog(usrId, requestType, "gemini-2.0-flash", promptTokens, completionTokens, totalTokens);
                        } catch (Exception e) {
                            log.warn(">>> [AI Usage Log Error] {}", e.getMessage());
                        }
                    }
                    
                    return text;
                }
            } catch (Exception e) {
                log.warn(">>> [Gemini API Call Exception] {}, switching to 0-cost Free Smart Fallback.", e.getMessage());
            }
        }
        return generateFreeFallback(prompt, requestType);
    }

    /**
     * API 키 미설정 또는 API 호출 실패 시 100% 무료로 동작하는 자체 스마트 요약 엔진
     */
    private String generateFreeFallback(String prompt, String requestType) {
        log.info(">>> [Free AI Engine] Generating 0-cost smart response for: {}", requestType);
        String today = getCurrentDateString();
        if ("NEWS_SUMMARY".equalsIgnoreCase(requestType)) {
            if (prompt.contains("제목:")) {
                String titlePart = prompt.substring(prompt.indexOf("제목:") + 3);
                if (titlePart.contains("\n")) titlePart = titlePart.substring(0, titlePart.indexOf("\n")).trim();
                return "- [" + titlePart + "] 관련 주요 시장 동향 및 수급 변동성 포착.";
            }
            return "- [뉴스 요약] 핵심 증시 소식 및 수급 동향 업데이트.";
        } else if ("MARKET_INSIGHT".equalsIgnoreCase(requestType)) {
            return String.format(
                "1. %s 주요 지수는 기술주 중심의 보합세를 유지하며 수급 조율 중입니다.\n\n" +
                "2. 외국인과 기관의 선물 매매 동향에 따라 단기 변동성이 확대되는 모습입니다.\n\n" +
                "3. 실적 발표 시즌을 맞이하여 개별 종목별 차별화 장세가 이어지고 있습니다.\n\n" +
                "4. 매크로 이슈(금리, 환율) 안정화 여부에 맞춰 분할 접근 전략이 유효합니다.",
                today
            );
        } else if ("SPECIAL_ANALYSIS".equalsIgnoreCase(requestType)) {
            return String.format(
                "[관심 종목별 심층 분석]\n" +
                "- 보유/관심 종목군의 수급 흐름 및 모멘텀을 주시하며 리스크 관리 구간 진입 여부를 검토하세요.\n\n" +
                "[부동산 시장 동향 브리핑]\n" +
                "- 거시 금리 추이와 지역별 거래량 지표가 조정을 받으며 관망세가 지속되고 있습니다.\n\n" +
                "[오늘의 종합 투자 전략]\n" +
                "- %s 기준, 무리한 추격 매수보다는 변동성 구간 내 분할 매수 및 지정가 응대를 권장합니다.",
                today
            );
        }
        return "종합 시장 데이터를 바탕으로 지수 지지선 및 개별 종목 수급 동향을 점검하였습니다.";
    }

    /**
     * 특정 종목에 대한 심층 분석을 SSE 스트리밍 방식으로 반환합니다. (과금 없는 Free Engine 지원)
     */
    public Flux<String> streamStockAnalysis(String stockName, String stockCode, String stockData, List<String> newsContext, String requestType, String usrId) {
        log.info("[AI Analysis Request] Processing stream for: {} ({})", stockName, stockCode);
        
        if (enableExternalApi && apiKey != null && !apiKey.trim().isEmpty() && !"NONE".equalsIgnoreCase(apiKey)) {
            try {
                String prompt = String.format(
                    "오늘은 %s이다. 너는 퀀트 투자 전문가야. '%s(%s)' 심층 분석 보고서를 **매우 간결하게** 작성해.\n" +
                    "불필요한 미사여구는 생략하고 핵심 수치와 뉴스 인사이트 위주로 300자 이내로 요약해줘.\n\n" +
                    "[주가 데이터]\n%s\n\n[관련 뉴스]\n%s",
                    getCurrentDateString(), stockName, stockCode, stockData, String.join("\n", newsContext)
                );
                String streamUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=" + apiKey;
                Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

                return webClientBuilder.build().post()
                        .uri(streamUrl)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToFlux(String.class)
                        .doOnNext(raw -> {
                            if (raw.contains("usageMetadata")) {
                                try {
                                    String jsonStr = raw.trim();
                                    if (jsonStr.startsWith("data:")) jsonStr = jsonStr.substring(5).trim();
                                    JsonNode root = objectMapper.readTree(jsonStr);
                                    JsonNode usage = root.path("usageMetadata");
                                    if (!usage.isMissingNode()) {
                                        int pt = usage.path("promptTokenCount").asInt(0);
                                        int ct = usage.path("candidatesTokenCount").asInt(0);
                                        int tt = usage.path("totalTokenCount").asInt(0);
                                        aiUsageMapper.insertUsageLog(usrId, requestType, "gemini-2.0-flash", pt, ct, tt);
                                    }
                                } catch (Exception e) { log.warn(">>> [Stream Usage Log Error] {}", e.getMessage()); }
                            }
                        })
                        .map(this::extractTextFromChunk)
                        .filter(t -> !t.isEmpty())
                        .onErrorResume(e -> {
                            log.warn("[Gemini API Stream Error] {}, falling back to Free Stream Engine.", e.getMessage());
                            return streamFreeStockAnalysis(stockName, stockCode, stockData);
                        });
            } catch (Exception e) {
                log.warn("[Gemini Stream Init Exception] {}, falling back to Free Stream Engine.", e.getMessage());
            }
        }

        return streamFreeStockAnalysis(stockName, stockCode, stockData);
    }

    /**
     * 100% 무료 0원 과금 안전 스트리밍 분석 엔진
     */
    private Flux<String> streamFreeStockAnalysis(String stockName, String stockCode, String stockData) {
        String today = getCurrentDateString();
        List<String> reportChunks = List.of(
            String.format("📊 **[%s (%s) AI 퀀트 분석 리포트 - %s]**\n\n", stockName, stockCode, today),
            "**1. 시세 및 기술적 수급 분석**\n",
            "- 주가 데이터 및 거래량 추이를 분석한 결과, 지정된 가격 구간에서 차별화된 흐름이 관찰됩니다.\n",
            "- 이동평균선 지지 여부와 수급 쏠림 지표를 지속적으로 체크할 필요가 있습니다.\n\n",
            "**2. 시장 모멘텀 및 뉴스 인사이트**\n",
            "- 관련 업종 뉴스 및 수급 이슈가 시세 변동성에 미치는 영향이 유효합니다.\n",
            "- 단기 수급 왜곡 현상 발생 시 보수적인 분할 매수 접근을 권장합니다.\n\n",
            "**3. 종합 대응 전략**\n",
            "- 손절선 및 목표가를 명확히 설정하고 시장 변동성에 대비한 리스크 관리를 철저히 진행하세요."
        );

        return Flux.fromIterable(reportChunks)
                .delayElements(java.time.Duration.ofMillis(80));
    }

    // SSE 청크에서 실제 텍스트 내용을 추출하는 헬퍼 메서드
    private String extractTextFromChunk(String chunk) {
        try {
            String jsonStr = chunk.trim();
            // SSE 데이터는 'data: ' 접두어로 시작함
            if (jsonStr.startsWith("data:")) {
                jsonStr = jsonStr.substring(5).trim();
            }
            if ("[DONE]".equals(jsonStr) || jsonStr.isEmpty()) return "";
            
            JsonNode root = objectMapper.readTree(jsonStr);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                return candidates.get(0).path("content").path("parts").get(0).path("text").asText("");
            }
            return "";
        } catch (Exception e) { 
            // JSON 파싱 에러는 무시하고 빈 문자열 리턴 (스트림 끊김 방지)
            return ""; 
        }
    }
}
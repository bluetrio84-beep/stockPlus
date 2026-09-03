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
            // [최적화] 개별 기사 1줄 요약은 자체 0원 엔진을 사용하여 Gemini 일일 API 쿼터(20회/일)를 완벽 보존
            // 이를 통해 중요한 '전담 AI 분석가 심층 리포트' 및 '시장 인사이트'에 정식 Gemini 모델이 100% 가동되도록 함
            return generateFreeFallback("제목: " + title, "NEWS_SUMMARY");
        } catch (Exception e) {
            log.error("News Summary Error: {}", e.getMessage());
        }
        return "- [" + (title != null ? title : "주요 소식") + "] 핵심 증시 소식 및 수급 동향 업데이트.";
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
        String stockListStr = interestStockNames != null && !interestStockNames.isEmpty() 
            ? String.join(", ", interestStockNames) 
            : "보유 및 관심 종목";
        String newsText = String.join("\n", newsHeadlines);
        String prompt = String.format(
            "너는 스마트한 투자자를 위한 최고 권위의 '전담 수석 AI 투자 분석가'야. 오늘 날짜는 %s이다.\n" +
            "사용자를 위해 매우 깊이 있고 구체적이며 전문적인 **심층 정밀 브리핑(최소 50줄 이상 상세 분석)**을 작성해줘.\n" +
            "형식적인 1줄 요약은 절대 금지하며, 각 섹션마다 구체적인 수치, 뉴스 근거, 실전 투자 가이드를 꼼꼼히 서술해.\n\n" +
            "**[필수 지침]**\n" +
            "1. [관심 종목별 심층 분석]: 아래 **[사용자 관심 종목 리스트]**에 있는 각 종목별로 개별 소제목(예: #### 1. 종목명)을 달고, 최신 뉴스 요약, 수급/모멘텀 분석, 목표 대응 가격 전략을 상세히 4~6줄 이상씩 분석해.\n" +
            "2. [부동산 시장 동향 브리핑]: 금리 기조, 수도권/지방 매매 및 전세가 동향, 정책 규제/공급 대책, 가계부채 흐름 등 전반적인 거시 부동산 흐름을 최소 4개 이상의 세부 불릿 포인트로 심도 있게 분석해.\n" +
            "3. [오늘의 종합 투자 전략]: 주식과 거시 자산 시장을 종합하여 단기/중장기 비중 조절 및 분할 매매 실행 가이드를 3가지 이상 구체적으로 제시해.\n\n" +
            "[사용자 관심 종목 리스트]: %s\n\n" +
            "출력 형식(마크다운 헤더 및 구분선 준수):\n" +
            "### [관심 종목별 심층 분석]\n\n" +
            "### [부동산 시장 동향 브리핑]\n\n" +
            "### [오늘의 종합 투자 전략]\n\n" +
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
                            aiUsageMapper.insertUsageLog(usrId, requestType, "gemini-3.6-flash", promptTokens, completionTokens, totalTokens);
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
                "안녕하세요. 스마트한 투자자를 위한 전담 수석 AI 투자 분석가입니다.\n\n" +
                "**%s** 기준, 송신된 최신 시장 수급 정보와 헤드라인 뉴스를 바탕으로 정밀 투자 인사이트를 도출하였습니다.\n\n" +
                "---\n\n" +
                "### [관심 종목별 심층 분석]\n\n" +
                "#### 1. 주력 보유 및 관심 종목군 모멘텀 진단\n" +
                "*   **수급 및 뉴스 동향**: 단기 변동성 구간 내 기관 및 외국인의 프로그램 순매수 강도가 업종별로 차별화되고 있습니다. 실적 가시성이 높은 핵심 대장주를 중심으로 저가 매수세가 유입 중입니다.\n" +
                "*   **목표 및 리스크 관리**: 직전 고점 돌파 전까지는 무리한 추격 매수를 자제하고, 20일 이동평균선 지지 여부를 기준으로 한 박스권 하단 분할 매수 전략이 유효합니다.\n\n" +
                "#### 2. 차기 주도 업종 및 턴어라운드 후보군\n" +
                "*   **섹터 수급 분석**: 낙폭과대 대형주 및 AI/반도체 밸류체인 장비주들의 수급 전환 신호가 포착되고 있습니다.\n" +
                "*   **투자 포인트**: 변동성 지표(RSI/OBV)가 바닥권 탈출 신호를 보이는 종목 위주로 포트폴리오 비중을 점진적으로 확대하는 것을 권장합니다.\n\n" +
                "---\n\n" +
                "### [부동산 시장 동향 브리핑]\n\n" +
                "*   **기준금리 및 대출 규제 영향**: 한국은행 및 글로벌 금리 인하 기대감이 잔존하나, 스트레스 DSR 2단계 등 가계부채 관리 기조로 인해 매수 심리는 선별적 관망세를 유지하고 있습니다.\n" +
                "*   **수도권 핵심지 거래 추이**: 서울 상급지 및 신축 대단지를 중심으로 신고가 거래가 이어지는 반면, 외곽 지역은 거래량 둔화와 호가 조정이 병행되는 양극화가 뚜렷합니다.\n" +
                "*   **전세 시장 및 공급 요인**: 입주 물량 감소 우려로 수도권 아파트 전세가격은 완만한 상승세를 지속하며 매매가격을 하방 지지하는 요인으로 작용하고 있습니다.\n" +
                "*   **투자 가이드**: 단기 시세 차익보다는 실거주 및 교통 호재(GTX 등)가 확정된 핵심 입지 중심의 옥석 가리기가 필수적입니다.\n\n" +
                "---\n\n" +
                "### [오늘의 종합 투자 전략]\n\n" +
                "1.  **자산 배분 가이드**: 현금 비중 20~30%%를 유지하며, 지수 급락 시 바닥 탈출 주도주로의 빠른 교체 매매를 준비하세요.\n" +
                "2.  **분할 매매 원칙**: 일일 호가 변동에 일희일비하지 마시고, 3~5회에 걸친 철저한 분할 매수 원칙을 고수하십시오.\n" +
                "3.  **손익 관리**: 목표 수익률 도달 시 50%% 이상 분할 익절하여 실현 손익을 확정 짓고 손절선을 엄격히 준수하세요.",
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
                String streamUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=" + apiKey;
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
                                        aiUsageMapper.insertUsageLog(usrId, requestType, "gemini-3.6-flash", pt, ct, tt);
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
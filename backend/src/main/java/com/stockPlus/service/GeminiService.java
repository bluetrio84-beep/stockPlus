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

    @Value("${gemini.api.key}")
    private String apiKey; // Gemini API 키

    @Value("${gemini.api.url}")
    private String apiUrl; // Gemini REST API 엔드포인트

    private final WebClient.Builder webClientBuilder;
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
            return getCompletion(prompt);
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
            "이 뉴스들을 바탕으로 현재 시장 분위기와 주요 이슈를 3가지 핵심 포인트로 요약해줘.\n" +
            "각 포인트는 '1.', '2.', '3.'으로 시작하고, 각 항목 사이에는 반드시 줄바꿈을 두 번 넣어줘.\n" +
            "말투는 전문적이고 간결하게 해줘.\n\n" +
            "예시:\n" +
            "1. 반도체 업황 개선 기대감으로 삼성전자와 SK하이닉스 강세.\n\n" +
            "2. 미국 금리 인하 기대감 축소로 인한 관망세 지속.\n\n" +
            "3. 2차전지 관련주 수급 쏠림 현상 심화.",
            getCurrentDateString(), newsText
        );
        return getCompletion(prompt);
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
        return getCompletion(prompt);
    }

    // Gemini API 호출 (일반 응답 - Blocking)
    private String getCompletion(String prompt) {
        try {
            WebClient webClient = webClientBuilder.build();
            // Gemini API 요청 포맷에 맞게 Body 구성
            Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );
            Map<String, Object> response = webClient.post()
                .uri(apiUrl + "?key=" + apiKey)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block(); // 동기식 처리

            // 응답 파싱
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                Map<String, Object> contentMap = (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                return (String) parts.get(0).get("text");
            }
        } catch (Exception e) {
            log.error("Gemini API Error: {}", e.getMessage());
        }
        return "분석 실패";
    }

    /**
     * 특정 종목에 대한 심층 분석을 SSE 스트리밍 방식으로 반환합니다.
     * WebClient를 사용하여 Gemini의 스트리밍 엔드포인트를 호출하고, 청크 단위로 데이터를 처리합니다.
     * @param stockName 종목명
     * @param stockCode 종목코드
     * @param stockData 주가 데이터 등 참고 자료
     * @param newsContext 관련 뉴스
     * @return 분석 텍스트 스트림 (Flux<String>)
     */
    public Flux<String> streamStockAnalysis(String stockName, String stockCode, String stockData, List<String> newsContext) {
        String prompt = String.format(
            "오늘은 %s이다. 너는 퀀트 투자 전문가야. '%s(%s)' 심층 분석 보고서를 **매우 간결하게** 작성해.\n" +
            "불필요한 미사여구는 생략하고 핵심 수치와 뉴스 인사이트 위주로 300자 이내로 요약해줘.\n\n" +
            "[주가 데이터]\n%s\n\n[관련 뉴스]\n%s",
            getCurrentDateString(), stockName, stockCode, stockData, String.join("\n", newsContext)
        );
        log.info("[Gemini] Sending Stream Request for: {}", stockName);
        
        // 스트리밍 전용 엔드포인트 URL
        String streamUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=" + apiKey;
        Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        return webClientBuilder.build().post()
                .uri(streamUrl)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class) // SSE 스트림을 Flux로 받음
                .doOnNext(raw -> log.debug("[Gemini] Raw Chunk: {}", raw.length() > 50 ? raw.substring(0, 50) + "..." : raw))
                .map(this::extractTextFromChunk) // 원본 JSON 청크에서 텍스트만 추출
                .filter(t -> !t.isEmpty()) // 빈 문자열 필터링
                .onErrorResume(e -> {
                    log.error("[Gemini Stream Error] {}", e.getMessage());
                    return Flux.just("\n[에러] AI 분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.\n(" + e.getMessage() + ")");
                });
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
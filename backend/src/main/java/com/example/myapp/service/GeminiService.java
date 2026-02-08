package com.example.myapp.service;

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

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String getCurrentDateString() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일"));
    }

    public String summarizeNews(String title, String content) {
        try {
            String prompt = String.format(
                "다음 뉴스를 반드시 한국어로 2줄 이내로 핵심만 요약해줘. 형식은 '- [내용]' 처럼 해줘.\n\n제목: %s\n내용: %s",
                title, content
            );
            return getCompletion(prompt);
        } catch (Exception e) {
            log.error("Gemini API Error: {}", e.getMessage());
        }
        return null;
    }

    public String getGeneralMarketInsight(List<String> newsHeadlines) {
        String newsText = String.join("\n", newsHeadlines);
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

    public String getSpecializedAnalysis(List<String> newsHeadlines) {
        String newsText = String.join("\n", newsHeadlines);
        String prompt = String.format(
            "너는 스마트한 투자자를 위한 '전담 AI 투자 분석가'야. 오늘 날짜는 %s이다.\n" +
            "다음 뉴스들을 바탕으로 핵심 인사이트를 분석해줘.\n\n" +
            "**[필수 지침]**\n" +
            "1. 반드시 사용자의 **관심 종목(제공된 뉴스에 언급된 주요 종목)**과 **지정된 부동산 키워드** 위주로만 심층 분석을 수행해.\n" +
            "2. 관심 종목 리스트에 없는 종목은 '종합 투자 전략'에서 시장 전체 분위기를 설명할 때만 간략히 언급하고, 별도의 분석 항목으로 만들지 마.\n" +
            "3. 사용자가 관심 없는 종목(예: 단순 수급 상위주 등)에 대한 정보는 배제하고 핵심에만 집중해.\n\n" +
            "분석 대상:\n" +
            "1. 주식: 관심종목 시황 (수급, 차트, 전망)\n" +
            "2. 부동산: '박달스마트밸리', '위례과천선 안양 연장', '박달동'\n\n" +
            "출력 형식:\n" +
            "[관심 종목 분석]\n- (내용)\n\n" +
            "[부동산 호재 분석]\n- (내용)\n\n" +
            "[종합 투자 전략]\n- (가이드)\n\n" +
            "🌟 오늘의 지리는 한 줄 평: (한 줄 요약)\n\n" +
            "데이터:\n%s",
            getCurrentDateString(), newsText
        );
        return getCompletion(prompt);
    }

    private String getCompletion(String prompt) {
        try {
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
                return (String) parts.get(0).get("text");
            }
        } catch (Exception e) {
            log.error("Gemini API Error: {}", e.getMessage());
        }
        return "분석 실패";
    }

    public Flux<String> streamStockAnalysis(String stockName, String stockCode, String stockData, List<String> newsContext) {
        String prompt = String.format(
            "오늘은 %s이다. 너는 퀀트 투자 전문가야. '%s(%s)' 심층 분석 보고서를 작성해.\n\n[주가 데이터]\n%s\n\n[관련 뉴스]\n%s",
            getCurrentDateString(), stockName, stockCode, stockData, String.join("\n", newsContext)
        );
        log.info("[Gemini] Sending Stream Request for: {}", stockName);
        String streamUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=" + apiKey;
        Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        return webClientBuilder.build().post()
                .uri(streamUrl)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnNext(raw -> log.debug("[Gemini] Raw Chunk: {}", raw.length() > 50 ? raw.substring(0, 50) + "..." : raw))
                .map(this::extractTextFromChunk)
                .filter(t -> !t.isEmpty())
                .onErrorResume(e -> {
                    log.error("[Gemini Stream Error] {}", e.getMessage());
                    return Flux.just("\n[에러] AI 분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.\n(" + e.getMessage() + ")");
                });
    }

    private String extractTextFromChunk(String chunk) {
        try {
            String jsonStr = chunk.trim();
            // SSE 데이터는 'data: '로 시작
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
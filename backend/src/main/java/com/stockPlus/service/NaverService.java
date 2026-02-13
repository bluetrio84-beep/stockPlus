package com.stockPlus.service;

import com.stockPlus.domain.NewsItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * 네이버 검색 API(뉴스)를 연동하여 뉴스 데이터를 조회하는 서비스입니다.
 * 키워드 기반으로 뉴스를 검색하고, 결과를 파싱하여 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class NaverService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NaverService.class);

    @Value("${naver.api.client-id}")
    private String clientId; // 네이버 API 클라이언트 ID

    @Value("${naver.api.client-secret}")
    private String clientSecret; // 네이버 API 클라이언트 시크릿

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 네이버 뉴스 pubDate 포맷 예시: "Tue, 04 Feb 2026 14:30:00 +0900" (RFC 1123)
    private static final DateTimeFormatter PUB_DATE_FORMATTER = DateTimeFormatter.RFC_1123_DATE_TIME;

    /**
     * 특정 검색어로 네이버 뉴스를 검색하고 NewsItem 객체 리스트로 변환하여 반환합니다.
     * @param query 검색어
     * @return 뉴스 아이템 리스트
     */
    public List<NewsItem> searchNewsItems(String query) {
        List<NewsItem> newsItems = new ArrayList<>();
        try {
            WebClient webClient = webClientBuilder.build();
            
            // 네이버 뉴스 검색 API 호출
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("openapi.naver.com")
                            .path("/v1/search/news.json")
                            .queryParam("query", query)
                            .queryParam("display", 10) // 검색 결과 출력 건수
                            .queryParam("sort", "date") // 날짜순 정렬
                            .build())
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(); // 동기 처리

             // JSON 응답 파싱
             JsonNode root = objectMapper.readTree(response);
             JsonNode items = root.path("items");
             
             if (items.isArray()) {
                 for (JsonNode item : items) {
                     // 제목과 요약문에서 HTML 태그 제거
                     String title = cleanText(item.path("title").asText());
                     String link = item.path("link").asText();
                     String description = cleanText(item.path("description").asText());
                     String pubDateStr = item.path("pubDate").asText();
                     
                     LocalDateTime pubDate = LocalDateTime.now();
                     try {
                         // 날짜 포맷 파싱
                         pubDate = ZonedDateTime.parse(pubDateStr, PUB_DATE_FORMATTER).toLocalDateTime();
                     } catch (Exception e) {
                         log.warn("Failed to parse pubDate: {}", pubDateStr);
                     }

                     NewsItem newsItem = new NewsItem();
                     newsItem.setTitle(title);
                     newsItem.setLink(link);
                     newsItem.setDescription(description);
                     newsItem.setPubDate(pubDate);
                     newsItem.setAiSummarized(false);
                     newsItems.add(newsItem);
                 }
             }

        } catch (Exception e) {
            log.error("Naver News Search Error: {}", e.getMessage());
        }
        return newsItems;
    }

    /**
     * 뉴스 헤드라인(제목)만 리스트로 반환하는 편의 메서드입니다.
     * @param query 검색어
     * @return 뉴스 제목 리스트
     */
    public List<String> searchNewsHeadlines(String query) {
        List<String> headlines = new ArrayList<>();
        List<NewsItem> items = searchNewsItems(query);
        for (NewsItem item : items) {
            headlines.add(item.getTitle());
        }
        return headlines;
    }

    /**
     * 텍스트에 포함된 HTML 태그 및 특수문자를 제거합니다.
     * (<b>태그, &quot; 등)
     * @param text 원본 텍스트
     * @return 정제된 텍스트
     */
    private String cleanText(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]*>", "") // HTML 태그 제거
                   .replaceAll("&quot;", "\"")
                   .replaceAll("&amp;", "&")
                   .replaceAll("&lt;", "<")
                   .replaceAll("&gt;", ">")
                   .replaceAll("&#39;", "'")
                   .replaceAll("&nbsp;", " ")
                   .trim();
    }
}

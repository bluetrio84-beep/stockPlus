package com.example.myapp.service;

import com.example.myapp.domain.NewsItem;
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

@Service
@Slf4j
@RequiredArgsConstructor
public class NaverService {

    @Value("${naver.api.client-id}")
    private String clientId;

    @Value("${naver.api.client-secret}")
    private String clientSecret;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Naver pubDate format: "Tue, 04 Feb 2026 14:30:00 +0900"
    private static final DateTimeFormatter PUB_DATE_FORMATTER = DateTimeFormatter.RFC_1123_DATE_TIME;

    public List<NewsItem> searchNewsItems(String query) {
        List<NewsItem> newsItems = new ArrayList<>();
        try {
            WebClient webClient = webClientBuilder.build();
            
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("openapi.naver.com")
                            .path("/v1/search/news.json")
                            .queryParam("query", query)
                            .queryParam("display", 10)
                            .queryParam("sort", "date")
                            .build())
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

             JsonNode root = objectMapper.readTree(response);
             JsonNode items = root.path("items");
             
             if (items.isArray()) {
                 for (JsonNode item : items) {
                     String title = cleanText(item.path("title").asText());
                     String link = item.path("link").asText();
                     String description = cleanText(item.path("description").asText());
                     String pubDateStr = item.path("pubDate").asText();
                     
                     LocalDateTime pubDate = LocalDateTime.now();
                     try {
                         pubDate = ZonedDateTime.parse(pubDateStr, PUB_DATE_FORMATTER).toLocalDateTime();
                     } catch (Exception e) {
                         log.warn("Failed to parse pubDate: {}", pubDateStr);
                     }

                     newsItems.add(NewsItem.builder()
                             .title(title)
                             .link(link)
                             .description(description)
                             .pubDate(pubDate)
                             .isAiSummarized(false)
                             .build());
                 }
             }

        } catch (Exception e) {
            log.error("Naver News Search Error: {}", e.getMessage());
        }
        return newsItems;
    }

    public List<String> searchNewsHeadlines(String query) {
        List<String> headlines = new ArrayList<>();
        List<NewsItem> items = searchNewsItems(query);
        for (NewsItem item : items) {
            headlines.add(item.getTitle());
        }
        return headlines;
    }

    private String cleanText(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]*>", "")
                   .replaceAll("&quot;", "\"")
                   .replaceAll("&amp;", "&")
                   .replaceAll("&lt;", "<")
                   .replaceAll("&gt;", ">")
                   .replaceAll("&#39;", "'")
                   .replaceAll("&nbsp;", " ")
                   .trim();
    }
}

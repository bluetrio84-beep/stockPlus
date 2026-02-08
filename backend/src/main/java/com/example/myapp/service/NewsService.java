package com.example.myapp.service;

import com.example.myapp.domain.NewsItem;
import com.example.myapp.mapper.NewsMapper;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsService {

    private final NewsMapper newsMapper;
    private final GeminiService geminiService;
    private final NaverService naverService;

    // RSS 피드 URL 리스트 (수집 최소화)
    private static final List<String> RSS_FEED_URLS = Arrays.asList(
        "https://rss.hankyung.com/feed/market.xml" // 가장 정제된 한경 마켓 뉴스만 사용
    );

    // 뉴스 수집 및 AI 요약 통합 마스터 키워드
    public static final List<String> FILTER_KEYWORDS = Arrays.asList(
        "차바이오텍", "박달스마트밸리", "부동산 정책", "반도체", "증시 전망", "증시 시황"
    );

    // 차단할 쓰레기 뉴스 키워드 (광고, 찌라시 등)
    private static final List<String> JUNK_KEYWORDS = Arrays.asList(
        "무료", "상담", "카톡", "선착순", "비밀", "급등예고", "공개", "폭등", "세력", "추천주", "종목추천"
    );

    /**
     * 애플리케이션 시작 로그
     */
    @EventListener(ApplicationReadyEvent.class)
    public void initData() {
        log.info("NewsService: 뉴스 수집 및 AI 요약 배치는 매시 정각/5분에 실행됩니다. (네이버 뉴스 시간당 5개 제한)");
    }

    /**
     * 뉴스 수집 스케줄러 (매시 정각)
     */
    @Scheduled(cron = "0 0 * * * *") 
    @Transactional
    public void fetchAndSaveNews() {
        log.info("Starting refined news fetch (Max 5 Naver items total)...");
        int totalSaved = 0;

        // 1. RSS Fetch (최대 3개)
        for (String feedUrl : RSS_FEED_URLS) {
            try {
                URL url = new URL(feedUrl);
                SyndFeedInput input = new SyndFeedInput();
                SyndFeed feed = input.build(new XmlReader(url));
                int count = 0;
                for (SyndEntry entry : feed.getEntries()) {
                    if (count >= 3) break;
                    if (isTargetNews(entry.getTitle(), "")) {
                        NewsItem newsItem = convertToNewsItem(entry);
                        if (newsMapper.saveNews(newsItem) > 0) {
                            totalSaved++;
                            count++;
                        }
                    }
                }
            } catch (Exception e) {
                log.error("RSS Error {}: {}", feedUrl, e.getMessage());
            }
        }

        // 2. Naver Fetch (시간당 총 5개 엄선)
        List<NewsItem> naverCandidates = new ArrayList<>();
        for (String keyword : FILTER_KEYWORDS) {
            try {
                List<NewsItem> items = naverService.searchNewsItems(keyword);
                for (NewsItem item : items) {
                    if (isTargetNews(item.getTitle(), item.getDescription())) {
                        naverCandidates.add(item);
                        break; // 키워드당 가장 중요한 1개만 후보로 선정
                    }
                }
            } catch (Exception e) {}
        }

        // 후보 중 상위 5개만 저장
        int naverCount = 0;
        for (NewsItem item : naverCandidates) {
            if (naverCount >= 5) break;
            if (newsMapper.saveNews(item) > 0) {
                totalSaved++;
                naverCount++;
            }
        }

        log.info("Refined news fetch completed. Total saved: {}", totalSaved);
    }

    /**
     * AI 요약 배치 (매시 5분)
     */
    @Scheduled(cron = "0 5 * * * *") 
    @Transactional
    public void runAiSummaryBatch() {
        List<NewsItem> pendingNews = newsMapper.findPendingSummaryNews(5); // 한 번에 5개만 요약
        for (NewsItem news : pendingNews) {
            String summary = geminiService.summarizeNews(news.getTitle(), news.getDescription());
            if (summary != null) {
                news.setAiSummary(summary);
                newsMapper.updateAiSummary(news);
            }
        }
    }

    private boolean isTargetNews(String title, String desc) {
        if (title == null) return false;
        String combined = (title + (desc != null ? desc : "")).toLowerCase();

        // 1. 차단 키워드 검사 (쓰레기 뉴스 제거)
        for (String junk : JUNK_KEYWORDS) {
            if (combined.contains(junk)) return false;
        }

        // 2. 타겟 키워드 포함 검사
        for (String keyword : FILTER_KEYWORDS) {
            if (combined.contains(keyword.toLowerCase())) return true;
        }
        return false;
    }

    private NewsItem convertToNewsItem(SyndEntry entry) {
        LocalDateTime publishedDate = LocalDateTime.now();
        if (entry.getPublishedDate() != null) {
            publishedDate = convertToLocalDateTime(entry.getPublishedDate());
        }
        return NewsItem.builder()
                .title(cleanText(entry.getTitle()))
                .link(entry.getLink())
                .description(cleanText(entry.getDescription() != null ? entry.getDescription().getValue() : ""))
                .pubDate(publishedDate)
                .isAiSummarized(false)
                .build();
    }

    private String cleanText(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]*>", "").replaceAll("&[^;]+;", " ").trim();
    }

    private LocalDateTime convertToLocalDateTime(Date dateToConvert) {
        return dateToConvert.toInstant().atZone(ZoneId.of("Asia/Seoul")).toLocalDateTime();
    }

    public List<NewsItem> getRecentNews() {
        return newsMapper.findRecentNews(15); // 화면 표시 개수도 약간 줄임
    }
}

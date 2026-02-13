package com.stockPlus.service;

import com.stockPlus.domain.NewsItem;
import com.stockPlus.mapper.NewsMapper;
import com.stockPlus.mapper.UserKeywordMapper;
import com.stockPlus.mapper.UserMapper;
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
    private final UserKeywordMapper userKeywordMapper;
    private final UserMapper userMapper;

    private static final List<String> RSS_FEED_URLS = Arrays.asList(
        "https://rss.hankyung.com/feed/market.xml"
    );

    private static final List<String> JUNK_KEYWORDS = Arrays.asList(
        "무료", "상담", "카톡", "선착순", "비밀", "급등예고", "공개", "폭등", "세력", "추천주", "종목추천"
    );

    @EventListener(ApplicationReadyEvent.class)
    public void initData() {
        log.info("NewsService: 뉴스 수집 및 AI 요약 배치는 매시 정각/5분에 실행됩니다.");
    }

    @Scheduled(cron = "0 5 8-23 * * *") 
    @Transactional
    public void fetchAndSaveNews() {
        log.info("Starting personalized news fetch with immediate AI Summary (Min 3, Max 5)...");
        int totalSavedOverall = 0;
        
        List<String> allUserIds = userMapper.findAllUserIds();
        
        for (String usrId : allUserIds) {
            int userSavedThisCycle = 0;
            int userSummarizedThisCycle = 0;
            final int MAX_NEWS_TO_SAVE = 4;  // 시간당 최대 4개 수집
            final int MAX_AI_SUMMARIES = 2;  // 그중 딱 2개만 AI 요약

            try {
                List<String> keywords = userKeywordMapper.findKeywordsByUsrId(usrId);
                
                // 중요 뉴스 판별 키워드
                List<String> importantKeywords = Arrays.asList("실적", "계약", "공시", "M&A", "인수", "합병", "신공장", "체결", "특허", "임상", "공개", "상장", "수주");

                // 1. 키워드 뉴스 수집 (최대 4개)
                if (!keywords.isEmpty()) {
                    for (String keyword : keywords) {
                        if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                        List<NewsItem> items = naverService.searchNewsItems(keyword);
                        for (NewsItem item : items) {
                            if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                            if (isNotJunk(item.getTitle(), item.getDescription())) {
                                item.setUsrId(usrId);
                                
                                // 중요 키워드 우선 요약 (최대 2개)
                                boolean isImportant = importantKeywords.stream().anyMatch(k -> item.getTitle().contains(k));
                                if (userSummarizedThisCycle < MAX_AI_SUMMARIES && isImportant) {
                                    String summary = geminiService.summarizeNews(item.getTitle(), item.getDescription());
                                    if (summary != null) {
                                        item.setAiSummary(summary);
                                        item.setAiSummarized(true);
                                        userSummarizedThisCycle++;
                                    }
                                }

                                if (newsMapper.saveNews(item) > 0) {
                                    userSavedThisCycle++;
                                    totalSavedOverall++;
                                }
                            }
                        }
                    }
                }
                
                // 2. RSS 피드 뉴스 수집 (4개를 다 못 채운 경우 실행)
                if (userSavedThisCycle < MAX_NEWS_TO_SAVE) {
                    for (String feedUrl : RSS_FEED_URLS) {
                        if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                        try {
                            URL url = new URL(feedUrl);
                            SyndFeedInput input = new SyndFeedInput();
                            SyndFeed feed = input.build(new XmlReader(url));
                            for (SyndEntry entry : feed.getEntries()) {
                                if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                                if (isNotJunk(entry.getTitle(), "")) {
                                    NewsItem newsItem = convertToNewsItem(entry);
                                    newsItem.setUsrId(usrId);

                                    // 요약이 아직 2개 안 채워졌다면 RSS 중요 뉴스도 요약
                                    boolean isImportant = importantKeywords.stream().anyMatch(k -> newsItem.getTitle().contains(k));
                                    if (userSummarizedThisCycle < MAX_AI_SUMMARIES && isImportant) {
                                        String summary = geminiService.summarizeNews(newsItem.getTitle(), newsItem.getDescription());
                                        if (summary != null) {
                                            newsItem.setAiSummary(summary);
                                            newsItem.setAiSummarized(true);
                                            userSummarizedThisCycle++;
                                        }
                                    }

                                    if (newsMapper.saveNews(newsItem) > 0) {
                                        userSavedThisCycle++;
                                        totalSavedOverall++;
                                    }
                                }
                            }
                        } catch (Exception e) {}
                    }
                }

                // 3. [보강] 만약 2개의 요약을 다 못 채웠다면, 방금 저장한 뉴스들 중 요약 없는 것을 골라 강제 요약 수행
                if (userSummarizedThisCycle < MAX_AI_SUMMARIES && userSavedThisCycle > userSummarizedThisCycle) {
                    // DB에서 방금 저장된 요약 안 된 뉴스 가져오기
                    List<NewsItem> recentNoSummary = newsMapper.findRecentNews(usrId, 10);
                    for (NewsItem n : recentNoSummary) {
                        if (userSummarizedThisCycle >= MAX_AI_SUMMARIES) break;
                        if (!n.isAiSummarized()) {
                            String summary = geminiService.summarizeNews(n.getTitle(), n.getDescription());
                            if (summary != null) {
                                n.setAiSummary(summary);
                                n.setAiSummarized(true);
                                newsMapper.updateAiSummary(n); // NewsItem 객체 전달
                                userSummarizedThisCycle++;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error fetching news for user {}: {}", usrId, e.getMessage());
            }
        }
        log.info("Personalized news fetch & summary completed. Total items: {}", totalSavedOverall);
    }

    // 기존 runAiSummaryBatch 제거 (fetchAndSaveNews에 통합됨)

    private boolean isNotJunk(String title, String desc) {
        if (title == null) return false;
        String combined = (title + (desc != null ? desc : "")).toLowerCase();
        for (String junk : JUNK_KEYWORDS) {
            if (combined.contains(junk)) return false;
        }
        return true;
    }

    public List<NewsItem> getRecentNews(String usrId) {
        return newsMapper.findRecentNews(usrId, 20); 
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
}
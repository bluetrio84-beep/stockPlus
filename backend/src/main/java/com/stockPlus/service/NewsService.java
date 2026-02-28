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
            final int MAX_NEWS_TO_SAVE = 4;  // [v17.9] 시간당 최대 4개 수집
            final int MAX_AI_SUMMARIES = 3;  // [v17.9] 그중 최소/최대 3개 AI 요약

            try {
                List<String> keywords = userKeywordMapper.findKeywordsByUsrId(usrId);
                // RSS 가중치 판단을 위한 중요 단어들
                List<String> importantKeywords = Arrays.asList("실적", "계약", "공시", "M&A", "인수", "합병", "신공장", "체결", "특허", "임상", "공개", "상장", "수주", "속보", "발표");

                // 1. [가중치 1순위] 사용자 키워드 뉴스 수집 및 즉시 요약
                if (!keywords.isEmpty()) {
                    for (String keyword : keywords) {
                        if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                        List<NewsItem> items = naverService.searchNewsItems(keyword);
                        for (NewsItem item : items) {
                            if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                            if (isNotJunk(item.getTitle(), item.getDescription())) {
                                item.setUsrId(usrId);
                                
                                // 키워드 뉴스는 3개 채울 때까지 무조건 요약 시도
                                if (userSummarizedThisCycle < MAX_AI_SUMMARIES) {
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
                
                // 2. [가중치 2순위] RSS 피드 뉴스 수집 및 중요 뉴스 요약
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

                                    // RSS는 중요 키워드가 포함된 경우에만 우선 요약
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

                // 3. [가중치 3순위] 강제 보충: 요약이 3개 미만이면 방금 저장한 뉴스 중 무작위 요약
                if (userSummarizedThisCycle < MAX_AI_SUMMARIES && userSavedThisCycle > userSummarizedThisCycle) {
                    List<NewsItem> recentSaved = newsMapper.findRecentNews(usrId, MAX_NEWS_TO_SAVE);
                    for (NewsItem n : recentSaved) {
                        if (userSummarizedThisCycle >= MAX_AI_SUMMARIES) break;
                        if (!n.isAiSummarized()) {
                            String summary = geminiService.summarizeNews(n.getTitle(), n.getDescription());
                            if (summary != null) {
                                n.setAiSummary(summary);
                                n.setAiSummarized(true);
                                newsMapper.updateAiSummary(n);
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
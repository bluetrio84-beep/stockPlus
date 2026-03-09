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
        log.info(">>> [News Pipeline] Starting personalized news fetch & summary...");
        int totalSavedOverall = 0;
        
        List<String> allUserIds = userMapper.findAllActiveUserIds(); // [v17.9] 활성 사용자만 처리
        log.info(">>> [News Pipeline] Found {} active users to process.", allUserIds.size());
        
        for (String usrId : allUserIds) {
            log.info(">>> [News Pipeline] Processing start for user: {}", usrId);
            int userSavedThisCycle = 0;
            int userSummarizedThisCycle = 0;
            final int MAX_NEWS_TO_SAVE = 4;
            final int MAX_AI_SUMMARIES = 3;

            try {
                List<String> keywords = userKeywordMapper.findKeywordsByUsrId(usrId);
                // [v24.2] 하드코딩 제거: DB에서 시스템 공통 AI 중요 키워드 로드
                List<String> importantKeywords = userKeywordMapper.findKeywordsByUsrId("SYSTEM_AI");

                // 1. [가중치 1순위] 키워드 뉴스 수집 (사용자 키워드 + 시스템 중요 키워드)
                if (!keywords.isEmpty() || !importantKeywords.isEmpty()) {
                    // 두 리스트 통합 (중복 제거를 위해 Set 고려 가능하나 단순 루프로 처리)
                    java.util.Set<String> combinedKeywords = new java.util.HashSet<>(keywords);
                    combinedKeywords.addAll(importantKeywords);

                    for (String keyword : combinedKeywords) {
                        if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                        List<NewsItem> items = naverService.searchNewsItems(keyword);
                        for (NewsItem item : items) {
                            if (userSavedThisCycle >= MAX_NEWS_TO_SAVE) break;
                            if (isNotJunk(item.getTitle(), item.getDescription())) {
                                item.setUsrId(usrId);
                                if (newsMapper.saveNews(item) > 0) userSavedThisCycle++;
                            }
                        }
                    }
                }
                
                // 2. [가중치 2순위] RSS 피드 보충
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
                                    if (newsMapper.saveNews(newsItem) > 0) userSavedThisCycle++;
                                }
                            }
                        } catch (Exception e) {
                            log.error(">>> [News Pipeline] RSS Fetch Error: {}", e.getMessage());
                        }
                    }
                }

                // 3. [핵심] 사용자별 AI 요약 생성 (최근 10개 중 요약 안 된 것 3개 채우기)
                List<NewsItem> recentNews = newsMapper.findRecentNews(usrId, 10);
                for (NewsItem n : recentNews) {
                    if (userSummarizedThisCycle >= MAX_AI_SUMMARIES) break;
                    if (!n.isAiSummarized()) {
                        log.info(">>> [AI Summary] Summarizing for {}: {}", usrId, n.getTitle());
                        String summary = geminiService.summarizeNews(n.getTitle(), n.getDescription());
                        if (summary != null && !summary.contains("실패") && !summary.isEmpty()) {
                            n.setAiSummary(summary);
                            n.setAiSummarized(true);
                            newsMapper.updateAiSummary(n);
                            userSummarizedThisCycle++;
                        }
                    } else {
                        userSummarizedThisCycle++;
                    }
                }
                totalSavedOverall += userSavedThisCycle;
                log.info(">>> [News Pipeline] Completed for user: {}. (Saved: {}, Summarized Today: {})", usrId, userSavedThisCycle, userSummarizedThisCycle);
            } catch (Exception e) {
                log.error(">>> [News Pipeline] Error for user {}: {}", usrId, e.getMessage());
            }
        }
        log.info(">>> [News Pipeline] Entire process finished. Total new items: {}", totalSavedOverall);
    }

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
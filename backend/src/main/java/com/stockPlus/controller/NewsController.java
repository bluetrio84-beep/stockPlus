package com.stockPlus.controller;

import com.stockPlus.domain.NewsItem;
import com.stockPlus.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.core.Authentication;
import java.util.List;

/**
 * 뉴스 관련 API 요청을 처리하는 컨트롤러입니다.
 * 최신 뉴스 조회 및 뉴스 크롤링/요약 트리거 기능을 제공합니다.
 */
@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService; // 뉴스 비즈니스 로직을 담당하는 서비스

    /**
     * DB에 저장된 최신 뉴스를 조회합니다. (사용자 키워드 필터링 적용)
     * GET /api/news/recent
     *
     * @return 최신 뉴스 목록 (List<NewsItem>)
     */
    @GetMapping("/recent")
    public List<NewsItem> getRecentNews(Authentication authentication) {
        String usrId = (authentication != null) ? authentication.getName() : null;
        return newsService.getRecentNews(usrId);
    }

    /**
     * 외부 API를 통해 뉴스를 수동으로 가져오고, AI 요약을 실행하는 트리거 API입니다.
     * (주로 테스트용이나 관리자 기능으로 사용)
     * GET /api/news/trigger
     *
     * @return 실행 결과 메시지
     */
    @GetMapping("/trigger")
    public String triggerNewsFetch() {
        newsService.fetchAndSaveNews();    // 네이버 뉴스 API 호출, 저장 및 즉시 AI 요약 수행
        return "News fetch & AI summary triggered!";
    }
}
package com.example.myapp.controller;

import com.example.myapp.domain.NewsItem;
import com.example.myapp.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/recent")
    public List<NewsItem> getRecentNews() {
        return newsService.getRecentNews();
    }

    @GetMapping("/trigger")
    public String triggerNewsFetch() {
        newsService.fetchAndSaveNews();
        newsService.runAiSummaryBatch();
        return "News fetch & AI summary triggered!";
    }
}
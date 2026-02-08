package com.example.myapp.mapper;

import com.example.myapp.domain.NewsItem;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface NewsMapper {
    int saveNews(NewsItem newsItem);
    List<NewsItem> findRecentNews(int limit);
    List<NewsItem> findPendingSummaryNews(int limit);
    int updateAiSummary(NewsItem newsItem);
}

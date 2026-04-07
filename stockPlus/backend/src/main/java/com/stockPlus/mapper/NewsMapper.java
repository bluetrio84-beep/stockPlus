package com.stockPlus.mapper;

import com.stockPlus.domain.NewsItem;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface NewsMapper {
    int saveNews(NewsItem newsItem);
    List<NewsItem> findRecentNews(@org.apache.ibatis.annotations.Param("usrId") String usrId, @org.apache.ibatis.annotations.Param("limit") int limit);
    List<NewsItem> findPendingSummaryNews(int limit);
    int updateAiSummary(NewsItem newsItem);
    
    // 모든 사용자가 등록한 고유 키워드 목록 조회
    List<String> findAllUniqueUserKeywords();
}

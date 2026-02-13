package com.stockPlus.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsItem {
    private Long id;
    private String usrId; // 사용자 ID (FK)
    private String title;
    private String link;
    private String description;
    private LocalDateTime pubDate;
    private boolean isAiSummarized;
    private String aiSummary;
    private LocalDateTime createdAt;
}

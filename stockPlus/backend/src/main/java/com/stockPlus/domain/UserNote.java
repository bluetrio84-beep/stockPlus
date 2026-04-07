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
public class UserNote {
    private Long id;
    private String usrId;
    private String refCode; 
    private String stockName; // [v33.95] 추가: 종목명 자동 매핑
    private String title;
    private String content;
    private String category;
    private Boolean isImportant;
    private Integer viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

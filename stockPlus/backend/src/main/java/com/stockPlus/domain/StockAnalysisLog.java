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
public class StockAnalysisLog {
    private Long id;
    private String usrId; // String 으로 변경
    private String stockCode;
    private String analysisResult;
    private LocalDateTime createdAt;
}

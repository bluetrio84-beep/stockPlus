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
public class Watchlist {
    private String usrId;   // 복합 PK 일부
    private String stockCode; // 복합 PK 일부
    private String stockName;
    private String exchangeCode;
    private Integer groupId; // 복합 PK 일부
    private Boolean isFavorite;
    private String marketType;
    private LocalDateTime createdAt;
}
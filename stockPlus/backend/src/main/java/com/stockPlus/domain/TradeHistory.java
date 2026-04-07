package com.stockPlus.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeHistory {
    private Long id;
    private String usrId;
    private String stockCode;
    private LocalDate tradeDate;
    private Integer quantity;
    private BigDecimal price;
    private LocalDateTime createdAt;
}

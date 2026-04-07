package com.stockPlus.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Holdings {
    private Long id;
    private String usrId;
    private String stockCode;
    private String stockName;
    private Integer quantity;
    private BigDecimal avgPrice;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

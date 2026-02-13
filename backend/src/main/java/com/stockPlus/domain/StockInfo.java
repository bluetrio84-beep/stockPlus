package com.stockPlus.domain;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class StockInfo {
    private String stockCode;
    private String exchangeCode; // J or NX
    private String sector;
    private String marketType;
    private Long marketCap;
    private LocalDateTime updatedAt;
}
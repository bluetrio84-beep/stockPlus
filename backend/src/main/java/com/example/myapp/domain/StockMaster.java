package com.example.myapp.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMaster {
    private String stockCode;
    private String stockName;
    private String exchangeCode;
    private String marketType;
}

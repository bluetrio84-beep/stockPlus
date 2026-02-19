package com.stockPlus.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockPriceDto {
    private String stockCode;
    private String exchangeCode;
    private String marketName;
    private String time;
    private String currentPrice;
    private String change;
    private String changeRate;
    private String volume;
    private String priceSign;
    private Boolean isExpected; // 예상가 여부
    
    // 상세 정보
    private String open;
    private String high;
    private String low;
    private String prevClose;
    private String marketCap;
    private String listedShares;
    private String high52w;
    private String low52w;
    private String stockStatus; 
    private String marketWarning; 
    private String indexName; 
    
    // [임시] 모든 응답 필드 확인용
    private Map<String, Object> rawOutput;
}

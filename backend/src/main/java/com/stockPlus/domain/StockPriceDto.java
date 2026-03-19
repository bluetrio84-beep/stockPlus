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
    private String industryName; // [v16.4] 업종명 추가
    
    // [v21.0] 실적 및 수급 데이터 추가
    private String programNet;   // 프로그램 순매수 (pgtr_ntby_qty)
    private String foreignNet;   // 외국인 순매수 (frgn_ntby_qty)
    
    // [임시] 모든 응답 필드 확인용
    private Map<String, Object> rawOutput;
}

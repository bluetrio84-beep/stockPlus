package com.stockPlus.domain.kis;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class KisPriceOutput {
    @JsonProperty("stck_prpr")
    private String currentPrice;    // 주식 현재가
    
    @JsonProperty("prdy_vrss")
    private String change;          // 전일 대비
    
    @JsonProperty("prdy_ctrt")
    private String changeRate;      // 전일 대비율
    
    @JsonProperty("prdy_vrss_sign")
    private String priceSign;       // 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
    
    @JsonProperty("acml_vol")
    private String volume;          // 누적 거래량
    
    @JsonProperty("stck_shrn_iscd")
    private String stockCode;       // 주식 단축 종목코드
    
    @JsonProperty("hts_kor_isnm")
    private String stockName;       // HTS 한글 종목명
    
    @JsonProperty("stck_oprc")
    private String open;            // 시가
    
    @JsonProperty("stck_hgpr")
    private String high;            // 고가
    
    @JsonProperty("stck_lwpr")
    private String low;             // 저가
    
    @JsonProperty("stck_sdpr")
    private String prevClose;       // 전일 종가
    
    @JsonProperty("hts_avls")
    private String marketCap;       // 시가총액
    
    @JsonProperty("lstn_stcn")
    private String listedShares;    // 상장 주식 수
    
    @JsonProperty("w52_hgpr")
    private String high52w;         // 52주 최고가
    
    @JsonProperty("w52_lwpr")
    private String low52w;          // 52주 최저가
}

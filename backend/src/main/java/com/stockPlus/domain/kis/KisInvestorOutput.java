package com.stockPlus.domain.kis;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class KisInvestorOutput {
    @JsonProperty("stck_bsop_date")
    private String date;            // 영업 일자
    
    @JsonProperty("stck_clpr")
    private String price;           // 주식 종가
    
    @JsonProperty("prdy_vrss")
    private String change;          // 전일 대비
    
    @JsonProperty("prsn_ntby_qty")
    private String retailNet;       // 개인 순매수 수량
    
    @JsonProperty("frgn_ntby_qty")
    private String foreignNet;      // 외국인 순매수 수량
    
    @JsonProperty("orgn_ntby_qty")
    private String institutionNet;  // 기관 순매수 수량
}

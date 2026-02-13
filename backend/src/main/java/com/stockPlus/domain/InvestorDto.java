package com.stockPlus.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestorDto {
    private String stockCode;
    private List<InvestorItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvestorItem {
        private String date;           // 일자
        private String price;          // 종가
        private String change;         // 전일대비
        private String retailNet;      // 개인
        private String foreignNet;     // 외국인
        private String institutionNet; // 기관계 (합계)
    }
}

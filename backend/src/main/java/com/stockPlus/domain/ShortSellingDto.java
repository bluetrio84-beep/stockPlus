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
public class ShortSellingDto {
    private String stockCode;
    private List<ShortSellingItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShortSellingItem {
        private String date;              // 영업일자 (stck_bsop_date)
        private String shortCntgQty;      // 당일 공매도 체결수량 (sstk_cntg_qty)
        private String shortRatio;        // 당일 공매도 거래량 비중 (ssts_vol_rlim)
        private String shortAmtRatio;     // 당일 공매도 거래대금 비중 (ssts_tr_pbmn_rlim)
        private String shortCntgAmt;      // 당일 공매도 거래대금 (ssts_tr_pbmn)
        private String totalShortCntgQty; // 누적 공매도 체결 수량 (acml_ssts_cntg_qty)
        private String totalShortRatio;   // 누적 공매도 거래량 비중 (acml_ssts_cntg_qty_rlim)
        private String totalShortAmtRatio; // 누적 공매도 거래대금 비중 (acml_ssts_tr_pbmn_rlim)
        private String totalShortAmt;     // 누적 공매도 거래대금 (acml_ssts_tr_pbmn)
        private String avgShortPrice;     // 공매도 평균가 (avrg_prc)
    }
}

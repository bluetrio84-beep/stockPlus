package com.stockPlus.service;

import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.StockChartDto;
import com.stockPlus.domain.InvestorDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class KisStockService {
    private final KisAuthService kisAuthService;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public Mono<StockPriceDto> fetchUnifiedCurrentPrice(final String stockCode, final String exchangeCode) {
        if ("IDX".equals(exchangeCode)) return fetchIndexCurrentPrice(stockCode);
        if ("UN".equals(exchangeCode)) {
            return fetchCurrentPriceInternal(stockCode, "UN", "UN");
        }
        return fetchCurrentPriceInternal(stockCode, "NX".equals(exchangeCode) ? "NX" : "J", exchangeCode);
    }

    private Mono<StockPriceDto> fetchCurrentPriceInternal(String stockCode, String marketDiv, String requestExchange) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST01010100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(json -> {
            try {
                JsonNode out = objectMapper.readTree(json).path("output");
                // [v13.2] 시장 및 지수 구분 로직 최종 수정
                String korName = getField(out, "rprs_mrkt_kor_name", "RPRS_MRKT_KOR_NAME", "");
                String marketName = "KOSPI"; // 기본값
                String indexName = null;

                // 지수 편입 여부 확인
                if (korName.contains("200")) {
                    indexName = "KOSPI 200";
                    marketName = "KOSPI";
                } else if (korName.contains("150")) {
                    indexName = "KOSDAQ 150";
                    marketName = "KOSDAQ";
                } else if (korName.contains("KOSDAQ") || korName.contains("코스닥")) {
                    marketName = "KOSDAQ";
                }

                return StockPriceDto.builder().stockCode(stockCode).marketName(marketName)
                        .currentPrice(getField(out, "stck_prpr", "STCK_PRPR", "0")).change(getField(out, "prdy_vrss", "PRDY_VRSS", "0"))
                        .changeRate(getField(out, "prdy_ctrt", "PRDY_CTRT", "0.00")).priceSign(getField(out, "prdy_vrss_sign", "PRDY_VRSS_SIGN", "3"))
                        .volume(getField(out, "acml_vol", "ACML_VOL", "0")).open(getField(out, "stck_oprc", "STCK_OPRC", "0"))
                        .high(getField(out, "stck_hgpr", "STCK_HGPR", "0")).low(getField(out, "stck_lwpr", "STCK_LWPR", "0"))
                        .prevClose(getField(out, "stck_sdpr", "STCK_SDPR", "0")).marketCap(getField(out, "hts_avls", "HTS_AVLS", "0"))
                        .listedShares(getField(out, "lstn_stcn", "LSTN_STCN", "0")).high52w(getField(out, "w52_hgpr", "W52_HGPR", "0"))
                        .low52w(getField(out, "w52_lwpr", "W52_LWPR", "0")).indexName(indexName)
                        .exchangeCode(requestExchange).build();
            } catch (Exception e) { return StockPriceDto.builder().stockCode(stockCode).currentPrice("0").build(); }
        });
    }

    private Mono<StockPriceDto> fetchIndexCurrentPrice(String indexCode) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHPUP02100000").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(json -> {
            try {
                JsonNode out = objectMapper.readTree(json).path("output");
                String name = indexCode.equals("0001") ? "KOSPI" : "KOSDAQ";
                return StockPriceDto.builder().stockCode(indexCode).marketName(name).indexName(name).currentPrice(getField(out, "bstp_nmix_prpr", "BSTP_NMIX_PRPR", "0")).change(getField(out, "bstp_nmix_prdy_vrss", "BSTP_NMIX_PRDY_VRSS", "0")).changeRate(getField(out, "bstp_nmix_prdy_ctrt", "BSTP_NMIX_PRDY_CTRT", "0.00")).priceSign(getField(out, "bstp_nmix_prdy_vrss_sign", "BSTP_NMIX_PRDY_VRSS_SIGN", "3")).volume(getField(out, "acml_vol", "ACML_VOL", "0")).build();
            } catch (Exception e) { return StockPriceDto.builder().stockCode(indexCode).currentPrice("0").build(); }
        });
    }

    public Mono<List<StockChartDto>> fetchUnifiedChart(String stockCode, String exchangeCode, String period) {
        if ("IDX".equals(exchangeCode)) return fetchIndexHistoryChart(stockCode, period);
        if ("UN".equals(exchangeCode)) {
            return fetchHistoryChart(stockCode, "UN", period)
                    .flatMap(list -> list.isEmpty() ? fetchHistoryChart(stockCode, "J", period) : Mono.just(list));
        }
        String targetMarket = "NX".equals(exchangeCode) ? "NX" : "J";
        return fetchHistoryChart(stockCode, targetMarket, period);
    }

    private Mono<List<StockChartDto>> fetchHistoryChart(String stockCode, String marketDiv, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "1W".equals(period) ? "W" : ("1M".equals(period) ? "M" : "D");
        String endDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String startDate = LocalDate.now().minusYears(2).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0&FID_INPUT_DATE_1=" + startDate + "&FID_INPUT_DATE_2=" + endDate;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST03010100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseChartResponse(res, false)).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private Mono<List<StockChartDto>> fetchIndexHistoryChart(String indexCode, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "1W".equals(period) ? "W" : ("1M".equals(period) ? "M" : "D");
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0";
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKUP03500100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseChartResponse(res, true)).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private List<StockChartDto> parseChartResponse(String response, boolean isIndex) {
        try {
            List<StockChartDto> list = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            JsonNode dataNode = root.path("output2");
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
            if (dataNode.isArray()) {
                for (JsonNode n : dataNode) {
                    String d = n.path("stck_bsop_date").asText();
                    if (d.isEmpty()) continue;
                    LocalDate ld = LocalDate.parse(d, df);
                    long ts = ld.atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    String o = isIndex ? n.path("bstp_nmix_oprc").asText("0") : n.path("stck_oprc").asText("0");
                    String h = isIndex ? n.path("bstp_nmix_hgpr").asText("0") : n.path("stck_hgpr").asText("0");
                    String l = isIndex ? n.path("bstp_nmix_lwpr").asText("0") : n.path("stck_lwpr").asText("0");
                    String c = isIndex ? n.path("bstp_nmix_prpr").asText("0") : n.path("stck_clpr").asText("0");
                    String v = n.path("acml_vol").asText("0");
                    String dateStr = d.length() == 8 ? d.substring(0, 4) + "-" + d.substring(4, 6) + "-" + d.substring(6, 8) : ld.toString();
                    list.add(StockChartDto.builder().time(ts).date(dateStr).open(o).high(h).low(l).close(c).volume(v).build());
                }
            }
            Collections.reverse(list);
            return list;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    /**
     * 투자자별 매매동향 조회 (단일 호출로 원복)
     */
    public Mono<InvestorDto> fetchInvestors(String stockCode, String exchangeCode) {
        String marketDiv = "NX".equals(exchangeCode) ? "NX" : "J";
        return fetchInvestorsInternal(stockCode, marketDiv)
                .map(items -> InvestorDto.builder().stockCode(stockCode).items(items).build());
    }

    private Mono<List<InvestorDto.InvestorItem>> fetchInvestorsInternal(String stockCode, String marketDiv) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-investor?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST01010900").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(JsonNode.class).map(root -> {
            JsonNode outArr = root.path("output");
            List<InvestorDto.InvestorItem> items = new ArrayList<>();
            if (outArr.isArray()) {
                for (JsonNode n : outArr) {
                    String rawDate = n.path("stck_bsop_date").asText("");
                    if (rawDate.length() < 8) continue;
                    String date = rawDate.substring(4, 6) + "." + rawDate.substring(6, 8);
                    items.add(InvestorDto.InvestorItem.builder()
                            .date(date).price(n.path("stck_clpr").asText("0")).change(n.path("prdy_vrss").asText("0"))
                            .retailNet(n.path("prsn_ntby_qty").asText("0")).foreignNet(n.path("frgn_ntby_qty").asText("0")).institutionNet(n.path("orgn_ntby_qty").asText("0"))
                            .build());
                }
            }
            return items;
        }).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private String getField(JsonNode node, String lower, String upper, String defaultVal) {
        if (node.has(lower)) return node.path(lower).asText(defaultVal);
        if (node.has(upper)) return node.path(upper).asText(defaultVal);
        return defaultVal;
    }

    private long parseLongSafe(String val) {
        if (val == null || val.isEmpty() || "null".equals(val)) return 0L;
        try { return (long) Double.parseDouble(val.replace(",", "")); } catch (Exception e) { return 0L; }
    }
}

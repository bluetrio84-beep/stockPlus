package com.stockPlus.service;

import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.StockChartDto;
import com.stockPlus.domain.InvestorDto;
import com.stockPlus.domain.kis.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * 한국투자증권(KIS) REST API를 사용하여 주식 정보(현재가, 차트 등)를 조회하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
public class KisStockService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(KisStockService.class);

    private final KisAuthService kisAuthService;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    /**
     * 투자자별 매매동향 조회
     */
    public Mono<InvestorDto> fetchInvestors(String stockCode, String exchangeCode) {
        String marketDiv = "UN".equals(exchangeCode) ? "UN" : ("NX".equals(exchangeCode) ? "NX" : "J");
        return fetchInvestorsInternal(stockCode, marketDiv);
    }

    private Mono<InvestorDto> fetchInvestorsInternal(String stockCode, String marketDiv) {
        String token = kisAuthService.getAccessToken();
        return webClientBuilder.build().get()
                .uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-investor",
                     uriBuilder -> uriBuilder.queryParam("FID_COND_MRKT_DIV_CODE", marketDiv).queryParam("FID_INPUT_ISCD", stockCode).build())
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST01010900")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve().bodyToMono(JsonNode.class)
                .map(body -> {
                    List<InvestorDto.InvestorItem> items = new ArrayList<>();
                    JsonNode output = body.get("output");
                    if (output != null && output.isArray()) {
                        for (JsonNode out : output) {
                            String rawDate = out.path("stck_bsop_date").asText();
                            if (rawDate.isEmpty()) continue;
                            String date = rawDate.substring(4, 6) + "." + rawDate.substring(6, 8);
                            items.add(InvestorDto.InvestorItem.builder().date(date).price(out.path("stck_clpr").asText())
                                    .retailNet(out.path("prsn_ntby_qty").asText()).foreignNet(out.path("frgn_ntby_qty").asText())
                                    .institutionNet(out.path("orgn_ntby_qty").asText()).build());
                        }
                    }
                    return InvestorDto.builder().stockCode(stockCode).items(items).build();
                });
    }

    public Mono<StockPriceDto> fetchUnifiedCurrentPrice(final String stockCode, final String exchangeCode) {
        if ("IDX".equals(exchangeCode)) return fetchIndexCurrentPrice(stockCode);
        if ("UN".equals(exchangeCode)) {
            return Mono.zip(fetchCurrentPriceInternal(stockCode, "FHKST01010100", "J", "UN"), fetchCurrentPriceInternal(stockCode, "FHKST01010100", "NX", "UN"))
                .map(tuple -> {
                    StockPriceDto jDto = tuple.getT1();
                    StockPriceDto nxDto = tuple.getT2();
                    long totalVol = parseLongSafe(jDto.getVolume()) + parseLongSafe(nxDto.getVolume());
                    LocalTime now = LocalTime.now(ZoneId.of("Asia/Seoul"));
                    boolean isNxTime = now.isAfter(LocalTime.of(15, 30, 0)) || now.isBefore(LocalTime.of(8, 50, 0));
                    StockPriceDto mainDto = (isNxTime && parseLongSafe(nxDto.getCurrentPrice()) > 0) ? nxDto : jDto;
                    mainDto.setVolume(String.valueOf(totalVol));
                    return mainDto;
                });
        }
        return fetchCurrentPriceInternal(stockCode, "FHKST01010100", "NX".equals(exchangeCode) ? "NX" : "J", exchangeCode);
    }

    public Mono<List<StockChartDto>> fetchUnifiedChart(final String stockCode, final String exchangeCode, final String period) {
        if ("IDX".equals(exchangeCode)) return fetchIndexHistoryChart(stockCode, period);
        String marketDiv = "NX".equals(exchangeCode) ? "NX" : "J";
        return fetchHistoryChart(stockCode, marketDiv, period);
    }

    private Mono<List<StockChartDto>> fetchHistoryChart(String stockCode, String marketDiv, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "1W".equals(period) ? "W" : ("1M".equals(period) ? "M" : "D");
        String endDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String startDate = LocalDate.now().minusYears(2).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0&FID_INPUT_DATE_1=" + startDate + "&FID_INPUT_DATE_2=" + endDate;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST03010100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseChartResponse(res, period)).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private List<StockChartDto> parseChartResponse(String response, String period) {
        try {
            List<StockChartDto> list = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            JsonNode dataNode = root.path("output2");
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
            if (dataNode.isArray()) {
                for (JsonNode node : dataNode) {
                    String dateStr = node.path("stck_bsop_date").asText();
                    if (dateStr.isEmpty()) continue;
                    long timestamp = LocalDate.parse(dateStr, df).atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    list.add(StockChartDto.builder().time(timestamp).open(node.path("stck_oprc").asText("0")).high(node.path("stck_hgpr").asText("0")).low(node.path("stck_lwpr").asText("0")).close(node.path("stck_clpr").asText("0")).volume(node.path("acml_vol").asText("0")).build());
                }
            }
            Collections.reverse(list);
            return list;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private Mono<StockPriceDto> fetchIndexCurrentPrice(String indexCode) {
        String token = kisAuthService.getAccessToken();
        return webClientBuilder.build().get().uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHPUP02100000").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(JsonNode.class).map(body -> {
            JsonNode output = body.path("output");
            String name = indexCode.equals("0001") ? "KOSPI" : "KOSDAQ";
            return StockPriceDto.builder().stockCode(indexCode).marketName(name).indexName(name).currentPrice(output.path("bstp_nmix_prpr").asText()).change(output.path("bstp_nmix_prdy_vrss").asText()).changeRate(output.path("bstp_nmix_prdy_ctrt").asText()).volume(output.path("acml_vol").asText()).priceSign(output.path("bstp_nmix_prdy_vrss_sign").asText()).build();
        });
    }

    private Mono<List<StockChartDto>> fetchIndexHistoryChart(String indexCode, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "1W".equals(period) ? "W" : ("1M".equals(period) ? "M" : "D");
        return webClientBuilder.build().get().uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0").header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKUP03500100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(this::parseIndexChartResponse).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private List<StockChartDto> parseIndexChartResponse(String response) {
        try {
            List<StockChartDto> list = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            if (root.has("output2") && root.path("output2").isArray()) {
                DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
                for (JsonNode node : root.path("output2")) {
                    String dateStr = node.path("stck_bsop_date").asText();
                    long ts = LocalDate.parse(dateStr, df).atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    list.add(StockChartDto.builder().time(ts).open(node.path("bstp_nmix_oprc").asText()).high(node.path("bstp_nmix_hgpr").asText()).low(node.path("bstp_nmix_lwpr").asText()).close(node.path("bstp_nmix_prpr").asText()).volume(node.path("acml_vol").asText()).build());
                }
            }
            Collections.reverse(list);
            return list;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private Mono<StockPriceDto> fetchCurrentPriceInternal(String stockCode, String trId, String marketDiv, String requestExchange) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", trId).header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(json -> {
            try {
                JsonNode out = objectMapper.readTree(json).path("output");
                String korName = out.path("rprs_mrkt_kor_name").asText("");
                String marketName = korName.contains("KOSDAQ") ? "KOSDAQ" : "KOSPI";
                String indexName = korName.contains("200") ? "200" : (korName.contains("150") ? "150" : null);
                return StockPriceDto.builder().stockCode(stockCode).marketName(marketName).currentPrice(out.path("stck_prpr").asText()).change(out.path("prdy_vrss").asText()).changeRate(out.path("prdy_ctrt").asText()).priceSign(out.path("prdy_vrss_sign").asText()).volume(out.path("acml_vol").asText()).open(out.path("stck_oprc").asText()).high(out.path("stck_hgpr").asText()).low(out.path("stck_lwpr").asText()).prevClose(out.path("stck_sdpr").asText()).marketCap(out.path("hts_avls").asText()).listedShares(out.path("lstn_stcn").asText()).high52w(out.path("w52_hgpr").asText()).low52w(out.path("w52_lwpr").asText()).indexName(indexName).exchangeCode(requestExchange).build();
            } catch (Exception e) { return StockPriceDto.builder().stockCode(stockCode).build(); }
        });
    }

    private long parseLongSafe(String val) {
        if (val == null || val.isEmpty() || "null".equals(val)) return 0L;
        try { return Long.parseLong(val.replace(",", "")); } catch (Exception e) { return 0L; }
    }
}

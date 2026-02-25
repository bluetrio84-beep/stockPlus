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
import java.time.LocalTime;
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
        
        return webClientBuilder.build().get()
                .uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST01010100")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve()
                .onStatus(status -> status.isError(), response -> response.bodyToMono(String.class).flatMap(body -> {
                    if (body.contains("EGW00201")) return Mono.error(new RuntimeException("TPS_LIMIT"));
                    return Mono.error(new RuntimeException("API_ERROR: " + body));
                }))
                .bodyToMono(String.class)
                .retryWhen(reactor.util.retry.Retry.fixedDelay(3, java.time.Duration.ofMillis(500))
                        .filter(ex -> "TPS_LIMIT".equals(ex.getMessage()))
                        .doBeforeRetry(retrySignal -> log.warn(">>> [KIS API] TPS Limit reached. Retrying... ({}/3)", retrySignal.totalRetries() + 1)))
                .map(json -> {
                    try {
                        JsonNode out = objectMapper.readTree(json).path("output");
                        String korName = getField(out, "rprs_mrkt_kor_name", "RPRS_MRKT_KOR_NAME", "");
                        String marketName = "KOSPI"; String indexName = null;
                        if (korName.contains("200")) { indexName = "KOSPI 200"; marketName = "KOSPI"; }
                        else if (korName.contains("150")) { indexName = "KOSDAQ 150"; marketName = "KOSDAQ"; }
                        else if (korName.contains("KOSDAQ") || korName.contains("코스닥")) { marketName = "KOSDAQ"; }
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
                })
                .onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(stockCode).currentPrice("0").build()));
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
        
        if ("5m".equalsIgnoreCase(period)) {
            String marketDiv = "NX".equals(exchangeCode) ? "NX" : "J";
            return fetchHistory5MinChart(stockCode, marketDiv);
        }

        if ("UN".equals(exchangeCode)) {
            return fetchHistoryChart(stockCode, "UN", period)
                    .flatMap(list -> list.isEmpty() ? fetchHistoryChart(stockCode, "J", period) : Mono.just(list));
        }
        return fetchHistoryChart(stockCode, "NX".equals(exchangeCode) ? "NX" : "J", period);
    }

    private Mono<List<StockChartDto>> fetchHistory5MinChart(String stockCode, String marketDiv) {
        log.info(">>> [KIS API] Fetching 5Min Chart (FHKST03010230) for {}", stockCode);
        String token = kisAuthService.getAccessToken();
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String nowTime = LocalTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("HHmmss"));
        
        // [보정] UN 코드가 들어오면 KIS가 거부할 수 있으므로 J로 전환
        String finalMarketDiv = "UN".equals(marketDiv) ? "J" : marketDiv;

        // [수정] 정확한 API URL 경로 적용
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-time-dailychartprice"
                + "?FID_COND_MRKT_DIV_CODE=" + finalMarketDiv
                + "&FID_INPUT_ISCD=" + stockCode
                + "&FID_INPUT_HOUR_1=" + nowTime
                + "&FID_INPUT_DATE_1=" + today
                + "&FID_ETC_CLS_CODE=2" // 5분봉
                + "&FID_PW_DATA_INCU_YN=Y"
                + "&FID_FAKE_TICK_INCU_YN="; // 명세서상 공백 필수

        return webClientBuilder.build().get().uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST03010230")
                .header("content-type", "application/json; charset=utf-8") // [수정] UTF-8 명시
                .header("custtype", "P") // [수정] 개인 고객 명시
                .retrieve()
                .bodyToMono(String.class)
                .map(res -> parse5MinResponse(res, "output2"))
                .onErrorResume(e -> {
                    log.error(">>> [KIS API] 5Min Request Error: {}", e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    private List<StockChartDto> parse5MinResponse(String response, String outputKey) {
        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode dataNode = root.path(outputKey);
            if (dataNode.isMissingNode() || dataNode.isEmpty()) dataNode = root.path("output");
            if (dataNode.isMissingNode() || !dataNode.isArray()) return Collections.emptyList();

            List<StockChartDto> oneMinList = new ArrayList<>();
            String commonDate = root.path("output1").path("stck_bsop_date").asText("");
            if (commonDate.isEmpty()) commonDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            DateTimeFormatter fullFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

            // 1. 먼저 1분봉 데이터를 모두 리스트에 담음
            for (JsonNode n : dataNode) {
                try {
                    String d = n.path("stck_bsop_date").asText(commonDate);
                    String t = n.path("stck_cntg_hour").asText("");
                    if (t.isEmpty()) continue;
                    if (t.length() < 6) t = "0".repeat(6 - t.length()) + t;
                    // [수정] 브라우저 환경에 상관없이 한국 시간 숫자가 그대로 보이도록 UTC 오프셋으로 강제 생성
                    long ts = java.time.LocalDateTime.parse(d + t, fullFormatter)
                            .toEpochSecond(java.time.ZoneOffset.UTC);
                    
                    oneMinList.add(StockChartDto.builder()
                            .time(ts)
                            .date(d.substring(0, 4) + "-" + d.substring(4, 6) + "-" + d.substring(6, 8))
                            .open(n.path("stck_oprc").asText("0")).high(n.path("stck_hgpr").asText("0"))
                            .low(n.path("stck_lwpr").asText("0")).close(n.path("stck_prpr").asText("0"))
                            .volume(n.path("cntg_vol").asText("0")).build());
                } catch (Exception inner) {}
            }

            // 2. 5분 단위로 그룹화 (Aggregation)
            Collections.sort(oneMinList, Comparator.comparingLong(StockChartDto::getTime));
            List<StockChartDto> aggregatedList = new ArrayList<>();
            Map<Long, List<StockChartDto>> groups = oneMinList.stream()
                .collect(Collectors.groupingBy(item -> (item.getTime() / 300) * 300, TreeMap::new, Collectors.toList()));

            for (Map.Entry<Long, List<StockChartDto>> entry : groups.entrySet()) {
                List<StockChartDto> items = entry.getValue();
                if (items.isEmpty()) continue;
                
                StockChartDto first = items.get(0);
                StockChartDto last = items.get(items.size() - 1);
                
                long maxHigh = items.stream().mapToLong(i -> Long.parseLong(i.getHigh())).max().orElse(0);
                long minLow = items.stream().mapToLong(i -> Long.parseLong(i.getLow())).min().orElse(0);
                long sumVol = items.stream().mapToLong(i -> Long.parseLong(i.getVolume())).sum();

                // [원복] Lightweight Charts 규격인 초(Seconds) 단위 사용
                aggregatedList.add(StockChartDto.builder()
                    .time(entry.getKey()) 
                    .date(first.getDate())
                    .open(first.getOpen())
                    .high(String.valueOf(maxHigh))
                    .low(String.valueOf(minLow))
                    .close(last.getClose())
                    .volume(String.valueOf(sumVol))
                    .build());
            }

            log.info(">>> [KIS API] Aggregated {} 1Min items into {} 5Min candles.", oneMinList.size(), aggregatedList.size());
            return aggregatedList;
        } catch (Exception e) { 
            log.error(">>> [KIS API] 5Min Aggregation Error: {}", e.getMessage());
            return Collections.emptyList(); 
        }
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

    public Mono<InvestorDto> fetchInvestors(String stockCode, String exchangeCode) {
        String marketDiv = "NX".equals(exchangeCode) ? "NX" : "J";
        return fetchInvestorsInternal(stockCode, marketDiv).map(items -> InvestorDto.builder().stockCode(stockCode).items(items).build());
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
                    items.add(InvestorDto.InvestorItem.builder().date(rawDate.substring(4, 6) + "." + rawDate.substring(6, 8)).price(n.path("stck_clpr").asText("0")).change(n.path("prdy_vrss").asText("0")).retailNet(n.path("prsn_ntby_qty").asText("0")).foreignNet(n.path("frgn_ntby_qty").asText("0")).institutionNet(n.path("orgn_ntby_qty").asText("0")).build());
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
}

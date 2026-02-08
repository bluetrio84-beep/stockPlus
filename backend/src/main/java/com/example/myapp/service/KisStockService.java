package com.example.myapp.service;

import com.example.myapp.domain.StockPriceDto;
import com.example.myapp.domain.StockChartDto;
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

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class KisStockService {

    private final KisAuthService kisAuthService;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public Mono<StockPriceDto> fetchUnifiedCurrentPrice(final String stockCode, final String exchangeCode) {
        if ("IDX".equals(exchangeCode)) {
            return fetchIndexCurrentPrice(stockCode);
        }

        ZoneId seoulZone = ZoneId.of("Asia/Seoul");
        LocalTime now = LocalTime.now(seoulZone);
        
        // 동시호가 체크
        boolean isPreMarket = now.isAfter(LocalTime.of(8, 49, 59)) && now.isBefore(LocalTime.of(9, 0, 0));
        boolean isPostMarket = now.isAfter(LocalTime.of(15, 19, 59)) && now.isBefore(LocalTime.of(15, 30, 0));

        if ((isPreMarket || isPostMarket) && !"NX".equals(exchangeCode)) {
            return fetchExpectedPriceInternal(stockCode, exchangeCode);
        }
        
        // [백업 복구] UN(통합), NX(야간), Q(코스닥)은 해당 코드 그대로 사용. 그 외는 J(코스피)로 간주.
        String marketDiv = exchangeCode;
        if (!"UN".equals(marketDiv) && !"NX".equals(marketDiv) && !"Q".equals(marketDiv)) {
            marketDiv = "J";
        }

        return fetchCurrentPriceInternal(stockCode, "FHKST01010100", marketDiv, exchangeCode);
    }

    public Mono<List<StockChartDto>> fetchUnifiedChart(final String stockCode, final String exchangeCode, final String period) {
        if ("IDX".equals(exchangeCode)) {
            return fetchIndexHistoryChart(stockCode, period);
        }

        // [백업 복구] 차트 조회 시에도 시장 구분값 유지
        String marketDiv = exchangeCode;
        if (!"UN".equals(marketDiv) && !"NX".equals(marketDiv) && !"Q".equals(marketDiv)) {
            marketDiv = "J";
        }
        
        if ("5m".equals(period)) { 
            return fetchIntradayChartHistory(stockCode, marketDiv)
                    .map(list -> aggregateToIntervalChartData(list, 5));
        } else {
            return fetchHistoryChart(stockCode, marketDiv, period);
        }
    }

    // (이하 모든 파싱 및 상세 로직들 원복 및 안정화)
    private Mono<List<StockChartDto>> fetchIntradayChartHistory(String stockCode, String marketDiv) {
        List<String> times = Arrays.asList(
            "153000", "150000", "143000", "140000", "133000", "130000", 
            "123000", "120000", "113000", "110000", "103000", "100000", "093000"
        );
        String token = kisAuthService.getAccessToken();
        return Flux.fromIterable(times)
                .flatMap(time -> webClientBuilder.build().get()
                        .uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice?FID_ETC_CLS_CODE=&FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode + "&FID_INPUT_HOUR_1=" + time + "&FID_PW_DATA_INXC_NUM=30&FID_PW_DATA_INCU_YN=Y")
                        .header("authorization", "Bearer " + token)
                        .header("appkey", kisAuthService.getAppKey())
                        .header("appsecret", kisAuthService.getAppSecret())
                        .header("tr_id", "FHKST03010200")
                        .header("content-type", "application/json")
                        .header("custtype", "P")
                        .retrieve()
                        .bodyToMono(String.class)
                        .map(res -> parseChartResponse(res, "1m"))
                        .onErrorResume(e -> Mono.just(Collections.emptyList()))
                )
                .collectList()
                .map(lists -> {
                    List<StockChartDto> allData = new ArrayList<>();
                    lists.forEach(allData::addAll);
                    return allData.stream().filter(distinctByKey(StockChartDto::getTime)).sorted(Comparator.comparingLong(StockChartDto::getTime)).collect(Collectors.toList());
                });
    }

    private Mono<List<StockChartDto>> fetchHistoryChart(String stockCode, String marketDiv, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "D";
        if ("1W".equals(period)) typeCode = "W";
        if ("1M".equals(period)) typeCode = "M";
        return webClientBuilder.build().get()
                .uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0")
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST01010400")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(String.class)
                .map(res -> parseChartResponse(res, period))
                .onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private List<StockChartDto> parseChartResponse(String response, String period) {
        try {
            List<StockChartDto> list = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            JsonNode output2 = root.path("output2");
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            if (output2.isArray()) {
                DateTimeFormatter intradayFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
                for (JsonNode node : output2) {
                    String dateStr = node.path("stck_bsop_date").asText();
                    String timeStr = node.path("stck_cntg_hour").asText();
                    if (timeStr.length() < 6) timeStr = String.format("%06d", Integer.parseInt(timeStr));
                    LocalDateTime ldt = LocalDateTime.parse(dateStr + timeStr, intradayFormatter);
                    long timestamp = ldt.atZone(seoulZone).toInstant().getEpochSecond();
                    list.add(StockChartDto.builder().time(timestamp).open(String.valueOf(node.path("stck_oprc").asDouble())).high(String.valueOf(node.path("stck_hgpr").asDouble())).low(String.valueOf(node.path("stck_lwpr").asDouble())).close(String.valueOf(node.path("stck_prpr").asDouble())).volume(String.valueOf(node.path("cntg_vol").asLong())).build());
                }
            } else if (root.has("output") && root.path("output").isArray()) {
                DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");
                for (JsonNode node : root.path("output")) {
                    String dateStr = node.path("stck_bsop_date").asText();
                    LocalDate ld = LocalDate.parse(dateStr, dayFormatter);
                    long timestamp = ld.atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    list.add(StockChartDto.builder().time(timestamp).open(String.valueOf(node.path("stck_oprc").asDouble())).high(String.valueOf(node.path("stck_hgpr").asDouble())).low(String.valueOf(node.path("stck_lwpr").asDouble())).close(String.valueOf(node.path("stck_clpr").asDouble())).volume(String.valueOf(node.path("acml_vol").asLong())).build());
                }
            }
            Collections.reverse(list);
            return list;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private List<StockChartDto> aggregateToIntervalChartData(List<StockChartDto> minuteChartData, int intervalMinutes) {
        if (minuteChartData.isEmpty()) return Collections.emptyList();
        Map<Long, List<StockChartDto>> grouped = minuteChartData.stream().collect(Collectors.groupingBy(d -> {
                LocalDateTime ldt = LocalDateTime.ofInstant(java.time.Instant.ofEpochSecond(d.getTime()), ZoneId.of("Asia/Seoul"));
                int groupedMinute = (ldt.getMinute() / intervalMinutes) * intervalMinutes;
                return ldt.withMinute(groupedMinute).withSecond(0).withNano(0).atZone(ZoneId.of("Asia/Seoul")).toInstant().getEpochSecond();
            }));
        return grouped.entrySet().stream().map(entry -> {
                List<StockChartDto> bars = entry.getValue();
                bars.sort(Comparator.comparingLong(StockChartDto::getTime));
                return StockChartDto.builder().time(entry.getKey()).open(bars.get(0).getOpen()).close(bars.get(bars.size()-1).getClose()).high(String.valueOf(bars.stream().mapToDouble(b -> Double.parseDouble(b.getHigh())).max().orElse(0))).low(String.valueOf(bars.stream().mapToDouble(b -> Double.parseDouble(b.getLow())).min().orElse(0))).volume(String.valueOf(bars.stream().mapToDouble(b -> Double.parseDouble(b.getVolume())).sum())).build();
            }).sorted(Comparator.comparingLong(StockChartDto::getTime)).collect(Collectors.toList());
    }

    private Mono<StockPriceDto> fetchIndexCurrentPrice(String indexCode) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHPUP02100000").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseIndexPriceResponse(indexCode, res)).onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(indexCode).currentPrice("0").build()));
    }

    private StockPriceDto parseIndexPriceResponse(String indexCode, String response) {
        try {
            JsonNode output = objectMapper.readTree(response).path("output");
            return StockPriceDto.builder().stockCode(indexCode).exchangeCode("IDX").marketName(output.path("bstp_nmix_kor_name").asText()).currentPrice(output.path("bstp_nmix_prpr").asText()).change(output.path("bstp_nmix_prdy_vrss").asText()).changeRate(output.path("bstp_nmix_prdy_ctrt").asText()).volume(output.path("acml_vol").asText()).priceSign(output.path("bstp_nmix_prdy_vrss_sign").asText()).build();
        } catch (Exception e) { return null; }
    }

    private Mono<List<StockChartDto>> fetchIndexHistoryChart(String indexCode, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "D";
        if ("1W".equals(period)) typeCode = "W";
        if ("1M".equals(period)) typeCode = "M";
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode.trim() + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0";
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKUP03500100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(this::parseIndexChartResponse).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private List<StockChartDto> parseIndexChartResponse(String response) {
        try {
            List<StockChartDto> list = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            if (root.has("output2") && root.path("output2").isArray()) {
                DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");
                for (JsonNode node : root.path("output2")) {
                    String dateStr = node.path("stck_bsop_date").asText();
                    LocalDate ld = LocalDate.parse(dateStr, dayFormatter);
                    long timestamp = ld.atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    list.add(StockChartDto.builder().time(timestamp).open(String.valueOf(node.path("bstp_nmix_oprc").asDouble())).high(String.valueOf(node.path("bstp_nmix_hgpr").asDouble())).low(String.valueOf(node.path("bstp_nmix_lwpr").asDouble())).close(String.valueOf(node.path("bstp_nmix_prpr").asDouble())).volume(String.valueOf(node.path("acml_vol").asLong())).build());
                }
            }
            Collections.reverse(list);
            return list;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private Mono<StockPriceDto> fetchCurrentPriceInternal(String stockCode, String trId, String marketDiv, String exchangeCode) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", trId).header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parsePriceResponse(stockCode, res, exchangeCode)).onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(stockCode).exchangeCode(exchangeCode).currentPrice("0").build()));
    }

    private StockPriceDto parsePriceResponse(String stockCode, String response, String exchangeCode) {
        try {
            JsonNode output = objectMapper.readTree(response).path("output");
            if (output.isMissingNode() || output.path("stck_prpr").asText().isEmpty()) return null;
            return StockPriceDto.builder().stockCode(stockCode).exchangeCode(exchangeCode).marketName(output.path("rprs_mrkt_kor_name").asText()).currentPrice(output.path("stck_prpr").asText()).change(output.path("prdy_vrss").asText()).changeRate(output.path("prdy_ctrt").asText()).volume(output.path("acml_vol").asText()).priceSign(output.path("prdy_vrss_sign").asText()).open(output.path("stck_oprc").asText()).high(output.path("stck_hgpr").asText()).low(output.path("stck_lwpr").asText()).prevClose(output.path("stck_sdpr").asText()).marketCap(output.path("hts_avls").asText()).listedShares(output.path("lstn_stcn").asText()).high52w(output.path("w52_hgpr").asText()).low52w(output.path("w52_lwpr").asText()).build();
        } catch (Exception e) { return null; }
    }

    private Mono<StockPriceDto> fetchExpectedPriceInternal(String stockCode, String exchangeCode) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=" + stockCode;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST01010200").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseExpectedPriceResponse(stockCode, res, exchangeCode)).onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(stockCode).currentPrice("0").isExpected(true).build()));
    }

    private StockPriceDto parseExpectedPriceResponse(String stockCode, String response, String exchangeCode) {
        try {
            JsonNode output2 = objectMapper.readTree(response).path("output2");
            return StockPriceDto.builder().stockCode(stockCode).exchangeCode(exchangeCode).currentPrice(output2.path("antc_cnpr").asText()).change(output2.path("antc_cntg_vrss").asText()).changeRate(output2.path("antc_cntg_prdy_ctrt").asText()).volume(output2.path("antc_vol").asText()).priceSign(output2.path("antc_cntg_vrss_sign").asText()).isExpected(true).build();
        } catch (Exception e) { return null; }
    }

    public static <T> java.util.function.Predicate<T> distinctByKey(java.util.function.Function<? super T, ?> keyExtractor) {
        Set<Object> seen = java.util.concurrent.ConcurrentHashMap.newKeySet();
        return t -> seen.add(keyExtractor.apply(t));
    }
}
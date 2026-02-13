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
     * 투자자별 매매동향 조회 (통합/개별 시장 대응) - 단일 호출로 변경
     */
    public Mono<InvestorDto> fetchInvestors(String stockCode, String exchangeCode) {
        // J: KRX, NX: NXT, UN: 통합 (API가 지원하는 경우)
        String marketDiv = "UN".equals(exchangeCode) ? "UN" : ("NX".equals(exchangeCode) ? "NX" : "J");
        return fetchInvestorsInternal(stockCode, marketDiv);
    }

    private Mono<InvestorDto> fetchInvestorsInternal(String stockCode, String marketDiv) {
        String token = kisAuthService.getAccessToken();

        return webClientBuilder.build().get()
                .uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-investor",
                     uriBuilder -> uriBuilder
                        .queryParam("FID_COND_MRKT_DIV_CODE", marketDiv)
                        .queryParam("FID_INPUT_ISCD", stockCode)
                        .build())
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST01010900")
                .header("tr_cont", "N")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve()
                .toEntity(JsonNode.class)
                .flatMap(entity -> {
                    JsonNode body = entity.getBody();
                    if (body == null) return Mono.just(InvestorDto.builder().stockCode(stockCode).items(Collections.emptyList()).build());

                    JsonNode output = body.get("output");
                    
                    // [디버깅] API 응답 데이터 로깅
                    if (output != null) {
                        log.info(">>>> [Investor Raw] Market: {}, Data: {}", marketDiv, output.toString().substring(0, Math.min(output.toString().length(), 200))); 
                    }

                    List<InvestorDto.InvestorItem> items = new ArrayList<>();
                    if (output != null && output.isArray()) {
                        for (JsonNode out : output) {
                            String rawDate = out.path("stck_bsop_date").asText();
                            if (rawDate == null || rawDate.isEmpty()) continue;
                            String date = rawDate.length() == 8 ? rawDate.substring(4, 6) + "." + rawDate.substring(6, 8) : rawDate;

                            items.add(InvestorDto.InvestorItem.builder()
                                    .date(date)
                                    .price(out.path("stck_clpr").asText())
                                    .change(out.path("prdy_vrss").asText())
                                    .retailNet(out.path("prsn_ntby_qty").asText())
                                    .foreignNet(out.path("frgn_ntby_qty").asText())
                                    .institutionNet(out.path("orgn_ntby_qty").asText())
                                    .build());
                        }
                    }
                    
                    return Mono.just(InvestorDto.builder().stockCode(stockCode).items(items).build());
                })
                .onErrorResume(e -> {
                    log.error("Error fetching investors: " + e.getMessage());
                    return Mono.just(InvestorDto.builder().stockCode(stockCode).items(Collections.emptyList()).build());
                });
    }

    /**
     * 통합 현재가 조회
     */
    public Mono<StockPriceDto> fetchUnifiedCurrentPrice(final String stockCode, final String exchangeCode) {
        if ("IDX".equals(exchangeCode)) {
            return fetchIndexCurrentPrice(stockCode);
        }

        if ("UN".equals(exchangeCode)) {
            // 정규장(J)과 야간장(NX) 데이터를 동시에 조회하여 합산
            return Mono.zip(
                fetchCurrentPriceInternal(stockCode, "FHKST01010100", "J", "UN"),
                fetchCurrentPriceInternal(stockCode, "FHKST01010100", "NX", "UN")
            ).map(tuple -> {
                StockPriceDto jDto = tuple.getT1();
                StockPriceDto nxDto = tuple.getT2();
                
                ZoneId seoulZone = ZoneId.of("Asia/Seoul");
                LocalTime now = LocalTime.now(seoulZone);
                
                // 거래량 합산 (J + NX)
                long jVol = Long.parseLong(jDto.getVolume() != null && !jDto.getVolume().isEmpty() ? jDto.getVolume() : "0");
                long nxVol = Long.parseLong(nxDto.getVolume() != null && !nxDto.getVolume().isEmpty() ? nxDto.getVolume() : "0");
                String totalVolume = String.valueOf(jVol + nxVol);
                
                // 가격 결정 로직: 현재 시간에 따라 우선순위 결정
                StockPriceDto mainDto;
                boolean isNxTime = now.isAfter(LocalTime.of(15, 30, 0)) || now.isBefore(LocalTime.of(8, 50, 0));
                
                if (isNxTime && nxDto.getCurrentPrice() != null && !"0".equals(nxDto.getCurrentPrice())) {
                    mainDto = nxDto;
                } else {
                    mainDto = jDto;
                }
                
                mainDto.setVolume(totalVolume); // 합산된 거래량 설정
                return mainDto;
            });
        }

        // 개별 시장 요청 처리 (기존 로직 유지)
        ZoneId seoulZone = ZoneId.of("Asia/Seoul");
        LocalTime now = LocalTime.now(seoulZone);
        // ... (기존 개별 시장 로직 생략 가능하나 안전을 위해 유지)
        String marketDivTmp = "NX".equals(exchangeCode) ? "NX" : "J";
        return fetchCurrentPriceInternal(stockCode, "FHKST01010100", marketDivTmp, exchangeCode);
    }

    /**
     * 통합 차트 데이터 조회
     */
    public Mono<List<StockChartDto>> fetchUnifiedChart(final String stockCode, final String exchangeCode, final String period) {
        if ("IDX".equals(exchangeCode)) {
            return fetchIndexHistoryChart(stockCode, period);
        }

        if ("UN".equals(exchangeCode)) {
            return fetchChartDataByMarket(stockCode, "NX", period)
                    .flatMap(nxList -> {
                        return fetchChartDataByMarket(stockCode, "J", period)
                                .map(jList -> {
                                    Map<Long, StockChartDto> mergedMap = new HashMap<>();
                                    for (StockChartDto data : jList) mergedMap.put(data.getTime(), data);
                                    for (StockChartDto data : nxList) {
                                        if (mergedMap.containsKey(data.getTime())) {
                                            StockChartDto existing = mergedMap.get(data.getTime());
                                            
                                            // [중복 방지] 거래량이 동일하면(완벽한 복사본이면) 합산하지 않음
                                            if (existing.getVolume().equals(data.getVolume())) {
                                                continue;
                                            }
                                            
                                            // NX 데이터가 0이 아니면 합산 (야간장 유효 거래)
                                            double nxVol = Double.parseDouble(data.getVolume());
                                            if (nxVol > 0) {
                                                double totalVol = Double.parseDouble(existing.getVolume()) + nxVol;
                                                existing.setVolume(String.valueOf((long)totalVol));
                                                
                                                // NX 종가가 유효하고 J 종가와 다르면(야간장 변동), NX 종가를 우선시하여 통합 종가로 반영
                                                // 단, 0이거나 비정상적 데이터는 무시
                                                if (Double.parseDouble(data.getClose()) > 0 && !data.getClose().equals(existing.getClose())) {
                                                    existing.setClose(data.getClose());
                                                }
                                            }
                                        } else {
                                            mergedMap.put(data.getTime(), data);
                                        }
                                    }
                                    log.info("[Chart Merge] {} - Merged J({}) + NX({}) -> Final({})", stockCode, jList.size(), nxList.size(), mergedMap.size());
                                    return mergedMap.values().stream()
                                            .sorted(Comparator.comparingLong(StockChartDto::getTime))
                                            .collect(Collectors.toList());
                                });
                    });
        }

        return fetchChartDataByMarket(stockCode, exchangeCode, period)
                .flatMap(list -> {
                    if (list.isEmpty() && !"J".equals(exchangeCode) && !"NX".equals(exchangeCode)) {
                        return fetchChartDataByMarket(stockCode, "J", period);
                    }
                    return Mono.just(list);
                });
    }

    private Mono<List<StockChartDto>> fetchChartDataByMarket(String stockCode, String market, String period) {
        String marketDivTmp = market;
        if ("NX".equals(marketDivTmp)) marketDivTmp = "NX"; 
        else if (!"Q".equals(marketDivTmp)) marketDivTmp = "J";
        final String targetMarket = marketDivTmp;

        if ("5m".equals(period)) { 
            return fetchIntradayChartHistory(stockCode, targetMarket)
                    .map(list -> aggregateToIntervalChartData(list, 5));
        } else {
            return fetchHistoryChart(stockCode, targetMarket, period);
        }
    }

    private Mono<List<StockChartDto>> fetchIntradayChartHistory(String stockCode, String marketDiv) {
        List<String> times = Arrays.asList("153000", "140000", "123000", "110000", "093000");
        List<String> dates = new ArrayList<>();
        java.time.LocalDate date = java.time.LocalDate.now();
        int count = 0;
        while (dates.size() < 2 && count < 10) {
            if (date.getDayOfWeek() != java.time.DayOfWeek.SATURDAY && date.getDayOfWeek() != java.time.DayOfWeek.SUNDAY) {
                dates.add(date.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")));
            }
            date = date.minusDays(1);
            count++;
        }

        String token = kisAuthService.getAccessToken();
        return Flux.fromIterable(dates)
                .flatMap(d -> Flux.fromIterable(times).map(t -> Map.entry(d, t)))
                .flatMap(entry -> webClientBuilder.build().get()
                        .uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice?FID_ETC_CLS_CODE=&FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode + "&FID_INPUT_HOUR_1=" + entry.getValue() + "&FID_PW_DATA_INXC_NUM=100&FID_PW_DATA_INCU_YN=Y")
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
                    return allData.stream()
                            .filter(distinctByKey(StockChartDto::getTime))
                            .sorted(Comparator.comparingLong(StockChartDto::getTime))
                            .collect(Collectors.toList());
                });
    }

    private Mono<List<StockChartDto>> fetchHistoryChart(String stockCode, String marketDiv, String period) {
        return fetchHistoryChartBatch(stockCode, marketDiv, period, null)
                .flatMap(firstBatch -> {
                    if (firstBatch.size() < 100) return Mono.just(firstBatch);
                    String minDate = firstBatch.stream().map(StockChartDto::getDate).min(String::compareTo).orElse(null);
                    if (minDate == null) return Mono.just(firstBatch);
                    String nextEndDate = java.time.LocalDate.parse(minDate, java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")).minusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
                    return fetchHistoryChartBatch(stockCode, marketDiv, period, nextEndDate)
                            .map(secondBatch -> {
                                List<StockChartDto> combined = new ArrayList<>(secondBatch);
                                combined.addAll(firstBatch);
                                return combined.stream().filter(distinctByKey(StockChartDto::getTime)).sorted(Comparator.comparingLong(StockChartDto::getTime)).collect(Collectors.toList());
                            });
                });
    }

    private Mono<List<StockChartDto>> fetchHistoryChartBatch(String stockCode, String marketDiv, String period, String customEndDate) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "D"; 
        if ("1W".equals(period)) typeCode = "W";
        if ("1M".equals(period)) typeCode = "M";
        String endDate = customEndDate != null ? customEndDate : java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String startDate = java.time.LocalDate.now().minusYears(3).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0&FID_PW_DATA_INXC_NUM=100&FID_INPUT_DATE_1=" + startDate + "&FID_INPUT_DATE_2=" + endDate;
        return webClientBuilder.build().get().uri(uri).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST03010100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseChartResponse(res, period)).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    private List<StockChartDto> parseChartResponse(String response, String period) {
        try {
            List<StockChartDto> list = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            ZoneId seoulZone = ZoneId.of("Asia/Seoul");
            JsonNode dataNode = root.path("output2").isArray() ? root.path("output2") : root.path("output");
            if (!dataNode.isArray()) dataNode = root;
            if (dataNode.isArray()) {
                DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");
                DateTimeFormatter intradayFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
                for (JsonNode node : dataNode) {
                    if (!node.has("stck_bsop_date")) continue;
                    String dateStr = node.path("stck_bsop_date").asText();
                    long timestamp;
                    if ("1m".equals(period) || "5m".equals(period)) {
                        String timeStr = node.path("stck_cntg_hour").asText();
                        if (timeStr.length() < 6) timeStr = String.format("%06d", Integer.parseInt(timeStr));
                        timestamp = LocalDateTime.parse(dateStr + timeStr, intradayFormatter).atZone(seoulZone).toInstant().getEpochSecond();
                    } else {
                        timestamp = LocalDate.parse(dateStr, dayFormatter).atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    }
                    list.add(StockChartDto.builder().time(timestamp).date(dateStr).open(node.path("stck_oprc").asText("0")).high(node.path("stck_hgpr").asText("0")).low(node.path("stck_lwpr").asText("0")).close(node.has("stck_prpr") ? node.path("stck_prpr").asText("0") : node.path("stck_clpr").asText("0")).volume(node.has("cntg_vol") ? node.path("cntg_vol").asText("0") : node.path("acml_vol").asText("0")).build());
                }
            }
            return list.stream().filter(d -> Double.parseDouble(d.getClose()) > 0).sorted(Comparator.comparingLong(StockChartDto::getTime)).collect(Collectors.toList());
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private List<StockChartDto> aggregateToIntervalChartData(List<StockChartDto> minuteChartData, int intervalMinutes) {
        if (minuteChartData.isEmpty()) return Collections.emptyList();
        Map<Long, List<StockChartDto>> grouped = minuteChartData.stream().collect(Collectors.groupingBy(d -> {
                LocalDateTime ldt = LocalDateTime.ofInstant(java.time.Instant.ofEpochSecond(d.getTime()), ZoneId.of("Asia/Seoul"));
                return ldt.withMinute((ldt.getMinute() / intervalMinutes) * intervalMinutes).withSecond(0).withNano(0).atZone(ZoneId.of("Asia/Seoul")).toInstant().getEpochSecond();
            }));
        return grouped.entrySet().stream().map(entry -> {
                List<StockChartDto> bars = entry.getValue();
                bars.sort(Comparator.comparingLong(StockChartDto::getTime));
                return StockChartDto.builder().time(entry.getKey()).open(bars.get(0).getOpen()).close(bars.get(bars.size()-1).getClose()).high(String.valueOf(bars.stream().mapToDouble(b -> Double.parseDouble(b.getHigh())).max().orElse(0))).low(String.valueOf(bars.stream().mapToDouble(b -> Double.parseDouble(b.getLow())).min().orElse(0))).volume(String.valueOf(bars.stream().mapToDouble(b -> Double.parseDouble(b.getVolume())).sum())).build();
            }).sorted(Comparator.comparingLong(StockChartDto::getTime)).collect(Collectors.toList());
    }

    private Mono<StockPriceDto> fetchIndexCurrentPrice(String indexCode) {
        String token = kisAuthService.getAccessToken();
        return webClientBuilder.build().get().uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHPUP02100000").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseIndexPriceResponse(indexCode, res)).onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(indexCode).currentPrice("0").build()));
    }

    private StockPriceDto parseIndexPriceResponse(String indexCode, String response) {
        try {
            JsonNode output = objectMapper.readTree(response).path("output");
            return StockPriceDto.builder().stockCode(indexCode).exchangeCode("IDX").marketName(output.path("bstp_nmix_kor_name").asText()).currentPrice(output.path("bstp_nmix_prpr").asText()).change(output.path("bstp_nmix_prdy_vrss").asText()).changeRate(output.path("bstp_nmix_prdy_ctrt").asText()).volume(output.path("acml_vol").asText()).priceSign(output.path("bstp_nmix_prdy_vrss_sign").asText()).build();
        } catch (Exception e) { return null; }
    }

    private Mono<List<StockChartDto>> fetchIndexHistoryChart(String indexCode, String period) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "1W".equals(period) ? "W" : ("1M".equals(period) ? "M" : "D");
        return webClientBuilder.build().get().uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=" + indexCode.trim() + "&FID_PERIOD_DIV_CODE=" + typeCode + "&FID_ORG_ADJ_PRC=0").header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKUP03500100").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(this::parseIndexChartResponse).onErrorResume(e -> Mono.just(Collections.emptyList()));
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
                    long timestamp = LocalDate.parse(dateStr, dayFormatter).atStartOfDay(seoulZone).toInstant().getEpochSecond();
                    list.add(StockChartDto.builder().time(timestamp).open(String.valueOf(node.path("bstp_nmix_oprc").asDouble())).high(String.valueOf(node.path("bstp_nmix_hgpr").asDouble())).low(String.valueOf(node.path("bstp_nmix_lwpr").asDouble())).close(String.valueOf(node.path("bstp_nmix_prpr").asDouble())).volume(String.valueOf(node.path("acml_vol").asLong())).build());
                }
            }
            Collections.reverse(list);
            return list;
        } catch (Exception e) { return Collections.emptyList(); }
    }

            /**

             * 내부 현재가 조회 (DTO 자동 매핑 버전)

             */

            private Mono<StockPriceDto> fetchCurrentPriceInternal(String stockCode, String trId, String marketDiv, String requestExchange) {

                String token = kisAuthService.getAccessToken();

                String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-price"

                        + "?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode;

        

                return webClientBuilder.build().get()

                        .uri(uri)

                        .header("authorization", "Bearer " + token)

                        .header("appkey", kisAuthService.getAppKey())

                        .header("appsecret", kisAuthService.getAppSecret())

                        .header("tr_id", trId)

                        .header("content-type", "application/json")

                        .header("custtype", "P")

                        .retrieve()

                        .bodyToMono(new ParameterizedTypeReference<KisResponse<KisPriceOutput>>() {})

                        .map(response -> {

                            KisPriceOutput out = response.getOutput();

                            if (out == null) return StockPriceDto.builder().stockCode(stockCode).build();

        

                            return StockPriceDto.builder()

                                    .stockCode(stockCode)

                                    .marketName(out.getStockName())

                                    .currentPrice(out.getCurrentPrice())

                                    .change(out.getChange())

                                    .changeRate(out.getChangeRate())

                                    .priceSign(out.getPriceSign())

                                    .volume(out.getVolume())

                                    .open(out.getOpen())

                                    .high(out.getHigh())

                                    .low(out.getLow())

                                    .prevClose(out.getPrevClose())

                                    .marketCap(out.getMarketCap())

                                    .listedShares(out.getListedShares())

                                    .high52w(out.getHigh52w())

                                    .low52w(out.getLow52w())

                                    .exchangeCode(requestExchange)

                                    .build();

                        })

                        .onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(stockCode).exchangeCode(requestExchange).currentPrice("0").build()));

            }

        

                        private Mono<StockPriceDto> fetchExpectedPriceInternal(String stockCode, String marketDiv, String exchangeCode) {

        

                            String token = kisAuthService.getAccessToken();

        

                            return webClientBuilder.build().get().uri(kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn?FID_COND_MRKT_DIV_CODE=" + marketDiv + "&FID_INPUT_ISCD=" + stockCode).header("authorization", "Bearer " + token).header("appkey", kisAuthService.getAppKey()).header("appsecret", kisAuthService.getAppSecret()).header("tr_id", "FHKST01010200").header("content-type", "application/json").header("custtype", "P").retrieve().bodyToMono(String.class).map(res -> parseExpectedPriceResponse(stockCode, res, exchangeCode)).onErrorResume(e -> Mono.just(StockPriceDto.builder().stockCode(stockCode).currentPrice("0").isExpected(true).build()));

        

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

        

    
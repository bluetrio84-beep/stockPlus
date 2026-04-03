package com.stockPlus.service;

import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.StockChartDto;
import com.stockPlus.domain.InvestorDto;
import com.stockPlus.domain.ShortSellingDto;
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

    public Mono<StockPriceDto> fetchCurrentPrice(final String stockCode) {
        return fetchUnifiedCurrentPrice(stockCode, "J");
    }

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
                                .industryName(getField(out, "bstp_kor_isnm", "BSTP_KOR_ISNM", "")) // [v16.4] 업종명 추출
                                .programNet(getField(out, "pgtr_ntby_qty", "PGTR_NTBY_QTY", "0")) // [v21.0] 프로그램 실시간 수급
                                .foreignNet(getField(out, "frgn_ntby_qty", "FRGN_NTBY_QTY", "0")) // [v21.0] 외국인 실시간 수급
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
            // [v16.43.2] UN(통합) 모드 최우선 사용: NXT 지원 종목의 데이터를 최대한 확보
            return fetchHistoryChart(stockCode, "UN", period)
                    .flatMap(list -> {
                        // 데이터가 아예 없거나, 마지막 데이터가 7일 이상 과거인 경우 (NXT 미지원 종목 등)
                        if (list.isEmpty() || isChartDataStale(list)) {
                            log.info(">>> [UN Priority] Stock {} lacks valid UN data (Stale). Automatically switching to 'J' for continuity.", stockCode);
                            return fetchHistoryChart(stockCode, "J", period);
                        }
                        return Mono.just(list);
                    });
        }
        
        return fetchHistoryChart(stockCode, "NX".equals(exchangeCode) ? "NX" : "J", period);
    }

    /**
     * [v16.43.1] 차트 데이터의 신선도를 체크합니다. (7일 이상 경과 시 Stale로 판단)
     */
    private boolean isChartDataStale(List<StockChartDto> list) {
        if (list == null || list.isEmpty()) return true;
        try {
            // list는 reverse된 상태이므로 마지막 요소가 가장 최신 데이터임
            String lastDateStr = list.get(list.size() - 1).getDate(); // "yyyy-MM-dd"
            java.time.LocalDate lastDate = java.time.LocalDate.parse(lastDateStr);
            java.time.LocalDate threshold = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).minusDays(7);
            return lastDate.isBefore(threshold);
        } catch (Exception e) {
            return true;
        }
    }

    private Mono<List<StockChartDto>> fetchHistory5MinChart(String stockCode, String marketDiv) {
        log.info(">>> [KIS API] Fetching Extended 10-Day 5Min Chart for {}", stockCode);
        String finalMarketDiv = "UN".equals(marketDiv) ? "J" : marketDiv;
        
        // [v16.0] 5분봉 데이터 범위 2배 확장 (5일 -> 10일)
        List<String> targetDates = new ArrayList<>();
        LocalDate d = LocalDate.now(ZoneId.of("Asia/Seoul"));
        while (targetDates.size() < 10) {
            if (d.getDayOfWeek().getValue() <= 5) {
                targetDates.add(d.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
            }
            d = d.minusDays(1);
        }

        return reactor.core.publisher.Flux.fromIterable(targetDates)
            .flatMap(date -> fetchRawIntradayForDate(stockCode, finalMarketDiv, date))
            .collectList()
            .map(allLists -> {
                Map<Long, StockChartDto> mergedMap = new TreeMap<>();
                for (List<StockChartDto> dayList : allLists) {
                    for (StockChartDto item : dayList) {
                        mergedMap.put(item.getTime(), item);
                    }
                }
                return new ArrayList<>(mergedMap.values());
            });
    }

    private Mono<List<StockChartDto>> fetchRawIntradayForDate(String stockCode, String marketDiv, String date) {
        String token = kisAuthService.getAccessToken();
        String todayStr = LocalDate.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String targetTime = date.equals(todayStr) ? LocalTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("HHmmss")) : "160000";

        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-time-dailychartprice"
                + "?FID_COND_MRKT_DIV_CODE=" + marketDiv
                + "&FID_INPUT_ISCD=" + stockCode
                + "&FID_INPUT_HOUR_1=" + targetTime
                + "&FID_INPUT_DATE_1=" + date
                + "&FID_ETC_CLS_CODE=2" 
                + "&FID_PW_DATA_INCU_YN=Y"
                + "&FID_FAKE_TICK_INCU_YN=";

        return webClientBuilder.build().get().uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST03010230")
                .header("content-type", "application/json; charset=utf-8")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(String.class)
                .map(res -> parse5MinResponse(res, "output2"))
                .onErrorResume(e -> Mono.just(Collections.emptyList()));
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
        if ("1M".equals(period)) {
            // 월봉은 1회 호출로도 수년 치가 나오므로 기존 로직 유지
            return fetchSingleHistoryChart(stockCode, marketDiv, period, null);
        }

        // 일봉(D), 주봉(W)은 2회 호출하여 데이터 보강 (*2 멀티패치)
        return fetchSingleHistoryChart(stockCode, marketDiv, period, null)
            .flatMap(firstList -> {
                if (firstList.size() < 50) return Mono.just(firstList); // 데이터가 적으면 2차 호출 생략
                
                // 1차 리스트의 가장 과거 날짜(첫 번째 아이템)를 기준으로 2차 호출 범위 설정
                // parseChartResponse에서 reverse를 하므로 firstList[0]이 가장 과거임
                String earliestDate = firstList.get(0).getDate().replace("-", "");
                LocalDate endDate2 = LocalDate.parse(earliestDate, DateTimeFormatter.ofPattern("yyyyMMdd")).minusDays(1);
                
                return fetchSingleHistoryChart(stockCode, marketDiv, period, endDate2.format(DateTimeFormatter.ofPattern("yyyyMMdd")))
                    .map(secondList -> {
                        Map<Long, StockChartDto> mergedMap = new TreeMap<>();
                        for (StockChartDto s : secondList) mergedMap.put(s.getTime(), s);
                        for (StockChartDto f : firstList) mergedMap.put(f.getTime(), f);
                        return new ArrayList<>(mergedMap.values());
                    });
            });
    }

    private Mono<List<StockChartDto>> fetchSingleHistoryChart(String stockCode, String marketDiv, String period, String customEndDate) {
        String token = kisAuthService.getAccessToken();
        String typeCode = "1W".equals(period) ? "W" : ("1M".equals(period) ? "M" : "D");
        String endDate = (customEndDate != null) ? customEndDate : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String startDate = LocalDate.now().minusYears(4).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
                + "?FID_COND_MRKT_DIV_CODE=" + marketDiv
                + "&FID_INPUT_ISCD=" + stockCode
                + "&FID_PERIOD_DIV_CODE=" + typeCode
                + "&FID_ORG_ADJ_PRC=0"
                + "&FID_INPUT_DATE_1=" + startDate
                + "&FID_INPUT_DATE_2=" + endDate;

        return webClientBuilder.build().get().uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHKST03010100")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(String.class)
                .map(res -> parseChartResponse(res, false))
                .onErrorResume(e -> Mono.just(Collections.emptyList()));
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
                    items.add(InvestorDto.InvestorItem.builder()
                            .date(rawDate.substring(4, 6) + "." + rawDate.substring(6, 8))
                            .price(n.path("stck_clpr").asText("0"))
                            .change(n.path("prdy_vrss").asText("0"))
                            .retailNet(n.path("prsn_ntby_qty").asText("0"))
                            .foreignNet(n.path("frgn_ntby_qty").asText("0"))
                            .institutionNet(n.path("orgn_ntby_qty").asText("0"))
                            .volume(n.path("acml_vol").asText("0")) // [추가]
                            .build());
                }
            }
            return items;
        }).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    /**
     * 시가총액 순위 조회 (FHPST01740000) - 정석 API
     */
    public Mono<List<Map<String, Object>>> fetchMarketCapRanking(String marketDiv, int startRank) {
        String token = kisAuthService.getAccessToken();
        // [수정] 사용자 제공 정석 API 경로 및 파라미터 적용
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/ranking/market-cap"
                + "?fid_cond_mrkt_div_code=" + marketDiv
                + "&fid_cond_scr_div_code=20174"
                + "&fid_div_cls_code=0"
                + "&fid_input_iscd=0000"
                + "&fid_trgt_cls_code=0"
                + "&fid_trgt_exls_cls_code=0"
                + "&fid_input_price_1=0"
                + "&fid_input_price_2=0"
                + "&fid_vol_cnt=0";

        return webClientBuilder.build().get().uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHPST01740000") // [수정] 정석 TR_ID
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve().bodyToMono(String.class)
                .map(res -> {
                    try {
                        log.info(">>> [KIS API] MarketCapRanking Raw: {}", res.length() > 500 ? res.substring(0, 500) + "..." : res);
                        JsonNode root = objectMapper.readTree(res);
                        List<Map<String, Object>> list = new ArrayList<>();
                        JsonNode outArr = root.path("output");
                        if (outArr.isArray()) {
                            for (JsonNode n : outArr) {
                                Map<String, Object> m = new HashMap<>();
                                m.put("code", n.path("mksc_shrn_iscd").asText()); // 종목코드
                                m.put("price", n.path("stck_prpr").asText());      // 현재가
                                m.put("volume", n.path("acml_vol").asText());     // 누적거래량
                                m.put("market_cap", n.path("hts_avls").asText()); // 시가총액
                                list.add(m);
                            }
                        }
                        return list;
                    } catch (Exception e) {
                        return Collections.<Map<String, Object>>emptyList();
                    }
                }).onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    /**
     * [v19.0] 기업 실적 및 ROE 병합 수집 (2024년 이후 데이터 한정)
     */
    public Mono<List<Map<String, Object>>> fetchFinancials(String stockCode) {
        String token = kisAuthService.getAccessToken();
        String baseUrl = kisAuthService.getBaseUrl();
        String appKey = kisAuthService.getAppKey();
        String appSecret = kisAuthService.getAppSecret();

        // 1. 손익계산서 (매출, 이익) - FHKST66430200
        String uriIncome = baseUrl + "/uapi/domestic-stock/v1/finance/income-statement?fid_cond_mrkt_div_code=J&fid_input_iscd=" + stockCode + "&fid_div_cls_code=0";
        Mono<Map<String, Map<String, Object>>> incomeMono = webClientBuilder.build().get().uri(uriIncome)
                .header("authorization", "Bearer " + token).header("appkey", appKey).header("appsecret", appSecret)
                .header("tr_id", "FHKST66430200").header("content-type", "application/json").header("custtype", "P")
                .retrieve().bodyToMono(JsonNode.class).map(root -> {
                    Map<String, Map<String, Object>> map = new HashMap<>();
                    JsonNode outArr = root.path("output");
                    if (outArr.isArray()) {
                        for (JsonNode n : outArr) {
                            String yymm = n.path("stac_yymm").asText("");
                            if (yymm.length() < 6 || Integer.parseInt(yymm.substring(0, 4)) < 2024) continue;
                            Map<String, Object> data = new HashMap<>();
                            // [v19.0] 정밀도 향상: Double로 받아서 1억 미만(0.3억 등) 데이터 유실 방지
                            data.put("revenue", (long) (n.path("sale_account").asDouble(0.0) * 100000000L));
                            data.put("op_profit", (long) (n.path("bsop_prti").asDouble(0.0) * 100000000L));
                            data.put("net_income", (long) (n.path("thtr_ntin").asDouble(0.0) * 100000000L));
                            map.put(yymm, data);
                        }
                    }
                    return map;
                }).onErrorResume(e -> Mono.just(Collections.emptyMap()));

        // 2. 재무비율 (ROE) - FHKST66430300
        String uriRatio = baseUrl + "/uapi/domestic-stock/v1/finance/financial-ratio?fid_cond_mrkt_div_code=J&fid_input_iscd=" + stockCode + "&fid_div_cls_code=0";
        Mono<Map<String, Double>> ratioMono = webClientBuilder.build().get().uri(uriRatio)
                .header("authorization", "Bearer " + token).header("appkey", appKey).header("appsecret", appSecret)
                .header("tr_id", "FHKST66430300").header("content-type", "application/json").header("custtype", "P")
                .retrieve().bodyToMono(JsonNode.class).map(root -> {
                    Map<String, Double> map = new HashMap<>();
                    JsonNode outArr = root.path("output");
                    if (outArr.isArray()) {
                        for (JsonNode n : outArr) {
                            String yymm = n.path("stac_yymm").asText("");
                            if (yymm.length() < 6 || Integer.parseInt(yymm.substring(0, 4)) < 2024) continue;
                            map.put(yymm, n.path("roe_val").asDouble(0.0));
                        }
                    }
                    return map;
                }).onErrorResume(e -> Mono.just(Collections.emptyMap()));

        // 3. 결산월 기준으로 데이터 병합
        return Mono.zip(incomeMono, ratioMono).map(tuple -> {
            Map<String, Map<String, Object>> incMap = tuple.getT1();
            Map<String, Double> rMap = tuple.getT2();
            List<Map<String, Object>> finalResult = new ArrayList<>();
            
            for (String yymm : incMap.keySet()) {
                Map<String, Object> m = incMap.get(yymm);
                m.put("stock_code", stockCode);
                m.put("report_year", Integer.parseInt(yymm.substring(0, 4)));
                
                String month = yymm.substring(4, 6);
                String rCode = "11011"; // 기본 12월
                if ("03".equals(month)) rCode = "11013";
                else if ("06".equals(month)) rCode = "11012";
                else if ("09".equals(month)) rCode = "11014";
                
                m.put("report_code", rCode);
                m.put("roe", rMap.getOrDefault(yymm, 0.0));
                finalResult.add(m);
            }
            return finalResult;
        });
    }

    private String getField(JsonNode node, String lower, String upper, String defaultVal) {
        if (node.has(lower)) return node.path(lower).asText(defaultVal);
        if (node.has(upper)) return node.path(upper).asText(defaultVal);
        return defaultVal;
    }

    /**
     * [v23.5] 일별 공매도 추이 조회
     * TR: FHPST04830000
     */
    public Mono<ShortSellingDto> fetchShortSelling(String stockCode) {
        String token = kisAuthService.getAccessToken();
        
        // [v23.8] 시장 구분 'J' 고정 및 날짜 파라미터 (최근 30일치)
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String startDate = java.time.LocalDate.now().minusDays(30).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));

        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/daily-short-sale"
                + "?FID_COND_MRKT_DIV_CODE=J"
                + "&FID_INPUT_ISCD=" + stockCode
                + "&FID_PERIOD_DIV_CODE=D"
                + "&FID_INPUT_DATE_1=" + startDate
                + "&FID_INPUT_DATE_2=" + today;

        return webClientBuilder.build().get().uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "FHPST04830000")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(String.class)
                .doOnNext(json -> log.info(">>> [KIS API] Short Selling Raw Response for {}: {}", stockCode, json))
                .map(json -> {
                    try {
                        JsonNode root = objectMapper.readTree(json);
                        List<ShortSellingDto.ShortSellingItem> items = new java.util.ArrayList<>();
                        JsonNode output = root.path("output2"); // [v24.1] 실전 응답 데이터 매핑 확정
                        if (output.isArray()) {
                            for (JsonNode n : output) {
                                items.add(ShortSellingDto.ShortSellingItem.builder()
                                        .date(n.path("stck_bsop_date").asText(""))
                                        .shortCntgQty(n.path("ssts_cntg_qty").asText("0"))
                                        .shortRatio(n.path("ssts_vol_rlim").asText("0"))
                                        .shortAmtRatio(n.path("ssts_tr_pbmn_rlim").asText("0"))
                                        .shortCntgAmt(n.path("ssts_tr_pbmn").asText("0"))
                                        .totalShortCntgQty(n.path("acml_ssts_cntg_qty").asText("0"))
                                        .totalShortRatio(n.path("acml_ssts_cntg_qty_rlim").asText("0"))
                                        .totalShortAmtRatio(n.path("acml_ssts_tr_pbmn_rlim").asText("0"))
                                        .totalShortAmt(n.path("acml_ssts_tr_pbmn").asText("0"))
                                        .avgShortPrice(n.path("avrg_prc").asText("0"))
                                        .build());
                            }
                        }
                        return ShortSellingDto.builder().stockCode(stockCode).items(items).build();
                    } catch (Exception e) {
                        log.error(">>> [KIS API] Error parsing short selling for {}: {}", stockCode, e.getMessage());
                        return ShortSellingDto.builder().stockCode(stockCode).items(java.util.Collections.emptyList()).build();
                    }
                })
                .onErrorResume(e -> Mono.just(ShortSellingDto.builder().stockCode(stockCode).items(java.util.Collections.emptyList()).build()));
    }

    /**
     * [v44.7] 주식정보조회 (마스터 상세)
     * TR: CTPF1002R
     * 목적: 현재가 API에서 누락되기 쉬운 정밀한 소분류 업종명(idx_bztp_scls_cd_name) 확보
     */
    public Mono<Map<String, Object>> fetchStockMasterDetail(String stockCode) {
        String token = kisAuthService.getAccessToken();
        String uri = kisAuthService.getBaseUrl() + "/uapi/domestic-stock/v1/quotations/search-stock-info"
                + "?PRDT_TYPE_CD=300"
                + "&PDNO=" + stockCode;

        return webClientBuilder.build().get().uri(uri)
                .header("authorization", "Bearer " + token)
                .header("appkey", kisAuthService.getAppKey())
                .header("appsecret", kisAuthService.getAppSecret())
                .header("tr_id", "CTPF1002R")
                .header("content-type", "application/json")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(String.class)
                .map(json -> {
                    try {
                        JsonNode root = objectMapper.readTree(json);
                        JsonNode output = root.path("output");
                        Map<String, Object> result = new java.util.HashMap<>();
                        if (!output.isMissingNode()) {
                            // 디버깅을 위해 모든 필드를 맵에 담아 반환
                            java.util.Iterator<Map.Entry<String, JsonNode>> fields = output.fields();
                            while (fields.hasNext()) {
                                Map.Entry<String, JsonNode> entry = fields.next();
                                result.put(entry.getKey(), entry.getValue().asText(""));
                            }
                            
                            // 기본 필드 매핑 유지 (기존 필드가 덮어씌워지지 않도록 함)
                            result.put("industryName", output.path("idx_bztp_scls_cd_name").asText(""));
                        }
                        return result;
                    } catch (Exception e) {
                        log.error(">>> [KIS API] Error parsing master detail for {}: {}", stockCode, e.getMessage());
                        return new java.util.HashMap<String, Object>();
                    }
                })
                .onErrorResume(e -> {
                    log.error(">>> [KIS API] Master Detail Connection Error for {}: {}", stockCode, e.getMessage());
                    return Mono.just(new java.util.HashMap<String, Object>());
                });
    }
}

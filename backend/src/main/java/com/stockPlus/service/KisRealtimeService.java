package com.stockPlus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.Watchlist;
import com.stockPlus.mapper.WatchlistMapper;
import com.stockPlus.mapper.AdminMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class KisRealtimeService {
    private final KisAuthService kisAuthService;
    private final Sinks.Many<StockPriceDto> stockPriceSink;
    private final WatchlistMapper watchlistMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private reactor.core.Disposable connectionDisposable;

    private final AdminMapper adminMapper; // [v18.5] DB 공휴일 체크를 위해 추가

    public KisRealtimeService(KisAuthService kisAuthService, Sinks.Many<StockPriceDto> stockPriceSink, WatchlistMapper watchlistMapper, AdminMapper adminMapper) {
        this.kisAuthService = kisAuthService;
        this.stockPriceSink = stockPriceSink;
        this.watchlistMapper = watchlistMapper;
        this.adminMapper = adminMapper;
    }

    @PostConstruct
    public void init() {
        if (isMarketOpen()) connect();
    }

    @Scheduled(cron = "0 0 8 * * MON-FRI", zone = "Asia/Seoul")
    public void start() {
        if (isMarketOpen()) connect();
    }

    @Scheduled(cron = "0 39 15 * * MON-FRI", zone = "Asia/Seoul")
    public void resetForNightMarket() {
        if (isMarketOpen()) {
            log.info(">>> [WebSocket] Refreshing for NXT Night Market...");
            connect();
        }
    }

    @Scheduled(cron = "0 0 20 * * MON-FRI", zone = "Asia/Seoul")
    public void stop() {
        disconnect();
    }

    public synchronized void connect() {
        disconnect();
        String approvalKey = kisAuthService.getApprovalKey();
        if (approvalKey == null) {
            log.error(">>> [WebSocket] Failed to get Approval Key.");
            return;
        }

        log.info(">>> [WebSocket] Standard Connecting to KIS (UN Mode)...");
        ReactorNettyWebSocketClient client = new ReactorNettyWebSocketClient();
        connectionDisposable = client.execute(URI.create("ws://ops.koreainvestment.com:21000"), session -> {
            List<String> subMsgs = watchlistMapper.findAllGlobal().stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsFavorite()))
                .flatMap(item -> Arrays.asList(
                    buildMsg(approvalKey, item.getStockCode(), "H0UNCNT0"),
                    buildMsg(approvalKey, item.getStockCode(), "H0UNANC0")
                ).stream())
                .collect(Collectors.toList());

            log.info(">>> [WebSocket] Sending {} UN subscription messages.", subMsgs.size());

            return session.send(reactor.core.publisher.Flux.fromIterable(subMsgs).map(session::textMessage))
                .thenMany(session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .doOnNext(msg -> {
                        if (!msg.contains("PINGPONG")) {
                            log.info(">>> [Realtime Data] {}", msg);
                            handleMessage(msg);
                        }
                    }))
                .then();
        }).subscribeOn(Schedulers.boundedElastic()).subscribe();
    }

    public void fullResetAndReconnect() {
        connect();
    }

    public void addSubscription(Watchlist item) {
        if (Boolean.TRUE.equals(item.getIsFavorite())) connect();
    }

    public void removeSubscription(Watchlist item) {
        connect();
    }

    private void handleMessage(String message) {
        if (message.startsWith("{")) {
            // [v14.6] 승인키 만료 시 자동 복구 로직
            if (message.contains("invalid approval") || message.contains("OPSP0011")) {
                log.error(">>> [WebSocket] Invalid Approval detected. Forcing Refresh...");
                kisAuthService.forceRefreshApprovalKey().subscribe(newKey -> connect());
            }
            return;
        }
        try {
            String[] segments = message.split("\\|");
            if (segments.length < 4) return;
            String trId = segments[1];
            String combinedData = segments[3];
            int recordCount = Math.max(1, Integer.parseInt(segments[2]));
            if (trId.endsWith("CNT0") || trId.endsWith("ANC0")) {
                parseAndEmit(combinedData, recordCount, trId.endsWith("ANC0"));
            }
        } catch (Exception e) {}
    }

    private void parseAndEmit(String combinedData, int recordCount, boolean isExpected) {
        try {
            String[] allParts = combinedData.split("\\^", -1);
            int fieldsPerRecord = allParts.length / recordCount;
            for (int i = 0; i < recordCount; i++) {
                int offset = i * fieldsPerRecord;
                if (offset + 5 >= allParts.length) break;
                
                String rawPrice = allParts[offset + 2];
                if (rawPrice == null || rawPrice.isEmpty() || "0".equals(rawPrice)) continue;

                // [v14.7] 비정상적인 필드(소수점 포함 등)가 가격에 들어오는 경우 방어
                if (rawPrice.contains(".")) continue;

                StockPriceDto dto;
                if (isExpected) {
                    String changeStr = allParts[offset + 4];
                    dto = StockPriceDto.builder()
                        .stockCode(allParts[offset])
                        .currentPrice(rawPrice)
                        .change(changeStr)
                        .changeRate(allParts[offset + 5])
                        .priceSign(calculateSign(changeStr))
                        .isExpected(true)
                        .exchangeCode("UN")
                        .build();
                } else {
                    dto = StockPriceDto.builder()
                        .stockCode(allParts[offset])
                        .currentPrice(rawPrice)
                        .priceSign(allParts[offset + 3])
                        .change(allParts[offset + 4])
                        .changeRate(allParts[offset + 5])
                        .volume(allParts[offset + 13])
                        .isExpected(false)
                        .exchangeCode("UN")
                        .build();
                }
                stockPriceSink.tryEmitNext(dto);
            }
        } catch (Exception e) {}
    }

    private String calculateSign(String change) {
        try {
            double c = Double.parseDouble(change.replace(",", ""));
            if (c > 0) return "2";
            if (c < 0) return "5";
            return "3";
        } catch (Exception e) { return "3"; }
    }

    private String buildMsg(String key, String code, String trId) {
        try {
            Map<String, Object> header = new HashMap<>();
            header.put("approval_key", key);
            header.put("custtype", "P");
            header.put("tr_type", "1");
            header.put("content-type", "utf-8");
            Map<String, Object> body = new HashMap<>();
            Map<String, Object> input = new HashMap<>();
            input.put("tr_id", trId);
            input.put("tr_key", code);
            body.put("input", input);
            Map<String, Object> msg = new HashMap<>();
            msg.put("header", header);
            msg.put("body", body);
            return objectMapper.writeValueAsString(msg);
        } catch (Exception e) { return ""; }
    }

    public void disconnect() {
        if (connectionDisposable != null) { connectionDisposable.dispose(); connectionDisposable = null; }
        log.info(">>> [WebSocket] Disconnected.");
    }

    private boolean isMarketOpen() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        if (today.getDayOfWeek().getValue() > 5) return false;
        // [v18.5] 하드코딩 제거: DB market_holidays 테이블 조회
        return adminMapper.checkIsHoliday(today.toString()) == 0;
    }
}

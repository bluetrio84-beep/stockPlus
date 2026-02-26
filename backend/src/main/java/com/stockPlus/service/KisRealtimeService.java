package com.stockPlus.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.Watchlist;
import com.stockPlus.mapper.WatchlistMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Slf4j
public class KisRealtimeService {
    private final KisAuthService kisAuthService;
    private final Sinks.Many<StockPriceDto> stockPriceSink;
    private final WatchlistMapper watchlistMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Set<String> subscribedCodes = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private reactor.core.Disposable connectionDisposable;

    public KisRealtimeService(KisAuthService kisAuthService, Sinks.Many<StockPriceDto> stockPriceSink, WatchlistMapper watchlistMapper) {
        this.kisAuthService = kisAuthService;
        this.stockPriceSink = stockPriceSink;
        this.watchlistMapper = watchlistMapper;
    }

    @PostConstruct
    public void init() {
        if (isMarketOpen()) connect();
    }

    @Scheduled(cron = "0 0 8 * * MON-FRI", zone = "Asia/Seoul")
    public void start() {
        if (isMarketOpen()) connect();
    }

    @Scheduled(cron = "0 0 20 * * MON-FRI", zone = "Asia/Seoul")
    public void stop() {
        disconnect();
    }

    public synchronized void connect() {
        if (connectionDisposable != null && !connectionDisposable.isDisposed()) return;
        
        String approvalKey = kisAuthService.getApprovalKey();
        if (approvalKey == null) return;

        ReactorNettyWebSocketClient client = new ReactorNettyWebSocketClient();
        connectionDisposable = client.execute(URI.create("ws://ops.koreainvestment.com:21000"), session -> {
            List<String> subMsgs = watchlistMapper.findAllGlobal().stream()
                .flatMap(item -> Arrays.asList(
                    buildSubMsg(approvalKey, item.getStockCode(), "CNT"), // 실시간 체결
                    buildSubMsg(approvalKey, item.getStockCode(), "ANC"), // 정규장 예상체결
                    buildSubMsg(approvalKey, item.getStockCode(), "UN_ANC") // 통합 예상체결 (NXT 대응) [추가]
                ).stream())
                .collect(Collectors.toList());

            return session.send(reactor.core.publisher.Flux.fromIterable(subMsgs).map(session::textMessage))
                .thenMany(session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .doOnNext(this::handleMessage))
                .then();
        }).subscribeOn(Schedulers.boundedElastic()).subscribe();
        
        log.info(">>> KIS WebSocket Connected.");
    }

    public void disconnect() {
        if (connectionDisposable != null) {
            connectionDisposable.dispose();
            log.info(">>> KIS WebSocket Disconnected.");
        }
    }

    public void fullResetAndReconnect() {
        disconnect();
        kisAuthService.forceRefreshApprovalKey().subscribe(k -> connect());
    }

    public void addSubscription(Watchlist item) {
        // 기존 연결 유지하며 추가 (실제 구현은 세션 관리 필요하나 현재는 전체 재연결로 처리)
        fullResetAndReconnect();
    }

    public void removeSubscription(Watchlist item) {
        fullResetAndReconnect();
    }

    private void handleMessage(String message) {
        if (message.contains("PINGPONG")) return;
        if (message.startsWith("{")) {
            if (message.contains("invalid approval")) fullResetAndReconnect();
            return;
        }

        try {
            String[] segments = message.split("\\|");
            if (segments.length < 4) return;
            String trId = segments[1];
            String combinedData = segments[3];
            int recordCount = Math.max(1, Integer.parseInt(segments[2]));
            String exchangeCode = trId.contains("H0NX") ? "NX" : (trId.contains("H0UN") ? "UN" : "J");

            if (trId.contains("CNT0") || trId.contains("ANC0")) {
                parseAndEmit(combinedData, recordCount, trId.contains("ANC0"), exchangeCode, trId);
            }
        } catch (Exception e) {}
    }

    private void parseAndEmit(String combinedData, int recordCount, boolean isExpected, String exchangeCode, String trId) {
        try {
            String[] allParts = combinedData.split("\\^", -1);
            int fieldsPerRecord = allParts.length / recordCount;

            for (int i = 0; i < recordCount; i++) {
                int offset = i * fieldsPerRecord;
                if (offset + 5 >= allParts.length) break;

                StockPriceDto dto;
                if (isExpected) {
                    if (allParts.length < offset + 48) continue;
                    String rawPrice = allParts[offset + 47];
                    if (rawPrice == null || rawPrice.isEmpty() || "0".equals(rawPrice)) continue;

                    dto = StockPriceDto.builder()
                            .stockCode(allParts[offset])
                            .currentPrice(rawPrice)
                            .change(allParts.length > offset + 48 ? allParts[offset + 48] : "0")
                            .changeRate(allParts.length > offset + 50 ? allParts[offset + 50] : "0.00")
                            .isExpected(true).exchangeCode(exchangeCode).build();
                } else {
                    dto = StockPriceDto.builder()
                            .stockCode(allParts[offset])
                            .currentPrice(allParts[offset + 2])
                            .change(allParts[offset + 4])
                            .changeRate(allParts[offset + 5])
                            .volume(allParts[offset + 13])
                            .isExpected(false).exchangeCode(exchangeCode).build();
                }
                stockPriceSink.tryEmitNext(dto);
            }
        } catch (Exception e) {}
    }

    private String buildSubMsg(String key, String code, String type) {
        try {
            Map<String, Object> header = new HashMap<>();
            header.put("approval_key", key);
            header.put("custtype", "P");
            header.put("tr_type", "1");
            header.put("content-type", "utf-8");

            Map<String, Object> body = new HashMap<>();
            Map<String, Object> input = new HashMap<>();
            String trId = "CNT".equals(type) ? "H0STCNT0" : 
                         ("ANC".equals(type) ? "H0STANC0" : "H0UNANC0");
            input.put("tr_id", trId);
            body.put("input", input);

            Map<String, Object> msg = new HashMap<>();
            msg.put("header", header);
            msg.put("body", body);
            return objectMapper.writeValueAsString(msg);
        } catch (Exception e) { return ""; }
    }

    private boolean isMarketOpen() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        if (today.getDayOfWeek().getValue() > 5) return false;
        List<String> holidays = java.util.Arrays.asList("2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02", "2026-05-01", "2026-05-05", "2026-05-25", "2026-06-03", "2026-07-17", "2026-08-17", "2026-09-24", "2026-09-25", "2026-10-05", "2026-10-09", "2026-12-25", "2026-12-31");
        return !holidays.contains(today.toString());
    }
}

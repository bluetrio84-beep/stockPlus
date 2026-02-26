package com.stockPlus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.Watchlist;
import com.stockPlus.mapper.WatchlistMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import reactor.core.publisher.Sinks;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.time.Duration;
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
    
    // [보안] 세션 및 구독 관리 고도화
    private WebSocketSession activeSession;
    private final Sinks.Many<String> controlSink = Sinks.many().multicast().directBestEffort();
    private final Set<String> currentSubscribedCodes = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Map<String, Long> lastActionTime = new ConcurrentHashMap<>();

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
        if (activeSession != null) return; // 이미 연결되어 있으면 중복 연결 차단

        String approvalKey = kisAuthService.getApprovalKey();
        if (approvalKey == null) return;

        log.info(">>> [WebSocket] Establishing safe persistent connection...");
        ReactorNettyWebSocketClient client = new ReactorNettyWebSocketClient();
        
        client.execute(URI.create("ws://ops.koreainvestment.com:21000"), session -> {
            this.activeSession = session;
            
            // 1. 초기 즐겨찾기 종목 구독 메시지 생성
            List<String> initialMsgs = watchlistMapper.findAllGlobal().stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsFavorite()))
                .flatMap(item -> {
                    currentSubscribedCodes.add(item.getStockCode());
                    return Arrays.asList(
                        buildMsg(approvalKey, item.getStockCode(), "H0STCNT0", "1"),
                        buildMsg(approvalKey, item.getStockCode(), "H0STANC0", "1")
                    ).stream();
                }).collect(Collectors.toList());

            log.info(">>> [WebSocket] Initial subscription for {} stocks.", currentSubscribedCodes.size());

            // 2. 초기 메시지 + 동적 컨트롤 메시지(SUB/UNSUB) 통합 전송
            Flux<WebSocketMessage> source = Flux.concat(
                Flux.fromIterable(initialMsgs),
                controlSink.asFlux()
            ).map(session::textMessage);

            return session.send(source)
                .thenMany(session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .doOnNext(this::handleMessage))
                .then()
                .doFinally(sig -> {
                    this.activeSession = null;
                    this.currentSubscribedCodes.clear();
                    log.warn(">>> [WebSocket] Session closed. Signal: {}", sig);
                });
        }).subscribeOn(Schedulers.boundedElastic()).subscribe();
    }

    // [핵심] 차단 방어형 개별 구독 추가
    public void addSubscription(Watchlist item) {
        if (!Boolean.TRUE.equals(item.getIsFavorite())) return;
        String code = item.getStockCode();
        
        // 중복 구독 방지 및 연타 방지 (3초 내 재요청 무시)
        if (currentSubscribedCodes.contains(code)) return;
        if (isThrottled(code)) return;

        log.info(">>> [WebSocket] Incrementally subscribing to {}", code);
        String approvalKey = kisAuthService.getApprovalKey();
        controlSink.tryEmitNext(buildMsg(approvalKey, code, "H0STCNT0", "1"));
        controlSink.tryEmitNext(buildMsg(approvalKey, code, "H0STANC0", "1"));
        currentSubscribedCodes.add(code);
    }

    // [핵심] 차단 방어형 개별 구독 해제
    public void removeSubscription(Watchlist item) {
        String code = item.getStockCode();
        if (!currentSubscribedCodes.contains(code)) return;
        if (isThrottled(code)) return;

        log.info(">>> [WebSocket] Incrementally unsubscribing from {}", code);
        String approvalKey = kisAuthService.getApprovalKey();
        controlSink.tryEmitNext(buildMsg(approvalKey, code, "H0STCNT0", "2")); // tr_type 2: 해제
        controlSink.tryEmitNext(buildMsg(approvalKey, code, "H0STANC0", "2"));
        currentSubscribedCodes.remove(code);
    }

    public void fullResetAndReconnect() {
        // 무분별한 전체 재연결 차단. 개별 구독(add/remove)을 사용하도록 유도.
        log.warn(">>> [WebSocket] Full reset requested but ignored for safety. Use incremental sub/unsub.");
    }

    private boolean isThrottled(String code) {
        long now = System.currentTimeMillis();
        long last = lastActionTime.getOrDefault(code, 0L);
        if (now - last < 3000) { // 3초 보호막
            log.warn(">>> [WebSocket] Action for {} throttled to prevent KIS ban.", code);
            return true;
        }
        lastActionTime.put(code, now);
        return false;
    }

    private void handleMessage(String message) {
        if (message.contains("PINGPONG")) return;
        if (message.startsWith("{")) {
            log.debug(">>> [WebSocket Control] {}", message);
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
                parseAndEmit(combinedData, recordCount, trId.contains("ANC0"), exchangeCode);
            }
        } catch (Exception e) {}
    }

    private void parseAndEmit(String combinedData, int recordCount, boolean isExpected, String exchangeCode) {
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
                    
                    dto = StockPriceDto.builder().stockCode(allParts[offset]).currentPrice(rawPrice)
                            .change(allParts.length > offset + 48 ? allParts[offset + 48] : "0")
                            .changeRate(allParts.length > offset + 50 ? allParts[offset + 50] : "0.00")
                            .isExpected(true).exchangeCode(exchangeCode).build();
                } else {
                    dto = StockPriceDto.builder().stockCode(allParts[offset]).currentPrice(allParts[offset + 2])
                            .change(allParts[offset + 4]).changeRate(allParts[offset + 5]).volume(allParts[offset + 13])
                            .isExpected(false).exchangeCode(exchangeCode).build();
                }
                stockPriceSink.tryEmitNext(dto);
            }
        } catch (Exception e) {}
    }

    private String buildMsg(String key, String code, String trId, String trType) {
        try {
            Map<String, Object> header = new HashMap<>();
            header.put("approval_key", key);
            header.put("custtype", "P");
            header.put("tr_type", trType); // 1: 등록, 2: 해제
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

    private void disconnect() {
        if (activeSession != null) {
            activeSession.close().subscribe();
            activeSession = null;
            log.info(">>> [WebSocket] Persistent connection closed manually.");
        }
    }

    private boolean isMarketOpen() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        if (today.getDayOfWeek().getValue() > 5) return false;
        List<String> holidays = java.util.Arrays.asList("2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02", "2026-05-01", "2026-05-05", "2026-05-25", "2026-06-03", "2026-07-17", "2026-08-17", "2026-09-24", "2026-09-25", "2026-10-05", "2026-10-09", "2026-12-25", "2026-12-31");
        return !holidays.contains(today.toString());
    }
}

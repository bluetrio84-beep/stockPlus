package com.example.myapp.service;

import com.example.myapp.domain.StockPriceDto;
import com.example.myapp.domain.Watchlist;
import com.example.myapp.mapper.WatchlistMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.client.WebSocketClient;
import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class KisRealtimeService {

    private final KisAuthService kisAuthService;
    private final Sinks.Many<StockPriceDto> stockPriceSink;
    private final WatchlistMapper watchlistMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Disposable webSocketSession;
    
    private final Sinks.Many<Map.Entry<Watchlist, String>> subscriptionSink = Sinks.many().multicast().onBackpressureBuffer();

    public KisRealtimeService(KisAuthService kisAuthService, Sinks.Many<StockPriceDto> stockPriceSink, WatchlistMapper watchlistMapper) {
        this.kisAuthService = kisAuthService;
        this.stockPriceSink = stockPriceSink;
        this.watchlistMapper = watchlistMapper;
    }

    @PostConstruct
    public void init() {
        log.error("Initializing KisRealtimeService... (Force Log)");
        connect();
    }

    @Scheduled(cron = "0 0 7 * * MON-FRI", zone = "Asia/Seoul")
    public void start() {
        log.info("Scheduled start of KisRealtimeService");
        connect();
    }

    @Scheduled(cron = "0 0 20 * * MON-FRI", zone = "Asia/Seoul")
    public void stop() {
        log.info("Scheduled stop of KisRealtimeService");
        disconnect();
    }
    
    public void addSubscription(Watchlist item) {
        log.info("Adding dynamic subscription for: {}", item.getStockCode());
        subscriptionSink.tryEmitNext(Map.entry(item, "1"));
        
        if ("J".equals(item.getExchangeCode()) || item.getExchangeCode() == null) {
            Watchlist nxItem = new Watchlist();
            nxItem.setStockCode(item.getStockCode());
            nxItem.setExchangeCode("NX");
            subscriptionSink.tryEmitNext(Map.entry(nxItem, "1"));
        }
    }
    
    public void removeSubscription(Watchlist item) {
        log.info("Removing subscription for: {}", item.getStockCode());
        subscriptionSink.tryEmitNext(Map.entry(item, "2"));
        
        if ("J".equals(item.getExchangeCode()) || item.getExchangeCode() == null) {
            Watchlist nxItem = new Watchlist();
            nxItem.setStockCode(item.getStockCode());
            nxItem.setExchangeCode("NX");
            subscriptionSink.tryEmitNext(Map.entry(nxItem, "2"));
        }
    }

    public void connect() {
        if (webSocketSession != null && !webSocketSession.isDisposed()) {
            log.info("WebSocket is already connected.");
            return;
        }
        
        log.error("Attempting to connect to KIS WebSocket...");
        
        kisAuthService.getApprovalKeyMono()
            .doOnSubscribe(s -> log.info("Subscribed to ApprovalKeyMono"))
            .doOnNext(key -> log.info("Received Approval Key: {}", key != null ? "YES" : "NO"))
            .retryWhen(reactor.util.retry.Retry.fixedDelay(Long.MAX_VALUE, Duration.ofSeconds(10))
                .doBeforeRetry(s -> log.warn("Retrying approval key fetch due to error: {}", s.failure().getMessage())))
            .subscribe(
                this::connectWebSocket,
                error -> log.error("Fatal error fetching approval key: ", error)
            );
    }

    private void connectWebSocket(String approvalKey) {
        if (webSocketSession != null && !webSocketSession.isDisposed()) {
            return;
        }

        WebSocketClient client = new ReactorNettyWebSocketClient();
        URI uri = URI.create("ws://ops.koreainvestment.com:21000"); 

        log.info("Connecting to KIS WebSocket: {}", uri);

        webSocketSession = client.execute(uri, session -> {
            log.info("WebSocket connected. Session id: {}", session.getId());

            List<Watchlist> watchlist = watchlistMapper.findAllGlobal();
            
            Watchlist kospi = new Watchlist();
            kospi.setStockCode("0001");
            kospi.setExchangeCode("IDX");

            Watchlist kosdaq = new Watchlist();
            kosdaq.setStockCode("1001");
            kosdaq.setExchangeCode("IDX");
            
            Flux<Map.Entry<Watchlist, String>> initialSubs = Flux.fromIterable(watchlist).flatMap(item -> {
                // 기본 구독 (DB에 저장된 시장 코드 기준)
                Flux<Map.Entry<Watchlist, String>> baseSub = Flux.just(Map.entry(item, "CNT"), Map.entry(item, "ANC"));
                
                // KRX(J) 종목인 경우, NXT(NX) 시장 데이터도 함께 구독
                if ("J".equals(item.getExchangeCode()) || item.getExchangeCode() == null) {
                    Watchlist nxItem = new Watchlist();
                    nxItem.setStockCode(item.getStockCode());
                    nxItem.setExchangeCode("NX"); // Force NXT market
                    
                    // NXT는 실시간 체결(CNT)만 구독하여 구독 슬롯 절약 (MAX SUBSCRIBE OVER 방지)
                    Flux<Map.Entry<Watchlist, String>> nxSub = Flux.just(Map.entry(nxItem, "CNT"));
                    return Flux.concat(baseSub, nxSub);
                }
                
                return baseSub;
            });
            
            Flux<Map.Entry<Watchlist, String>> allSubs = Flux.merge(initialSubs, subscriptionSink.asFlux());

            Mono<Void> receive = session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .doOnNext(this::handleMessage)
                    .doOnError(e -> log.error("WebSocket Receive Error: ", e))
                    .then();

            Mono<Void> send = session.send(
                allSubs
                    .map(entry -> {
                        Watchlist item = entry.getKey();
                        String val = entry.getValue();
                        
                        String realTrType;
                        String realDataType;
                        
                        if ("1".equals(val) || "2".equals(val)) {
                            realTrType = val;
                            realDataType = "CNT";
                        } else {
                            realTrType = "1";
                            realDataType = val;
                        }
                        
                        String trId = resolveTrId(item.getExchangeCode(), realDataType);
                        if (trId == null) return session.textMessage(""); 

                        String msg = buildSubscriptionMessageWithTrId(approvalKey, item, realTrType, trId);
                        log.info("Sending subscription request: code={}, market={}, trId={}, type={}", item.getStockCode(), item.getExchangeCode(), trId, realTrType);
                        return session.textMessage(msg);
                    })
                    .filter(msg -> !msg.getPayloadAsText().isEmpty())
            ).doOnError(e -> log.error("WebSocket Send Error: ", e));

            return Mono.zip(receive, send).then();
        }).subscribe(
                null,
                error -> {
                    log.error("WebSocket runtime error: {}", error.getMessage());
                    error.printStackTrace();
                },
                () -> log.info("WebSocket connection closed.")
        );
    }
    
    private void disconnect() {
        if (webSocketSession != null && !webSocketSession.isDisposed()) {
            webSocketSession.dispose();
            log.info("WebSocket disconnected.");
        }
    }

    private String resolveTrId(String exchangeCode, String type) {
        if ("UPANC".equals(type)) return "H0UPANC0";
        if ("J".equals(exchangeCode) || exchangeCode == null) {
            if ("CNT".equals(type)) return "H0STCNT0";
            if ("ANC".equals(type)) return "H0STANC0";
        }
        else if ("UN".equals(exchangeCode)) {
            if ("CNT".equals(type)) return "H0UNCNT0";
            if ("ANC".equals(type)) return "H0UNANC0";
        }
        else if ("NX".equals(exchangeCode)) {
            if ("CNT".equals(type)) return "H0NXCNT0";
            if ("ANC".equals(type)) return "H0NXANC0";
        }
        return "H0STCNT0";
    }

    private String buildSubscriptionMessageWithTrId(String approvalKey, Watchlist item, String trType, String trId) {
        try {
            Map<String, Object> header = new HashMap<>();
            header.put("approval_key", approvalKey);
            header.put("custtype", "P");
            header.put("tr_type", trType); 
            header.put("content-type", "utf-8");

            Map<String, Object> body = new HashMap<>();
            Map<String, Object> input = new HashMap<>();
            input.put("tr_id", trId);
            input.put("tr_key", item.getStockCode());
            body.put("input", input);

            Map<String, Object> messageMap = new HashMap<>();
            messageMap.put("header", header);
            messageMap.put("body", body);

            return objectMapper.writeValueAsString(messageMap);
        } catch (Exception e) {
            log.error("Error building subscription message", e);
            return "";
        }
    }

    private void handleMessage(String message) {
        // PINGPONG 체크 (가장 빈번함)
        if (message.contains("PINGPONG")) {
            log.debug("Received PINGPONG");
            return;
        }

        log.info("Raw Message Received: {}", message);
        
        try {
            if (message.startsWith("0|") || message.startsWith("1|")) {
                String[] segments = message.split("\\|");
                if (segments.length < 4) return;
                
                String trId = segments[1];
                int recordCount = Integer.parseInt(segments[2]);
                String combinedData = segments[3];
                
                // H0STCNT0 (국내주식 체결), H0UNCNT0 (해외주식 체결) 등
                String exchangeCode = "J";
                if (trId.contains("H0NX")) exchangeCode = "NX";
                else if (trId.contains("H0UN")) exchangeCode = "UN";

                if (trId.contains("CNT0")) {
                    parseAndEmitMultiRow(combinedData, recordCount, false, exchangeCode);
                } 
                // H0STANC0 (국내주식 예상체결) 등
                else if (trId.contains("ANC0")) {
                    parseAndEmitMultiRow(combinedData, recordCount, true, exchangeCode);
                }
                // 지수 등 기타
                else if (trId.contains("UPANC0")) {
                    parseAndEmitIndex(message);
                }
            }
        } catch (Exception e) {
            log.error("Error handling WebSocket message: {}", e.getMessage());
        }
    }

    private void parseAndEmitMultiRow(String combinedData, int recordCount, boolean isExpected, String exchangeCode) {
        try {
            String[] allParts = combinedData.split("\\^");
            // 국내주식 체결(H0STCNT0)은 레코드당 약 46개 필드
            // 실제 데이터 구조를 보며 레코드 단위로 분리
            int fieldsPerRecord = allParts.length / recordCount;
            
            for (int i = 0; i < recordCount; i++) {
                int offset = i * fieldsPerRecord;
                if (offset + 5 >= allParts.length) break;
                
                StockPriceDto dto = StockPriceDto.builder()
                        .stockCode(allParts[offset]) 
                        .exchangeCode(exchangeCode)
                        .time(allParts[offset + 1])
                        .currentPrice(allParts[offset + 2])
                        .priceSign(allParts[offset + 3])
                        .change(allParts[offset + 4])
                        .changeRate(allParts[offset + 5])
                        .volume(allParts.length > offset + 13 ? allParts[offset + 13] : "0")
                        .isExpected(isExpected)
                        .build();
                
                if ("NX".equals(exchangeCode)) {
                    log.info("Emitting NXT data: code={}, price={}, ex={}", dto.getStockCode(), dto.getCurrentPrice(), dto.getExchangeCode());
                }
                            
                stockPriceSink.tryEmitNext(dto);
            }
        } catch (Exception e) {
            log.error("Error parsing multi-row stock data", e);
        }
    }

    private void parseAndEmitIndex(String data) {
        try {
             String content = data.substring(data.lastIndexOf('|') + 1);
             String[] contentParts = content.split("\\^");
             if (contentParts.length < 6) return;

             StockPriceDto dto = StockPriceDto.builder()
                     .stockCode(contentParts[0])
                     .exchangeCode("IDX")
                     .time(contentParts[1])
                     .currentPrice(contentParts[2])
                     .priceSign(contentParts[3])
                     .change(contentParts[4])
                     .changeRate(contentParts[5])
                     .volume(contentParts.length > 8 ? contentParts[8] : "0")
                     .build();
            
             log.debug("Emitting index update: {}-{} -> {}", dto.getStockCode(), dto.getExchangeCode(), dto.getCurrentPrice());
             stockPriceSink.tryEmitNext(dto);
        } catch (Exception e) {
             log.error("Error parsing index data", e);
        }
    }
}
package com.stockPlus.service;

import com.stockPlus.domain.StockPriceDto;
import com.stockPlus.domain.Watchlist;
import com.stockPlus.mapper.WatchlistMapper;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 한국투자증권(KIS) 웹소켓 API를 통해 실시간 주가 데이터를 수신하는 서비스입니다.
 * 웹소켓 연결 관리, 구독(Subscription) 처리, 수신 메시지 파싱 및 전파를 담당합니다.
 */
@Service
@Slf4j
public class KisRealtimeService {

    private final KisAuthService kisAuthService;
    private final Sinks.Many<StockPriceDto> stockPriceSink; // 전역 주가 데이터 브로드캐스팅 채널
    private final WatchlistMapper watchlistMapper; // 초기 구독 목록 로딩용
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Disposable webSocketSession; // 웹소켓 세션 구독 관리
    private long lastConnectTime = 0; // [추가] 마지막 연결 시도 시간 체크용
    
    // 동적 구독 추가/삭제를 처리하는 Sink (멀티캐스트 지원, 자동 종료 방지 설정)
    private final Sinks.Many<Map.Entry<Watchlist, String>> subscriptionSink = Sinks.many().multicast().onBackpressureBuffer(256, false);

    /**
     * 애플리케이션 종료 시 호출되어 KIS 웹소켓 연결을 안전하게 닫습니다.
     * 유령 세션 방지를 위한 핵심 재발 방지 코드입니다.
     */
    @jakarta.annotation.PreDestroy
    public void shutdown() {
        log.info(">>> Graceful Shutdown: Closing KIS WebSocket session to prevent ghost sessions.");
        disconnect();
    }

    /**
     * 세션이 완전히 꼬였을 때 호출하여 토큰부터 새로 받고 다시 연결합니다.
     */
    public void fullResetAndReconnect() {
        log.warn(">>> Full Reset Requested: Revoking current auth and reconnecting...");
        disconnect();
        kisAuthService.fullResetAuth().subscribe(newKey -> {
            log.info(">>> Reset Complete. Reconnecting with fresh credentials.");
            connect();
        });
    }

    public KisRealtimeService(KisAuthService kisAuthService, Sinks.Many<StockPriceDto> stockPriceSink, WatchlistMapper watchlistMapper) {
        this.kisAuthService = kisAuthService;
        this.stockPriceSink = stockPriceSink;
        this.watchlistMapper = watchlistMapper;
    }

    /**
     * 서비스 시작 시 초기화 및 웹소켓 연결 시도
     */
    @PostConstruct
    public void init() {
        log.error("Initializing KisRealtimeService... (Force Log)");
        connect();
    }

    /**
     * 평일 오전 8시에 웹소켓 연결 (스케줄러)
     */
    @Scheduled(cron = "0 0 8 * * MON-FRI", zone = "Asia/Seoul")
    public void start() {
        log.info("Scheduled start of KisRealtimeService");
        connect();
    }

    /**
     * 평일 오후 8시에 웹소켓 연결 종료 (스케줄러)
     */
    @Scheduled(cron = "0 0 20 * * MON-FRI", zone = "Asia/Seoul")
    public void stop() {
        log.info("Scheduled stop of KisRealtimeService");
        disconnect();
    }
    
    /**
     * 실시간으로 관심 종목 구독을 추가합니다.
     * @param item 구독할 관심 종목 정보
     */
    public void addSubscription(Watchlist item) {
        log.info("Adding dynamic subscription for: {}", item.getStockCode());
        // '1'은 구독 추가(Add)를 의미하는 내부 플래그
        subscriptionSink.tryEmitNext(Map.entry(item, "1"));
        
        // 코스피(J) 종목인 경우, 야간 시장(NX) 데이터도 함께 구독 시도
        if ("J".equals(item.getExchangeCode()) || item.getExchangeCode() == null) {
            Watchlist nxItem = new Watchlist();
            nxItem.setStockCode(item.getStockCode());
            nxItem.setExchangeCode("NX");
            subscriptionSink.tryEmitNext(Map.entry(nxItem, "1"));   // NX 체결
            subscriptionSink.tryEmitNext(Map.entry(nxItem, "ANC")); // NX 호가/예상체결
        }
    }
    
    /**
     * 실시간으로 관심 종목 구독을 해제합니다.
     * @param item 구독 해제할 관심 종목 정보
     */
    public void removeSubscription(Watchlist item) {
        log.info("Removing subscription for: {}", item.getStockCode());
        // '2'는 구독 삭제(Remove)를 의미하는 내부 플래그
        subscriptionSink.tryEmitNext(Map.entry(item, "2"));
        
        if ("J".equals(item.getExchangeCode()) || item.getExchangeCode() == null) {
            Watchlist nxItem = new Watchlist();
            nxItem.setStockCode(item.getStockCode());
            nxItem.setExchangeCode("NX");
            subscriptionSink.tryEmitNext(Map.entry(nxItem, "2"));   // NX 체결 해제
            
            // ANC 해제는 tr_type=2로 직접 구성해야 함. resolveTrId와 buildSubscriptionMessageWithTrId 연동 고려
            // 현재 buildSubscriptionMessageWithTrId는 entry.getValue()가 "2"면 tr_type=2로 설정함.
            // "NXANC_DEL" 같은 임시 플래그를 사용하여 resolveTrId에서는 ANC를 반환하고, build...에서는 2를 반환하게 할 수 있음.
            Watchlist nxAncDel = new Watchlist();
            nxAncDel.setStockCode(item.getStockCode());
            nxAncDel.setExchangeCode("NX");
            subscriptionSink.tryEmitNext(Map.entry(nxAncDel, "NXANC_DEL"));
        }
    }

    /**
     * KIS 웹소켓 서버에 연결합니다.
     * 접속키(Approval Key)를 먼저 발급받은 후 연결을 진행합니다.
     */
    public void connect() {
        // [보안] 연결 간격 최소 1초 보장 (한투 가이드 준수)
        long now = System.currentTimeMillis();
        if (now - lastConnectTime < 1000) {
            long delay = 1000 - (now - lastConnectTime);
            Mono.delay(Duration.ofMillis(delay)).subscribe(v -> connect());
            return;
        }
        lastConnectTime = now;

        log.error("Attempting to connect to KIS WebSocket with FRESH Approval Key...");
        
        kisAuthService.forceRefreshApprovalKey()
            .doOnNext(key -> log.info("Received FRESH Approval Key: {}", key != null ? "YES" : "NO"))
            .retryWhen(reactor.util.retry.Retry.fixedDelay(3, java.time.Duration.ofSeconds(10))) // 최대 3회 재시도
            .subscribe(
                this::connectWebSocket,
                error -> log.error("Fatal error fetching approval key: ", error)
            );
    }

    // 실제 웹소켓 클라이언트 생성 및 핸들러 등록
    private void connectWebSocket(String approvalKey) {
        if (webSocketSession != null && !webSocketSession.isDisposed()) {
            log.warn("WebSocket session already exists. Disconnecting previous session.");
            disconnect();
        }

        WebSocketClient client = new ReactorNettyWebSocketClient();
        URI uri = URI.create("ws://ops.koreainvestment.com:21000"); 

        log.info("Connecting to KIS WebSocket: {}", uri);

        webSocketSession = client.execute(uri, session -> {
            log.info("WebSocket connected. Session id: {}", session.getId());

            // 1. 구독 목록 구성 로직 (기존 동일)
            List<Watchlist> allFavorites = watchlistMapper.findAllGlobal().stream()
                    .filter(w -> Boolean.TRUE.equals(w.getIsFavorite()))
                    .collect(java.util.stream.Collectors.toList());

            Map<String, Watchlist> uniqueMap = new HashMap<>();
            for (Watchlist w : allFavorites) uniqueMap.putIfAbsent(w.getStockCode(), w);
            List<Watchlist> favoriteStocks = new ArrayList<>(uniqueMap.values());
            
            Watchlist kospi = new Watchlist(); kospi.setStockCode("0001"); kospi.setExchangeCode("IDX");
            Watchlist kosdaq = new Watchlist(); kosdaq.setStockCode("1001"); kosdaq.setExchangeCode("IDX");
            List<Watchlist> indices = java.util.Arrays.asList(kospi, kosdaq);
            
            Flux<Map.Entry<Watchlist, String>> initialSubs = Flux.concat(
                Flux.fromIterable(indices).map(idx -> Map.entry(idx, "CNT")),
                Flux.fromIterable(favoriteStocks).flatMap(item -> {
                    Watchlist krxItem = new Watchlist(); krxItem.setStockCode(item.getStockCode()); krxItem.setExchangeCode("J");
                    Watchlist unItem = new Watchlist(); unItem.setStockCode(item.getStockCode()); unItem.setExchangeCode("UN");
                    Watchlist nxItem = new Watchlist(); nxItem.setStockCode(item.getStockCode()); nxItem.setExchangeCode("NX");
                    return Flux.just(
                        Map.entry(krxItem, "CNT"), 
                        Map.entry(unItem, "CNT"), 
                        Map.entry(unItem, "ANC"),
                        Map.entry(nxItem, "CNT"),
                        Map.entry(nxItem, "ANC")
                    );
                })
            );            

            // 초기 구독 + 동적 구독 병합 (간격 100ms로 확대하여 안정성 확보)
            Flux<Map.Entry<Watchlist, String>> allSubs = Flux.concat(initialSubs, subscriptionSink.asFlux())
                    .delayElements(java.time.Duration.ofMillis(100));

            // 2. 메시지 수신 처리
            Mono<Void> receive = session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .doOnNext(this::handleMessage)
                    .doOnError(e -> log.error("WebSocket Receive Error: ", e))
                    .then();

            // 3. 구독 요청 전송 및 세션 유지 (Keep-Alive)
            // [중요] Flux.never()를 merge하여 세션이 스스로 종료되지 않도록 함
            Mono<Void> send = session.send(
                Flux.merge(
                    allSubs.delaySubscription(java.time.Duration.ofSeconds(2)) // 접속 확인 후 2초 대기 (가이드 준수)
                        .map(entry -> {
                            String trId = resolveTrId(entry.getKey().getExchangeCode(), entry.getValue().equals("1") || entry.getValue().equals("2") ? "CNT" : entry.getValue());
                            if (trId == null) return session.textMessage("");
                            String msg = buildSubscriptionMessageWithTrId(approvalKey, entry.getKey(), entry.getValue(), trId);
                            log.info("Subscription Request: {} ({})", entry.getKey().getStockCode(), trId);
                            return session.textMessage(msg);
                        })
                        .filter(msg -> !msg.getPayloadAsText().isEmpty()),
                    Flux.never() // 스트림이 완료되지 않도록 무한 대기
                )
            ).doOnError(e -> log.error("WebSocket Send Error: ", e));

            return Mono.zip(receive, send).then();
        }).subscribe(
                null,
                error -> {
                    log.error("WebSocket runtime error: {}. Reconnecting in 60s...", error.getMessage());
                    Mono.delay(java.time.Duration.ofSeconds(60)).subscribe(v -> connect());
                },
                () -> {
                    log.info("WebSocket connection closed. Reconnecting in 30s...");
                    Mono.delay(java.time.Duration.ofSeconds(30)).subscribe(v -> connect());
                }
        );
    }
    
    private void disconnect() {
        if (webSocketSession != null && !webSocketSession.isDisposed()) {
            webSocketSession.dispose();
            log.info("WebSocket disconnected.");
        }
    }

    // 시장 구분과 데이터 타입에 따른 TR ID 결정
    private String resolveTrId(String exchangeCode, String type) {
        if ("UPANC".equals(type)) return "H0UPANC0"; // 업종 지수
        if ("J".equals(exchangeCode) || exchangeCode == null) {
            if ("CNT".equals(type)) return "H0STCNT0"; // 국내주식 체결
            if ("ANC".equals(type)) return "H0STANC0"; // 국내주식 호가/예상체결
        }
        else if ("UN".equals(exchangeCode)) {
            if ("CNT".equals(type)) return "H0UNCNT0"; // [수정] 국내주식 통합체결
            if ("ANC".equals(type)) return "H0UNANC0"; // [수정] 국내주식 통합호가
        }
        else if ("NX".equals(exchangeCode)) {
            if ("CNT".equals(type)) return "H0NXCNT0"; // 야간시장 체결
            if ("ANC".equals(type) || "NXANC_DEL".equals(type)) return "H0NXANC0";
        }
        return "H0STCNT0";
    }

    // 구독 요청 JSON 메시지 생성
    private String buildSubscriptionMessageWithTrId(String approvalKey, Watchlist item, String trType, String trId) {
        try {
            Map<String, Object> header = new HashMap<>();
            header.put("approval_key", approvalKey);
            header.put("custtype", "P"); // 개인
            
            // trType이 직접 "1" 또는 "2"로 오지 않는 경우(예: ANC, NXANC_DEL) 처리
            String finalTrType = trType;
            if ("NXANC_DEL".equals(trType)) finalTrType = "2";
            else if (!"1".equals(trType) && !"2".equals(trType)) finalTrType = "1";
            
            header.put("tr_type", finalTrType); // 1: 등록, 2: 해제
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

    // 수신 메시지 핸들러
    private void handleMessage(String message) {
        if (message.contains("PINGPONG")) {
            log.debug("Received PINGPONG");
            return;
        }

        // 구독 응답과 같은 JSON 제어 메시지 처리
        if (message.startsWith("{") && message.contains("header")) {
            log.info("WebSocket Control Message: {}", message);
            
            // 승인키 오류 감지 시 재발급 및 재연결 (2초 지연 추가로 무한 루프 방지)
            if (message.contains("invalid approval") || message.contains("OPSP0011")) {
                log.error("Invalid Approval Key detected! Forcing refresh and reconnecting in 2s...");
                kisAuthService.forceRefreshApprovalKey()
                    .delaySubscription(java.time.Duration.ofSeconds(2))
                    .subscribe(newKey -> connect());
            }
            return;
        }

        // [중요] 실시간 데이터 수신 로그
        log.debug(">>> KIS Realtime Data Received: {}", message);
        
        try {
            // 실시간 데이터 포맷: 0(암호화여부)|TR_ID|데이터개수|데이터...
            if (message.startsWith("0|") || message.startsWith("1|")) {
                String[] segments = message.split("\\|");
                if (segments.length < 4) return;
                
                String trId = segments[1];
                String combinedData = segments[3];

                // [수정] segments[2]는 연속구분값이며 실시간 데이터에서는 레코드 개수가 0으로 올 수 있음.
                // CNT0(체결), ANC0(예상체결)의 경우 데이터가 있으면 최소 1개 레코드로 처리.
                int recordCount = Integer.parseInt(segments[2]);
                if (recordCount <= 0 && (trId.contains("CNT0") || trId.contains("ANC0"))) {
                    recordCount = 1;
                }
                
                if (recordCount <= 0) return;
                
                // 시장 구분 식별
                String exchangeCode = "J";
                if (trId.contains("H0NX")) exchangeCode = "NX";
                else if (trId.contains("H0UN")) exchangeCode = "UN";

                if (trId.contains("CNT0") || trId.contains("ANC0")) {
                    parseAndEmitMultiRow(combinedData, recordCount, trId.contains("ANC0"), exchangeCode, trId);
                }
                else if (trId.contains("UPANC0")) {
                    parseAndEmitIndex(message); // 지수 파싱
                }
            }
        } catch (Exception e) {
            log.error("Error handling WebSocket message: {}", e.getMessage());
        }
    }

    // 주식 데이터 파싱 및 Sink 방출
    private void parseAndEmitMultiRow(String combinedData, int recordCount, boolean isExpected, String exchangeCode, String trId) {
        try {
            String[] allParts = combinedData.split("\\^");
            // 데이터 필드 개수 계산 (전체 길이 / 레코드 수)
            int fieldsPerRecord = allParts.length / recordCount;
            
            for (int i = 0; i < recordCount; i++) {
                int offset = i * fieldsPerRecord;
                
                StockPriceDto dto;
                if (trId.contains("ANC0")) {
                    // [수정] 호가/예상체결 데이터 파싱 (Index 47~50)
                    if (allParts.length < offset + 51) continue; 
                    
                    dto = StockPriceDto.builder()
                            .stockCode(allParts[offset])
                            .exchangeCode(exchangeCode)
                            .time(allParts[offset + 1])
                            .currentPrice(allParts[offset + 47]) // 예상체결가
                            .change(allParts[offset + 48])
                            .priceSign(allParts[offset + 49])
                            .changeRate(allParts[offset + 50])
                            .volume(allParts.length > offset + 51 ? allParts[offset + 51] : "0")
                            .isExpected(true)
                            .build();
                    
                    if ("0".equals(dto.getCurrentPrice()) || dto.getCurrentPrice().isEmpty()) continue;
                } else {
                    if (offset + 5 >= allParts.length) break;
                    dto = StockPriceDto.builder()
                            .stockCode(allParts[offset]) 
                            .exchangeCode(exchangeCode)
                            .time(allParts[offset + 1])
                            .currentPrice(allParts[offset + 2])
                            .priceSign(allParts[offset + 3])
                            .change(allParts[offset + 4])
                            .changeRate(allParts[offset + 5])
                            .volume(allParts.length > offset + 13 ? allParts[offset + 13] : "0")
                            .isExpected(false)
                            .build();
                }
                            
                if (i == 0) {
                    log.debug("[SSE Emit] Code: {}, Price: {}, TR: {}", dto.getStockCode(), dto.getCurrentPrice(), trId);
                }
                stockPriceSink.tryEmitNext(dto);
            }
        } catch (Exception e) {
            log.error("Error parsing multi-row stock data", e);
        }
    }

    // 지수 데이터 파싱
    private void parseAndEmitIndex(String data) {
        try {
             String content = data.substring(data.lastIndexOf('|') + 1);
             String[] contentParts = content.split("\\^");
             if (contentParts.length < 6) return;

             StockPriceDto dto = StockPriceDto.builder()
                     .stockCode(contentParts[0])
                     .exchangeCode("IDX") // Index market code
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
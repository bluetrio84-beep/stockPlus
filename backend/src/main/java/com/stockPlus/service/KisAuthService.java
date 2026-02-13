package com.stockPlus.service;

import com.stockPlus.domain.KisTokenResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

/**
 * 한국투자증권(KIS) API 인증을 담당하는 서비스입니다.
 * 접근 토큰(Access Token)과 실시간 접속 키(Approval Key)의 발급 및 갱신을 관리합니다.
 */
@Service
@RequiredArgsConstructor
public class KisAuthService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(KisAuthService.class);

    @Value("${kis.api.base-url}")
    private String baseUrl; // KIS API 기본 URL
    @Value("${kis.api.key}")
    private String appKey; // 앱 키
    @Value("${kis.api.secret}")
    private String appSecret; // 앱 시크릿

    private String accessToken; // 발급받은 Access Token (일반 API용)
    private String approvalKey; // 발급받은 Approval Key (웹소켓용)
    private WebClient webClient;

    /**
     * 서비스 초기화 시 WebClient 생성 및 초기 토큰/키 발급을 수행합니다.
     */
    @PostConstruct
    public void init() {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
        refreshAccessToken();
        refreshApprovalKey();
    }

    // --- Access Token 관리 ---

    /**
     * 비동기로 Access Token을 갱신합니다.
     */
    public void refreshAccessToken() {
        requestToken().subscribe(response -> { this.accessToken = response.getAccessToken(); }, error -> log.error("Failed to refresh access token", error));
    }

    // 토큰 발급 API 호출
    private Mono<KisTokenResponse> requestToken() {
        Map<String, String> body = new HashMap<>();
        body.put("grant_type", "client_credentials");
        body.put("appkey", appKey);
        body.put("appsecret", appSecret);
        
        log.info("Requesting Access Token for AppKey: {}", appKey);
        
        return webClient.post()
                .uri("/oauth2/tokenP")
                .header("Content-Type", "application/json; charset=UTF-8")
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.isError(), clientResponse -> 
                    clientResponse.bodyToMono(String.class).flatMap(errorBody -> {
                        log.error(">>> [KIS TOKEN ERROR] Status: {}, Body: {}", clientResponse.statusCode(), errorBody);
                        return Mono.error(new RuntimeException("KIS Token API Error: " + errorBody));
                    })
                )
                .bodyToMono(KisTokenResponse.class)
                .doOnNext(res -> log.info("Successfully obtained Access Token"))
                .onErrorResume(e -> {
                    log.error("Fatal error during token request: {}", e.getMessage());
                    return Mono.empty();
                });
    }

    /**
     * 현재 유효한 Access Token을 반환합니다.
     * 토큰이 없을 경우 동기적으로 발급을 시도합니다.
     */
    public synchronized String getAccessToken() {
        if (accessToken == null) {
            try { 
                KisTokenResponse response = requestToken().block(); 
                if (response != null) this.accessToken = response.getAccessToken(); 
            } catch (Exception e) {
                log.error("Error fetching access token synchronously", e);
            }
        }
        return accessToken;
    }
    
    public String getAppKey() { return appKey; }
    public String getAppSecret() { return appSecret; }
    public String getBaseUrl() { return baseUrl; }

    // --- Approval Key (실시간 접속키) 관리 ---

    /**
     * 비동기로 Approval Key를 갱신합니다.
     */
    public void refreshApprovalKey() {
        requestApprovalKey().subscribe(
            key -> { 
                this.approvalKey = key; 
                log.info("Approval Key refreshed successfully: {}", key);
            }, 
            error -> log.error("Failed to refresh approval key", error)
        );
    }

    public Mono<String> forceRefreshApprovalKey() {
        log.info("Forcing refresh of Approval Key...");
        this.approvalKey = null;
        return requestApprovalKey().doOnNext(key -> this.approvalKey = key);
    }

    /**
     * 현재 접근 토큰을 폐기(Revoke)하고 모든 인증 정보를 초기화합니다.
     */
    public Mono<String> fullResetAuth() {
        log.error("!!! FULL AUTH RESET INITIATED (Revoke + TokenP + Approval) !!!");
        
        String tokenToRevoke = this.accessToken;
        this.accessToken = null;
        this.approvalKey = null;

        Mono<Void> revokeMono = Mono.empty();
        if (tokenToRevoke != null) {
            Map<String, String> body = new HashMap<>();
            body.put("appkey", appKey);
            body.put("appsecret", appSecret);
            body.put("token", tokenToRevoke);
            
            revokeMono = webClient.post()
                    .uri("/oauth2/revokeP")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .doOnNext(res -> log.info("Token Revoke Response: {}", res))
                    .onErrorResume(e -> {
                        log.warn("Token Revoke Failed (might be already invalid): {}", e.getMessage());
                        return Mono.empty();
                    })
                    .then();
        }

        // 폐기 후 2초 대기 -> 새 토큰 발급 -> 새 승인키 발급
        return revokeMono
                .delayElement(java.time.Duration.ofSeconds(2))
                .then(requestToken())
                .doOnNext(res -> {
                    this.accessToken = res.getAccessToken();
                    log.info("New Access Token obtained: {}", this.accessToken);
                })
                .delayElement(java.time.Duration.ofSeconds(1))
                .then(requestApprovalKey())
                .doOnNext(key -> {
                    this.approvalKey = key;
                    log.info("Full Auth Reset Complete. New Approval Key: {}", key);
                });
    }

    // 실시간 접속키 발급 API 호출
    private Mono<String> requestApprovalKey() {
        // 정확한 JSON 포맷을 보장하기 위해 문자열로 직접 구성
        String jsonBody = String.format(
            "{\"grant_type\":\"client_credentials\",\"appkey\":\"%s\",\"secretkey\":\"%s\"}",
            appKey, appSecret
        );
        
        log.info("Requesting Approval Key with appkey: {}", appKey);
        
        return webClient.post()
                .uri("/oauth2/Approval")
                .header("Content-Type", "application/json; charset=UTF-8")
                .bodyValue(jsonBody)
                .retrieve()
                .bodyToMono(Map.class)
                .map(res -> {
                    log.info("Approval Key API Response: {}", res);
                    String key = (String) res.get("approval_key");
                    if (key == null) {
                        log.error("Approval Key response is missing 'approval_key' field: {}", res);
                        throw new RuntimeException("Approval Key is missing");
                    } else {
                        log.info("Successfully obtained Approval Key");
                    }
                    return key;
                })
                .doOnError(e -> log.error("Approval API error: {}", e.getMessage()));
    }

    /**
     * 현재 유효한 Approval Key를 반환합니다.
     * 키가 없을 경우 동기적으로 발급을 시도합니다.
     */
    public synchronized String getApprovalKey() {
        if (approvalKey == null) {
            try { 
                String key = requestApprovalKey().block(); 
                if (key != null) this.approvalKey = key; 
            } catch (Exception e) {
                log.error("Error fetching approval key synchronously", e);
            }
        }
        return approvalKey;
    }

    /**
     * 비동기 환경에서 사용하기 위한 Approval Key Mono 반환
     */
    public Mono<String> getApprovalKeyMono() {
        if (approvalKey != null) {
            return Mono.just(approvalKey);
        }
        return requestApprovalKey()
                .doOnNext(key -> this.approvalKey = key);
    }
}
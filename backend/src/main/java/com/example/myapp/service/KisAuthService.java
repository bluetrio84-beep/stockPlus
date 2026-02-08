package com.example.myapp.service;

import com.example.myapp.domain.KisTokenResponse;
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

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class KisAuthService {

    @Value("${kis.api.base-url}")
    private String baseUrl;
    @Value("${kis.api.key}")
    private String appKey;
    @Value("${kis.api.secret}")
    private String appSecret;

    private String accessToken;
    private String approvalKey; 
    private WebClient webClient;

    @PostConstruct
    public void init() {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
        refreshAccessToken();
        refreshApprovalKey();
    }

    public void refreshAccessToken() {
        requestToken().subscribe(response -> { this.accessToken = response.getAccessToken(); }, error -> log.error("Failed to refresh access token", error));
    }

    private Mono<KisTokenResponse> requestToken() {
        Map<String, String> body = new HashMap<>();
        body.put("grant_type", "client_credentials");
        body.put("appkey", appKey);
        body.put("appsecret", appSecret);
        return webClient.post().uri("/oauth2/tokenP").bodyValue(body).retrieve().bodyToMono(KisTokenResponse.class);
    }

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

    public void refreshApprovalKey() {
        requestApprovalKey().subscribe(key -> { this.approvalKey = key; }, error -> log.error("Failed to refresh approval key", error));
    }

    private Mono<String> requestApprovalKey() {
        // Construct raw JSON string to be absolutely sure about the format
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

    public Mono<String> getApprovalKeyMono() {
        if (approvalKey != null) {
            return Mono.just(approvalKey);
        }
        return requestApprovalKey()
                .doOnNext(key -> this.approvalKey = key);
    }
}
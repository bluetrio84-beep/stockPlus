package com.stockPlus.controller;

import com.stockPlus.service.StockAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * 주식 AI 분석 결과를 SSE(Server-Sent Events)로 스트리밍하는 컨트롤러입니다.
 * 실시간으로 생성되는 AI 분석 텍스트를 클라이언트에 전송합니다.
 */
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/sse/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 모든 도메인에서의 요청 허용
public class StockAnalysisController {

    private final StockAnalysisService stockAnalysisService;

    @GetMapping(value = "/{stockCode}/ai-analysis", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> getAiAnalysis(@PathVariable String stockCode, Authentication authentication) {
        // [v36.64] Zero-Trust: 로그인한 사용자만 AI 분석 요청 가능 (Gemini API 보안)
        if (authentication == null || !authentication.isAuthenticated()) {
            return Flux.error(new RuntimeException("Unauthorized: Please login to use AI Analysis."));
        }

        System.out.println("[Controller] SSE Request Received for: " + stockCode + " from User: " + authentication.getName());
        
        // 서비스 계층에서 AI 분석을 요청하고, 결과 스트림을 반환받아 그대로 클라이언트에 전달
        return stockAnalysisService.getStockAnalysis(stockCode)
                .doOnNext(data -> System.out.println("[Controller] Sending Chunk: " + (data.length() > 20 ? data.substring(0, 20) + "..." : data))) // 데이터 전송 로그
                .doOnComplete(() -> System.out.println("[Controller] Stream Completed")) // 스트림 완료 로그
                .doOnError(e -> System.out.println("[Controller] Stream Error: " + e.getMessage())); // 에러 발생 로그
    }
}

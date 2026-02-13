package com.stockPlus.controller;

import com.stockPlus.domain.StockPriceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Sinks;

import java.io.IOException;

/**
 * 실시간 주식 시세를 SSE(Server-Sent Events) 방식으로 클라이언트에게 스트리밍하는 컨트롤러입니다.
 * Reactor Sinks를 사용하여 여러 클라이언트에게 동시에 데이터를 브로드캐스트합니다.
 */
@RestController
@RequestMapping("/api/sse")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class StockSseController {

    // 애플리케이션 전역에서 공유되는 주식 시세 데이터 스트림 (Sinks)
    private final Sinks.Many<StockPriceDto> stockPriceSink;

    /**
     * 주식 시세 스트림에 연결합니다.
     * GET /api/sse/stocks
     *
     * @return SseEmitter 객체 (SSE 연결)
     */
    @GetMapping(value = "/stocks", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.http.ResponseEntity<SseEmitter> streamStockPrices() {
        // 타임아웃을 무제한(Long.MAX_VALUE)으로 설정하여 연결 유지
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // 1. 초기 연결 확인 메시지 전송
        try {
            emitter.send(SseEmitter.event().name("connect").data("Connected to Stock Price Stream"));
        } catch (IOException e) {
            log.error("Error sending initial SSE connection event", e);
            emitter.completeWithError(e);
            return org.springframework.http.ResponseEntity.ok(emitter);
        }

        // 2. 실시간 데이터 스트림(Sink) 구독
        // Sinks.Many<StockPriceDto> -> Flux 변환 후 subscribe
        var disposable = stockPriceSink.asFlux()
                .subscribe(
                        stockPrice -> {
                            try {
                                // 데이터 발생 시 클라이언트에게 전송 (이벤트명: priceUpdate)
                                emitter.send(SseEmitter.event().name("priceUpdate").data(stockPrice));
                            } catch (IOException e) {
                                log.warn("Error sending SSE data, client might have disconnected.", e);
                                // 에러 처리는 아래 onError/onCompletion에서 수행됨
                            }
                        },
                        error -> {
                            log.error("Error in SSE stream.", error);
                            emitter.completeWithError(error);
                        },
                        emitter::complete // 스트림 종료 시
                );

        // 3. 연결 종료 및 타임아웃 처리
        // 클라이언트가 연결을 끊거나 타임아웃 발생 시 구독 해제(dispose)하여 리소스 누수 방지
        emitter.onCompletion(disposable::dispose);
        emitter.onTimeout(disposable::dispose);
        emitter.onError(e -> disposable.dispose());

        // Nginx 등 프록시 버퍼링 방지 헤더 설정
        return org.springframework.http.ResponseEntity.ok()
                .header("X-Accel-Buffering", "no")
                .body(emitter);
    }
}

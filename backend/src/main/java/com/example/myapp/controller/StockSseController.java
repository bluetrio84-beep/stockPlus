package com.example.myapp.controller;

import com.example.myapp.domain.StockPriceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Sinks;

import java.io.IOException;

@RestController
@RequestMapping("/api/sse")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class StockSseController {

    private final Sinks.Many<StockPriceDto> stockPriceSink;

    @GetMapping(value = "/stocks", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.http.ResponseEntity<SseEmitter> streamStockPrices() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // Send a connection confirmation message
        try {
            emitter.send(SseEmitter.event().name("connect").data("Connected to Stock Price Stream"));
        } catch (IOException e) {
            log.error("Error sending initial SSE connection event", e);
            emitter.completeWithError(e);
            return org.springframework.http.ResponseEntity.ok(emitter);
        }

        // Subscribe to the shared real-time data stream (Sink)
        final Sinks.EmitResult[] emitResult = {null};
        var disposable = stockPriceSink.asFlux()
                .subscribe(
                        stockPrice -> {
                            try {
                                emitter.send(SseEmitter.event().name("priceUpdate").data(stockPrice));
                            } catch (IOException e) {
                                log.warn("Error sending SSE data, client might have disconnected.", e);
                                // The onError/onCompletion handlers below will handle cleanup.
                            }
                        },
                        error -> {
                            log.error("Error in SSE stream.", error);
                            emitter.completeWithError(error);
                        },
                        emitter::complete
                );

        // Clean up when the client disconnects
        emitter.onCompletion(disposable::dispose);
        emitter.onTimeout(disposable::dispose);
        emitter.onError(e -> disposable.dispose());

        return org.springframework.http.ResponseEntity.ok()
                .header("X-Accel-Buffering", "no")
                .body(emitter);
    }
}

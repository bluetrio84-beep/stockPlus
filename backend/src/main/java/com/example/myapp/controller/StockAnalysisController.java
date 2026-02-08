package com.example.myapp.controller;

import com.example.myapp.service.StockAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/sse/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StockAnalysisController {

    private final StockAnalysisService stockAnalysisService;

    @GetMapping(value = "/{stockCode}/ai-analysis", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> getAiAnalysis(@PathVariable String stockCode) {
        System.out.println("[Controller] SSE Request Received for: " + stockCode);
        return stockAnalysisService.getStockAnalysis(stockCode)
                .doOnNext(data -> System.out.println("[Controller] Sending Chunk: " + (data.length() > 20 ? data.substring(0, 20) + "..." : data)))
                .doOnComplete(() -> System.out.println("[Controller] Stream Completed"))
                .doOnError(e -> System.out.println("[Controller] Stream Error: " + e.getMessage()));
    }
}

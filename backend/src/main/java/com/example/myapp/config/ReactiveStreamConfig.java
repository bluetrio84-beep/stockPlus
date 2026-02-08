package com.example.myapp.config;

import com.example.myapp.domain.StockPriceDto;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Sinks;

@Configuration
public class ReactiveStreamConfig {

    @Bean
    public Sinks.Many<StockPriceDto> stockPriceSink() {
        // Use a replay sink with a small history or a multicast with drop-oldest strategy
        // This prevents the buffer from overflowing and killing the SSE connection
        return Sinks.many().multicast().onBackpressureBuffer(256, false);
    }
}

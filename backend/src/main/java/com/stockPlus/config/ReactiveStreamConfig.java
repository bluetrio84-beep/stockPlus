package com.stockPlus.config;

import com.stockPlus.domain.StockPriceDto;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Sinks;

/**
 * Reactive Streams (Project Reactor) 관련 설정을 담당하는 클래스입니다.
 * 실시간 데이터를 여러 구독자에게 효율적으로 브로드캐스팅하기 위한 Sink를 설정합니다.
 */
@Configuration
public class ReactiveStreamConfig {

    /**
     * 주식 시세 업데이트 데이터를 전파하기 위한 전역 Sink 빈(Bean)을 생성합니다.
     * Sinks.Many<StockPriceDto>는 여러 구독자에게 데이터를 보낼 수 있는 통로 역할을 합니다.
     * 
     * [설정 상세]
     * 1. many(): 여러 데이터를 보낼 수 있는 Sink 생성
     * 2. multicast(): 멀티캐스트 방식 (하나의 데이터 소스를 여러 구독자가 동시에 공유)
     * 3. onBackpressureBuffer(256, false): 
     *    - 최대 256개의 데이터를 버퍼링합니다.
     *    - 구독자가 데이터를 처리하는 속도보다 데이터가 들어오는 속도가 빠를 때 시스템 부하를 방지합니다.
     *    - false: 버퍼가 꽉 찼을 때 이전 데이터를 버리지 않고 에러를 발생시키거나 흐름을 조절하는 기본 전략 사용 (상황에 따라 true로 변경하여 drop-oldest 전략 사용 가능)
     * 
     * 이 Sink를 통해 수신된 실시간 시세는 StockSseController를 통해 클라이언트들의 SSE 연결로 전달됩니다.
     */
    @Bean
    public Sinks.Many<StockPriceDto> stockPriceSink() {
        // 백프레셔(Backpressure) 관리를 위해 버퍼 크기를 지정한 멀티캐스트 Sink 반환
        return Sinks.many().multicast().onBackpressureBuffer(256, false);
    }
}

package com.stockPlus.scheduler;

import com.stockPlus.service.KisAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class KisTokenScheduler {

    private final KisAuthService kisAuthService;

    // 애플리케이션 시작 직후 1회 실행
    @EventListener(ApplicationReadyEvent.class)
    public void initToken() {
        log.info("[Scheduler] 애플리케이션 시작: 초기 토큰 발급 시도");
        kisAuthService.refreshAccessToken();
    }

    // 매일 오전 8시와 오후 8시에 실행 (안정성 강화)
    @Scheduled(cron = "0 0 8,20 * * *", zone = "Asia/Seoul")
    public void scheduleTokenRefresh() {
        log.info("[Scheduler] 토큰 정기 갱신 작업 시작 (08:00 / 20:00)");
        kisAuthService.refreshAccessToken();
    }
}

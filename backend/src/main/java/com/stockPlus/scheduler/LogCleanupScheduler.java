package com.stockPlus.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 오래된 로그 파일을 자동으로 삭제하는 스케줄러입니다.
 * 보관 기간: 5일
 */
@Component
@Slf4j
public class LogCleanupScheduler {

    private static final String LOG_DIR = "logs";
    private static final int RETENTION_DAYS = 5; // 보관 기간 (5일)
    private static final Pattern DATE_PATTERN = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    /**
     * 매일 새벽 04:30에 로그 청소 실행
     */
    @Scheduled(cron = "0 30 4 * * *")
    public void cleanupOldLogs() {
        log.info("[LogCleanup] Starting log cleanup task... (Retention: {} days)", RETENTION_DAYS);
        
        try {
            Path logPath = Paths.get(LOG_DIR);
            if (!Files.exists(logPath)) {
                log.warn("[LogCleanup] Log directory does not exist: {}", LOG_DIR);
                return;
            }

            File folder = logPath.toFile();
            File[] files = folder.listFiles();
            
            if (files == null || files.length == 0) {
                log.info("[LogCleanup] No log files found to clean.");
                return;
            }

            LocalDate cutoffDate = LocalDate.now().minusDays(RETENTION_DAYS);
            int deleteCount = 0;

            for (File file : files) {
                if (file.isDirectory()) continue;

                // 파일명에서 날짜 추출 (예: stockplus.log.2026-02-12.0.gz)
                Matcher matcher = DATE_PATTERN.matcher(file.getName());
                if (matcher.find()) {
                    String dateStr = matcher.group();
                    try {
                        LocalDate fileDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                        
                        // 기준일보다 이전 날짜면 삭제
                        if (fileDate.isBefore(cutoffDate)) {
                            if (file.delete()) {
                                log.info("[LogCleanup] Deleted old log file: {}", file.getName());
                                deleteCount++;
                            }
                        }
                    } catch (Exception e) {
                        log.warn("[LogCleanup] Could not parse date from filename: {}", file.getName());
                    }
                }
            }
            
            log.info("[LogCleanup] Cleanup finished. Total deleted: {} files.", deleteCount);
            
        } catch (Exception e) {
            log.error("[LogCleanup] Error during log cleanup: {}", e.getMessage());
        }
    }
}

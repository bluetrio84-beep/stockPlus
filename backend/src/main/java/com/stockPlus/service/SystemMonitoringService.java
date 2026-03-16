package com.stockPlus.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.util.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class SystemMonitoringService {

    private final OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
    private final DataSource dataSource;
    private final KisAuthService kisAuthService;
    private final GeminiService geminiService;

    /**
     * 실시간 시스템 지표 및 장애 위험도 조회 (v36.20 확장)
     */
    public Map<String, Object> getSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        // 1. CPU & Memory Metrics
        double cpuLoad = getProcessCpuLoad();
        long totalMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long usedMemory = totalMemory - freeMemory;
        double memoryUsage = (double) usedMemory / totalMemory * 100;

        metrics.put("cpuLoad", Math.round(cpuLoad * 100 * 10.0) / 10.0);
        metrics.put("memoryUsage", Math.round(memoryUsage * 10.0) / 10.0);
        
        // 2. Database & External API Status
        metrics.put("dbSessions", getActiveDbSessions());
        metrics.put("kisStatus", getKisApiStatus());

        // 3. Log Analysis
        String logPath = "logs/stockplus.log";
        List<String> recentErrors = analyzeRecentLogs(logPath, 30);
        metrics.put("recentErrors", recentErrors);
        metrics.put("errorCount", recentErrors.size());

        // 4. Failure Probability
        double failureProb = calculateFailureProbability(cpuLoad * 100, memoryUsage, recentErrors.size());
        metrics.put("failureProbability", Math.round(failureProb * 10.0) / 10.0);
        
        metrics.put("status", failureProb > 75 ? "CRITICAL" : (failureProb > 45 ? "WARNING" : "STABLE"));
        metrics.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime());
        metrics.put("lastCheck", new java.text.SimpleDateFormat("HH:mm:ss").format(new Date()));

        return metrics;
    }

    private int getActiveDbSessions() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM information_schema.processlist")) {
            if (rs.next()) return rs.getInt(1);
        } catch (Exception e) {
            log.error(">>> [Monitoring] DB Session check failed: {}", e.getMessage());
        }
        return 0;
    }

    private Map<String, Object> getKisApiStatus() {
        Map<String, Object> status = new HashMap<>();
        try {
            String token = kisAuthService.getAccessToken();
            status.put("connected", token != null && !token.isEmpty());
            status.put("tokenHealth", token != null ? "VALID" : "INVALID");
            status.put("apiServer", "KIS-PROD");
        } catch (Exception e) {
            status.put("connected", false);
            status.put("error", e.getMessage());
        }
        return status;
    }

    /**
     * AI 로그 분석 (Gemini 연동)
     */
    public String analyzeLogWithAi(String logContent) {
        String prompt = "당신은 세계 최고의 자바 스프링 부트 및 주식 시스템 전문가입니다. " +
                "다음 로그(에러)를 분석하여 1. 원인 2. 해결 방법(코드 예시 포함) 3. 재발 방지책을 아주 친절하고 전문적인 한국어로 설명해 주세요.\n\n" +
                "대상 로그:\n" + logContent;
        try {
            return geminiService.getCompletion(prompt);
        } catch (Exception e) {
            return "AI 분석 중 오류가 발생했습니다: " + e.getMessage();
        }
    }

    /**
     * 시스템 긴급 복구 (재시작)
     */
    public void triggerSystemRestart() {
        log.warn("!!! [Critical] System Restart Triggered by Admin !!!");
        new Thread(() -> {
            try {
                Thread.sleep(2000); // 사용자에게 응답 보낼 시간 확보
                Runtime.getRuntime().exec("docker restart projects-backend-1");
                // 수집기도 함께 재시작
                Runtime.getRuntime().exec("docker restart projects-collector-1");
            } catch (Exception e) {
                log.error(">>> [Restart] Failed to trigger restart: {}", e.getMessage());
            }
        }).start();
    }

    private double getProcessCpuLoad() {
        if (osBean instanceof com.sun.management.OperatingSystemMXBean) {
            double load = ((com.sun.management.OperatingSystemMXBean) osBean).getProcessCpuLoad();
            return load >= 0 ? load : 0.05; // 음수면 기본값 5%
        }
        return osBean.getSystemLoadAverage() / osBean.getAvailableProcessors();
    }

    private List<String> analyzeRecentLogs(String filePath, int lineLimit) {
        List<String> errors = new ArrayList<>();
        File logFile = new File(filePath);
        if (!logFile.exists()) {
            log.warn(">>> [Monitoring] Log file not found at: {}", filePath);
            return errors;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(logFile))) {
            Deque<String> errorLines = new ArrayDeque<>();
            String line;
            while ((line = reader.readLine()) != null) {
                // 핵심 장애 키워드 필터링
                if (line.contains("ERROR") || line.contains("Exception") || line.contains("Critical") || line.contains("403 Forbidden")) {
                    errorLines.add(line);
                    if (errorLines.size() > lineLimit) {
                        errorLines.removeFirst();
                    }
                }
            }
            errors.addAll(errorLines);
            Collections.reverse(errors); // 최신 로그 상단 배치
        } catch (IOException e) {
            log.error(">>> [Monitoring] Failed to read log file: {}", e.getMessage());
        }
        return errors;
    }

    private double calculateFailureProbability(double cpu, double mem, int errorCount) {
        // 임계치 기반 가중치 알고리즘
        double cpuImpact = Math.max(0, (cpu - 40) * 1.2);   // 40% 초과시 가중치
        double memImpact = Math.max(0, (mem - 60) * 1.5);   // 60% 초과시 가중치
        double errorImpact = Math.min(30, errorCount * 3.0); // 최근 에러 1개당 3점 (최대 30점)
        
        // 기본 부하(20%) + 가변 가중치
        double prob = 15.0 + (cpu * 0.1) + (mem * 0.1) + cpuImpact + memImpact + errorImpact;
        return Math.min(100, prob);
    }
}

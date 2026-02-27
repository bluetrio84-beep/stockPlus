package com.stockPlus.controller;

import com.stockPlus.mapper.AdminMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import java.util.*; // [v16.5] ArrayList, Collections 사용을 위해 추가
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminMapper adminMapper;
    private final com.stockPlus.scheduler.DailyInvestorScheduler dailyInvestorScheduler;

    @PostMapping("/dump-investor")
    public String triggerInvestorDump() {
        log.error(">>> [Admin] Manual Investor Data Dump Triggered! STARTING...");
        try {
            dailyInvestorScheduler.collectDailyInvestorData();
            log.error(">>> [Admin] Manual Investor Data Dump FINISHED SUCCESSFULLY!");
            return "Dump finished.";
        } catch (Exception e) {
            log.error(">>> [Admin] Manual Dump FAILED: {}", e.getMessage(), e);
            return "Dump failed: " + e.getMessage();
        }
    }

    // --- 1. 수집기 설정 및 로그 (기존 기능 복구) ---
    @GetMapping("/collector/config")
    public Map<String, Object> getConfig() {
        return adminMapper.getCollectorConfig();
    }

    @PostMapping("/collector/interval")
    public void updateInterval(@RequestBody Map<String, Integer> payload) {
        adminMapper.updateCollectInterval(payload.get("interval"));
    }

    @GetMapping("/collector/logs")
    public List<Map<String, Object>> getLogs() {
        return adminMapper.getCollectorLogs();
    }

    @GetMapping("/collector/stats/hourly")
    public List<Map<String, Object>> getHourlyStats() {
        return adminMapper.getHourlyStats();
    }

    @GetMapping("/collector/data/all")
    public Map<String, List<Map<String, Object>>> getAllCollectedData() {
        Map<String, List<Map<String, Object>>> response = new HashMap<>();
        response.put("supply", adminMapper.getCollectedData());
        response.put("rank", adminMapper.getRecentRankings());
        response.put("theme", adminMapper.getRecentThemes());
        response.put("industry", adminMapper.getRecentIndustries());
        return response;
    }

    // --- 2. v12 인텔리전스 대시보드 (신규 기능) ---
    @GetMapping("/intelligence/dashboard")
    public Map<String, Object> getIntelligenceDashboard() {
        Map<String, Object> response = new HashMap<>();
        response.put("heatmap", adminMapper.getIndustryHeatmap());
        response.put("persistence", adminMapper.getThemePersistence());
        response.put("leaders", adminMapper.getMarketLeaders());
        response.put("breadth", adminMapper.getMarketBreadth());
        response.put("aiSignals", adminMapper.getLatestAiSignals());
        Double hitRate = adminMapper.getAiHitRate();
        response.put("hitRate", hitRate != null ? hitRate : 0.0); // [v13.7] AI 적중률 추가
        return response;
    }

    /**
     * [v16.5] 드릴다운 대체: 특정 업종의 주도주(Lead Stocks) 정보 조회
     */
    @GetMapping("/intelligence/industry")
    public Map<String, String> getLeadStocks(@RequestParam String industryName) {
        log.info(">>> [Sector Info] Fetching lead stocks for: {}", industryName);
        String leadStocks = adminMapper.getLeadStocksByIndustryName(industryName);
        Map<String, String> response = new HashMap<>();
        response.put("leadStocks", leadStocks != null ? leadStocks : "");
        return response;
    }
}

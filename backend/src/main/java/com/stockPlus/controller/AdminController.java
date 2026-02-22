package com.stockPlus.controller;

import com.stockPlus.mapper.AdminMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
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
        return response;
    }
}

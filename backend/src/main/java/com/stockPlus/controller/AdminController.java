package com.stockPlus.controller;

import com.stockPlus.mapper.AdminMapper;
import com.stockPlus.mapper.UserMapper;
import com.stockPlus.service.StockMasterService;
import com.stockPlus.scheduler.DailyInvestorScheduler;
import com.stockPlus.domain.User;
import com.stockPlus.domain.StockMaster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminMapper adminMapper;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final DailyInvestorScheduler dailyInvestorScheduler;
    private final StockMasterService stockMasterService;
    private final com.stockPlus.service.StockAnalysisService stockAnalysisService;
    private final com.stockPlus.service.KisStockService kisStockService; // [추가] 실적 수집용 서비스

    // --- 0. 상장종목 관리 (CRUD) ---
    @GetMapping("/stocks")
    public List<StockMaster> getAllStocks(
            @RequestParam(defaultValue = "100") int limit, 
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String marketType) {
        if (marketType != null && !marketType.equals("ALL")) {
            return stockMasterService.getStocksByMarket(marketType, limit, offset);
        }
        return stockMasterService.getAllStocks(limit, offset);
    }

    @PostMapping("/stocks")
    public org.springframework.http.ResponseEntity<?> addStock(@RequestBody StockMaster master) {
        try {
            stockMasterService.createStock(master);
            return org.springframework.http.ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/stocks")
    public void updateStock(@RequestBody StockMaster master) {
        stockMasterService.updateStock(master);
    }

    @DeleteMapping("/stocks/{stockCode}")
    public void deleteStock(@PathVariable String stockCode) {
        stockMasterService.deleteStock(stockCode);
    }

    @GetMapping("/stocks/count")
    public int getStockCount(@RequestParam(required = false) String marketType) {
        if (marketType != null && !marketType.equals("ALL")) {
            return stockMasterService.countByMarket(marketType);
        }
        return stockMasterService.countAll();
    }

    // --- 0.1 사용자 관리 (Full Restore v17.9) ---
    @GetMapping("/users")
    public List<User> getAllUsers(@RequestParam(required = false) String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return userMapper.searchUsers(keyword);
        }
        return userMapper.findAll();
    }

    @PostMapping("/users")
    public org.springframework.http.ResponseEntity<?> createUser(@RequestBody User user) {
        // [v17.9] 사용자 ID 중복 체크 (existsByUsrId 사용)
        if (userMapper.existsByUsrId(user.getUsrId())) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", "이미 존재하는 사용자 ID입니다. 다른 ID를 사용해 주세요."));
        }
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        userMapper.insert(user);
        return org.springframework.http.ResponseEntity.ok().build();
    }

    @PutMapping("/users")
    public void updateUser(@RequestBody User user) {
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            log.info(">>> [Admin] Changing password for user: {}", user.getUsrId());
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        } else {
            user.setPassword(null); // MyBatis에서 null 체크하여 처리
        }
        userMapper.update(user);
    }

    @DeleteMapping("/users/{usrId}")
    public void deleteUser(@PathVariable String usrId) {
        userMapper.deleteByUsrId(usrId);
    }

    // --- 1. 수집기 설정 및 로그 ---
    @GetMapping("/collector/config")
    public Map<String, Object> getConfig() {
        return adminMapper.getCollectorConfig();
    }

    @PostMapping("/collector/interval")
    public void updateInterval(@RequestBody Map<String, Integer> payload) {
        adminMapper.updateCollectInterval(payload.get("interval"));
    }

    @PostMapping("/collector/strategy")
    public void updateStrategy(@RequestBody Map<String, String> payload) {
        adminMapper.updateAiStrategy(payload.get("mode"));
    }

    @PostMapping("/collector/policy")
    public void updatePolicy(@RequestBody Map<String, String> payload) {
        String weekend = payload.get("collectOnWeekend");
        String holiday = payload.get("collectOnHoliday");
        adminMapper.updateCollectorPolicy(weekend, holiday);
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

    // --- 2. 인텔리전스 대시보드 ---
    @GetMapping("/intelligence/dashboard")
    public Map<String, Object> getIntelligenceDashboard() {
        Map<String, Object> response = new HashMap<>();
        response.put("heatmap", adminMapper.getIndustryHeatmap());
        response.put("persistence", adminMapper.getThemePersistence());
        response.put("leaders", adminMapper.getMarketLeaders());
        response.put("breadth", adminMapper.getMarketBreadth());
        response.put("aiSignals", adminMapper.getLatestAiSignals());
        Double hitRate = adminMapper.getAiHitRate();
        response.put("hitRate", hitRate != null ? hitRate : 0.0);
        return response;
    }

    @GetMapping("/intelligence/industry")
    public Map<String, String> getLeadStocks(@RequestParam String industryName) {
        String leadStocks = adminMapper.getLeadStocksByIndustryName(industryName);
        Map<String, String> response = new HashMap<>();
        response.put("leadStocks", leadStocks != null ? leadStocks : "");
        return response;
    }

    @GetMapping("/intelligence/next-leaders")
    public List<Map<String, Object>> getNextLeaders(@RequestParam(required = false) String date) {
        String targetDate = (date != null) ? date : java.time.LocalDate.now().toString();
        // [v18.0] TOP 10으로 정예화
        return adminMapper.getNextLeadersByDate(targetDate).stream().limit(10).toList();
    }

    @PostMapping("/intelligence/next-leaders/feedback")
    public void updateNextLeaderFeedback(@RequestBody Map<String, String> payload) {
        String stockCode = payload.get("stockCode");
        String date = payload.get("date");
        String feedbackTag = payload.get("feedbackTag");
        log.info(">>> [AI Feedback] Updating feedback for {}: {} on {}", stockCode, feedbackTag, date);
        adminMapper.updateNextLeaderFeedback(stockCode, date, feedbackTag);
    }

    @GetMapping("/intelligence/ai-review")
    public Map<String, Object> getAiReviewData() {
        Map<String, Object> response = new HashMap<>();
        response.put("modelPerformance", adminMapper.getAiModelPerformance());
        response.put("pastRecommendations", adminMapper.getPastRecommendations());
        return response;
    }

    @GetMapping("/magazine/data")
    public Map<String, Object> getMagazineData() {
        Map<String, Object> response = new HashMap<>();
        String today = java.time.LocalDate.now().toString();
        
        // 1. 히트맵 및 랭킹, 지수 조회
        List<Map<String, Object>> heatmap = adminMapper.getIndustryHeatmap();
        List<Map<String, Object>> leaders = adminMapper.getNextLeadersByDate(today).stream().limit(10).toList();
        List<Map<String, Object>> indices = adminMapper.getLatestIndices();
        
        // 2. DB에서 오늘의 브리핑 조회 (캐싱 로직 v18.0)
        String briefing = adminMapper.getDailyReport(today);
        
        if (briefing == null || briefing.trim().isEmpty()) {
            // DB에 없으면 Gemini 호출하여 생성
            briefing = stockAnalysisService.generateMagazineBriefing(heatmap, leaders);
            // 생성된 브리핑 DB에 저장
            try {
                adminMapper.insertDailyReport(today, briefing);
            } catch (Exception e) {
                // 중복 키 에러 등 예외 처리
            }
        }
        
        response.put("date", today);
        response.put("heatmap", heatmap);
        response.put("leaders", leaders);
        response.put("indices", indices);
        response.put("briefing", briefing);
        return response;
    }

    // --- 3. 공휴일 관리 API (v17.8 유지) ---
    @GetMapping("/holidays")
    public List<Map<String, Object>> getHolidays(@RequestParam int year) {
        return adminMapper.getHolidaysByYear(year);
    }

    @PostMapping("/holidays")
    public org.springframework.http.ResponseEntity<?> addHoliday(@RequestBody Map<String, Object> holiday) {
        String date = (String) holiday.get("holiday_date");
        if (adminMapper.checkIsHoliday(date) > 0) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", "이미 등록된 공휴일 날짜입니다."));
        }
        adminMapper.insertHoliday(holiday);
        return org.springframework.http.ResponseEntity.ok().build();
    }

    @PutMapping("/holidays")
    public void updateHoliday(@RequestBody Map<String, Object> holiday) {
        adminMapper.updateHoliday(holiday);
    }

    @DeleteMapping("/holidays/{id}")
    public void deleteHoliday(@PathVariable int id) {
        adminMapper.deleteHoliday(id);
    }

    @PostMapping("/dump-investor")
    public String triggerInvestorDump() {
        try {
            dailyInvestorScheduler.collectDailyInvestorData();
            return "Dump finished.";
        } catch (Exception e) {
            return "Dump failed: " + e.getMessage();
        }
    }

    // [v19.0] 개별 종목 실적 동기화 (Python 수집기 호출용)
    @GetMapping("/intelligence/sync-financials/{stockCode}")
    public String syncFinancials(@PathVariable String stockCode) {
        try {
            kisStockService.fetchFinancials(stockCode)
                .doOnNext(list -> {
                    for (Map<String, Object> f : list) {
                        adminMapper.insertFinancials(f);
                    }
                }).block(java.time.Duration.ofSeconds(10));
            return "SUCCESS";
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }
}

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
    private final com.stockPlus.mapper.UserMapper userMapper; // [추가] 사용자 관리용 매퍼
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder; // [v17.9] 비밀번호 암호화용
    private final com.stockPlus.scheduler.DailyInvestorScheduler dailyInvestorScheduler;
    private final com.stockPlus.service.StockMasterService stockMasterService;

    // --- 0. 상장종목 관리 (CRUD) ---
    @GetMapping("/stocks")
    public List<com.stockPlus.domain.StockMaster> getAllStocks(
            @RequestParam(defaultValue = "100") int limit, 
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String marketType) {
        // [v17.7] marketType 필터링 로직 추가
        if (marketType != null && !marketType.equals("ALL")) {
            // 이 부분은 Service/Mapper에 필터링 쿼리를 추가해야 함
            return stockMasterService.getStocksByMarket(marketType, limit, offset);
        }
        return stockMasterService.getAllStocks(limit, offset);
    }

    @PostMapping("/stocks")
    public void addStock(@RequestBody com.stockPlus.domain.StockMaster master) {
        stockMasterService.createStock(master);
    }

    @PutMapping("/stocks")
    public void updateStock(@RequestBody com.stockPlus.domain.StockMaster master) {
        stockMasterService.updateStock(master);
    }

    @DeleteMapping("/stocks/{stockCode}")
    public void deleteStock(@PathVariable String stockCode) {
        stockMasterService.deleteStock(stockCode);
    }

    // --- 0.1 사용자 관리 ---
    @GetMapping("/users")
    public List<com.stockPlus.domain.User> getAllUsers(@RequestParam(required = false) String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return userMapper.searchUsers(keyword);
        }
        return userMapper.findAll();
    }

    @PostMapping("/users")
    public void createUser(@RequestBody com.stockPlus.domain.User user) {
        // [v17.9] 신규 등록 시 비밀번호 암호화 필수
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        userMapper.insert(user);
    }

    @PutMapping("/users")
    public void updateUser(@RequestBody com.stockPlus.domain.User user) {
        // [v17.9] 비밀번호가 입력된 경우 암호화하여 저장
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            log.info(">>> [Admin] Changing password for user: {}", user.getUsrId());
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        } else {
            // 입력 안 됐으면 null로 세팅하여 MyBatis에서 업데이트 안 되게 함
            user.setPassword(null);
        }
        userMapper.update(user);
    }

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

    /**
     * [v17.0] AI 브리핑: 날짜별 Next Leaders Top 20 조회
     */
    @GetMapping("/intelligence/next-leaders")
    public List<Map<String, Object>> getNextLeaders(@RequestParam(required = false) String date) {
        String targetDate = (date != null) ? date : java.time.LocalDate.now().toString();
        log.info(">>> [AI Briefing] Fetching Next Leaders for date: {}", targetDate);
        return adminMapper.getNextLeadersByDate(targetDate);
    }
}

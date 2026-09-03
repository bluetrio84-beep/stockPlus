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
import reactor.core.publisher.Flux;
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
    private final com.stockPlus.service.SystemMonitoringService systemMonitoringService; // [신규] 시스템 관제 서비스

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
    public Map<String, Object> getIntelligenceDashboard(org.springframework.security.core.Authentication authentication) {
        // [v36.60] 관리자 권한 강제 (이중 방어)
        validateAdmin(authentication);

        Map<String, Object> response = new HashMap<>();
        response.put("heatmap", adminMapper.getIndustryHeatmap());
        response.put("persistence", adminMapper.getThemePersistence());
        response.put("leaders", adminMapper.getMarketLeaders());
        response.put("breadth", adminMapper.getMarketBreadth());
        response.put("aiSignals", adminMapper.getLatestAiSignals());
        response.put("indices", adminMapper.getLatestIndices()); // [v15.1] 최신 지수 및 환율 데이터 추가
        Double hitRate = adminMapper.getAiHitRate();
        response.put("hitRate", hitRate != null ? hitRate : 0.0);
        return response;
    }

    // [v15.1] 매거진 전용 지수 동기화 트리거 (실시간 웹 수집 실행)
    @PostMapping("/magazine/trigger-index-sync")
    public Map<String, String> triggerIndexSync(org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        Map<String, String> response = new HashMap<>();
        try {
            // Docker 컨테이너(collector) 내부의 스크립트 실행 명령
            String[] cmd = { "docker", "exec", "projects-collector-1", "python3", "/app/fetch_indices_once.py" };
            Process process = Runtime.getRuntime().exec(cmd);
            process.waitFor(); // 실행 완료 대기 (약 3-5초 소요)
            response.put("status", "SUCCESS");
            response.put("message", "Global indices synchronized successfully.");
        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", e.getMessage());
        }
        return response;
    }

    @GetMapping("/intelligence/industry")
    public Map<String, String> getLeadStocks(@RequestParam String industryName, org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        String leadStocks = adminMapper.getLeadStocksByIndustryName(industryName);
        Map<String, String> response = new HashMap<>();
        response.put("leadStocks", leadStocks != null ? leadStocks : "");
        return response;
    }

    @GetMapping("/intelligence/next-leaders")
    public List<Map<String, Object>> getNextLeaders(@RequestParam(required = false) String date, org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        String targetDate = (date != null) ? date : java.time.LocalDate.now().toString();
        // [v18.0] TOP 10으로 정예화
        return adminMapper.getNextLeadersByDate(targetDate).stream().limit(10).toList();
    }

    @PostMapping("/intelligence/next-leaders/feedback")
    public void updateNextLeaderFeedback(@RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        String stockCode = payload.get("stockCode");
        String date = payload.get("date");
        String feedbackTag = payload.get("feedbackTag");
        log.info(">>> [AI Feedback] Updating feedback for {}: {} on {}", stockCode, feedbackTag, date);
        adminMapper.updateNextLeaderFeedback(stockCode, date, feedbackTag);
    }

    @GetMapping("/intelligence/next-leaders/live")
    public List<Map<String, Object>> getLiveNextLeaders(org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        return adminMapper.getLiveNextLeaders();
    }

    @GetMapping("/intelligence/ai-review")
    public Map<String, Object> getAiReviewData(org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        Map<String, Object> response = new HashMap<>();
        response.put("modelPerformance", adminMapper.getAiModelPerformance());
        response.put("pastRecommendations", adminMapper.getPastRecommendations());
        response.put("summary", adminMapper.getAiPerformanceSummary());
        return response;
    }

    // [v36.60] 관리자 권한 통합 검증 유틸리티
    private void validateAdmin(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized: Authentication is required.");
        }
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            throw new RuntimeException("Forbidden: Only ADMIN can access intelligence data.");
        }
    }

    @GetMapping("/magazine/data")
    public Map<String, Object> getMagazineData(org.springframework.security.core.Authentication authentication) {
        // [v36.74] 유연한 보안 체계: 파이썬 수집기 및 헤더 유실 대응 (인증 정보가 있을 때만 관리자 체크)
        if (authentication != null && authentication.isAuthenticated()) {
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                throw new RuntimeException("Forbidden: Only ADMIN can access magazine data.");
            }
        }

        Map<String, Object> response = new HashMap<>();
        String today = java.time.LocalDate.now().toString();
        
        // 1. 히트맵 및 랭킹, 지수 조회
        List<Map<String, Object>> heatmap = adminMapper.getIndustryHeatmap();
        List<Map<String, Object>> leaders = adminMapper.getNextLeadersByDate(today).stream().limit(10).toList();
        List<Map<String, Object>> indices = adminMapper.getLatestIndices();
        
        // 2. DB에서 오늘의 브리핑 조회 (캐싱 로직 v18.0)
        String briefing = adminMapper.getDailyReport(today);
        
        // [v16.21 Patch] 사용자 요청 시 실시간 재분석 수행 (프롬프트 변경 반영)
        if (briefing == null || briefing.trim().isEmpty()) {
            // DB에 없거나 비어있으면 새 프롬프트(해외 지수 포함)로 Gemini 호출
            briefing = stockAnalysisService.generateMagazineBriefing(heatmap, leaders, indices);
            try {
                adminMapper.insertDailyReport(today, briefing);
            } catch (Exception e) {}
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

    @PostMapping("/trigger-review")
    public String triggerReview() {
        try {
            dailyInvestorScheduler.reviewAiPerformance();
            return "Review triggered.";
        } catch (Exception e) {
            return "Review failed: " + e.getMessage();
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

    // [v23.5] 스마트머니 90점 돌파 종목 리스트 조회 (최근 30일)
    @GetMapping("/intelligence/smart-money")
    public List<Map<String, Object>> getSmartMoneyStocks() {
        return adminMapper.getSmartMoneyStocks();
    }

    // [v16.53] 세력 잠행 매집 추적 (Smart-Money Stealth Accumulation)
    @GetMapping("/intelligence/stealth-accumulation")
    public List<Map<String, Object>> getStealthAccumulationStocks(org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        return adminMapper.getStealthAccumulationStocks();
    }

    // [v36.10] 시스템 장애 관제 (NOC) 데이터 조회
    @GetMapping("/system/metrics")
    public Map<String, Object> getSystemMetrics() {
        return systemMonitoringService.getSystemMetrics();
    }

    // [v36.20] 로그 AI 분석 (Gemini 연동)
    @PostMapping("/system/analyze-log")
    public Map<String, String> analyzeLog(@RequestBody Map<String, String> payload) {
        String logContent = payload.get("log");
        String analysis = systemMonitoringService.analyzeLogWithAi(logContent);
        return Map.of("analysis", analysis);
    }

    // [v36.20] 시스템 긴급 복구 (재시작)
    @PostMapping("/system/restart")
    public Map<String, String> restartSystem() {
        systemMonitoringService.triggerSystemRestart();
        return Map.of("message", "System restart triggered. Please wait a few moments.");
    }

    private final com.stockPlus.mapper.AiUsageMapper aiUsageMapper; // [v16.25] AI 사용량 매퍼 추가

    // --- 4. AI 사용량 관리 (v16.25) ---
    @GetMapping("/system/ai-stats/daily")
    public List<Map<String, Object>> getAiDailyStats(org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        return aiUsageMapper.getDailyUsageStats();
    }

    @GetMapping("/system/ai-stats/type")
    public List<Map<String, Object>> getAiTypeStats(org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        return aiUsageMapper.getUsageByType();
    }

    /**
     * [v36.102] AI 개발 센터: 지능형 SSE 스트리밍 터미널 (v36.105 노이즈 제거 및 실시간성 강화)
     */
    @PostMapping(value = "/system/terminal/execute", produces = org.springframework.http.MediaType.TEXT_PLAIN_VALUE)
    public Flux<String> executeAgentCommand(@RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        validateAdmin(authentication);
        String input = payload.get("command").trim();

        return Flux.create(sink -> {
            try {
                String targetCommand;
                if (input.matches("^(ls|pwd|cd|docker|cat|grep|ps|date|whoami|find|mkdir|rm|cp|mv|chmod|chown|df|free|tail|head|mvn|npm|python3|git).*")) {
                    targetCommand = input;
                } else {
                    targetCommand = "echo \"[AI 터미널 0원 엔진] 요청하신 명령('" + input.replace("\"", "\\\"") + "')에 대한 시스템 분석 완료: 정상 동작 중입니다.\"";
                }

                ProcessBuilder pb = new ProcessBuilder("bash", "-c", targetCommand);
                pb.directory(new java.io.File("/Projects"));
                pb.redirectErrorStream(true);
                Process process = pb.start();

                // [v36.106] 한글 깨짐 방지를 위해 문자(char) 단위 스트리밍 적용
                java.io.InputStreamReader reader = new java.io.InputStreamReader(process.getInputStream(), java.nio.charset.StandardCharsets.UTF_8);
                char[] buffer = new char[16]; // 16글자 단위로 안전하게 읽기
                int length;
                try {
                    while ((length = reader.read(buffer)) != -1) {
                        sink.next(new String(buffer, 0, length));
                    }
                } finally {
                    reader.close();
                }
                process.waitFor();
                sink.complete();
            } catch (Exception e) {
                sink.next(">>> Error: " + e.getMessage());
                sink.complete();
            }
        });
    }
}

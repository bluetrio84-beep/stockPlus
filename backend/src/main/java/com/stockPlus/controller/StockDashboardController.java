package com.stockPlus.controller;

import com.stockPlus.domain.StockChartDto;
import com.stockPlus.domain.StockInfo;
import com.stockPlus.domain.UserNote;
import com.stockPlus.domain.Watchlist;
import com.stockPlus.service.KisRealtimeService;
import com.stockPlus.service.KisStockService;
import com.stockPlus.service.StockDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 주식 대시보드 관련 기능을 통합하여 제공하는 컨트롤러입니다.
 * 관심종목(Watchlist), 주식 정보 및 차트, 사용자 메모, AI 시장 분석, 알림 등의 기능을 처리합니다.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") 
@lombok.extern.slf4j.Slf4j
public class StockDashboardController {

    private final StockDashboardService dashboardService;
    private final KisStockService kisStockService;
    private final KisRealtimeService kisRealtimeService;

    // --- Watchlist (관심 종목) ---

    /**
     * 관심 종목 목록을 조회합니다.
     * @param groupId 그룹 ID (선택 사항)
     * @return 관심 종목 리스트
     */
    @GetMapping("/watchlist")
    public List<Watchlist> getWatchlist(@RequestParam(required = false) Integer groupId) {
        log.info("Watchlist Fetch Request - Group: {}", groupId);
        return dashboardService.getWatchlist(groupId);
    }
    
    /**
     * 즐겨찾기(Favorites)로 설정된 관심 종목만 조회합니다.
     * @return 즐겨찾기 종목 리스트
     */
    @GetMapping("/watchlist/favorites")
    public List<Watchlist> getFavorites() {
        return dashboardService.getFavorites();
    }

    /**
     * 관심 종목을 추가합니다.
     * @param watchlist 추가할 관심 종목 정보
     */
    @PostMapping("/watchlist")
    public void addToWatchlist(@RequestBody Watchlist watchlist) {
        log.info("Watchlist Add Request - Code: {}", watchlist.getStockCode());
        dashboardService.addToWatchlist(watchlist);
    }

    /**
     * 특정 종목을 관심 종목에서 삭제합니다.
     * @param stockCode 종목 코드
     * @param groupId 그룹 ID (기본값: 1)
     */
    @DeleteMapping("/watchlist/{stockCode}")
    public void removeFromWatchlist(@PathVariable String stockCode, @RequestParam(defaultValue = "1") int groupId) {
        dashboardService.removeFromWatchlist(stockCode, groupId);
    }

    /**
     * 특정 그룹의 모든 관심 종목을 삭제합니다.
     * @param groupId 그룹 ID
     */
    @DeleteMapping("/watchlist/group/{groupId}")
    public void removeAllFromWatchlist(@PathVariable int groupId) {
        dashboardService.removeAllFromWatchlist(groupId);
    }

    /**
     * 관심 종목의 즐겨찾기 상태를 토글(변경)합니다.
     * @param stockCode 종목 코드
     * @param payload 변경할 상태 값 (isFavorite: true/false)
     * @param groupId 그룹 ID
     */
    @PutMapping("/watchlist/{stockCode}/favorite")
    public void toggleFavorite(@PathVariable String stockCode, @RequestBody Map<String, Boolean> payload, @RequestParam(defaultValue = "1") int groupId) {
        boolean isFavorite = payload.get("isFavorite");
        dashboardService.toggleFavorite(stockCode, groupId, isFavorite);

        // [추가] 즐겨찾기 토글 시 실시간 구독/해제 즉시 반영
        com.stockPlus.domain.Watchlist item = new com.stockPlus.domain.Watchlist();
        item.setStockCode(stockCode);
        item.setExchangeCode("J"); // 기본 국내주식으로 요청 (내부에서 NX, UN 자동 처리)
        
        if (isFavorite) {
            kisRealtimeService.addSubscription(item);
        } else {
            kisRealtimeService.removeSubscription(item);
        }
    }

    /**
     * [디버그] KIS 웹소켓 세션이 고착되었을 때 강제로 토큰을 폐기하고 재연결합니다.
     */
    @PostMapping("/debug/refresh-approval")
    public ResponseEntity<String> forceRefreshApproval() {
        log.warn("Manual KIS session reset triggered via API.");
        kisRealtimeService.fullResetAndReconnect();
        return ResponseEntity.ok("Reset request submitted. Check backend logs.");
    }

    // --- User Keywords (사용자 키워드) ---
    
    @GetMapping("/keywords")
    public List<String> getUserKeywords() {
        try {
            return dashboardService.getUserKeywords();
        } catch (Exception e) {
            log.error("Error fetching keywords: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @PostMapping("/keywords")
    public ResponseEntity<?> addUserKeyword(@RequestBody Map<String, String> payload) {
        try {
            dashboardService.addUserKeyword(payload.get("keyword"));
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error adding keyword: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @DeleteMapping("/keywords")
    public ResponseEntity<?> deleteUserKeyword(@RequestParam String keyword) {
        try {
            dashboardService.deleteUserKeyword(keyword);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error deleting keyword: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // --- Stock Info & Chart (주식 정보 및 차트) ---

    /**
     * 특정 종목의 상세 정보를 조회합니다.
     * @param stockCode 종목 코드
     * @return 주식 상세 정보
     */
    @GetMapping("/stock-info/{stockCode}")
    public StockInfo getStockInfo(@PathVariable String stockCode) {
        return dashboardService.getStockInfo(stockCode);
    }

    /**
     * 주식 정보를 업데이트합니다.
     * @param stockInfo 업데이트할 주식 정보
     */
    @PostMapping("/stock-info")
    public void updateStockInfo(@RequestBody StockInfo stockInfo) {
        dashboardService.updateStockInfo(stockInfo);
    }

    /**
     * 주식 차트 데이터를 조회합니다. (한국투자증권 API 연동)
     * @param stockCode 종목 코드
     * @param exchangeCode 거래소 코드 (J: 국내, 등)
     * @param period 기간 (D: 일, W: 주, M: 월, etc. - API 스펙에 따름)
     * @return 차트 데이터 리스트 (비동기 Mono)
     */
    @GetMapping("/stocks/{stockCode}/chart")
    public Mono<List<StockChartDto>> getStockChart(
            @PathVariable String stockCode,
            @RequestParam(defaultValue = "J") String exchangeCode,
            @RequestParam(defaultValue = "1D") String period) {
        return kisStockService.fetchUnifiedChart(stockCode, exchangeCode, period);
    }

    /**
     * 주식 현재가를 조회합니다. (한국투자증권 API 연동)
     * @param stockCode 종목 코드
     * @param exchangeCode 거래소 코드
     * @return 현재가 정보 (비동기 Mono)
     */
    @GetMapping("/stocks/{stockCode}/price")
    public Mono<com.stockPlus.domain.StockPriceDto> getStockPrice(
            @PathVariable String stockCode,
            @RequestParam(defaultValue = "J") String exchangeCode) {
        return kisStockService.fetchUnifiedCurrentPrice(stockCode, exchangeCode);
    }

    /**
     * 특정 종목의 투자자 매매동향을 조회합니다.
     */
    @GetMapping("/stocks/{stockCode}/investors")
    public Mono<com.stockPlus.domain.InvestorDto> getStockInvestors(
            @PathVariable String stockCode,
            @RequestParam(defaultValue = "J") String exchangeCode) {
        return kisStockService.fetchInvestors(stockCode, exchangeCode);
    }

    // --- User Notes (사용자 메모) ---

    @GetMapping("/notes")
    public List<UserNote> getAllNotes() { return dashboardService.getAllNotes(); }
    
    @GetMapping("/notes/{refCode}")
    public List<UserNote> getNotesByRefCode(@PathVariable String refCode) { return dashboardService.getNotesByRefCode(refCode); }
    
    @PostMapping("/notes")
    public void createNote(@RequestBody UserNote note) { dashboardService.createNote(note); }
    
    @PutMapping("/notes")
    public void updateNote(@RequestBody UserNote note) { dashboardService.updateNote(note); }
    
    @DeleteMapping("/notes/{id}")
    public void deleteNote(@PathVariable Long id) { dashboardService.deleteNote(id); }

    // --- AI Market Insight (AI 시장 분석) ---

    /**
     * 최신 AI 시장 분석 리포트를 조회합니다.
     * @return 분석 리포트 내용
     */
    @GetMapping("/market-insight")
    public String getMarketInsight() {
        return dashboardService.getMarketInsight();
    }

    /**
     * 특정 주제에 대한 AI 특별 리포트를 조회합니다.
     * @return 특별 리포트 내용
     */
    @GetMapping("/special-report")
    public String getSpecializedReport() {
        return dashboardService.getSpecializedReport();
    }

    // --- Notifications (알림) ---

    /**
     * 최근 알림 목록을 조회합니다.
     * @return 알림 리스트
     */
    @GetMapping("/notifications")
    public List<Map<String, Object>> getNotifications() {
        return dashboardService.getRecentNotifications();
    }

    /**
     * 읽지 않은 알림의 개수를 조회합니다.
     * @return 읽지 않은 알림 개수
     */
    @GetMapping("/notifications/unread-count")
    public int getUnreadCount() {
        return dashboardService.getUnreadNotificationCount();
    }

    /**
     * 알림을 읽음 처리합니다.
     */
    @PostMapping("/notifications/read")
    public void markAsRead() {
        dashboardService.markNotificationsAsRead();
    }

    // --- Debug/Admin (관리자용) ---

    /**
     * 수동으로 AI 특별 리포트 생성을 트리거합니다.
     */
    @PostMapping("/debug/trigger-special-report")
    public void triggerSpecialReport() {
        log.info("[Debug] Manually triggering Special AI Report...");
        dashboardService.updateSpecializedAnalysisScheduled();
    }
}

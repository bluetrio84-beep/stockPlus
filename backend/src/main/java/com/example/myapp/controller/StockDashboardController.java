package com.example.myapp.controller;

import com.example.myapp.domain.StockChartDto;
import com.example.myapp.domain.StockInfo;
import com.example.myapp.domain.UserNote;
import com.example.myapp.domain.Watchlist;
import com.example.myapp.service.KisStockService;
import com.example.myapp.service.StockDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") 
@lombok.extern.slf4j.Slf4j
public class StockDashboardController {

    private final StockDashboardService dashboardService;
    private final KisStockService kisStockService;

    // --- Watchlist ---
    @GetMapping("/watchlist")
    public List<Watchlist> getWatchlist(@RequestParam(required = false) Integer groupId) {
        log.info("Watchlist Fetch Request - Group: {}", groupId);
        return dashboardService.getWatchlist(groupId);
    }
    
    @GetMapping("/watchlist/favorites")
    public List<Watchlist> getFavorites() {
        return dashboardService.getFavorites();
    }

    @PostMapping("/watchlist")
    public void addToWatchlist(@RequestBody Watchlist watchlist) {
        log.info("Watchlist Add Request - Code: {}", watchlist.getStockCode());
        dashboardService.addToWatchlist(watchlist);
    }

    @DeleteMapping("/watchlist/{stockCode}")
    public void removeFromWatchlist(@PathVariable String stockCode, @RequestParam(defaultValue = "1") int groupId) {
        dashboardService.removeFromWatchlist(stockCode, groupId);
    }

    @DeleteMapping("/watchlist/group/{groupId}")
    public void removeAllFromWatchlist(@PathVariable int groupId) {
        dashboardService.removeAllFromWatchlist(groupId);
    }

    @PutMapping("/watchlist/{stockCode}/favorite")
    public void toggleFavorite(@PathVariable String stockCode, @RequestBody Map<String, Boolean> payload, @RequestParam(defaultValue = "1") int groupId) {
        dashboardService.toggleFavorite(stockCode, groupId, payload.get("isFavorite"));
    }

    // --- Stock Info & Chart ---
    @GetMapping("/stock-info/{stockCode}")
    public StockInfo getStockInfo(@PathVariable String stockCode) {
        return dashboardService.getStockInfo(stockCode);
    }

    @PostMapping("/stock-info")
    public void updateStockInfo(@RequestBody StockInfo stockInfo) {
        dashboardService.updateStockInfo(stockInfo);
    }

    // 차트 데이터 조회 (통합 API 호출로 변경)
    @GetMapping("/stocks/{stockCode}/chart")
    public Mono<List<StockChartDto>> getStockChart(
            @PathVariable String stockCode,
            @RequestParam(defaultValue = "J") String exchangeCode,
            @RequestParam(defaultValue = "1D") String period) {
        return kisStockService.fetchUnifiedChart(stockCode, exchangeCode, period);
    }

    // 현재가 조회 (단건)
    @GetMapping("/stocks/{stockCode}/price")
    public Mono<com.example.myapp.domain.StockPriceDto> getStockPrice(
            @PathVariable String stockCode,
            @RequestParam(defaultValue = "J") String exchangeCode) {
        return kisStockService.fetchUnifiedCurrentPrice(stockCode, exchangeCode);
    }

    // --- User Notes ---
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

    // --- AI Market Insight ---
    @GetMapping("/market-insight")
    public String getMarketInsight() {
        return dashboardService.getMarketInsight();
    }

    @GetMapping("/special-report")
    public String getSpecializedReport() {
        return dashboardService.getSpecializedReport();
    }

    // --- Notifications ---
    @GetMapping("/notifications")
    public List<Map<String, Object>> getNotifications() {
        return dashboardService.getRecentNotifications();
    }

    @GetMapping("/notifications/unread-count")
    public int getUnreadCount() {
        return dashboardService.getUnreadNotificationCount();
    }

    @PostMapping("/notifications/read")
    public void markAsRead() {
        dashboardService.markNotificationsAsRead();
    }

    // --- Debug/Admin ---
    @PostMapping("/debug/trigger-special-report")
    public void triggerSpecialReport() {
        log.info("[Debug] Manually triggering Special AI Report...");
        dashboardService.updateSpecializedAnalysisScheduled();
    }
}

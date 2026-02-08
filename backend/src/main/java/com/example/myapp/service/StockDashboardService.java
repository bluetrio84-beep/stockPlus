package com.example.myapp.service;

import com.example.myapp.domain.*;
import com.example.myapp.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockDashboardService {

    private final WatchlistMapper watchlistMapper;
    private final StockInfoMapper stockInfoMapper;
    private final UserNoteMapper userNoteMapper;
    private final UserMapper userMapper;
    private final UserMarketInsightMapper userMarketInsightMapper;
    private final StockMasterMapper stockMasterMapper;
    private final NotificationMapper notificationMapper;
    private final NaverService naverService;
    private final GeminiService geminiService;
    private final KisRealtimeService kisRealtimeService;

    private String getCurrentUsrId() {
        try {
            String principal = SecurityContextHolder.getContext().getAuthentication().getName();
            return ("anonymousUser".equals(principal) || principal == null) ? "bluetrio" : principal;
        } catch (Exception e) { return "bluetrio"; }
    }

    // --- Watchlist ---
    public List<Watchlist> getWatchlist(Integer groupId) {
        String usrId = getCurrentUsrId();
        return (groupId == null) ? watchlistMapper.findAll(usrId) : watchlistMapper.findByGroupId(usrId, groupId);
    }

    public List<Watchlist> getFavorites() {
        return watchlistMapper.findFavorites(getCurrentUsrId());
    }

    @Transactional
    public void addToWatchlist(Watchlist watchlist) {
        String usrId = getCurrentUsrId();
        watchlist.setUsrId(usrId);
        if (watchlist.getGroupId() == null) watchlist.setGroupId(1);
        List<Watchlist> current = watchlistMapper.findByGroupId(usrId, watchlist.getGroupId());
        if (current.stream().anyMatch(w -> w.getStockCode().equals(watchlist.getStockCode()))) return;
        StockMaster master = stockMasterMapper.findByStockCode(watchlist.getStockCode());
        if (master != null) watchlist.setStockName(master.getStockName());
        if (watchlist.getIsFavorite() == null) watchlist.setIsFavorite(false);
        watchlistMapper.insert(watchlist);
        kisRealtimeService.addSubscription(watchlist);
    }

    @Transactional
    public void removeFromWatchlist(String stockCode, int groupId) {
        watchlistMapper.deleteByStockCode(getCurrentUsrId(), stockCode, groupId);
    }

    @Transactional
    public void removeAllFromWatchlist(int groupId) {
        watchlistMapper.deleteByGroupId(getCurrentUsrId(), groupId);
    }
    
    @Transactional
    public void toggleFavorite(String stockCode, int groupId, boolean isFavorite) {
        watchlistMapper.updateFavorite(getCurrentUsrId(), stockCode, groupId, isFavorite);
    }

    // --- User Notes (Fixing Compilation Error) ---
    public List<UserNote> getAllNotes() {
        return userNoteMapper.findAll(getCurrentUsrId());
    }

    public List<UserNote> getNotesByRefCode(String refCode) {
        return userNoteMapper.findByRefCode(getCurrentUsrId(), refCode);
    }

    @Transactional
    public void createNote(UserNote note) {
        note.setUsrId(getCurrentUsrId());
        userNoteMapper.insert(note);
    }
    
    @Transactional
    public void updateNote(UserNote note) {
        note.setUsrId(getCurrentUsrId());
        userNoteMapper.update(note);
    }

    @Transactional
    public void deleteNote(Long id) {
        userNoteMapper.deleteById(getCurrentUsrId(), id);
    }

    // --- AI Market Insight (조회) ---
    public String getMarketInsight() {
        String insight = userMarketInsightMapper.findLatestByType(getCurrentUsrId(), "GENERAL");
        return insight != null ? insight : "매시간 뉴스 분석이 준비 중입니다.";
    }

    public String getSpecializedReport() {
        String report = userMarketInsightMapper.findLatestByType(getCurrentUsrId(), "SPECIAL");
        return report != null ? report : "전담 AI 분석 리포트가 준비 중입니다. (08:55 / 15:55)";
    }

    // [1] 매시간 뉴스 요약 (07:05 ~ 23:05)
    @Scheduled(cron = "0 5 7-23 * * *")
    @Transactional
    public void updateGeneralInsightScheduled() {
        log.info("[Scheduler] General Market Insight Start...");
        
        // 1. 공통 뉴스 요약 생성 (NewsService의 마스터 키워드 사용)
        List<String> keywords = NewsService.FILTER_KEYWORDS;
        Set<String> headlines = new LinkedHashSet<>();
        for (String k : keywords) {
            List<String> res = naverService.searchNewsHeadlines(k);
            if (res != null) headlines.addAll(res);
        }
        if (headlines.isEmpty()) return;
        
        String newInsight = geminiService.getGeneralMarketInsight(new ArrayList<>(headlines));
        if (newInsight == null) return;

        // 2. 모든 사용자에게 배포 및 알림
        List<com.example.myapp.domain.User> allUsers = userMapper.findAll(); // UserMapper에 findAll 추가 필요
        for (com.example.myapp.domain.User user : allUsers) {
            String usrId = user.getUsrId();
            String prevInsight = userMarketInsightMapper.findLatestByType(usrId, "GENERAL");
            
            if (!newInsight.equals(prevInsight)) {
                userMarketInsightMapper.insert(usrId, "GENERAL", newInsight);
                notificationMapper.insertNotification(usrId, "📰 새로운 시장 요약(Insight)이 업데이트되었습니다.", "MARKET_INSIGHT");
            }
        }
        log.info("[Scheduler] General Market Insight updated for all users.");
    }

    // [2] 전담 AI 분석가 (08:55, 15:55)
    @Scheduled(cron = "0 55 8,15 * * *")
    @Transactional
    public void updateSpecializedAnalysisScheduled() {
        log.info("[Scheduler] Specialized AI Analysis Start...");
        
        List<com.example.myapp.domain.User> allUsers = userMapper.findAll();
        List<String> commonKeywords = Arrays.asList("박달스마트밸리", "위례과천선 안양", "박달동");
        
        for (com.example.myapp.domain.User user : allUsers) {
            try {
                String usrId = user.getUsrId();
                Set<String> headlines = new LinkedHashSet<>();
                
                // 1. 사용자 관심 종목 뉴스 (상위 3개)
                List<Watchlist> favorites = watchlistMapper.findFavorites(usrId);
                int limit = 0;
                for (Watchlist w : favorites) {
                    if (limit++ >= 3) break;
                    List<String> res = naverService.searchNewsHeadlines(w.getStockName());
                    if (res != null) headlines.addAll(res);
                }
                
                // 2. 공통 부동산 키워드 뉴스
                for (String k : commonKeywords) {
                    List<String> res = naverService.searchNewsHeadlines(k);
                    if (res != null) headlines.addAll(res);
                }

                if (headlines.isEmpty()) continue;
                
                String insight = geminiService.getSpecializedAnalysis(new ArrayList<>(headlines));
                if (insight != null) {
                    userMarketInsightMapper.insert(usrId, "SPECIAL", insight);
                    notificationMapper.insertNotification(usrId, "🔔 전담 AI 분석가의 최신 리포트가 도착했습니다!", "AI_INSIGHT");
                    log.info("[Scheduler] Special Report created for {}", usrId);
                }
            } catch (Exception e) {
                log.error("[Scheduler] Error creating report for {}: {}", user.getUsrId(), e.getMessage());
            }
        }
        log.info("[Scheduler] Specialized AI Analysis Completed.");
    }

    public StockInfo getStockInfo(String stockCode) {
        return stockInfoMapper.findByStockCode(stockCode);
    }

    @Transactional
    public void updateStockInfo(StockInfo stockInfo) {
        stockInfoMapper.upsert(stockInfo);
    }

    // --- Notifications ---
    public List<Map<String, Object>> getRecentNotifications() {
        return notificationMapper.findRecentNotifications(getCurrentUsrId());
    }

    public int getUnreadNotificationCount() {
        return notificationMapper.countUnread(getCurrentUsrId());
    }

    @Transactional
    public void markNotificationsAsRead() {
        notificationMapper.markAsRead(getCurrentUsrId());
    }
}
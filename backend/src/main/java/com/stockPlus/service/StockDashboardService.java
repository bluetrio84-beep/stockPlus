package com.stockPlus.service;

import com.stockPlus.domain.*;
import com.stockPlus.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 주식 대시보드의 전반적인 비즈니스 로직을 처리하는 통합 서비스입니다.
 * 관심 종목 관리, 사용자 메모, AI 시장 분석(인사이트), 알림 등을 담당합니다.
 */
@Service
@RequiredArgsConstructor
public class StockDashboardService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StockDashboardService.class);

    private final WatchlistMapper watchlistMapper; // 관심 종목 DB 매퍼
    private final StockInfoMapper stockInfoMapper; // 주식 상세 정보 DB 매퍼
    private final UserNoteMapper userNoteMapper; // 사용자 메모 DB 매퍼
    private final UserMapper userMapper; // 사용자 정보 DB 매퍼
    private final UserMarketInsightMapper userMarketInsightMapper; // AI 인사이트 DB 매퍼
    private final StockMasterMapper stockMasterMapper; // 종목 마스터 DB 매퍼
    private final NotificationMapper notificationMapper; // 알림 DB 매퍼
    private final UserKeywordMapper userKeywordMapper; // 사용자 키워드 DB 매퍼
    private final NaverService naverService; // 뉴스 검색 서비스
    private final GeminiService geminiService; // AI 생성 서비스
    private final KisRealtimeService kisRealtimeService; // 실시간 시세 서비스

    // 현재 로그인한 사용자 ID 조회 (없으면 기본값 반환 - 개발 편의용)
    private String getCurrentUsrId() {
        try {
            String principal = SecurityContextHolder.getContext().getAuthentication().getName();
            return ("anonymousUser".equals(principal) || principal == null) ? "bluetrio" : principal;
        } catch (Exception e) { return "bluetrio"; }
    }

    // --- User Keywords (AI 분석 및 뉴스용) ---

    /**
     * 사용자의 맞춤 키워드 리스트를 조회합니다.
     */
    public List<String> getUserKeywords() {
        return userKeywordMapper.findKeywordsByUsrId(getCurrentUsrId());
    }

    /**
     * 맞춤 키워드를 추가합니다.
     */
    @Transactional
    public void addUserKeyword(String keyword) {
        String usrId = getCurrentUsrId();
        List<String> current = userKeywordMapper.findKeywordsByUsrId(usrId);
        if (!current.contains(keyword)) {
            userKeywordMapper.insertKeyword(usrId, keyword);
        }
    }

    /**
     * 맞춤 키워드를 삭제합니다.
     */
    @Transactional
    public void deleteUserKeyword(String keyword) {
        userKeywordMapper.deleteKeyword(getCurrentUsrId(), keyword);
    }

    // --- Watchlist (관심 종목 관리) ---

    /**
     * 사용자의 관심 종목 목록을 조회합니다.
     * @param groupId 그룹 ID (null이면 전체 조회)
     * @return 관심 종목 리스트
     */
    public List<Watchlist> getWatchlist(Integer groupId) {
        String usrId = getCurrentUsrId();
        return (groupId == null) ? watchlistMapper.findAll(usrId) : watchlistMapper.findByGroupId(usrId, groupId);
    }

    /**
     * 사용자가 즐겨찾기(Favorites)로 설정한 종목 목록을 조회합니다.
     * @return 즐겨찾기 종목 리스트
     */
    public List<Watchlist> getFavorites() {
        return watchlistMapper.findFavorites(getCurrentUsrId());
    }

    /**
     * 관심 종목을 추가합니다. 실시간 시세 구독도 함께 요청합니다.
     * @param watchlist 추가할 관심 종목 정보
     */
    @Transactional
    public void addToWatchlist(Watchlist watchlist) {
        String usrId = getCurrentUsrId();
        watchlist.setUsrId(usrId);
        if (watchlist.getGroupId() == null) watchlist.setGroupId(1);
        
        // 중복 추가 방지
        List<Watchlist> current = watchlistMapper.findByGroupId(usrId, watchlist.getGroupId());
        if (current.stream().anyMatch(w -> w.getStockCode().equals(watchlist.getStockCode()))) return;
        
        // 종목명 보정 (마스터 데이터 조회)
        StockMaster master = stockMasterMapper.findByStockCode(watchlist.getStockCode());
        if (master != null) watchlist.setStockName(master.getStockName());
        
        if (watchlist.getIsFavorite() == null) watchlist.setIsFavorite(false);
        
        watchlistMapper.insert(watchlist);
        
        // 실시간 시세 구독 추가 (WebSocket)
        kisRealtimeService.addSubscription(watchlist);
    }

    /**
     * 관심 종목을 삭제합니다.
     * @param stockCode 삭제할 종목 코드
     * @param groupId 그룹 ID
     */
    @Transactional
    public void removeFromWatchlist(String stockCode, int groupId) {
        watchlistMapper.deleteByStockCode(getCurrentUsrId(), stockCode, groupId);
    }

    /**
     * 특정 그룹의 모든 관심 종목을 삭제합니다.
     * @param groupId 그룹 ID
     */
    @Transactional
    public void removeAllFromWatchlist(int groupId) {
        watchlistMapper.deleteByGroupId(getCurrentUsrId(), groupId);
    }
    
    /**
     * 관심 종목의 즐겨찾기 상태를 변경합니다.
     * @param stockCode 종목 코드
     * @param groupId 그룹 ID
     * @param isFavorite 즐겨찾기 여부
     */
    @Transactional
    public void toggleFavorite(String stockCode, int groupId, boolean isFavorite) {
        watchlistMapper.updateFavorite(getCurrentUsrId(), stockCode, groupId, isFavorite);
    }

    // --- User Notes (사용자 메모 관리) ---
    
    public List<UserNote> getAllNotes() {
        return userNoteMapper.findAll(getCurrentUsrId());
    }

    // 특정 종목이나 키워드(refCode)와 연관된 메모 조회
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

    // --- AI Market Insight (시장 분석 리포트) ---

    /**
     * 최신 종합 시장 분석 리포트를 조회합니다.
     * @return 리포트 내용 (없으면 안내 메시지)
     */
    public String getMarketInsight() {
        String insight = userMarketInsightMapper.findLatestByType(getCurrentUsrId(), "GENERAL");
        return insight != null ? insight : "매시간 뉴스 분석이 준비 중입니다.";
    }

    /**
     * 최신 맞춤형 특별 리포트를 조회합니다.
     * @return 리포트 내용
     */
    public String getSpecializedReport() {
        String report = userMarketInsightMapper.findLatestByType(getCurrentUsrId(), "SPECIAL");
        return report != null ? report : "전담 AI 분석 리포트가 준비 중입니다. (08:55 / 15:55)";
    }

    // [1] 종합 시장 분석 스케줄러 (하루 4회 실행: 08:05, 12:05, 16:05, 20:05)
    // 공통된 주요 키워드 또는 사용자 맞춤 키워드로 뉴스를 검색하여 시장 전체 분위기를 요약합니다.
    @Scheduled(cron = "0 5 8,12,16,20 * * *")
    @Transactional
    public void updateGeneralInsightScheduled() {
        log.info("[Scheduler] General Market Insight Start...");
        
        List<com.stockPlus.domain.User> allUsers = userMapper.findAll(); 
        for (com.stockPlus.domain.User user : allUsers) {
            try {
                String usrId = user.getUsrId();
                
                // 1. 키워드 수집 (사용자 맞춤 키워드 우선, 없으면 기본 시황 키워드 사용)
                List<String> keywords = userKeywordMapper.findKeywordsByUsrId(usrId);
                if (keywords.isEmpty()) {
                    keywords = Arrays.asList("국내 증시 전망", "오늘의 주식 시황");
                }
                
                Set<String> headlines = new LinkedHashSet<>();
                for (String k : keywords) {
                    List<String> res = naverService.searchNewsHeadlines(k);
                    if (res != null) headlines.addAll(res);
                }
                
                if (headlines.isEmpty()) continue;
                
                // 2. AI 요약 생성
                String newInsight = geminiService.getGeneralMarketInsight(new ArrayList<>(headlines));
                if (newInsight == null) continue;

                // 3. 내용 변경 감지 로직 제거 (사용자 요청: 매번 강제 업데이트)
                // String prevInsight = userMarketInsightMapper.findLatestByType(usrId, "GENERAL");
                
                // if (!newInsight.equals(prevInsight)) { 
                    userMarketInsightMapper.insert(usrId, "GENERAL", newInsight);
                    notificationMapper.insertNotification(usrId, "📰 새로운 맞춤 시장 요약(Insight)이 업데이트되었습니다.", "MARKET_INSIGHT");
                    log.info("[Scheduler] General Insight updated (Forced) for {}", usrId);
                // }
            } catch (Exception e) {
                log.error("[Scheduler] Error updating insight for {}: {}", user.getUsrId(), e.getMessage());
            }
        }
        log.info("[Scheduler] General Market Insight Batch Completed.");
    }

    // [2] 전담 AI 분석가 스케줄러 (08:55, 15:55 실행 - 개장 전/마감 전)
    // 사용자별 관심 종목과 특정 부동산 키워드를 중심으로 맞춤형 분석을 제공합니다.
    @Scheduled(cron = "0 55 8,15 * * *")
    @Transactional
    public void updateSpecializedAnalysisScheduled() {
        log.info("[Scheduler] Specialized AI Analysis Start...");
        
        List<com.stockPlus.domain.User> allUsers = userMapper.findAll();
        // [수정] 특정 지역 대신 전반적인 부동산 흐름을 파악할 수 있는 키워드로 변경
        List<String> commonKeywords = Arrays.asList("부동산 시장 시황", "아파트 매매 가격 동향", "금리 부동산 영향");
        
        for (com.stockPlus.domain.User user : allUsers) {
            try {
                String usrId = user.getUsrId();
                Set<String> headlines = new LinkedHashSet<>();
                
                // 1. 사용자 관심 종목 뉴스 수집 (즐겨찾기 종목만)
                List<Watchlist> favorites = watchlistMapper.findFavorites(usrId);
                List<String> favStockNames = new ArrayList<>();
                int limit = 0;
                for (Watchlist w : favorites) {
                    favStockNames.add(w.getStockName());
                    if (limit++ < 5) { // 상위 5개 종목에 대해서만 뉴스 검색
                        List<String> res = naverService.searchNewsHeadlines(w.getStockName());
                        if (res != null) headlines.addAll(res);
                    }
                }
                
                // 2. 공통 부동산 키워드 뉴스 수집
                for (String k : commonKeywords) {
                    List<String> res = naverService.searchNewsHeadlines(k);
                    if (res != null) headlines.addAll(res);
                }

                if (headlines.isEmpty() && favStockNames.isEmpty()) continue;
                
                // 3. AI 맞춤 분석 생성 (관심 종목 리스트 명시적 전달)
                String insight = geminiService.getSpecializedAnalysis(favStockNames, new ArrayList<>(headlines));
                if (insight != null) {
                    // [수정] 이전 리포트와 내용이 다를 때만 저장 및 알림 발생
                    String prevInsight = userMarketInsightMapper.findLatestByType(usrId, "SPECIAL");
                    
                    if (!insight.equals(prevInsight)) {
                        userMarketInsightMapper.insert(usrId, "SPECIAL", insight);
                        notificationMapper.insertNotification(usrId, "🔔 전담 AI 분석가의 최신 리포트가 도착했습니다!", "AI_INSIGHT");
                        log.info("[Scheduler] Special Report created/updated for {}", usrId);
                    } else {
                        log.info("[Scheduler] Special Report content unchanged for {}, skipping notification.", usrId);
                    }
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

    // --- Notifications (알림 관리) ---
    
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
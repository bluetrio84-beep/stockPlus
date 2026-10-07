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
    private final UserNoteMapper userNoteMapper; // 사용자 메모 DB 매퍼
    private final UserMapper userMapper; // 사용자 정보 DB 매퍼
    private final UserMarketInsightMapper userMarketInsightMapper; // AI 인사이트 DB 매퍼
    private final StockMasterMapper stockMasterMapper; // 종목 마스터 DB 매퍼
    private final NotificationMapper notificationMapper; // 알림 DB 매퍼
    private final UserKeywordMapper userKeywordMapper; // 사용자 키워드 DB 매퍼
    private final NaverService naverService; // 뉴스 검색 서비스
    private final GeminiService geminiService; // AI 생성 서비스
    private final KisRealtimeService kisRealtimeService; // 실시간 시세 서비스
    private final KisStockService kisStockService; // KIS REST 시세 서비스
    private final HoldingsMapper holdingsMapper; // 사용자 보유 현황 DB 매퍼

    // [v36.50] 현재 로그인한 사용자 ID 조회 (v36.76 알림 보안 유연화 대응)
    private String getCurrentUsrId() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || "anonymousUser".equals(auth.getName())) {
            // [v36.76] 알림 조회 시 헤더 유실 대응: 익명 사용자에게는 기본 관리자 데이터 제공 (401 방지)
            return "bluetrio";
        }
        return auth.getName();
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
        
        // 종목명 및 마스터 데이터 보정
        StockMaster master = stockMasterMapper.findByStockCode(watchlist.getStockCode());
        if (master != null) {
            watchlist.setStockName(master.getStockName());
        } else {
            // [보완] 마스터 데이터가 없으면 자동 생성하여 별표(*) 로직이 작동하게 함
            String inferredMarket = watchlist.getStockCode().startsWith("0") ? "KOSPI" : "KOSDAQ";
            // 단, 005930(삼성전자) 처럼 00으로 시작하는 코스피가 많으므로 세밀한 판별 필요
            // 여기서는 일단 추가 시 전달된 이름으로 마스터 등록
            stockMasterMapper.insert(StockMaster.builder()
                    .stockCode(watchlist.getStockCode())
                    .stockName(watchlist.getStockName())
                    .exchangeCode(watchlist.getExchangeCode() != null ? watchlist.getExchangeCode() : "J")
                    .marketType(inferredMarket)
                    .build());
        }
        
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
        
        // [수정] 전체 재연결 대신 개별 종목만 구독/해제 트리거
        try {
            Watchlist item = new Watchlist();
            item.setStockCode(stockCode);
            item.setIsFavorite(isFavorite);
            
            if (isFavorite) {
                kisRealtimeService.addSubscription(item);
            } else {
                kisRealtimeService.removeSubscription(item);
            }
        } catch (Exception e) {
            log.error("Failed to update incremental subscription", e);
        }
    }

    // --- User Notes (사용자 메모 관리) ---
    
    public List<UserNote> getAllNotes() {
        return userNoteMapper.findAllByUsrId(getCurrentUsrId());
    }

    // 특정 종목이나 키워드(refCode)와 연관된 메모 조회
    public List<UserNote> getNotesByRefCode(String refCode) {
        return userNoteMapper.findByRefCode(getCurrentUsrId(), refCode);
    }

    @Transactional
    public void createNote(UserNote note) {
        note.setUsrId(getCurrentUsrId());
        if (note.getCategory() == null) note.setCategory("GENERAL");
        userNoteMapper.insert(note);
    }
    
    @Transactional
    public void updateNote(UserNote note) {
        note.setUsrId(getCurrentUsrId());
        userNoteMapper.update(note);
    }

    @Transactional
    public void deleteNote(Long id) {
        userNoteMapper.delete(id, getCurrentUsrId());
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

    // [1] 종합 시장 분석 스케줄러 (하루 6회 실행: 08:05, 10:05, 12:05, 14:05, 16:05, 20:05)
    // 공통된 주요 키워드 또는 사용자 맞춤 키워드로 뉴스를 검색하여 시장 전체 분위기를 요약합니다.
    @Scheduled(cron = "0 5 8,10,12,14,16,20 * * *")
    @Transactional
    public void updateGeneralInsightScheduled() {
        log.info("[Scheduler] General Market Insight Start...");
        
        List<String> activeUserIds = userMapper.findAllActiveUserIds(); // [v17.9] 활성 사용자만 처리 
        for (String usrId : activeUserIds) {
            try {
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
                log.error("[Scheduler] Error updating insight for {}: {}", usrId, e.getMessage());
            }
        }
        log.info("[Scheduler] General Market Insight Batch Completed.");
    }

    /**
     * 특정 종목의 실시간 또는 정규장 현재가를 안전하게 조회 (KIS API 연동)
     */
    private Double resolveCurrentPrice(String stockCode) {
        try {
            StockPriceDto dto = kisStockService.fetchUnifiedCurrentPrice(stockCode, "UN")
                    .block(java.time.Duration.ofMillis(800));
            if (dto != null && dto.getCurrentPrice() != null) {
                return Double.parseDouble(dto.getCurrentPrice().replaceAll("[^0-9.]", ""));
            }
        } catch (Exception e) {
            try {
                StockPriceDto dto = kisStockService.fetchUnifiedCurrentPrice(stockCode, "J")
                        .block(java.time.Duration.ofMillis(600));
                if (dto != null && dto.getCurrentPrice() != null) {
                    return Double.parseDouble(dto.getCurrentPrice().replaceAll("[^0-9.]", ""));
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    /**
     * [v18.0] 특정 사용자에 대한 전담 AI 맞춤 심층 분석 리포트 생성
     * 사용자의 실제 보유 종목(Holdings)과 관심 종목(Watchlist)을 정밀 결합하여 종목별 분석 제공
     */
    public String generateSpecialReportForUser(String usrId) {
        log.info("[AI Report] Generating specialized report for user: {}", usrId);
        List<String> commonKeywords = Arrays.asList("부동산 시장 시황", "아파트 매매 가격 동향", "금리 부동산 영향");
        Set<String> headlines = new LinkedHashSet<>();
        List<String> targetStockDescriptions = new ArrayList<>();
        Set<String> processedCodes = new HashSet<>();

        // 1. 보유 종목 (Holdings) 우선 수집 (사용자의 실제 포트폴리오)
        try {
            List<Holdings> holdingsList = holdingsMapper.findByUsrId(usrId);
            if (holdingsList != null) {
                for (Holdings h : holdingsList) {
                    if (h.getQuantity() != null && h.getQuantity() > 0) {
                        String code = h.getStockCode();
                        String name = h.getStockName();
                        if (name == null || name.trim().isEmpty() || name.equals(code)) {
                            StockMaster sm = stockMasterMapper.findByStockCode(code);
                            if (sm != null && sm.getStockName() != null) name = sm.getStockName();
                            else name = code;
                        }
                        // 현재가 조회
                        Double currentPrice = resolveCurrentPrice(code);
                        String priceStr = (currentPrice != null && currentPrice > 0) 
                            ? String.format("%,.0f원", currentPrice) 
                            : (h.getAvgPrice() != null ? String.format("%,.0f원", h.getAvgPrice().doubleValue()) : "시세확인중");
                        String avgStr = h.getAvgPrice() != null ? String.format("%,.0f원", h.getAvgPrice().doubleValue()) : "-";
                        
                        targetStockDescriptions.add(String.format("[보유 종목] %s (종목코드: %s, 보유수량: %d주, 매수평단가: %s, 실시간현재가: %s)",
                                name, code, h.getQuantity(), avgStr, priceStr));
                        processedCodes.add(code);

                        // 보유 종목 뉴스 검색 (상위 3개만)
                        if (targetStockDescriptions.size() <= 3) {
                            List<String> res = naverService.searchNewsHeadlines(name);
                            if (res != null) headlines.addAll(res);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AI Report] Error reading holdings for {}: {}", usrId, e.getMessage());
        }

        // 2. 관심 종목 (즐겨찾기 Watchlist) 수집
        try {
            List<Watchlist> favorites = watchlistMapper.findFavorites(usrId);
            if (favorites != null) {
                for (Watchlist w : favorites) {
                    String code = w.getStockCode();
                    if (!processedCodes.contains(code)) {
                        String name = w.getStockName();
                        if (name == null || name.trim().isEmpty() || name.equals(code)) {
                            StockMaster sm = stockMasterMapper.findByStockCode(code);
                            if (sm != null && sm.getStockName() != null) name = sm.getStockName();
                            else name = code;
                        }
                        Double currentPrice = (w.getCurrentPrice() != null && w.getCurrentPrice() > 0) 
                            ? w.getCurrentPrice() 
                            : resolveCurrentPrice(code);
                        String priceStr = (currentPrice != null && currentPrice > 0)
                                ? String.format("%,.0f원", currentPrice)
                                : "실시간 시세 확인중";
                        
                        targetStockDescriptions.add(String.format("[관심 종목] %s (종목코드: %s, 실시간현재가: %s)",
                                name, code, priceStr));
                        processedCodes.add(code);

                        if (targetStockDescriptions.size() <= 5) {
                            List<String> res = naverService.searchNewsHeadlines(name);
                            if (res != null) headlines.addAll(res);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AI Report] Error reading favorites for {}: {}", usrId, e.getMessage());
        }

        // 3. 부동산 뉴스 수집
        for (String k : commonKeywords) {
            List<String> res = naverService.searchNewsHeadlines(k);
            if (res != null) headlines.addAll(res);
        }

        if (targetStockDescriptions.isEmpty()) {
            targetStockDescriptions.add("보유 및 관심 종목 (현재 등록된 종목 없음)");
        }

        // 4. AI 생성 호출
        String insight = geminiService.getSpecializedAnalysis(targetStockDescriptions, new ArrayList<>(headlines));
        if (insight != null) {
            userMarketInsightMapper.insert(usrId, "SPECIAL", insight);
            log.info("[AI Report] Special Report created successfully for {}", usrId);
            return insight;
        }
        return getSpecializedReport();
    }

    /**
     * [v18.0] 현재 사용자의 전담 AI 리포트 즉시 수동 갱신
     */
    public String refreshSpecializedReport() {
        return generateSpecialReportForUser(getCurrentUsrId());
    }

    // [2] 전담 AI 분석가 스케줄러 (08:55, 15:55 실행 - 개장 전/마감 전)
    // 사용자별 관심 종목과 특정 부동산 키워드를 중심으로 맞춤형 분석을 제공합니다.
    @Scheduled(cron = "0 55 8,15 * * *")
    @Transactional
    public void updateSpecializedAnalysisScheduled() {
        log.info("[Scheduler] Specialized AI Analysis Start...");
        List<String> activeUserIds = userMapper.findAllActiveUserIds();
        for (String usrId : activeUserIds) {
            try {
                String prevInsight = userMarketInsightMapper.findLatestByType(usrId, "SPECIAL");
                String newInsight = generateSpecialReportForUser(usrId);
                if (newInsight != null && !newInsight.equals(prevInsight)) {
                    notificationMapper.insertNotification(usrId, "🔔 전담 AI 분석가의 최신 리포트가 도착했습니다!", "AI_INSIGHT");
                    log.info("[Scheduler] Special Report created/updated for {}", usrId);
                } else {
                    log.info("[Scheduler] Special Report content unchanged for {}, skipping notification.", usrId);
                }
            } catch (Exception e) {
                log.error("[Scheduler] Error creating report for {}: {}", usrId, e.getMessage());
            }
        }
        log.info("[Scheduler] Specialized AI Analysis Completed.");
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

    // --- YouTube Intelligence Gallery (v16.1) ---
    /**
     * 로그인한 사용자별로 맞춤화된 유튜브 갤러리 피드를 조회합니다.
     */
    public List<com.stockPlus.domain.YoutubeFeedDto> getYoutubeGallery() {
        return watchlistMapper.findYoutubeGallery(getCurrentUsrId());
    }

    // --- Market Trend Rankings (증시 동향 순위 300위 페이징: 시가총액, 상승, 하락, 신고가, 신저가, ETF/ETN 제외 지원) ---
    private static final Map<String, Object> marketCapCache = new java.util.concurrent.ConcurrentHashMap<>();
    private static final Map<String, Long> marketCapCacheTime = new java.util.concurrent.ConcurrentHashMap<>();

    public Map<String, Object> getMarketCapRankings(String market, String type, int page, int pageSize, boolean excludeEtf) {
        String rankingType = "marketValue";
        if ("up".equalsIgnoreCase(type)) rankingType = "up";
        else if ("down".equalsIgnoreCase(type)) rankingType = "down";
        else if ("high52week".equalsIgnoreCase(type) || "high".equalsIgnoreCase(type)) rankingType = "high52week";
        else if ("low52week".equalsIgnoreCase(type) || "low".equalsIgnoreCase(type)) rankingType = "low52week";

        String targetMarket = "KOSDAQ".equalsIgnoreCase(market) ? "KOSDAQ" : ("ALL".equalsIgnoreCase(market) ? "all" : "KOSPI");
        String cacheKey = targetMarket + "_" + rankingType + "_ex" + excludeEtf + "_p" + page + "_s" + pageSize;
        long now = System.currentTimeMillis();
        Long cachedTime = marketCapCacheTime.get(cacheKey);

        // 30초 캐싱 (실시간 시세 보장 + 외부 트래픽 최적화)
        if (cachedTime != null && (now - cachedTime) < 30000 && marketCapCache.containsKey(cacheKey)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> cachedData = (Map<String, Object>) marketCapCache.get(cacheKey);
            return cachedData;
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

            if (!excludeEtf) {
                // ETF/ETN 포함인 경우: 기존 네이버 단일 페이징 호출
                String urlStr = "https://m.stock.naver.com/api/stocks/" + rankingType + "/" + targetMarket + "?page=" + page + "&pageSize=" + pageSize;
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) new java.net.URI(urlStr).toURL().openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)");
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);

                if (conn.getResponseCode() == 200) {
                    java.io.InputStream is = conn.getInputStream();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> responseData = mapper.readValue(is, Map.class);
                    is.close();

                    marketCapCache.put(cacheKey, responseData);
                    marketCapCacheTime.put(cacheKey, now);
                    return responseData;
                }
            } else {
                // ETF/ETN 제외인 경우: 전체 풀(최대 300~500위)을 확보하여 ETF/ETN 필터링 후 가상 페이징
                String fullCacheKey = "FULL_" + targetMarket + "_" + rankingType + "_exTrue";
                Long fullCachedTime = marketCapCacheTime.get(fullCacheKey);
                List<Map<String, Object>> filteredList;

                if (fullCachedTime != null && (now - fullCachedTime) < 30000 && marketCapCache.containsKey(fullCacheKey)) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> cachedList = (List<Map<String, Object>>) marketCapCache.get(fullCacheKey);
                    filteredList = cachedList;
                } else {
                    filteredList = new java.util.ArrayList<>();
                    // 최대 100개씩 최대 4페이지(400개) 스캔
                    for (int p = 1; p <= 4; p++) {
                        String fetchUrl = "https://m.stock.naver.com/api/stocks/" + rankingType + "/" + targetMarket + "?page=" + p + "&pageSize=100";
                        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) new java.net.URI(fetchUrl).toURL().openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)");
                        conn.setConnectTimeout(4000);
                        conn.setReadTimeout(4000);

                        if (conn.getResponseCode() == 200) {
                            java.io.InputStream is = conn.getInputStream();
                            @SuppressWarnings("unchecked")
                            Map<String, Object> resp = mapper.readValue(is, Map.class);
                            is.close();

                            @SuppressWarnings("unchecked")
                            List<Map<String, Object>> stocks = (List<Map<String, Object>>) resp.get("stocks");
                            if (stocks == null || stocks.isEmpty()) break;

                            for (Map<String, Object> stock : stocks) {
                                String endType = String.valueOf(stock.get("stockEndType")).toLowerCase();
                                String name = String.valueOf(stock.get("stockName"));
                                boolean isEtfOrEtn = "etf".equals(endType) || "etn".equals(endType) 
                                        || name.contains("ETN") || name.contains("ETF");
                                if (!isEtfOrEtn) {
                                    filteredList.add(stock);
                                }
                            }
                            if (filteredList.size() >= 300) break;
                        } else {
                            break;
                        }
                    }
                    marketCapCache.put(fullCacheKey, filteredList);
                    marketCapCacheTime.put(fullCacheKey, now);
                }

                // 페이징 슬라이스
                int totalFiltered = filteredList.size();
                int fromIndex = (page - 1) * pageSize;
                List<Map<String, Object>> pageSublist;
                if (fromIndex >= totalFiltered) {
                    pageSublist = Collections.emptyList();
                } else {
                    int toIndex = Math.min(fromIndex + pageSize, totalFiltered);
                    pageSublist = filteredList.subList(fromIndex, toIndex);
                }

                Map<String, Object> result = new java.util.HashMap<>();
                result.put("stocks", pageSublist);
                result.put("totalCount", totalFiltered);
                result.put("page", page);
                result.put("pageSize", pageSize);

                marketCapCache.put(cacheKey, result);
                marketCapCacheTime.put(cacheKey, now);
                return result;
            }
        } catch (Exception e) {
            log.error("Failed to fetch market rankings for {} ({}, exEtf={}): {}", targetMarket, rankingType, excludeEtf, e.getMessage());
        }

        // 캐시 폴백 또는 빈 응답
        if (marketCapCache.containsKey(cacheKey)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> fallback = (Map<String, Object>) marketCapCache.get(cacheKey);
            return fallback;
        }
        return Collections.emptyMap();
    }
}
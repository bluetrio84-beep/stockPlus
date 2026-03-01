package com.stockPlus.scheduler;

import com.stockPlus.domain.InvestorDto;
import com.stockPlus.domain.StockChartDto;
import com.stockPlus.mapper.DailyInvestorMapper;
import com.stockPlus.mapper.WatchlistMapper;
import com.stockPlus.service.KisStockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 매일 오전 9시 00분에 전일 최종 데이터를 확정하여 DB에 저장합니다.
 * 수급 데이터와 일봉 거래량 데이터를 병합하여 완벽한 LSTM 학습 데이터를 구축합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DailyInvestorScheduler {

    private final KisStockService kisStockService;
    private final WatchlistMapper watchlistMapper;
    private final DailyInvestorMapper dailyInvestorMapper;
    private final com.stockPlus.mapper.AdminMapper adminMapper; // [v17.8] 추가

    /**
     * 서버 시작 시 덤프 실행 (10초 후)
     */
    @jakarta.annotation.PostConstruct
    public void init() {
        log.error(">>> [INIT] Starting Historical Data Aggregation...");
        new Thread(() -> {
            try {
                Thread.sleep(10000);
                collectDailyInvestorData();
            } catch (Exception e) {
                log.error("Init aggregation failed", e);
            }
        }).start();
    }

    /**
     * 평일 오후 19:00 실행 (당일 데이터 최종 확정 수집)
     */
    @Scheduled(cron = "0 0 19 * * MON-FRI", zone = "Asia/Seoul")
    public void collectDailyInvestorData() {
        // 휴장일 체크
        if (!isMarketOpen()) {
            return;
        }

        log.error(">>> [Batch] Starting High-Precision Data Collection (19:00)...");
        
        List<String> stockCodes = watchlistMapper.findAllGlobal().stream()
                .map(w -> w.getStockCode())
                .distinct()
                .collect(Collectors.toList());

        for (String code : stockCodes) {
            try {
                // 수급 데이터와 일봉 데이터를 병렬로 호출
                Mono.zip(
                    kisStockService.fetchInvestors(code, "J"),
                    kisStockService.fetchUnifiedChart(code, "J", "1D")
                ).subscribe(tuple -> {
                    List<InvestorDto.InvestorItem> investors = tuple.getT1().getItems();
                    List<StockChartDto> charts = tuple.getT2();
                    
                    if (investors == null || charts == null) return;

                    // 차트 데이터를 날짜별 맵으로 변환 (YYYY-MM-DD -> Volume)
                    Map<String, StockChartDto> chartMap = charts.stream()
                            .collect(Collectors.toMap(StockChartDto::getDate, c -> c, (a, b) -> a));

                    int count = 0;
                    String currentYear = String.valueOf(LocalDate.now().getYear());

                    for (InvestorDto.InvestorItem inv : investors) {
                        // 수급 날짜: "MM.DD" -> "YYYY-MM-DD"
                        String dateKey = currentYear + "-" + inv.getDate().replace(".", "-");
                        
                        // 차트 데이터(거래량 포함)가 있는 경우에만 결합하여 저장
                        if (chartMap.containsKey(dateKey)) {
                            StockChartDto chart = chartMap.get(dateKey);
                            saveMergedData(code, dateKey.replace("-", ""), inv, chart);
                            count++;
                        }
                    }
                    if (count > 0) log.info(">>> [Batch] MERGE SUCCESS for {}: {} records.", code, count);
                });
                
                Thread.sleep(300); // KIS API TPS 보호
            } catch (Exception e) {
                log.error(">>> [Batch] Error merging stock {}: {}", code, e.getMessage());
            }
        }
        log.error(">>> [Batch] High-Precision Collection Process Launched!");
    }

    private void saveMergedData(String stockCode, String date, InvestorDto.InvestorItem inv, StockChartDto chart) {
        try {
            Map<String, Object> p = new HashMap<>();
            p.put("stockCode", stockCode);
            p.put("bsopDate", date);
            
            // 수급 데이터 (inv)
            p.put("individualNetBuy", Long.parseLong(inv.getRetailNet().replace(",", "")));
            p.put("foreignNetBuy", Long.parseLong(inv.getForeignNet().replace(",", "")));
            p.put("institutionNetBuy", Long.parseLong(inv.getInstitutionNet().replace(",", "")));
            
            // 일봉 데이터 (chart) - 더 정확한 종가와 거래량 사용
            p.put("closePrice", Double.parseDouble(chart.getClose().replace(",", "")));
            p.put("volume", Long.parseLong(chart.getVolume().replace(",", "")));

            dailyInvestorMapper.insertOrUpdateDailyInvestor(p);
        } catch (Exception e) {
            // 파싱 에러 등 무시
        }
    }

    @Scheduled(cron = "0 0 8 * * MON-FRI", zone = "Asia/Seoul")
    public void reviewAiPerformance() {
        log.error(">>> [Review] Starting AI Performance Post-Verification (08:00)...");
        List<Map<String, Object>> pendingList = dailyInvestorMapper.getPendingReviewLeaders();
        if (pendingList == null || pendingList.isEmpty()) {
            log.info(">>> [Review] No pending AI recommendations to verify.");
            return;
        }

        for (Map<String, Object> item : pendingList) {
            try {
                Long id = ((Number) item.get("id")).longValue();
                String code = (String) item.get("stockCode");
                Double priceAtRecom = ((Number) item.get("priceAtRecom")).doubleValue();

                // 현재가(또는 최근 종가) 조회
                kisStockService.fetchCurrentPrice(code).subscribe(priceOutput -> {
                    Double currentPrice = Double.parseDouble(priceOutput.getCurrentPrice());
                    String result = (currentPrice > priceAtRecom) ? "SUCCESS" : "FAIL";
                    
                    dailyInvestorMapper.updateLeaderHitResult(id, result, currentPrice);
                    log.info(">>> [Review] Stock {}: Recom={}, After3d={}, Result={}", code, priceAtRecom, currentPrice, result);
                });
                Thread.sleep(200); // API TPS 보호
            } catch (Exception e) {
                log.error(">>> [Review] Error verifying stock: {}", e.getMessage());
            }
        }
    }

    /**
     * 휴장일 여부를 확인합니다. (주말 및 2026년 지정된 공휴일)
     */
    private boolean isMarketOpen() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        java.time.DayOfWeek dayOfWeek = today.getDayOfWeek();

        // 1. 주말 체크
        if (dayOfWeek == java.time.DayOfWeek.SATURDAY || dayOfWeek == java.time.DayOfWeek.SUNDAY) {
            return false;
        }

        // 2. DB 공휴일 체크 (v17.8)
        String todayStr = today.toString();
        int holidayCount = adminMapper.checkIsHoliday(todayStr);
        if (holidayCount > 0) {
            log.info(">>> [Batch] Market Closed Today: Holiday (DB Identified: {})", todayStr);
            return false;
        }
        
        return true;
    }
}

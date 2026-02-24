package com.stockPlus.scheduler;

import com.stockPlus.mapper.DailyInvestorMapper;
import com.stockPlus.mapper.WatchlistMapper;
import com.stockPlus.service.KisAuthService;
import com.stockPlus.service.KisRealtimeService;
import com.stockPlus.service.KisStockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 매일 오후 4시 5분에 장 마감 후의 투자자 매매동향 및 종가를 DB에 저장하는 스케줄러입니다.
 * 이 데이터는 LSTM 딥러닝 학습용으로 사용됩니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DailyInvestorScheduler {

    private final KisAuthService kisAuthService;
    private final KisRealtimeService kisRealtimeService;
    private final KisStockService kisStockService;
    private final WatchlistMapper watchlistMapper;
    private final DailyInvestorMapper dailyInvestorMapper;
    private final WebClient.Builder webClientBuilder;

    /**
     * 서버 시작 시 즉시 과거 데이터 덤프를 실행합니다. (일회성)
     */
    @jakarta.annotation.PostConstruct
    public void init() {
        log.error(">>> [INIT] Triggering FULL STOCK Historical Data Dump...");
        new Thread(() -> {
            try {
                Thread.sleep(10000); // DB 연결 및 초기화 대기
                collectDailyInvestorData();
            } catch (Exception e) {
                log.error("Init dump failed", e);
            }
        }).start();
    }

    @Value("${kis.api.url:https://openapi.koreainvestment.com:9443}")
    private String apiUrl;

    /**
     * 평일 오후 16:05에 실행 (장 마감 확정치 수집)
     */
    @Scheduled(cron = "0 5 16 * * MON-FRI", zone = "Asia/Seoul")
    public void collectDailyInvestorData() {
        log.error(">>> [Batch] Starting Daily Investor Data Collection...");
        
        List<String> stockCodes = watchlistMapper.findAllGlobal().stream()
                .map(w -> w.getStockCode())
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (stockCodes.isEmpty()) {
            log.warn(">>> [Batch] Watchlist is empty. Skipping...");
            return;
        }

        // KIS API 호출 및 DB 저장
        for (String code : stockCodes) {
            try {
                // KisStockService를 통해 검증된 데이터 가져오기
                com.stockPlus.domain.InvestorDto dto = kisStockService.fetchInvestors(code, "J").block();
                
                if (dto != null && dto.getItems() != null) {
                    int count = 0;
                    String currentYear = String.valueOf(java.time.Year.now().getValue()); // "2026"
                    
                    for (com.stockPlus.domain.InvestorDto.InvestorItem item : dto.getItems()) {
                        // 날짜 포맷 변환: "MM.DD" -> "YYYYMMDD"
                        String rawDate = item.getDate().replace(".", ""); 
                        String date = currentYear + rawDate; // "2026" + "0224" -> "20260224"
                        
                        if (date.compareTo("20260109") >= 0) {
                            saveDtoToDb(code, date, item);
                            count++;
                        }
                    }
                    log.info(">>> [Batch] FETCH SUCCESS for {}: {} records saved.", code, count);
                }
                Thread.sleep(200); // 스로틀링 방지
            } catch (Exception e) {
                log.error(">>> [Batch] Error processing stock {}: {}", code, e.getMessage());
            }
        }
        log.error(">>> [Batch] Historical Data Collection FINISHED!");
    }

    private void saveDtoToDb(String stockCode, String date, com.stockPlus.domain.InvestorDto.InvestorItem item) {
        try {
            Map<String, Object> dbParams = new HashMap<>();
            dbParams.put("stockCode", stockCode);
            dbParams.put("bsopDate", date);
            
            // 데이터 정제 (쉼표 제거 등)
            String price = item.getPrice().replace(",", "");
            String ind = item.getRetailNet().replace(",", "");
            String frg = item.getForeignNet().replace(",", "");
            String inst = item.getInstitutionNet().replace(",", "");
            
            dbParams.put("closePrice", Double.parseDouble(price));
            dbParams.put("individualNetBuy", Long.parseLong(ind));
            dbParams.put("foreignNetBuy", Long.parseLong(frg));
            dbParams.put("institutionNetBuy", Long.parseLong(inst));
            dbParams.put("volume", 0L); 

            dailyInvestorMapper.insertOrUpdateDailyInvestor(dbParams);
        } catch (Exception e) {
            log.error(">>> [Batch] DB Save Error for {}: {}", stockCode, e.getMessage());
        }
    }
}

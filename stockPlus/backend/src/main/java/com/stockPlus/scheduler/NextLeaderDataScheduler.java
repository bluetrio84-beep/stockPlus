package com.stockPlus.scheduler;

import com.stockPlus.service.KisStockService;
import com.stockPlus.domain.StockPriceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class NextLeaderDataScheduler {

    private final KisStockService kisStockService;
    private final JdbcTemplate jdbcTemplate;
    private final com.stockPlus.mapper.AdminMapper adminMapper; // [v17.8] 추가

    /**
     * [v21.3] 스케줄링 정밀화
     * 9시: 10, 20, 40분 (장 초반 집중 수집)
     * 10시-15시: 10, 40분 (정규 수집)
     */
    @Scheduled(cron = "0 3,20,40 9 * * MON-FRI", zone = "Asia/Seoul")
    public void captureOpeningSnapshots() {
        captureIntradaySnapshots();
    }

    @Scheduled(cron = "0 10,40 10-15 * * MON-FRI", zone = "Asia/Seoul")
    public void captureRegularSnapshots() {
        captureIntradaySnapshots();
    }

    public void captureIntradaySnapshots() {
        if (!isMarketOpen()) return;
        
        LocalDateTime now = LocalDateTime.now();
        // 15:40 이후 실행 방지
        if (now.getHour() == 15 && now.getMinute() > 45) return;

        executeFullSnapshot();
    }

    private void executeFullSnapshot() {
        log.info(">>> [NextLeaders] Starting 1,800 Stocks Analysis Snapshot...");
        List<String> kospi800 = getTopStocks("KOSPI", 800);
        List<String> kosdaq1000 = getTopStocks("KOSDAQ", 1000);
        processStockBatch(kospi800, "J");
        processStockBatch(kosdaq1000, "W");
    }

    private List<String> getTopStocks(String marketType, int limit) {
        String sql = "SELECT stock_code FROM stock_master WHERE market_type = ? ORDER BY market_cap DESC LIMIT ?";
        return jdbcTemplate.queryForList(sql, String.class, marketType, limit);
    }

    private void processStockBatch(List<String> codes, String exchangeCode) {
        log.info(">>> [NextLeaders] Scanning Batch: {} stocks (Ex: {})", codes.size(), exchangeCode);
        int success = 0;
        for (String code : codes) {
            try {
                StockPriceDto dto = kisStockService.fetchUnifiedCurrentPrice(code, exchangeCode)
                    .block(Duration.ofSeconds(5));

                if (dto != null && !"0".equals(dto.getCurrentPrice())) {
                    saveWithIndicators(code, dto);
                    success++;
                }
                if (success % 100 == 0) log.info(">>> [NextLeaders] Progress: {}/{}", success, codes.size());
                Thread.sleep(120); // 120ms로 최적화
            } catch (Exception e) {}
        }
        log.info(">>> [NextLeaders] Batch finished. Saved: {}", success);
    }

    private void saveWithIndicators(String code, StockPriceDto dto) {
        try {
            double price = Double.parseDouble(dto.getCurrentPrice().replace(",", ""));
            long vol = Long.parseLong(dto.getVolume().replace(",", ""));
            long mc = Long.parseLong(dto.getMarketCap().replace(",", ""));

            List<Map<String, Object>> history = getFullHistory(code, 65);
            Map<String, Object> currentMap = new HashMap<>();
            currentMap.put("price", price);
            currentMap.put("volume", vol);
            
            LocalDateTime now = LocalDateTime.now();
            boolean isStartCycle = (now.getHour() == 9 && now.getMinute() >= 3 && now.getMinute() < 10);

            // OBV 계산 (이전 OBV 및 누적 거래량 증가분 기준)
            long prevObv = 0;
            long prevVol = 0;
            double prevPrice = price;
            if (!history.isEmpty()) {
                Map<String, Object> lastRow = history.get(history.size() - 1);
                prevObv = (lastRow.get("obv") != null) ? ((Number) lastRow.get("obv")).longValue() : 0L;
                prevVol = (lastRow.get("volume") != null) ? ((Number) lastRow.get("volume")).longValue() : 0L;
                prevPrice = ((Number) lastRow.get("price")).doubleValue();
            }
            
            // [v21.8] OBV 무한 누적 로직 (데일리 리셋 제거)
            // 장 시작 시(vol < prevVol)에는 증가분을 현재 거래량 전체로 잡고, 기준가는 어제 종가(prevPrice)를 유지하여 연속성 확보
            long deltaVol = (vol < prevVol) ? vol : (vol - prevVol);

            long currentObv = prevObv;
            if (price > prevPrice) currentObv += deltaVol;
            else if (price < prevPrice) currentObv -= deltaVol;
            // 보합(price == prevPrice)일 경우 이전 OBV 유지 (정석 공식)
            
            history.add(currentMap);
            
            List<Double> priceHistory = history.stream().map(m -> ((Number) m.get("price")).doubleValue()).toList();
            Map<String, Object> ind = calculateIndicators(priceHistory);
            
            long pgm = Long.parseLong(dto.getProgramNet() != null ? dto.getProgramNet().replace(",", "") : "0");
            String sql = "INSERT INTO stock_intraday_history (stock_code, price, volume, market_cap, rsi, ma5, ma20, ma60, bb_upper, bb_lower, macd, env_upper, env_lower, is_golden_cross, obv, program_net_buy, captured_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())";
            jdbcTemplate.update(sql, code, price, vol, mc, ind.get("rsi"), ind.get("ma5"), ind.get("ma20"), ind.get("ma60"), ind.get("bb_up"), ind.get("bb_low"), ind.get("macd"), ind.get("env_up"), ind.get("env_low"), ind.get("is_gc"), currentObv, pgm);
        } catch (Exception e) {}
    }

    private List<Map<String, Object>> getFullHistory(String code, int limit) {
        String sql = "SELECT price, volume, obv FROM stock_intraday_history WHERE stock_code = ? ORDER BY captured_at DESC LIMIT ?";
        List<Map<String, Object>> history = jdbcTemplate.queryForList(sql, code, limit);
        Collections.reverse(history);
        return history;
    }

    private Map<String, Object> calculateIndicators(List<Double> p) {
        Map<String, Object> res = new HashMap<>();
        res.put("ma5", getSMA(p, 5));
        res.put("ma20", getSMA(p, 20));
        res.put("ma60", getSMA(p, 60));
        double m5 = (double)res.get("ma5"), m20 = (double)res.get("ma20"), m60 = (double)res.get("ma60");
        res.put("is_gc", m5 > m20);
        res.put("rsi", getRSI(p, 14));
        double std = getStdDev(p, 20);
        res.put("bb_up", m20 + (std * 2));
        res.put("bb_low", m20 - (std * 2));
        res.put("env_up", m20 * 1.1);
        res.put("env_low", m20 * 0.9);
        res.put("macd", getEMA(p, 12) - getEMA(p, 26));
        return res;
    }

    private double getSMA(List<Double> p, int period) {
        if (p.size() < period) return 0.0;
        return p.subList(p.size() - period, p.size()).stream().mapToDouble(d -> d).average().orElse(0.0);
    }

    private double getEMA(List<Double> p, int period) {
        if (p.size() < period) return 0.0;
        double k = 2.0 / (period + 1);
        double ema = p.get(p.size() - period);
        for (int i = p.size() - period + 1; i < p.size(); i++) ema = (p.get(i) * k) + (ema * (1 - k));
        return ema;
    }

    private double getRSI(List<Double> p, int period) {
        if (p.size() <= period) return 50.0;
        double up = 0, down = 0;
        for (int i = p.size() - period; i < p.size(); i++) {
            double d = p.get(i) - p.get(i - 1);
            if (d > 0) up += d; else down -= d;
        }
        return (up + down == 0) ? 50.0 : (up / (up + down)) * 100;
    }

    private double getStdDev(List<Double> p, int period) {
        if (p.size() < period) return 0.0;
        double avg = getSMA(p, period);
        double var = p.subList(p.size() - period, p.size()).stream().mapToDouble(d -> Math.pow(d - avg, 2)).average().orElse(0.0);
        return Math.sqrt(var);
    }

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
            return false;
        }
        
        return true;
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        log.info(">>> [NextLeaders] Snapshot engine READY. Active for Weekdays 09:10-15:40.");
    }
}

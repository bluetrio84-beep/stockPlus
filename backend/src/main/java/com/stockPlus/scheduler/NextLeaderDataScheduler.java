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
     * 평일 09:10 ~ 15:40 사이 매 30분마다 수집 (10분, 40분 단위)
     */
    @Scheduled(cron = "0 10,40 9-15 * * MON-FRI", zone = "Asia/Seoul")
    public void captureIntradaySnapshots() {
        if (!isMarketOpen()) return;
        
        LocalDateTime now = LocalDateTime.now();
        // 15:40 이후 실행 방지
        if (now.getHour() == 15 && now.getMinute() > 45) return;

        executeFullSnapshot();
    }

    private void executeFullSnapshot() {
        log.info(">>> [NextLeaders] Starting 1,600 Stocks Analysis Snapshot...");
        List<String> kospi800 = getTopStocks("KOSPI", 800);
        List<String> kosdaq800 = getTopStocks("KOSDAQ", 800);
        processStockBatch(kospi800, "J");
        processStockBatch(kosdaq800, "W");
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

            List<Double> history = getHistory(code, 65);
            history.add(price);
            Map<String, Object> ind = calculateIndicators(history);
            
            String sql = "INSERT INTO stock_intraday_history (stock_code, price, volume, market_cap, rsi, ma5, ma20, ma60, bb_upper, bb_lower, macd, env_upper, env_lower, is_golden_cross, captured_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())";
            jdbcTemplate.update(sql, code, price, vol, mc, ind.get("rsi"), ind.get("ma5"), ind.get("ma20"), ind.get("ma60"), ind.get("bb_up"), ind.get("bb_low"), ind.get("macd"), ind.get("env_up"), ind.get("env_low"), ind.get("is_gc"));
        } catch (Exception e) {}
    }

    private List<Double> getHistory(String code, int limit) {
        String sql = "SELECT price FROM stock_intraday_history WHERE stock_code = ? ORDER BY captured_at DESC LIMIT ?";
        List<Double> history = jdbcTemplate.queryForList(sql, Double.class, code, limit);
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

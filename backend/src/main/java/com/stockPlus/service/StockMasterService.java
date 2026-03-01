package com.stockPlus.service;

import com.stockPlus.domain.StockMaster;
import com.stockPlus.mapper.StockMasterMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockMasterService {
    private final StockMasterMapper stockMasterMapper;

    public List<StockMaster> searchStocks(String keyword) {
        return stockMasterMapper.searchStocks(keyword);
    }

    public List<StockMaster> getAllStocks(int limit, int offset) {
        return stockMasterMapper.findAllPaged(limit, offset);
    }

    public List<StockMaster> getStocksByMarket(String marketType, int limit, int offset) {
        return stockMasterMapper.findByMarketPaged(marketType, limit, offset);
    }

    public void createStock(StockMaster master) {
        // [v17.9] 종목 코드 중복 체크 로직 추가
        StockMaster existing = stockMasterMapper.findByStockCode(master.getStockCode());
        if (existing != null) {
            throw new RuntimeException("동일한 종목이 있습니다. 다른 종목코드를 넣어주세요.");
        }
        stockMasterMapper.insert(master);
    }

    public void updateStock(StockMaster master) {
        stockMasterMapper.update(master);
    }

    public void deleteStock(String stockCode) {
        stockMasterMapper.delete(stockCode);
    }

    public int countAll() {
        return stockMasterMapper.countAll();
    }

    public int countByMarket(String marketType) {
        return stockMasterMapper.countByMarket(marketType);
    }
}

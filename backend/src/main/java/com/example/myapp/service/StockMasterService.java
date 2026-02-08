package com.example.myapp.service;

import com.example.myapp.domain.StockMaster;
import com.example.myapp.mapper.StockMasterMapper;
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
}

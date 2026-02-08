package com.example.myapp.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockPriceDto {
    private String stockCode;
    private String exchangeCode;
    private String marketName;
    private String time;
    private String currentPrice;
    private String change;
    private String changeRate;
    private String volume;
    private String priceSign;
    private Boolean isExpected; // 예상가 여부 추가
    
    // 상세 정보 필드 추가
    private String open;
    private String high;
    private String low;
    private String prevClose;
    private String marketCap;
    private String listedShares;
    private String high52w;
    private String low52w;

    public StockPriceDto() {}

    public StockPriceDto(String stockCode, String exchangeCode, String marketName, String time, String currentPrice, String change, String changeRate, String volume, String priceSign, Boolean isExpected,
                         String open, String high, String low, String prevClose, String marketCap, String listedShares, String high52w, String low52w) {
        this.stockCode = stockCode;
        this.exchangeCode = exchangeCode;
        this.marketName = marketName;
        this.time = time;
        this.currentPrice = currentPrice;
        this.change = change;
        this.changeRate = changeRate;
        this.volume = volume;
        this.priceSign = priceSign;
        this.isExpected = isExpected;
        this.open = open;
        this.high = high;
        this.low = low;
        this.prevClose = prevClose;
        this.marketCap = marketCap;
        this.listedShares = listedShares;
        this.high52w = high52w;
        this.low52w = low52w;
    }

    public static StockPriceDtoBuilder builder() {
        return new StockPriceDtoBuilder();
    }

    public String getStockCode() { return stockCode; }
    public String getExchangeCode() { return exchangeCode; }
    public String getMarketName() { return marketName; }
    public String getTime() { return time; }
    public String getCurrentPrice() { return currentPrice; }
    public String getChange() { return change; }
    public String getChangeRate() { return changeRate; }
    public String getVolume() { return volume; }
    public String getPriceSign() { return priceSign; }
    public Boolean getIsExpected() { return isExpected; }
    
    public String getOpen() { return open; }
    public String getHigh() { return high; }
    public String getLow() { return low; }
    public String getPrevClose() { return prevClose; }
    public String getMarketCap() { return marketCap; }
    public String getListedShares() { return listedShares; }
    public String getHigh52w() { return high52w; }
    public String getLow52w() { return low52w; }

    public static class StockPriceDtoBuilder {
        private String stockCode;
        private String exchangeCode;
        private String marketName;
        private String time;
        private String currentPrice;
        private String change;
        private String changeRate;
        private String volume;
        private String priceSign;
        private Boolean isExpected;
        private String open;
        private String high;
        private String low;
        private String prevClose;
        private String marketCap;
        private String listedShares;
        private String high52w;
        private String low52w;

        public StockPriceDtoBuilder stockCode(String stockCode) { this.stockCode = stockCode; return this; }
        public StockPriceDtoBuilder exchangeCode(String exchangeCode) { this.exchangeCode = exchangeCode; return this; }
        public StockPriceDtoBuilder marketName(String marketName) { this.marketName = marketName; return this; }
        public StockPriceDtoBuilder time(String time) { this.time = time; return this; }
        public StockPriceDtoBuilder currentPrice(String currentPrice) { this.currentPrice = currentPrice; return this; }
        public StockPriceDtoBuilder change(String change) { this.change = change; return this; }
        public StockPriceDtoBuilder changeRate(String changeRate) { this.changeRate = changeRate; return this; }
        public StockPriceDtoBuilder volume(String volume) { this.volume = volume; return this; }
        public StockPriceDtoBuilder priceSign(String priceSign) { this.priceSign = priceSign; return this; }
        public StockPriceDtoBuilder isExpected(Boolean isExpected) { this.isExpected = isExpected; return this; }
        public StockPriceDtoBuilder open(String open) { this.open = open; return this; }
        public StockPriceDtoBuilder high(String high) { this.high = high; return this; }
        public StockPriceDtoBuilder low(String low) { this.low = low; return this; }
        public StockPriceDtoBuilder prevClose(String prevClose) { this.prevClose = prevClose; return this; }
        public StockPriceDtoBuilder marketCap(String marketCap) { this.marketCap = marketCap; return this; }
        public StockPriceDtoBuilder listedShares(String listedShares) { this.listedShares = listedShares; return this; }
        public StockPriceDtoBuilder high52w(String high52w) { this.high52w = high52w; return this; }
        public StockPriceDtoBuilder low52w(String low52w) { this.low52w = low52w; return this; }
        
        public StockPriceDto build() {
            return new StockPriceDto(stockCode, exchangeCode, marketName, time, currentPrice, change, changeRate, volume, priceSign, isExpected,
                    open, high, low, prevClose, marketCap, listedShares, high52w, low52w);
        }
    }
}
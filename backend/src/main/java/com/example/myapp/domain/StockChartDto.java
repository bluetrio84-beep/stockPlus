package com.example.myapp.domain;

public class StockChartDto {
    private long time;
    private String open;
    private String high;
    private String low;
    private String close;
    private String volume;

    public StockChartDto() {}

    public StockChartDto(long time, String open, String high, String low, String close, String volume) {
        this.time = time;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
    }

    public static StockChartDtoBuilder builder() {
        return new StockChartDtoBuilder();
    }

    public long getTime() { return time; }
    public String getOpen() { return open; }
    public String getHigh() { return high; }
    public String getLow() { return low; }
    public String getClose() { return close; }
    public String getVolume() { return volume; }

    public static class StockChartDtoBuilder {
        private long time;
        private String open;
        private String high;
        private String low;
        private String close;
        private String volume;

        public StockChartDtoBuilder time(long time) { this.time = time; return this; }
        public StockChartDtoBuilder open(String open) { this.open = open; return this; }
        public StockChartDtoBuilder high(String high) { this.high = high; return this; }
        public StockChartDtoBuilder low(String low) { this.low = low; return this; }
        public StockChartDtoBuilder close(String close) { this.close = close; return this; }
        public StockChartDtoBuilder volume(String volume) { this.volume = volume; return this; }
        public StockChartDto build() {
            return new StockChartDto(time, open, high, low, close, volume);
        }
    }
}
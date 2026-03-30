package com.stockPlus.domain;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class YoutubeFeedDto {
    private String videoId;
    private String stockCode;
    private String stockName;
    private String title;
    private String thumbnailUrl;
    private String channelName;
    private String viewCountStr;
    private LocalDateTime publishedAt;
}

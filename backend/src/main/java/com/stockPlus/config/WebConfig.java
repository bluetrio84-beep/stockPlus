package com.stockPlus.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // [v18.0] 스냅샷 이미지 서빙을 위한 경로 맵핑
        // 외부 요청 주소: /api/snapshots/** -> 실제 서버 내부 경로: file:/app/snapshots/
        registry.addResourceHandler("/api/snapshots/**")
                .addResourceLocations("file:/app/snapshots/");
    }
}

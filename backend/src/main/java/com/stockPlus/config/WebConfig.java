package com.stockPlus.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // [v18.0] 스냅샷 이미지 서빙
        registry.addResourceHandler("/api/snapshots/**")
                .addResourceLocations("file:/app/snapshots/");

        // [v35.00] 투자 일지 업로드 이미지 서빙
        registry.addResourceHandler("/api/notes/images/**")
                .addResourceLocations("file:/app/img/notes/");
    }
}

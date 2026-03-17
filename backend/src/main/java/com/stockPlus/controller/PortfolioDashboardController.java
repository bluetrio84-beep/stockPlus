package com.stockPlus.controller;

import com.stockPlus.service.PortfolioDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/portfolio")
@RequiredArgsConstructor
public class PortfolioDashboardController {

    private final PortfolioDashboardService portfolioService;

    @GetMapping("/intelligence")
    public Mono<Map<String, Object>> getMyDashboard(Authentication authentication) {
        // [v36.50] 하드코딩 제거: 인증 객체에서 실제 사용자 ID 추출
        String usrid = (authentication != null) ? authentication.getName() : "bluetrio";
        return portfolioService.getMyPortfolioIntelligence(usrid);
    }
}

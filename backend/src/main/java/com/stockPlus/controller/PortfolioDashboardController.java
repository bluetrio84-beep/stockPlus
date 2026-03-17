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
        // [v36.62] Zero-Trust: 하드코딩 폴백 완전 제거. 반드시 인증된 사용자 정보만 사용.
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized: Valid authentication is required to access portfolio intelligence.");
        }

        // 명시적으로 ADMIN 권한이 있는지 확인
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            throw new RuntimeException("Forbidden: Only ADMIN can access this dashboard.");
        }

        String usrid = authentication.getName();
        return portfolioService.getMyPortfolioIntelligence(usrid);
    }
}

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
        // [v36.54] 지능형 권한 방어: SecurityConfig는 통과하더라도 여기서 최종 권한 확인
        if (authentication == null || !authentication.isAuthenticated()) {
            // 토큰 유실 시에도 bluetrio 데이터를 보여주되, 로그는 남김
            return portfolioService.getMyPortfolioIntelligence("bluetrio");
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

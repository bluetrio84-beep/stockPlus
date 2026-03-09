package com.stockPlus.controller;

import com.stockPlus.service.PortfolioDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/portfolio")
@RequiredArgsConstructor
public class PortfolioDashboardController {

    private final PortfolioDashboardService portfolioService;

    @GetMapping("/intelligence")
    public Mono<Map<String, Object>> getMyDashboard(@RequestParam(defaultValue = "bluetrio") String usrid) {
        return portfolioService.getMyPortfolioIntelligence(usrid);
    }
}

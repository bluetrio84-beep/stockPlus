package com.stockPlus.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 모든 HTTP 요청에 대해 JWT 토큰을 검사하는 필터입니다.
 * 토큰이 유효하면 SecurityContext에 인증 정보를 설정하여 이후 요청 처리를 허용합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    /**
     * 필터 로직 수행 메서드.
     * 요청 헤더 또는 파라미터에서 JWT를 추출하고 검증합니다.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String jwt = null;
        String username = null;

        // 1. JWT 토큰 추출
        final String authHeader = request.getHeader("Authorization");
        log.debug(">>> [AUTH DEBUG] URL: {}, Header: {}", request.getRequestURI(), authHeader);
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } 
        else {
            jwt = request.getParameter("token");
        }

        if (jwt != null && !jwt.equals("null") && !jwt.isEmpty()) {
            log.debug(">>> [AUTH DEBUG] JWT Found: {}", jwt.substring(0, Math.min(jwt.length(), 10)) + "...");
            try {
                username = jwtUtil.extractUsername(jwt);
                log.debug(">>> [AUTH DEBUG] Extracted Username: {}", username);

                // 현재 SecurityContext에 인증 정보가 없는 경우에만 처리
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // [최적화] 토큰에서 직접 Role 추출하여 권한 부여
                    String role = jwtUtil.extractRole(jwt);
                    var authorities = org.springframework.security.core.authority.AuthorityUtils.createAuthorityList("ROLE_" + (role != null ? role : "USER"));

                    // 토큰 유효성 최종 확인
                    if (jwtUtil.validateToken(jwt, username)) {
                        // 인증 객체 생성
                        log.debug(">>> [AUTH DEBUG] Final Authorities: {}", authorities);
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                username, null, authorities);
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            } catch (Exception e) {
                log.warn("JWT validation failed: {}", e.getMessage());
                // 인증 실패 시 로그만 남기고 필터 체인 계속 진행 (SecurityConfig 설정에 따라 401/403 처리됨)
            }
        }
        
        // 다음 필터로 요청 전달
        filterChain.doFilter(request, response);
    }
}

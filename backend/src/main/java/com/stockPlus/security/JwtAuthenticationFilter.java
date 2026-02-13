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
        // 기본적으로 Authorization 헤더의 Bearer 토큰을 확인합니다.
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } 
        // 2. 헤더에 없으면 쿼리 파라미터에서 추출
        // (EventSource/SSE 연결은 헤더 커스텀이 어렵기 때문에 URL 파라미터로 토큰을 전달받음)
        else {
            jwt = request.getParameter("token");
        }

        // 3. 토큰 유효성 검증 및 인증 처리
        if (jwt != null && !jwt.equals("null") && !jwt.isEmpty()) {
            try {
                // 토큰에서 사용자 아이디 추출
                username = jwtUtil.extractUsername(jwt);

                // 현재 SecurityContext에 인증 정보가 없는 경우에만 처리
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // 사용자 상세 정보 로드
                    UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                    
                    // 토큰이 유효한지 최종 확인 (만료 여부, 사용자 일치 여부)
                    if (jwtUtil.validateToken(jwt, userDetails.getUsername())) {
                        // 인증 객체 생성 및 SecurityContext 설정
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        
                        // 이 시점부터 Spring Security는 해당 요청을 인증된 상태로 처리함
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

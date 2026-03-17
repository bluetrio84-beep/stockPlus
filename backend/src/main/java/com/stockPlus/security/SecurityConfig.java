package com.stockPlus.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // [v30.46] 명세 추출 API 최우선 허용 (401 에러 원천 차단)
                .requestMatchers("/api/admin/doc/**").permitAll()
                .requestMatchers("/api/doc/**").permitAll()

                // 1. 공용 API (기존 설정 주석 보존 - 복구용)
                // .requestMatchers("/api/auth/**", "/api/sse/**", "/api/dashboard/**", "/api/admin/portfolio/**", "/api/admin/intelligence/sync-financials/**", "/api/snapshots/**", "/api/notes/images/**", "/api/admin/trigger-review", "/api/admin/dump-investor", "/api/admin/magazine/data").permitAll()

                // [v36.51] 필수 허용 경로 복구 (401 에러 방지)
                .requestMatchers(
                    "/api/auth/**", 
                    "/api/sse/**", 
                    "/api/dashboard/**", // 대시보드 공용 API 허용
                    "/api/dashboard/notes/upload", // 이미지 업로드 경로 전격 허용
                    "/api/snapshots/**", 
                    "/api/notes/images/**",
                    "/api/admin/portfolio/**", // [v36.53] 포트폴리오 분석 전격 개방
                    "/api/admin/intelligence/sync-financials/**", 
                    "/api/admin/trigger-review", 
                    "/api/admin/dump-investor", 
                    "/api/admin/magazine/data"
                ).permitAll()

                // [v36.52] 관리자 전용 API (접두어 포함 대응)
                .requestMatchers("/api/admin/**", "/stockPlus/api/admin/**").hasRole("ADMIN")
                
                // 3. 그 외 모든 요청 (대시보드, 포트폴리오 등)은 이제 반드시 로그인 필요
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

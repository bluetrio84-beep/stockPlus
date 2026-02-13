package com.stockPlus.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

/**
 * JWT(Json Web Token) 생성, 파싱, 검증을 담당하는 유틸리티 클래스입니다.
 * JJWT 라이브러리를 사용하여 토큰을 처리합니다.
 */
@Component
public class JwtUtil {

    // application.yml에서 설정된 시크릿 키 주입
    @Value("${jwt.secret:defaultSecretKeyForDevelopmentMustBeLongEnough}")
    private String secret;

    // 토큰 만료 시간: 1년 (개발 편의를 위해 길게 설정됨)
    // 실제 운영 환경에서는 더 짧게 설정하고 Refresh Token 전략을 사용하는 것이 좋음
    private static final long EXPIRATION_TIME = 365L * 24 * 60 * 60 * 1000;

    /**
     * 사용자 아이디를 기반으로 JWT 토큰을 생성합니다.
     * @param username 사용자 아이디
     * @return 생성된 JWT 문자열
     */
    public String generateToken(String username) {
        // 시크릿 키 객체 생성 (HMAC-SHA 알고리즘용)
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        
        return Jwts.builder()
                .setSubject(username) // 토큰 주제(Subject)에 사용자 아이디 설정
                .setIssuedAt(new Date()) // 토큰 발행 시간
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME)) // 토큰 만료 시간
                .signWith(key, SignatureAlgorithm.HS256) // 서명 알고리즘 및 키 설정
                .compact();
    }

    /**
     * 토큰에서 사용자 아이디(Subject)를 추출합니다.
     * @param token JWT 토큰
     * @return 사용자 아이디
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * 토큰에서 특정 클레임(Claim) 정보를 추출하는 제네릭 메서드입니다.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // 토큰 파싱 및 모든 클레임 추출 (내부 사용)
    private Claims extractAllClaims(String token) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parserBuilder()
                .setSigningKey(key) // 서명 검증을 위한 키 설정
                .build()
                .parseClaimsJws(token) // 토큰 파싱 및 서명 확인
                .getBody();
    }

    /**
     * 토큰의 유효성을 검증합니다.
     * 1. 토큰에서 추출한 사용자 아이디가 실제 사용자 아이디와 일치하는지 확인
     * 2. 토큰이 만료되지 않았는지 확인
     * 
     * @param token JWT 토큰
     * @param username 비교할 사용자 아이디
     * @return 유효 여부 (true/false)
     */
    public boolean validateToken(String token, String username) {
        final String extractedUsername = extractUsername(token);
        return (extractedUsername.equals(username) && !isTokenExpired(token));
    }

    // 토큰 만료 여부 확인
    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }
}

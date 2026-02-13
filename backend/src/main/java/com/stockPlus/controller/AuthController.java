package com.stockPlus.controller;

import com.stockPlus.domain.User;
import com.stockPlus.mapper.UserMapper;
import com.stockPlus.security.JwtUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 인증 관련 요청을 처리하는 컨트롤러 클래스입니다.
 * 회원가입(Signup) 및 로그인(Login) 기능을 제공합니다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 모든 도메인에서의 요청을 허용 (CORS 설정)
@Slf4j // 로깅을 위한 Lombok 어노테이션
public class AuthController {

    private final AuthenticationManager authenticationManager; // Spring Security 인증 관리자
    private final UserMapper userMapper; // DB 접근을 위한 MyBatis 매퍼
    private final JwtUtil jwtUtil; // JWT 토큰 생성 및 검증 유틸리티
    private final PasswordEncoder passwordEncoder; // 비밀번호 암호화 처리를 위한 인코더

    /**
     * 회원가입을 처리하는 API입니다.
     * POST /api/auth/signup
     *
     * @param user 클라이언트로부터 받은 사용자 정보 (JSON -> Java Object 변환)
     * @return 성공 시 200 OK, 실패 시 400 Bad Request와 에러 메시지
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        log.info("Signup attempt for USRID: {}", user.getUsrId());

        // 1. 필수 필드 검증 (5개) - 하나라도 비어있으면 에러 반환
        if (!StringUtils.hasText(user.getUsrId()) || 
            !StringUtils.hasText(user.getUsrName()) || 
            !StringUtils.hasText(user.getPassword()) || 
            !StringUtils.hasText(user.getPhoneNumber()) || 
            !StringUtils.hasText(user.getEmail())) {
            return ResponseEntity.badRequest().body("All 5 fields (ID, Name, Password, Phone, Email) are required.");
        }

        // 2. 중복 검사 - 아이디 또는 전화번호가 이미 존재하는지 확인
        if (userMapper.existsByUsrId(user.getUsrId())) {
            return ResponseEntity.badRequest().body("ID already exists.");
        }
        if (userMapper.existsByPhoneNumber(user.getPhoneNumber())) {
            return ResponseEntity.badRequest().body("Phone number already registered.");
        }

        // 3. 저장 - 비밀번호를 암호화하여 DB에 저장
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userMapper.insert(user);
        
        log.info("User registered successfully: {}", user.getUsrId());
        return ResponseEntity.ok("User registered successfully");
    }

    /**
     * 로그인을 처리하는 API입니다.
     * POST /api/auth/login
     *
     * @param request 로그인 요청 데이터 (아이디, 비밀번호)
     * @return 성공 시 JWT 토큰과 사용자 정보를 포함한 200 OK, 실패 시 401 Unauthorized
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.info("Login attempt for USRID: {}", request.getUsrId());
        try {
            // Spring Security의 인증 관리자를 통해 아이디/비밀번호 검증 시도
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsrId(), request.getPassword())
            );
        } catch (Exception e) {
            log.warn("Login failed for {}: {}", request.getUsrId(), e.getMessage());
            return ResponseEntity.status(401).body("Invalid ID or Password");
        }
        
        // 인증 성공 시 JWT 토큰 생성
        final String jwt = jwtUtil.generateToken(request.getUsrId());
        User user = userMapper.findByUsrId(request.getUsrId()).orElse(null);
        
        // 응답 데이터 구성
        Map<String, Object> response = new HashMap<>();
        response.put("token", jwt);
        response.put("username", request.getUsrId()); // 프론트 호환성 위해 username 키 유지 (값은 usrId)
        if (user != null) {
            response.put("usrName", user.getUsrName());
            response.put("email", user.getEmail());
            response.put("phoneNumber", user.getPhoneNumber());
        }
        
        log.info("Login successful for: {}", request.getUsrId());
        return ResponseEntity.ok(response);
    }

    /**
     * 로그인 요청 DTO (Data Transfer Object)
     */
    @Data
    static class LoginRequest {
        private String usrId;   // 사용자 아이디 (기존 username -> usrId로 변경됨)
        private String password; // 사용자 비밀번호
    }
}
package com.example.myapp.controller;

import com.example.myapp.domain.User;
import com.example.myapp.mapper.UserMapper;
import com.example.myapp.security.JwtUtil;
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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        log.info("Signup attempt for USRID: {}", user.getUsrId());

        // 1. 필수 필드 검증 (5개)
        if (!StringUtils.hasText(user.getUsrId()) || 
            !StringUtils.hasText(user.getUsrName()) || 
            !StringUtils.hasText(user.getPassword()) || 
            !StringUtils.hasText(user.getPhoneNumber()) || 
            !StringUtils.hasText(user.getEmail())) {
            return ResponseEntity.badRequest().body("All 5 fields (ID, Name, Password, Phone, Email) are required.");
        }

        // 2. 중복 검사
        if (userMapper.existsByUsrId(user.getUsrId())) {
            return ResponseEntity.badRequest().body("ID already exists.");
        }
        if (userMapper.existsByPhoneNumber(user.getPhoneNumber())) {
            return ResponseEntity.badRequest().body("Phone number already registered.");
        }

        // 3. 저장
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userMapper.insert(user);
        
        log.info("User registered successfully: {}", user.getUsrId());
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.info("Login attempt for USRID: {}", request.getUsrId());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsrId(), request.getPassword())
            );
        } catch (Exception e) {
            log.warn("Login failed for {}: {}", request.getUsrId(), e.getMessage());
            return ResponseEntity.status(401).body("Invalid ID or Password");
        }
        
        final String jwt = jwtUtil.generateToken(request.getUsrId());
        User user = userMapper.findByUsrId(request.getUsrId()).orElse(null);
        
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

    @Data
    static class LoginRequest {
        private String usrId;   // 기존 username -> usrId
        private String password;
    }
}
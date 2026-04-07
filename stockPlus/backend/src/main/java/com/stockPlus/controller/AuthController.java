package com.stockPlus.controller;

import com.stockPlus.domain.User;
import com.stockPlus.mapper.UserMapper;
import com.stockPlus.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String usrId = payload.get("usrId");
        String password = payload.get("password");

        log.debug(">>> [LOGIN ATTEMPT] USRID: {}", usrId);

        User user = userMapper.findByUsrId(usrId);
        if (user != null && passwordEncoder.matches(password, user.getPassword())) {
            log.info(">>> [AUTH SUCCESS] USRID: {}, Generating Token...", usrId);
            String role = user.getRole() != null ? user.getRole() : "USER";
            String token = jwtUtil.generateToken(usrId, role); // [수정] Role 포함 토큰 생성
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("usrId", user.getUsrId());
            response.put("usrName", user.getUsrName());
            response.put("role", role);
            
            return ResponseEntity.ok(response);
        }
        
        log.warn(">>> [LOGIN FAIL] Invalid credentials for USRID: {}", usrId);
        return ResponseEntity.status(401).body("Invalid credentials");
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (userMapper.findByUsrId(user.getUsrId()) != null) {
            return ResponseEntity.badRequest().body("User already exists");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null) user.setRole("USER");
        userMapper.insert(user);
        return ResponseEntity.ok("User registered successfully");
    }
}

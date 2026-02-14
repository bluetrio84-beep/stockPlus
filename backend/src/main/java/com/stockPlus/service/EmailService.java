package com.stockPlus.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 이메일 발송 및 비밀번호 초기화 인증 코드를 관리하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    
    // 인증 코드를 임시 저장할 맵 (Key: Email, Value: AuthCode)
    private final Map<String, String> authCodeMap = new ConcurrentHashMap<>();

    /**
     * 6자리 무작위 인증 코드를 생성하여 이메일로 발송합니다.
     */
    public void sendVerificationCode(String toEmail) {
        String authCode = generateCode();
        authCodeMap.put(toEmail, authCode);
        
        log.info("Sending auth code [{}] to {}", authCode, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("[StockPlus] 비밀번호 초기화 인증 번호입니다.");
            message.setText("안녕하세요. StockPlus입니다.\n\n" +
                            "비밀번호 초기화를 위한 인증 번호는 다음과 같습니다.\n\n" +
                            "인증번호: " + authCode + "\n\n" +
                            "해당 번호를 입력창에 넣어주세요.");
            
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Email send error: {}", e.getMessage());
            throw new RuntimeException("메일 발송 중 오류가 발생했습니다.");
        }
    }

    /**
     * 입력된 인증 코드가 유효한지 확인합니다.
     */
    public boolean verifyCode(String email, String code) {
        String savedCode = authCodeMap.get(email);
        if (savedCode != null && savedCode.equals(code)) {
            authCodeMap.remove(email); // 인증 성공 시 삭제
            return true;
        }
        return false;
    }

    // 6자리 난수 생성
    private String generateCode() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(1000000));
    }
}

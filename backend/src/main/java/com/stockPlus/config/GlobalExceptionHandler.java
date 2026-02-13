package com.stockPlus.config;

import com.stockPlus.domain.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 외부 API(KIS, Naver 등) 호출 중 에러가 발생한 경우 처리
     */
    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<ErrorResponse> handleWebClientException(WebClientResponseException ex, HttpServletRequest request) {
        log.error(">>> [EXTERNAL API ERROR] Status: {}, Body: {}, Path: {}", 
                ex.getStatusCode(), ex.getResponseBodyAsString(), request.getRequestURI());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(ex.getStatusCode().value())
                .error("External API Error")
                .message(ex.getStatusText() + ": " + ex.getResponseBodyAsString())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(error, ex.getStatusCode());
    }

    /**
     * 비즈니스 로직 중 발생하는 런타임 에러 처리
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex, HttpServletRequest request) {
        log.error(">>> [RUNTIME ERROR] Message: {}, Path: {}", ex.getMessage(), request.getRequestURI());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * 그 외 처리되지 않은 모든 예외 처리
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllException(Exception ex, HttpServletRequest request) {
        log.error(">>> [UNEXPECTED ERROR] Message: {}, Path: {}", ex.getMessage(), request.getRequestURI());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Unexpected Error")
                .message("알 수 없는 오류가 발생했습니다. 로그를 확인해 주세요.")
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

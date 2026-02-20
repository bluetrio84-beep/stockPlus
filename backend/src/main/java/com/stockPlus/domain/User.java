package com.stockPlus.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String usrId;   // PRIMARY KEY
    private String usrName;
    private String password;
    private String phoneNumber;
    private String email;
    private String role; // [추가] 권한 필드
    private LocalDateTime createdAt;
}

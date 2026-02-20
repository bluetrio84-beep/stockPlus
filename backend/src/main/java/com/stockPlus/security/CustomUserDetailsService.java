package com.stockPlus.security;

import com.stockPlus.domain.User;
import com.stockPlus.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

/**
 * Spring Security에서 사용자 정보를 로드하는 서비스 클래스입니다.
 * DB에서 사용자 정보를 조회하여 Spring Security가 이해할 수 있는 UserDetails 객체로 반환합니다.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserMapper userMapper; // 사용자 정보 DB 접근을 위한 매퍼

    /**
     * 사용자 아이디(usrId)를 기반으로 사용자 정보를 조회합니다.
     * 로그인 시 Spring Security의 AuthenticationManager에 의해 자동으로 호출됩니다.
     *
     * @param usrId 로그인 시 입력한 사용자 아이디
     * @return UserDetails 객체 (Spring Security 내부 인증용)
     * @throws UsernameNotFoundException 사용자를 찾을 수 없을 때 발생
     */
    @Override
    public UserDetails loadUserByUsername(String usrId) throws UsernameNotFoundException {
        // 1. DB에서 사용자 조회
        User user = userMapper.findByUsrId(usrId);
        
        if (user == null) {
            throw new UsernameNotFoundException("User not found with ID: " + usrId);
        }

        // 2. UserDetails 객체 생성 및 반환
        // 역할(Role)이 있으면 'ROLE_' 접두사를 붙여 권한 설정
        String role = user.getRole() != null ? user.getRole() : "USER";
        
        return new org.springframework.security.core.userdetails.User(
                user.getUsrId(), 
                user.getPassword(), 
                org.springframework.security.core.authority.AuthorityUtils.createAuthorityList("ROLE_" + role)
        );
    }
}
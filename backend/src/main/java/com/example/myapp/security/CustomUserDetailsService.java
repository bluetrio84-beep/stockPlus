package com.example.myapp.security;

import com.example.myapp.domain.User;
import com.example.myapp.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String usrId) throws UsernameNotFoundException {
        User user = userMapper.findByUsrId(usrId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + usrId));

        return new org.springframework.security.core.userdetails.User(
                user.getUsrId(), user.getPassword(), new ArrayList<>());
    }
}
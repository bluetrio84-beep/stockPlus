package com.stockPlus.mapper;

import com.stockPlus.domain.User;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {
    List<User> findAll();
    Optional<User> findByUsrId(String usrId);
    int insert(User user);
    boolean existsByUsrId(String usrId);
    boolean existsByPhoneNumber(String phoneNumber);
    void updatePassword(@org.apache.ibatis.annotations.Param("usrId") String usrId, @org.apache.ibatis.annotations.Param("password") String password);
    
    // 모든 사용자 ID 목록 조회
    List<String> findAllUserIds();
}
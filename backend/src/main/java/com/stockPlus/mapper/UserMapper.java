package com.stockPlus.mapper;

import com.stockPlus.domain.User;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {
    List<User> findAll();
    User findByUsrId(String usrId); // [수정] Optional 제거
    int insert(User user);
    boolean existsByUsrId(String usrId);
    boolean existsByPhoneNumber(String phoneNumber);
    void updatePassword(@org.apache.ibatis.annotations.Param("usrId") String usrId, @org.apache.ibatis.annotations.Param("password") String password);
    void update(User user); // [추가] 사용자 정보 수정 (usrName, email, phone_number, role, useyn)
    
    // 모든 사용자 ID 목록 조회
    List<String> findAllUserIds();

    // [v17.9] 활성 사용자 ID 목록 조회 (useyn='Y')
    List<String> findAllActiveUserIds();
    
    // [v17.9] 사용자 검색 (ID 또는 이름)
    List<User> searchUsers(@org.apache.ibatis.annotations.Param("keyword") String keyword);
}
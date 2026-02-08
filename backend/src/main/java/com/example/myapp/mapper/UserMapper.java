package com.example.myapp.mapper;

import com.example.myapp.domain.User;
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
}
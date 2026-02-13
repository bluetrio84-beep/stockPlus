package com.stockPlus.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface UserKeywordMapper {
    
    List<String> findKeywordsByUsrId(String usrId);

    void insertKeyword(@Param("usrId") String usrId, @Param("keyword") String keyword);

    void deleteKeyword(@Param("usrId") String usrId, @Param("keyword") String keyword);
}

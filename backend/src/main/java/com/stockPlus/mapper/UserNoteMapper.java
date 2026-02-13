package com.stockPlus.mapper;

import com.stockPlus.domain.UserNote;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface UserNoteMapper {
    List<UserNote> findAll(@Param("usrId") String usrId);
    List<UserNote> findByRefCode(@Param("usrId") String usrId, @Param("refCode") String refCode);
    int insert(UserNote userNote);
    int update(UserNote userNote);
    int deleteById(@Param("usrId") String usrId, @Param("id") Long id);
}

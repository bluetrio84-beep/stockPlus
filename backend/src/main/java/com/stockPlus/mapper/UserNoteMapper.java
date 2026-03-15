package com.stockPlus.mapper;

import com.stockPlus.domain.UserNote;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface UserNoteMapper {
    List<UserNote> findAllByUsrId(@Param("usrId") String usrId);
    List<UserNote> findByRefCode(@Param("usrId") String usrId, @Param("refCode") String refCode);
    UserNote findByIdAndUsrId(@Param("id") Long id, @Param("usrId") String usrId);
    int insert(UserNote note);
    int update(UserNote note);
    int delete(@Param("id") Long id, @Param("usrId") String usrId);
    int incrementViewCount(@Param("id") Long id);
}

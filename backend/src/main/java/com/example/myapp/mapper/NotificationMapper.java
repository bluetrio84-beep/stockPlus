package com.example.myapp.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface NotificationMapper {
    // 최근 알림 조회 (최대 10개)
    List<Map<String, Object>> findRecentNotifications(@Param("usrId") String usrId);
    
    // 알림 읽음 처리
    void markAsRead(@Param("usrId") String usrId);
    
    // 알림 추가 (뉴스 또는 시스템 메시지)
    void insertNotification(@Param("usrId") String usrId, @Param("message") String message, @Param("type") String type);
    
    // 읽지 않은 알림 수
    int countUnread(@Param("usrId") String usrId);
}

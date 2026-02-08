package com.example.myapp.mapper;

import com.example.myapp.domain.Watchlist;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface WatchlistMapper {
    List<Watchlist> findAll(@Param("usrId") String usrId);
    List<Watchlist> findAllGlobal();
    List<Watchlist> findByGroupId(@Param("usrId") String usrId, @Param("groupId") int groupId);
    int insert(Watchlist watchlist);
    int deleteByStockCode(@Param("usrId") String usrId, @Param("stockCode") String stockCode, @Param("groupId") int groupId);
    int deleteByGroupId(@Param("usrId") String usrId, @Param("groupId") int groupId);
    
    void updateFavorite(@Param("usrId") String usrId, @Param("stockCode") String stockCode, @Param("groupId") int groupId, @Param("isFavorite") boolean isFavorite);
    List<Watchlist> findFavorites(@Param("usrId") String usrId);
}

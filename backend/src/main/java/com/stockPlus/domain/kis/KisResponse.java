package com.stockPlus.domain.kis;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class KisResponse<T> {
    @JsonProperty("rt_cd")
    private String rtCd;      // 0: 성공, 이외: 실패
    
    @JsonProperty("msg_cd")
    private String msgCd;     // 응답코드
    
    @JsonProperty("msg1")
    private String msg1;       // 응답메시지
    
    private T output;          // 실제 데이터
}

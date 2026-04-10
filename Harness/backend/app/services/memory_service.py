from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.ai_service import ai_service
from app.core.broadcaster import log_broadcaster
import logging

logger = logging.getLogger("harness.dreamer")

class MemoryService:
    async def auto_dream(self, db: Session):
        """
        [AutoDream] 백그라운드에서 최근 로그를 분석하여 장기 기억으로 저장
        """
        try:
            # 1. 아직 인덱싱되지 않은 최근 로그 50개 추출 (가정)
            # 실제 운영 시에는 'is_indexed' 플래그 필드가 필요하지만, 여기서는 시뮬레이션
            query = text("SELECT message FROM h_logs ORDER BY id DESC LIMIT 50")
            logs = db.execute(query).fetchall()
            
            if not logs:
                return

            log_text = "\n".join([l[0] for r in logs])
            
            # 2. Gemini를 사용하여 로그 요약 (꿈을 꾸는 과정)
            await log_broadcaster.broadcast("DREAMER", f"Synthesizing {len(logs)} activities into intelligence...", "PROCESS")
            
            summary_prompt = f"""
            아래는 에이전트의 최근 활동 로그입니다.
            내용: {log_text[:2000]}
            
            이 활동들로부터 얻을 수 있는 핵심 성과나 교훈을 한 문장으로 요약해주세요.
            (예: '유튜브 API 할당량 초과에 대비한 재시도 로직이 성공적으로 작동함')
            """
            
            # AiService 재활용 (가벼운 요약 모드)
            insight = await ai_service.generate_script(topic="Memory Synthesis", custom_prompt=summary_prompt)
            
            # 3. h_memories에 저장
            save_query = text("INSERT INTO h_memories (agent_name, insight) VALUES ('Global-Harness', :insight)")
            db.execute(save_query, {"insight": insight[:255]})
            db.commit()
            
            await log_broadcaster.broadcast("DREAMER", f"Intelligence Indexed: {insight[:50]}...", "SUCCESS")
            
        except Exception as e:
            logger.error(f"Dreaming failed: {e}")

memory_service = MemoryService()

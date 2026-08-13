import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.api.deps import SessionLocal
from app.core.broadcaster import log_broadcaster

logger = logging.getLogger("blog_scheduler")

# 한국 표준시 KST (UTC+9)
KST = timezone(timedelta(hours=9))

class BlogScheduler:
    """
    매일 평일(월~금) 16:00 (오후 4시) KST에 
    오늘자 퀀트 블로그 포스팅 자율 생성 태스크를 task_queue에 자동 발주하는 스케줄러
    """
    def __init__(self):
        self.is_running = False
        self.last_triggered_date = None  # 중복 실행 방지용 (YYYY-MM-DD)

    async def start(self):
        self.is_running = True
        logger.info(">>> [BLOG SCHEDULER] Started: Waiting for Mon~Fri 16:00 KST.")
        await log_broadcaster.broadcast("SYSTEM", "⏰ [Blog Scheduler] 평일 16:00 자동 발행 스케줄러 가동 준비 완료", "INFO")

        while self.is_running:
            try:
                now_kst = datetime.now(KST)
                today_str = now_kst.strftime("%Y-%m-%d")
                weekday = now_kst.weekday()  # 0:월, 1:화, 2:수, 3:목, 4:금, 5:토, 6:일

                # 평일(0~4: 월~금)이고 16시 정각 구간(16:00 ~ 16:01)이며, 오늘 아직 트리거 안 된 경우
                if weekday < 5 and now_kst.hour == 16 and now_kst.minute == 0:
                    if self.last_triggered_date != today_str:
                        self.last_triggered_date = today_str
                        await self.trigger_daily_blog_job(today_str)

            except Exception as e:
                logger.error(f"Scheduler Error: {e}")

            # 30초 간격 체크
            await asyncio.sleep(30)

    async def trigger_daily_blog_job(self, date_str: str):
        """task_queue에 BLOG_GENERATE 태스크 발주"""
        db = SessionLocal()
        try:
            # 중복 체크: 이미 해당 날짜로 수동/자동 생성된 태스크가 있는지 확인
            check_query = text("""
                SELECT COUNT(*) FROM task_queue 
                WHERE job_name = 'BLOG' AND payload LIKE :pattern
            """)
            count = db.execute(check_query, {"pattern": f"%{date_str}%"}).scalar()

            if count > 0:
                await log_broadcaster.broadcast(
                    "SYSTEM",
                    f"⏰ [Blog Scheduler] 오늘({date_str}) 포스팅은 이미 생성되어 있어 스케줄러 발주를 스킵합니다.",
                    "WARNING"
                )
                return

            # PENDING 태스크 삽입 → HarnessManager가 즉시 3단계 파이프라인 완주
            insert_query = text("""
                INSERT INTO task_queue (job_name, step_name, payload, status)
                VALUES ('BLOG', 'BLOG_GENERATE', :payload, 'PENDING')
            """)
            payload_str = f'{{"target_date": "{date_str}", "auto_scheduled": true}}'
            db.execute(insert_query, {"payload": payload_str})
            db.commit()

            await log_broadcaster.broadcast(
                "SYSTEM",
                f"⏰ [Blog Scheduler] 평일 16:00 정각! [{date_str}] 퀀트 블로그 포스팅 자율 파이프라인 자동 발주 완료!",
                "SUCCESS"
            )
            logger.info(f"Triggered daily blog job for {date_str}")

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to trigger daily blog job: {e}")
        finally:
            db.close()

blog_scheduler = BlogScheduler()

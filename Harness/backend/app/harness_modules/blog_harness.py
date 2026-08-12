import logging
from app.harness_modules.base import BaseHarness
from app.core.broadcaster import log_broadcaster
from app.services.blog_builder import blog_builder_service
from app.api.deps import SessionLocal

logger = logging.getLogger("harness.blog")

class BlogHarness(BaseHarness):
    def __init__(self):
        super().__init__("BlogEngine")

    async def initialize(self):
        self.status = "IDLE"
        await log_broadcaster.broadcast("SYSTEM", "Blog Harness Engine initialized.", "INFO")

    async def _run_logic(self, task_data: dict):
        target_date = task_data.get("target_date")
        await log_broadcaster.broadcast(self.name, f"Starting quant blog generation task for {target_date or 'today'}...", "PROCESS")

        db = SessionLocal()
        try:
            post = await blog_builder_service.generate_daily_post(db, target_date)
            await log_broadcaster.broadcast(self.name, f"Quant Blog Post generated successfully! Title: {post.title}", "SUCCESS")
            return {
                "post_id": post.id,
                "title": post.title,
                "status": post.status,
                "post_date": str(post.post_date)
            }
        except Exception as e:
            logger.error(f"Error in BlogHarness run_logic: {e}")
            await log_broadcaster.broadcast(self.name, f"Blog generation failed: {str(e)}", "ERROR")
            raise e
        finally:
            db.close()

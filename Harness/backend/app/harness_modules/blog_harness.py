import logging
from app.harness_modules.base import BaseHarness
from app.core.broadcaster import log_broadcaster
from app.api.deps import SessionLocal

logger = logging.getLogger("harness.blog")

class BlogHarness(BaseHarness):
    def __init__(self):
        super().__init__("BlogEngine")

    async def initialize(self):
        self.status = "IDLE"
        await log_broadcaster.broadcast("SYSTEM", "Blog Harness Engine initialized.", "INFO")

    async def _run_logic(self, task_data: dict):
        """
        KAIROS 패턴으로 호출되는 실제 BlogHarness 실행 로직.
        step_name에 따라 3단계 파이프라인 분기:
          - BLOG_GENERATE    : StockPlus DB 수집 → HTML/MD 포스팅 생성
          - BLOG_SEO_ENHANCE : Gemini AI로 제목/인트로 강화
          - BLOG_PUBLISH     : status READY 확정
        """
        step_name = task_data.get("step_name", "BLOG_GENERATE")
        payload   = task_data.get("payload", {})

        await log_broadcaster.broadcast(
            self.name,
            f"[Sandbox: {self.sandbox_id}] Step={step_name} | Payload keys={list(payload.keys())}",
            "PROCESS"
        )

        db = SessionLocal()
        try:
            # ── Step 1: BLOG_GENERATE ────────────────────────────────
            if step_name == "BLOG_GENERATE":
                from app.services.blog_builder import blog_builder_service
                target_date = payload.get("target_date")
                await log_broadcaster.broadcast(self.name, "Fetching real-time quant data from StockPlus DB...", "PROCESS")
                post = await blog_builder_service.generate_daily_post(db, target_date)
                await log_broadcaster.broadcast(self.name, f"Post generated → ID={post.id} : {post.title}", "SUCCESS")
                return {"post_id": post.id, "title": post.title, "status": post.status}

            # ── Step 2: BLOG_SEO_ENHANCE ─────────────────────────────
            elif step_name == "BLOG_SEO_ENHANCE":
                from app.models.blog import BlogPost
                from app.services.ai_service import ai_service
                post_id = payload.get("post_id")
                post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
                if not post:
                    raise ValueError(f"Post {post_id} not found for SEO enhance.")

                await log_broadcaster.broadcast(self.name, f"Enhancing SEO metadata for Post ID={post_id}...", "PROCESS")

                # AI로 키워드 보강 (0원 방어: 실패해도 기존 keyword 유지)
                enhanced_keywords = post.seo_keywords or ""
                try:
                    if ai_service.model:
                        prompt = (
                            f"아래 주식 블로그 포스팅 제목에서 SEO에 최적화된 한국어 검색 키워드를 "
                            f"콤마(,)로 구분하여 10개 추출해줘. 제목: {post.title}\n"
                            f"기존 키워드: {post.seo_keywords}\n"
                            f"반드시 키워드만 출력. 예: 오늘주식,삼성전자,외국인순매수,..."
                        )
                        resp = ai_service.model.generate_content(prompt)
                        candidate = resp.text.strip().replace("\n", ",")
                        if candidate:
                            enhanced_keywords = candidate
                except Exception as e:
                    await log_broadcaster.broadcast(self.name, f"AI SEO fallback (0-cost): {e}", "WARNING")

                post.seo_keywords = enhanced_keywords
                db.commit()
                await log_broadcaster.broadcast(self.name, f"SEO keywords updated: {enhanced_keywords[:80]}...", "SUCCESS")
                return {"post_id": post_id, "seo_keywords": enhanced_keywords}

            # ── Step 3: BLOG_PUBLISH ─────────────────────────────────
            elif step_name == "BLOG_PUBLISH":
                from app.models.blog import BlogPost
                post_id = payload.get("post_id")
                post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
                if not post:
                    raise ValueError(f"Post {post_id} not found for publish.")

                await log_broadcaster.broadcast(self.name, f"Finalizing Post ID={post_id} → status=READY", "PROCESS")
                post.status = "READY"
                db.commit()
                await log_broadcaster.broadcast(self.name, f"✅ Pipeline COMPLETE: '{post.title}'", "SUCCESS")
                return {"post_id": post_id, "final_status": "READY", "title": post.title}

            else:
                raise ValueError(f"Unknown Blog step: {step_name}")

        finally:
            db.close()


# 싱글턴 인스턴스 (HarnessManager가 라우팅용으로 참조)
blog_harness = BlogHarness()

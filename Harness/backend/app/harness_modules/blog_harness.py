import logging
from app.harness_modules.base import BaseHarness
from app.core.broadcaster import log_broadcaster
from app.core.he_tools import BlogTool
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
        [Tool Sandbox] 모든 DB 접근은 BlogTool을 통해서만 수행됩니다.
        step_name에 따라 3단계 파이프라인 분기:
          - BLOG_GENERATE    : StockPlus DB 수집 → HTML/MD 포스팅 생성
          - BLOG_SEO_ENHANCE : Gemini AI로 제목/인트로 강화
          - BLOG_PUBLISH     : status READY 확정
        """
        step_name = task_data.get("step_name", "BLOG_GENERATE")
        payload   = task_data.get("payload", {})

        # [Tool Sandbox] BlogTool 인스턴스: sandbox_id 연동
        tool = BlogTool(sandbox_id=self.sandbox_id)

        await log_broadcaster.broadcast(
            self.name,
            f"[Sandbox: {self.sandbox_id}] Step={step_name} | Payload keys={list(payload.keys())}",
            "PROCESS"
        )

        db = SessionLocal()
        try:
            # ── Step 1: BLOG_GENERATE ────────────────────────────────
            if step_name == "BLOG_GENERATE":
                from app.services.ai_service import ai_service
                target_date = payload.get("target_date")
                if not target_date:
                    from datetime import datetime
                    target_date = datetime.now().strftime("%Y.%m.%d")

                # [Context Compaction] 토큰 카운트 추적
                self.current_tokens = 0

                await log_broadcaster.broadcast(self.name, "📡 [BlogTool] Fetching real-time quant data from StockPlus DB...", "PROCESS")
                # [Tool Sandbox] 직접 DB 접근 X → BlogTool 통해 데이터 수집
                raw_data = tool.fetch_quant_data()
                self.current_tokens += len(str(raw_data)) // 4  # 토큰 추정

                await log_broadcaster.broadcast(self.name, "🤖 [BlogTool] Generating AI market insight...", "PROCESS")
                ai_insight = await ai_service.generate_blog_insight(raw_data)
                self.current_tokens += len(ai_insight) // 4

                # Context Compaction 체크
                await self.compact_context()

                # [Tool Sandbox] 포스트 저장도 BlogTool 통해 수행
                post = tool.build_post(db, target_date, raw_data, ai_insight)
                await log_broadcaster.broadcast(self.name, f"✅ Post generated → ID={post.id} : {post.title}", "SUCCESS")
                return {"post_id": post.id, "title": post.title, "status": post.status}

            # ── Step 2: BLOG_SEO_ENHANCE ─────────────────────────────
            elif step_name == "BLOG_SEO_ENHANCE":
                from app.services.ai_service import ai_service
                post_id = payload.get("post_id")

                # [Tool Sandbox] 포스트 조회 → BlogTool 통해
                post = tool.get_post(db, post_id)
                await log_broadcaster.broadcast(self.name, f"🔍 [BlogTool] Enhancing SEO metadata for Post ID={post_id}...", "PROCESS")

                enhanced_keywords = post.seo_keywords or ""
                try:
                    if ai_service.model:
                        raw_prompt = (
                            f"아래 주식 블로그 포스팅 제목에서 SEO에 최적화된 한국어 검색 키워드를 "
                            f"콤마(,)로 구분하여 10개 추출해줘. 제목: {post.title}\n"
                            f"기존 키워드: {post.seo_keywords}\n"
                            f"반드시 키워드만 출력. 예: 오늘주식,삼성전자,외국인순매수,..."
                        )
                        # [Context Compaction] 프롬프트 안전 압축
                        prompt = ai_service.compact_text(raw_prompt)
                        resp = ai_service.model.generate_content(prompt)
                        candidate = resp.text.strip().replace("\n", ",")
                        if candidate:
                            enhanced_keywords = candidate
                except Exception as e:
                    await log_broadcaster.broadcast(self.name, f"⚠️ AI SEO fallback (0-cost): {e}", "WARNING")

                # [Tool Sandbox] SEO 키워드 업데이트 → BlogTool 통해
                tool.update_seo_keywords(db, post_id, enhanced_keywords)
                await log_broadcaster.broadcast(self.name, f"✅ SEO keywords updated: {enhanced_keywords[:80]}...", "SUCCESS")
                return {"post_id": post_id, "seo_keywords": enhanced_keywords}

            # ── Step 3: BLOG_PUBLISH ─────────────────────────────────
            elif step_name == "BLOG_PUBLISH":
                post_id = payload.get("post_id")
                await log_broadcaster.broadcast(self.name, f"📤 [BlogTool] Finalizing Post ID={post_id} → status=READY", "PROCESS")

                # [Tool Sandbox] 발행 상태 변경 → BlogTool 통해
                post = tool.get_post(db, post_id)
                tool.publish_post(db, post_id)
                await log_broadcaster.broadcast(self.name, f"✅ Pipeline COMPLETE: '{post.title}'", "SUCCESS")
                return {"post_id": post_id, "final_status": "READY", "title": post.title}

            else:
                raise ValueError(f"Unknown Blog step: {step_name}")

        finally:
            db.close()


# 싱글턴 인스턴스 (HarnessManager가 라우팅용으로 참조)
blog_harness = BlogHarness()

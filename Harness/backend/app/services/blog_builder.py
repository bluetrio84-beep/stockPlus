import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.services.blog_data_service import blog_data_service
from app.services.blog_template import blog_template_engine
from app.services.ai_service import ai_service
from app.models.blog import BlogPost, BlogDataSnapshot

logger = logging.getLogger("blog_builder")

class BlogBuilderService:
    async def generate_daily_post(self, db: Session, target_date: str = None) -> BlogPost:
        """
        StockPlus DB 데이터를 수집하고 HTML/Markdown 포스팅을 자동 빌드하여 harness_db에 저장합니다.
        """
        if not target_date:
            target_date = datetime.now().strftime("%Y.%m.%d")
        # 날짜 포맷 통일: YYYY-MM-DD → YYYY.MM.DD
        target_date = target_date.replace("-", ".")

        logger.info(f"Starting daily quant blog generation for {target_date}...")

        # 1. StockPlus DB 데이터 수집
        raw_data = blog_data_service.fetch_daily_quant_data()

        # 2. AI Market Insight 생성 (Gemini 2.0 Flash / 0원 템플릿)
        ai_insight = await ai_service.generate_blog_insight(raw_data)

        # 3. HTML & Markdown 템플릿 렌더링
        rendered = blog_template_engine.generate_post(target_date, raw_data, ai_insight)

        # 4. harness_db에 BlogPost 생성
        post = BlogPost(
            post_date=datetime.strptime(target_date, "%Y.%m.%d").date(),
            post_type="DAILY_MARKET",
            title=rendered["title"],
            html_content=rendered["html_content"],
            markdown_content=rendered["markdown_content"],
            seo_keywords=rendered["seo_keywords"],
            status="READY"
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        # 5. 스냅샷 데이터 저장
        snapshot = BlogDataSnapshot(
            post_id=post.id,
            data_type="DAILY_QUANT_DATA",
            raw_json=json.dumps(raw_data, default=str)
        )
        db.add(snapshot)
        db.commit()

        logger.info(f"Successfully generated blog post ID {post.id}: '{post.title}'")
        return post

blog_builder_service = BlogBuilderService()

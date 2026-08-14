"""
HE Tool Sandbox - 모든 하네스 에이전트가 DB/API/파일에 접근할 때
반드시 이 도구를 통해야 합니다. 직접 접근 금지.
"""
import logging
import json
from typing import Optional, Dict, Any
from sqlalchemy import text

logger = logging.getLogger("harness.tools")


class BlogTool:
    """
    [Tool Sandbox] Blog 파이프라인 전용 도구.
    DB 직접 접근 대신 이 도구만 허용되어 샌드박스 원칙을 준수합니다.
    """

    def __init__(self, sandbox_id: str):
        self.sandbox_id = sandbox_id

    def fetch_quant_data(self) -> Dict[str, Any]:
        """StockPlus DB에서 퀀트 데이터 수집 (읽기 전용)"""
        try:
            from app.services.blog_data_service import blog_data_service
            data = blog_data_service.fetch_daily_quant_data()
            logger.info(f"[BlogTool:{self.sandbox_id}] Quant data fetched: themes={len(data.get('themes',[]))}, sectors={len(data.get('sectors',[]))}")
            return data
        except Exception as e:
            logger.error(f"[BlogTool:{self.sandbox_id}] fetch_quant_data failed: {e}")
            raise

    def build_post(self, db, target_date: str, raw_data: Dict[str, Any], ai_insight: str) -> Any:
        """BlogPost DB 저장 (쓰기)"""
        try:
            from datetime import datetime
            from app.services.blog_template import blog_template_engine
            from app.models.blog import BlogPost, BlogDataSnapshot

            # 날짜 포맷 통일: YYYY-MM-DD → YYYY.MM.DD
            if target_date:
                target_date = target_date.replace("-", ".").replace("/", ".")

            rendered = blog_template_engine.generate_post(target_date, raw_data, ai_insight)
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

            snapshot = BlogDataSnapshot(
                post_id=post.id,
                data_type="DAILY_QUANT_DATA",
                raw_json=json.dumps(raw_data, default=str)
            )
            db.add(snapshot)
            db.commit()

            logger.info(f"[BlogTool:{self.sandbox_id}] Post saved: ID={post.id}, title={post.title}")
            return post
        except Exception as e:
            db.rollback()
            logger.error(f"[BlogTool:{self.sandbox_id}] build_post failed: {e}")
            raise

    def get_post(self, db, post_id: int) -> Optional[Any]:
        """포스트 조회"""
        try:
            from app.models.blog import BlogPost
            post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
            if not post:
                raise ValueError(f"[BlogTool:{self.sandbox_id}] Post {post_id} not found.")
            return post
        except Exception as e:
            logger.error(f"[BlogTool:{self.sandbox_id}] get_post failed: {e}")
            raise

    def update_seo_keywords(self, db, post_id: int, keywords: str) -> None:
        """SEO 키워드 업데이트"""
        try:
            from app.models.blog import BlogPost
            post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
            if not post:
                raise ValueError(f"Post {post_id} not found.")
            post.seo_keywords = keywords
            db.commit()
            logger.info(f"[BlogTool:{self.sandbox_id}] SEO keywords updated for Post {post_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"[BlogTool:{self.sandbox_id}] update_seo_keywords failed: {e}")
            raise

    def publish_post(self, db, post_id: int) -> None:
        """포스트 상태를 READY로 확정"""
        try:
            from app.models.blog import BlogPost
            post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
            if not post:
                raise ValueError(f"Post {post_id} not found.")
            post.status = "READY"
            db.commit()
            logger.info(f"[BlogTool:{self.sandbox_id}] Post {post_id} published (status=READY)")
        except Exception as e:
            db.rollback()
            logger.error(f"[BlogTool:{self.sandbox_id}] publish_post failed: {e}")
            raise

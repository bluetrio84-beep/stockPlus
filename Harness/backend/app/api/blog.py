import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel

from app.api.deps import get_db
from app.models.blog import BlogPost
from app.services.blog_auto_publisher import BlogAutoPublisher

logger = logging.getLogger("blog_api")
router = APIRouter(prefix="/blog", tags=["blog"])


# ─────────────────────────────────────────────────────────
#  POST /api/blog/generate
#  하네스 풀 알고리즘 경유: task_queue에 PENDING 삽입
#  → HarnessManager 워커가 2초 폴링 후 BLOG_GENERATE 스텝 실행
#  → AI Self-Correction, Agent Console 실시간 스트리밍 모두 적용
# ─────────────────────────────────────────────────────────
@router.post("/generate", summary="퀀트 블로그 포스팅 생성 (Harness 풀 알고리즘 경유)")
async def generate_blog_post(
    target_date: Optional[str] = Query(None, description="형식: YYYY.MM.DD (미입력 시 오늘)"),
    db: Session = Depends(get_db)
):
    try:
        payload = {}
        if target_date:
            payload["target_date"] = target_date

        # task_queue에 PENDING 태스크 삽입 → HarnessManager 워커가 처리
        insert_q = text("""
            INSERT INTO task_queue (job_name, step_name, payload, status)
            VALUES (:job_name, :step_name, :payload, 'PENDING')
        """)
        result = db.execute(insert_q, {
            "job_name": "BLOG_HARNESS",
            "step_name": "BLOG_GENERATE",
            "payload": json.dumps(payload)
        })
        db.commit()
        task_id = result.lastrowid

        return {
            "success": True,
            "message": "퀀트 블로그 생성 작업이 Harness Worker에 큐잉되었습니다.",
            "task_id": task_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"태스크 큐잉 실패: {str(e)}"
        )


# ─────────────────────────────────────────────────────────
#  GET /api/blog/task/{task_id}
#  Frontend가 완료 여부를 폴링하는 엔드포인트
# ─────────────────────────────────────────────────────────
@router.get("/task/{task_id}", summary="생성 작업 상태 조회 (Frontend 폴링용)")
def get_task_status(task_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT task_id, status, result_path, error_log FROM task_queue WHERE task_id = :id"),
        {"id": task_id}
    ).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다.")

    task_status = result[1]
    result_path = result[2]
    error_log   = result[3]

    # SUCCESS 시 post_id를 파싱해서 포스팅 상세 반환
    post_data = None
    if task_status == "SUCCESS" and result_path:
        try:
            import ast
            try:
                result_json = json.loads(result_path)
            except Exception:
                result_json = ast.literal_eval(result_path)
            post_id = result_json.get("post_id") if isinstance(result_json, dict) else None
            if post_id:
                post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
                if post:
                    post_data = {
                        "id": post.id,
                        "title": post.title,
                        "post_date": str(post.post_date),
                        "status": post.status,
                        "html_content": post.html_content,
                        "markdown_content": post.markdown_content,
                        "seo_keywords": post.seo_keywords,
                        "created_at": str(post.created_at)
                    }
        except Exception as e:
            logger.error(f"Failed to parse task result: {e}")

    return {
        "task_id": task_id,
        "status": task_status,
        "error_log": error_log,
        "post": post_data
    }


# ─────────────────────────────────────────────────────────
#  GET /api/blog/pipeline-tasks
# ─────────────────────────────────────────────────────────
@router.get("/pipeline-tasks", summary="3단계 파이프라인 전체 태스크 상태 조회")
def get_pipeline_tasks(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT task_id, job_name, step_name, status, created_at, updated_at
            FROM task_queue
            WHERE job_name = 'BLOG_HARNESS'
            ORDER BY task_id DESC
            LIMIT 10
        """)
    ).fetchall()

    tasks = [
        {
            "task_id": r[0],
            "job_name": r[1],
            "step_name": r[2],
            "status": r[3],
            "created_at": str(r[4]),
            "updated_at": str(r[5])
        }
        for r in rows
    ]
    return {"success": True, "tasks": tasks}


# ─────────────────────────────────────────────────────────
#  GET /api/blog/posts
# ─────────────────────────────────────────────────────────
@router.get("/posts", summary="블로그 포스팅 목록 조회")
def get_blog_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    posts = db.query(BlogPost).order_by(BlogPost.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "success": True,
        "count": len(posts),
        "data": [
            {
                "id": p.id,
                "post_date": str(p.post_date),
                "post_type": p.post_type,
                "title": p.title,
                "status": p.status,
                "seo_keywords": p.seo_keywords,
                "created_at": str(p.created_at)
            } for p in posts
        ]
    }


# ─────────────────────────────────────────────────────────
#  GET /api/blog/posts/{post_id}
# ─────────────────────────────────────────────────────────
@router.get("/posts/{post_id}", summary="블로그 포스팅 상세 조회")
def get_blog_post_detail(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="포스팅을 찾을 수 없습니다.")

    return {
        "success": True,
        "data": {
            "id": post.id,
            "post_date": str(post.post_date),
            "post_type": post.post_type,
            "title": post.title,
            "html_content": post.html_content,
            "markdown_content": post.markdown_content,
            "status": post.status,
            "seo_keywords": post.seo_keywords,
            "created_at": str(post.created_at),
            "published_at": str(post.published_at) if post.published_at else None
        }
    }


# ─────────────────────────────────────────────────────────
#  PUT /api/blog/posts/{post_id}/publish
# ─────────────────────────────────────────────────────────
@router.put("/posts/{post_id}/publish", summary="포스팅 발행 완료 처리")
def publish_blog_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="포스팅을 찾을 수 없습니다.")
    post.status = "PUBLISHED"
    post.published_at = datetime.now()
    db.commit()
    return {"success": True, "message": "발행 완료 상태로 변경되었습니다."}


# ─────────────────────────────────────────────────────────
#  DELETE /api/blog/posts/{post_id}
# ─────────────────────────────────────────────────────────
@router.delete("/posts/{post_id}", summary="포스팅 삭제")
def delete_blog_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="포스팅을 찾을 수 없습니다.")
    db.delete(post)
    db.commit()
    return {"success": True, "message": "포스팅이 삭제되었습니다."}


# ─────────────────────────────────────────────────────────
#  POST /api/blog/posts/{post_id}/auto-publish
#  외부 블로그(티스토리, 워드프레스 등)로 1클릭 직접 자동 포스팅 게시
# ─────────────────────────────────────────────────────────
class AutoPublishRequest(BaseModel):
    platform: str  # 'naver' | 'tistory' | 'wordpress' | 'webhook'
    naver_id: Optional[str] = None
    naver_pw: Optional[str] = None
    naver_mode: Optional[str] = "bridge"  # 'bridge' | 'macro'
    nid_aut: Optional[str] = None
    nid_ses: Optional[str] = None
    tistory_access_token: Optional[str] = None
    tistory_blog_name: Optional[str] = None
    wp_url: Optional[str] = None
    wp_username: Optional[str] = None
    wp_app_password: Optional[str] = None
    webhook_url: Optional[str] = None

@router.post("/posts/{post_id}/auto-publish", summary="외부 블로그로 1클릭 직접 자동 포스팅 게시")
def auto_publish_post(post_id: int, req: AutoPublishRequest, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="포스팅을 찾을 수 없습니다.")

    if req.platform == "naver":
        if not req.naver_id:
            raise HTTPException(status_code=400, detail="네이버 아이디(naver_id)가 필요합니다.")
        res = BlogAutoPublisher.publish_to_naver_blog(
            naver_id=req.naver_id,
            naver_pw=req.naver_pw,
            mode=req.naver_mode or "bridge",
            nid_aut=req.nid_aut,
            nid_ses=req.nid_ses,
            title=post.title,
            content_html=post.html_content
        )
    elif req.platform == "tistory":
        if not req.tistory_access_token or not req.tistory_blog_name:
            raise HTTPException(status_code=400, detail="티스토리 Access Token과 Blog Name이 필요합니다.")
        res = BlogAutoPublisher.publish_to_tistory(
            access_token=req.tistory_access_token,
            blog_name=req.tistory_blog_name,
            title=post.title,
            content_html=post.html_content,
            tag=post.seo_keywords or "주식,퀀트"
        )
    elif req.platform == "wordpress":
        if not req.wp_url or not req.wp_username or not req.wp_app_password:
            raise HTTPException(status_code=400, detail="워드프레스 접속 정보(URL, Username, App Password)가 필요합니다.")
        res = BlogAutoPublisher.publish_to_wordpress(
            wp_url=req.wp_url,
            username=req.wp_username,
            app_password=req.wp_app_password,
            title=post.title,
            content_html=post.html_content
        )
    elif req.platform == "webhook":
        if not req.webhook_url:
            raise HTTPException(status_code=400, detail="웹훅 URL이 필요합니다.")
        res = BlogAutoPublisher.publish_via_webhook(
            webhook_url=req.webhook_url,
            title=post.title,
            content_html=post.html_content,
            markdown=post.markdown_content
        )
    else:
        raise HTTPException(status_code=400, detail="지원하지 않는 발행 플랫폼입니다.")

    if res.get("success"):
        post.status = "PUBLISHED"
        post.published_at = datetime.now()
        db.commit()
    
    return res

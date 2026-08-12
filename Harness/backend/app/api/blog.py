import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.api.deps import get_db
from app.models.blog import BlogPost

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
            # result_path는 dict repr 또는 JSON 문자열
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
        "success": True,
        "task_id": task_id,
        "status": task_status,
        "post": post_data,
        "error_log": error_log if task_status == "FAILED" else None
    }


# ─────────────────────────────────────────────────────────
#  GET /api/blog/pipeline-tasks
#  BLOG_HARNESS job에서 체이닝된 task_id 목록 반환
#  (Frontend가 SEO_ENHANCE / PUBLISH 단계 추적에 사용)
# ─────────────────────────────────────────────────────────
@router.get("/pipeline-tasks", summary="파이프라인 체이닝 task_id 목록 조회")
def get_pipeline_tasks(root_task_id: int, db: Session = Depends(get_db)):
    """root task와 동일 job_name(BLOG_HARNESS)의 체이닝 태스크 id 목록 반환"""
    rows = db.execute(
        text("""
            SELECT task_id FROM task_queue
            WHERE job_name = 'BLOG_HARNESS'
              AND task_id >= :root_id
            ORDER BY task_id ASC
            LIMIT 10
        """),
        {"root_id": root_task_id}
    ).fetchall()
    task_ids = [r[0] for r in rows]
    return {"success": True, "task_ids": task_ids}


# ─────────────────────────────────────────────────────────
#  GET /api/blog/posts
# ─────────────────────────────────────────────────────────
@router.get("/posts", summary="생성된 블로그 포스팅 목록 조회")
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
@router.get("/posts/{post_id}", summary="특정 포스팅 상세 조회")
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

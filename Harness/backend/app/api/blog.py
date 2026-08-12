from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db
from app.models.blog import BlogPost
from app.services.blog_builder import blog_builder_service

router = APIRouter(prefix="/blog", tags=["blog"])

@router.post("/generate", summary="오늘 또는 특정 날짜의 퀀트 블로그 포스팅 생성")
async def generate_blog_post(
    target_date: Optional[str] = Query(None, description="형식: YYYY.MM.DD (미입력 시 오늘)"),
    db: Session = Depends(get_db)
):
    try:
        post = await blog_builder_service.generate_daily_post(db, target_date)
        return {
            "success": True,
            "message": "포스팅이 성공적으로 생성되었습니다.",
            "data": {
                "id": post.id,
                "title": post.title,
                "post_date": str(post.post_date),
                "status": post.status,
                "html_content": post.html_content,
                "markdown_content": post.markdown_content,
                "seo_keywords": post.seo_keywords
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"블로그 포스팅 생성 중 오류 발생: {str(e)}"
        )

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

@router.get("/posts/{post_id}", summary="특정 블로그 포스팅 상세 조회")
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

@router.put("/posts/{post_id}/publish", summary="포스팅 발행 상태 변경")
def publish_blog_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="포스팅을 찾을 수 없습니다.")
    
    post.status = "PUBLISHED"
    post.published_at = datetime.now()
    db.commit()
    return {"success": True, "message": "발행 완료 상태로 변경되었습니다."}

@router.delete("/posts/{post_id}", summary="포스팅 삭제")
def delete_blog_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="포스팅을 찾을 수 없습니다.")
    
    db.delete(post)
    db.commit()
    return {"success": True, "message": "포스팅이 삭제되었습니다."}

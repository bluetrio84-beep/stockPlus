from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api import deps
from app.services.ai_service import ai_service
from pydantic import BaseModel
from app.core.broadcaster import log_broadcaster
import asyncio
import random

router = APIRouter()

class PlanRequest(BaseModel):
    topic: str = None
    job_name: str = None

@router.post("/plan")
async def plan_video(request: PlanRequest, db: Session = Depends(deps.get_db)):
    """
    유튜브 자율 기획의 첫 단추 (PLANNING)를 태스크 큐에 삽입합니다.
    """
    job_name = request.job_name if request.job_name else f"YouTube Production: {request.topic or 'Trend Discovery'}"
    step_name = "PLANNING"
    payload = {"topic": request.topic}

    try:
        query = text("""
            INSERT INTO task_queue (job_name, step_name, payload, status) 
            VALUES (:job_name, :step_name, :payload, 'PENDING')
        """)
        db.execute(query, {
            "job_name": job_name,
            "step_name": step_name,
            "payload": json.dumps(payload),
        })
        db.commit()
        
        await log_broadcaster.broadcast("PLANNER", f"Autonomous Strategy queued: {job_name}", "PROCESS")
        return {"message": "Planning task queued.", "job_name": job_name, "status": "QUEUED"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

import json

class RenderRequest(BaseModel):
    topic: str = "Unknown Topic"
    script: str = "No script provided"

from app.services.harness_manager import harness_manager

@router.get("/status")
async def get_harness_status():
    """모든 하네스의 실시간 상태 조회"""
    return harness_manager.get_all_statuses()

@router.post("/stop")
async def stop_harness(name: str = "YouTube-Publisher"):
    """특정 하네스 긴급 정지"""
    success = await harness_manager.stop_harness(name)
    if success:
        return {"message": f"Harness [{name}] stopped successfully."}
    raise HTTPException(status_code=404, detail=f"Harness [{name}] not found or not running.")

@router.post("/render")
async def render_video(request: RenderRequest, db: Session = Depends(deps.get_db)):
    """
    영상 제작의 다음 단계(VIDEO)를 태스크 큐에 직접 삽입합니다.
    """
    job_name = f"YouTube Production: {request.topic}"
    step_name = "VIDEO"
    payload = {
        "topic": request.topic,
        "script": request.script
    }

    try:
        # 기존 대본 생성 작업(SCRIPTING)을 찾아서 연결하거나, 새로 시작함
        query = text("""
            INSERT INTO task_queue (job_name, step_name, payload, status) 
            VALUES (:job_name, :step_name, :payload, 'PENDING')
        """)
        db.execute(query, {
            "job_name": job_name,
            "step_name": step_name,
            "payload": json.dumps(payload),
        })
        db.commit()
        
        await log_broadcaster.broadcast("SYSTEM", f"Manual Render Triggered: {job_name}", "PROCESS")
        return {"message": "Rendering task queued.", "status": "QUEUED"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

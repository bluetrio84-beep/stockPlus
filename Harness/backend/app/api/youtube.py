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

@router.post("/plan")
async def plan_video(request: PlanRequest, db: Session = Depends(deps.get_db)):
    await log_broadcaster.broadcast("PLANNER", "Initializing autonomous video strategy...", "PROCESS")
    
    # 1. 시나리오 선정 (DB 데이터 vs AI 자율 리서치)
    try:
        await log_broadcaster.broadcast("PLANNER", "Accessing StockPlus DB for market insights...", "PROCESS")
        query = text("SELECT stock_name, change_rate FROM stockplus.stocks ORDER BY change_rate DESC LIMIT 3")
        result = db.execute(query).fetchall()
        
        if result:
            stocks_info = "오늘의 급등주 분석: " + ", ".join([f"{r[0]}({r[1]}%)" for r in result])
            await log_broadcaster.broadcast("SYSTEM", f"Market data fetched: {stocks_info[:50]}...", "SUCCESS")
            topic = stocks_info
        else:
            # [자율 브레인스토밍] 데이터가 없으면 AI가 스스로 주제를 생성
            await log_broadcaster.broadcast("PLANNER", "No local data. Engaging Autonomous Research Engine...", "WARNING")
            brainstorm_prompt = "현재 전 세계적인 금융/테크 트렌드 중 유튜브 쇼츠로 제작했을 때 가장 화제가 될만한 자극적인 주제 3가지를 키워드 형태로 알려줘."
            topic = await ai_service.generate_script(topic="Trend Discovery", custom_prompt=brainstorm_prompt)
            await log_broadcaster.broadcast("PLANNER", f"Agent discovered new viral scenario: {topic[:50]}...", "SUCCESS")
            
    except Exception as e:
        topic = "미래 테크놀로지와 AI 산업의 향방" # 최후의 수단
        await log_broadcaster.broadcast("SYSTEM", f"Research Error: {str(e)}. Using static backup.", "ERROR")

    # 2. 페르소나 설정
    query_cfg = text("SELECT cfg_key, cfg_value FROM h_configs")
    configs = {row[0]: row[1] for row in db.execute(query_cfg).fetchall()}
    persona = configs.get("agent_persona", "Professional")
    
    await log_broadcaster.broadcast("NARRATIVE", f"Agent persona set to '{persona}'. Crafting script...", "PROCESS")

    # 3. 최종 대본 생성
    script = await ai_service.generate_script(topic=topic, persona=persona)

    return {
        "topic": topic,
        "persona": persona,
        "script": script,
        "status": "PLANNING_COMPLETED"
    }

class RenderRequest(BaseModel):
    topic: str
    script: str

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
    영상 렌더링 파이프라인 가동 (매니저 등록 포함)
    """
    from app.harness_modules.youtube_harness import YouTubeHarness
    
    # 싱글톤 매니저에서 기존 인스턴스가 있으면 재사용, 없으면 생성
    agent = harness_manager.get_harness("YouTube-Publisher")
    if not agent:
        agent = YouTubeHarness()
        harness_manager.register(agent)
    
    async def run_render():
        await log_broadcaster.broadcast("SYSTEM", "Video Production Pipeline Engaged.", "PROCESS")
        try:
            await agent.initialize()
            await agent.execute({"topic": request.topic, "script": request.script})
        except asyncio.CancelledError:
            await log_broadcaster.broadcast("SYSTEM", "Pipeline task cancelled by user.", "WARNING")
        except Exception as e:
            await log_broadcaster.broadcast("SYSTEM", f"Critical Pipeline Failure: {str(e)}", "ERROR")
        
    asyncio.create_task(run_render())
    return {"message": "Rendering initiated.", "status": "PROCESSING"}

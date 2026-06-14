from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, settings as api_settings, agents as api_agents, youtube as api_youtube, stream as api_stream, tasks as api_tasks
from app.core.config import settings
from app.core.broadcaster import log_broadcaster
import asyncio

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(api_agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(api_youtube.router, prefix="/api/youtube", tags=["youtube"])
app.include_router(api_stream.router, prefix="/api/stream", tags=["stream"])
app.include_router(api_tasks.router, prefix="/api/tasks", tags=["tasks"])

# --- 시스템 하트비트 및 AutoDream 백그라운드 태스크 ---
@app.on_event("startup")
async def start_background_tasks():
    from app.services.memory_service import memory_service
    from app.services.harness_manager import harness_manager
    from app.api.deps import SessionLocal
    
    async def heartbeat():
        while True:
            await asyncio.sleep(15)
            try: await log_broadcaster.broadcast("SYSTEM", "Pulse Check: All AI harnesses nominal.", "INFO")
            except: pass

    async def auto_dream_loop():
        while True:
            await asyncio.sleep(120) # 2분마다 꿈을 꾸며 기억 정리
            db = SessionLocal()
            try:
                await memory_service.auto_dream(db)
            except Exception as e:
                print(f"Dreaming error: {e}")
            finally:
                db.close()

    asyncio.create_task(heartbeat())
    asyncio.create_task(auto_dream_loop())
    asyncio.create_task(harness_manager.start_worker())

@app.get("/")
def root():
    return {"message": "Welcome to Harness Engineering Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

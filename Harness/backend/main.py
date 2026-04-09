from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, settings as api_settings
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs"
)

# CORS 설정 (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실운영 환경에서는 프론트엔드 도메인으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_settings.router, prefix="/api/settings", tags=["settings"])

@app.get("/")
def root():
    return {"message": "Welcome to Harness Engineering Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

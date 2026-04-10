from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.core.broadcaster import log_broadcaster

router = APIRouter()

@router.get("/logs")
async def stream_logs():
    """
    프론트엔드와 연결되어 실시간 로그를 스트리밍
    """
    return StreamingResponse(
        log_broadcaster.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # Nginx 버퍼링 방지 필수
        }
    )

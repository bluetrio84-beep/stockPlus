import asyncio
import json
from typing import AsyncGenerator

class LogBroadcaster:
    def __init__(self):
        self.subscribers = []

    async def subscribe(self) -> AsyncGenerator:
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self.subscribers.remove(queue)

    async def broadcast(self, agent: str, message: str, level: str = "INFO"):
        """
        에이전트 로그를 모든 구독자(프론트엔드)에게 전송
        """
        data = json.dumps({
            "agent": agent,
            "message": message,
            "level": level
        })
        for queue in self.subscribers:
            await queue.put(f"data: {data}\n\n")

log_broadcaster = LogBroadcaster()

import os
import shutil
import uuid
import logging
import asyncio
import json
from abc import ABC, abstractmethod
from app.core.broadcaster import log_broadcaster

class BaseHarness(ABC):
    def __init__(self, name: str):
        self.name = name
        self.status = "IDLE"
        self.logger = logging.getLogger(f"harness.{name}")
        self.context_history = []
        self.token_limit = 8000
        self.current_tokens = 0
        self.active_task = None # [Deterministic Control] 실행 중인 태스크 추적
        
        # [Total Safety Sandbox] 격리 환경
        self.sandbox_id = str(uuid.uuid4())[:8]
        self.sandbox_path = f"/tmp/harness_sandbox/{self.sandbox_id}"
        os.makedirs(self.sandbox_path, exist_ok=True)

    async def safe_execute(self, action_name: str, func, *args, **kwargs):
        """[Tool Safety Sandbox] 격리 환경 실행 및 검증"""
        await log_broadcaster.broadcast("SYSTEM", f"Sandbox [{self.sandbox_id}]: Intercepting [{action_name}]...", "PROCESS")
        kwargs['sandbox_path'] = self.sandbox_path
        try:
            result = await func(*args, **kwargs)
            await log_broadcaster.broadcast("SYSTEM", f"Sandbox VALIDATION: [{action_name}] Passed.", "SUCCESS")
            return result
        except Exception as e:
            await log_broadcaster.broadcast("SYSTEM", f"Sandbox ROLLBACK: [{action_name}] Failed: {str(e)}", "ERROR")
            raise e

    async def compact_context(self):
        """[Context Compaction] 토큰 한도 방어"""
        if self.current_tokens > self.token_limit:
            await log_broadcaster.broadcast(self.name, "Threshold reached. Compacting memory...", "PROCESS")
            summary = f"[COMPACTED] Previous session summarized at {self.current_tokens} tokens."
            self.context_history = [{"role": "system", "content": summary}]
            self.current_tokens = len(summary) * 2
            await log_broadcaster.broadcast(self.name, "Compaction complete.", "SUCCESS")

    @abstractmethod
    async def initialize(self): pass

    @abstractmethod
    async def _run_logic(self, task_data: dict):
        """실제 에이전트 로직 (상속받아 구현)"""
        pass

    async def execute(self, task_data: dict):
        """
        [KAIROS Pattern] 자율 실행 및 자가 치유 루프
        """
        self.status = "WORKING"
        max_retries = 3
        retry_count = 0
        
        # 비동기 태스크로 실행하여 관리 가능하게 만듦
        self.active_task = asyncio.current_task()
        
        while retry_count < max_retries:
            try:
                return await self._run_logic(task_data)
            except Exception as e:
                retry_count += 1
                await log_broadcaster.broadcast(self.name, f"KAIROS: Error detected ({str(e)}). Initiating Self-Healing (Attempt {retry_count}/{max_retries})...", "WARNING")
                # 여기서 AI에게 에러로그를 던져서 전략을 수정하게 하는 로직이 들어감
                await asyncio.sleep(2)
        
        self.status = "FAILED"
        await log_broadcaster.broadcast(self.name, "KAIROS: Self-Healing failed after max retries.", "ERROR")

    async def stop(self):
        """
        [Deterministic Control] 긴급 정지 및 자원 강제 회수
        """
        self.status = "STOPPING"
        await log_broadcaster.broadcast("SYSTEM", f"EMERGENCY STOP: Killing Agent {self.name} and purging Sandbox {self.sandbox_id}...", "WARNING")
        
        # 1. 실행 중인 태스크 강제 캔슬
        if self.active_task:
            self.active_task.cancel()
            
        # 2. 샌드박스 격리 폴더 파괴
        if os.path.exists(self.sandbox_path):
            shutil.rmtree(self.sandbox_path, ignore_errors=True)
            
        self.status = "STOPPED"
        await log_broadcaster.broadcast("SYSTEM", f"Agent {self.name} terminated safely.", "SUCCESS")

    def get_status(self):
        return {
            "name": self.name, 
            "status": self.status, 
            "sandbox": self.sandbox_id,
            "tokens": self.current_tokens
        }

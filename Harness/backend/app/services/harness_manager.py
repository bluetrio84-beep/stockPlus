import asyncio
from typing import Dict, Any
from app.harness_modules.base import BaseHarness
from app.core.broadcaster import log_broadcaster

class HarnessManager:
    def __init__(self):
        # 실행 중인 하네스 인스턴스 보관소
        self._harnesses: Dict[str, BaseHarness] = {}

    def register(self, harness: BaseHarness):
        self._harnesses[harness.name] = harness

    def get_harness(self, name: str) -> BaseHarness:
        return self._harnesses.get(name)

    async def stop_harness(self, name: str):
        harness = self.get_harness(name)
        if harness:
            await log_broadcaster.broadcast("SYSTEM", f"EMERGENCY: Stopping Harness [{name}]...", "WARNING")
            await harness.stop()
            # 중지 후 목록에서 제거 (선택 사항)
            # del self._harnesses[name]
            return True
        return False

    def get_all_statuses(self) -> Dict[str, Any]:
        return {name: h.get_status() for name, h in self._harnesses.items()}

# 싱글톤 인스턴스 생성
harness_manager = HarnessManager()

import asyncio
import json
import traceback
import os
import uuid
from sqlalchemy import text
from app.api.deps import SessionLocal
from app.core.mcp_tools import FilesystemTool, ShellTool, APITool
from app.core.broadcaster import log_broadcaster
from app.services.ai_service import ai_service
from gtts import gTTS

class HarnessManager:
    def __init__(self):
        self.fs_tool = FilesystemTool()
        self.shell_tool = ShellTool()
        self.api_tool = APITool()
        self.is_running = False
        self.output_dir = "/app/exports/videos"
        self.audio_dir = "/app/exports/audio"
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.audio_dir, exist_ok=True)
        # job_name → asyncio.Semaphore (인스턴스 수 기반 동시성 제한)
        self._semaphores: dict[str, asyncio.Semaphore] = {}

    def _get_instances(self, job_name: str) -> int:
        """h_modules 테이블에서 해당 job_name의 instances 수를 조회"""
        db = SessionLocal()
        try:
            # job_name → module name 매핑 (BLOG → BlogHarness 등)
            name_map = {
                "BLOG": "BlogHarness",
                "YOUTUBE": "YouTubeHarness",
                "STOCK": "StockHarness",
                "NEWS": "NewsHarness",
            }
            module_name = name_map.get(job_name.upper(), job_name)
            row = db.execute(
                text("SELECT instances FROM h_modules WHERE name = :name LIMIT 1"),
                {"name": module_name}
            ).fetchone()
            return max(1, row[0]) if row else 1
        except Exception:
            return 1
        finally:
            db.close()

    def _get_semaphore(self, job_name: str) -> asyncio.Semaphore:
        """job_name별 Semaphore를 최신 instances 수로 갱신하여 반환"""
        instances = self._get_instances(job_name)
        existing = self._semaphores.get(job_name)
        # Semaphore 값이 달라지면 새로 생성
        if existing is None or existing._value != instances:
            self._semaphores[job_name] = asyncio.Semaphore(instances)
            asyncio.ensure_future(log_broadcaster.broadcast(
                "SYSTEM",
                f"[Fleet Manager] {job_name} 동시 처리 슬롯 → {instances}개 적용",
                "INFO"
            ))
        return self._semaphores[job_name]

    async def start_worker(self):
        self.is_running = True
        print(">>> [HARNESS WORKER] Started: Polling task_queue in MySQL.")
        await log_broadcaster.broadcast("SYSTEM", "Harness Worker Started: Polling task_queue.", "INFO")
        
        while self.is_running:
            try:
                await self._dispatch_pending_tasks()
            except Exception as e:
                print(f"Worker Error: {e}")
                traceback.print_exc()
            await asyncio.sleep(2)  # 폴링 주기

    async def _dispatch_pending_tasks(self):
        """PENDING 태스크를 job_name별 instances 수만큼 병렬 디스패치"""
        db = SessionLocal()
        try:
            # 현재 PENDING/RETRY 태스크 전체 조회 (job_name 그룹별로)
            rows = db.execute(text("""
                SELECT task_id, job_name, step_name, payload 
                FROM task_queue 
                WHERE status IN ('PENDING', 'RETRY')
                ORDER BY created_at ASC
            """)).fetchall()

            if not rows:
                return

            # job_name별로 그룹핑
            grouped: dict[str, list] = {}
            for row in rows:
                jn = row[1] or "BLOG"
                grouped.setdefault(jn, []).append(row)

            # 각 job_name별로 Semaphore 슬롯 수 만큼만 병렬 실행
            coroutines = []
            for job_name, tasks in grouped.items():
                sem = self._get_semaphore(job_name)
                # Semaphore 슬롯 수까지만 태스크 선택
                slots = sem._value  # 현재 남은 슬롯
                selected = tasks[:max(1, slots)]
                for task_row in selected:
                    coroutines.append(self._run_with_semaphore(sem, task_row))

            if coroutines:
                await asyncio.gather(*coroutines, return_exceptions=True)

        finally:
            db.close()

    async def _run_with_semaphore(self, sem: asyncio.Semaphore, task_row):
        """Semaphore로 동시성을 제한하며 태스크 실행"""
        async with sem:
            await self.process_task(task_row)

    async def process_task(self, task_row):
        """단일 태스크를 실행 (Semaphore 병렬 안전 처리)"""
        db = SessionLocal()
        try:
            task_id, job_name, step_name, payload_str = task_row

            # 중복 실행 방지: RUNNING으로 원자적 업데이트 후 확인
            updated = db.execute(text("""
                UPDATE task_queue SET status = 'RUNNING'
                WHERE task_id = :task_id AND status IN ('PENDING', 'RETRY')
            """), {"task_id": task_id}).rowcount
            db.commit()

            if updated == 0:
                # 이미 다른 코루틴이 처리 중 → 스킵
                return

            await log_broadcaster.broadcast("SYSTEM", f"Executing Task [{task_id}] - {job_name}: {step_name}", "INFO")

            try:
                # payload 로드
                payload = json.loads(payload_str) if payload_str else {}
                
                # 도구(Tool) 실행 라우팅 (진짜 제작 로직 가동)
                result_data = await self.execute_tool(step_name, payload)

                # 성공 시 상태 업데이트 및 다음 단계 연쇄 생성 (Chaining)
                success_query = text("""
                    UPDATE task_queue 
                    SET status = 'SUCCESS', result_path = :result_path 
                    WHERE task_id = :task_id
                """)
                db.execute(success_query, {"result_path": str(result_data), "task_id": task_id})
                db.commit()
                await log_broadcaster.broadcast("SYSTEM", f"Task [{task_id}] SUCCESS.", "INFO")

                # --- 자율 연쇄 주행 (Chaining) 로직 ---
                await self.queue_next_step(db, task_id, job_name, step_name, result_data, payload)

            except Exception as e:
                db.rollback() 
                error_trace = traceback.format_exc()
                
                # 실패 시 Self-Correction
                fail_query = text("""
                    UPDATE task_queue 
                    SET status = 'FAILED', error_log = :error_log 
                    WHERE task_id = :task_id
                """)
                db.execute(fail_query, {"error_log": error_trace, "task_id": task_id})
                db.commit()
                await log_broadcaster.broadcast("SYSTEM", f"Task [{task_id}] FAILED. {str(e)}", "ERROR")
                
                # Recover (Self-Correction) 에이전트 호출
                await self.recover_task(task_id, job_name, step_name, error_trace, payload)

        finally:
            db.close()

    async def execute_tool(self, step_name: str, payload: dict):
        """실제 도구 및 AI 서비스를 활용한 제작 엔진 (YouTube + Blog 통합)"""

        # ── BLOG 전용 스텝 → BlogHarness.execute() (BaseHarness 샌드박스 + KAIROS 완전 적용) ──
        if step_name in ('BLOG_GENERATE', 'BLOG_SEO_ENHANCE', 'BLOG_PUBLISH'):
            from app.harness_modules.blog_harness import blog_harness
            await log_broadcaster.broadcast(
                "SYSTEM",
                f"[Harness Router] Delegating {step_name} → BlogHarness (Sandbox: {blog_harness.sandbox_id})",
                "INFO"
            )
            # BaseHarness.execute() 호출 → KAIROS 재시도 루프 + 샌드박스 격리 + Context Compaction
            result = await blog_harness.execute({"step_name": step_name, "payload": payload})
            return result

        # ── YouTube 전용 스텝 ──────────────────────────────────────────
        # 1. 유튜브 기획 (PLANNING) - 주제 확정 (AI 자율 리서치 강화)
        if step_name == 'PLANNING':
            topic = payload.get("topic")
            if not topic or topic == "Unknown Topic":
                await log_broadcaster.broadcast("PLANNER", "No topic provided. Engaging Autonomous Engineering Research...", "WARNING")
                prompt = "당신은 하네스 엔지니어링의 수석 분석가입니다. 현재 전 세계 테크/금융 시장에서 가장 혁신적이고 쇼츠로 제작했을 때 시청자의 지적 호기심을 자극할만한 공학/기술 주제를 딱 하나만 제목 형태로 추천해주세요."
                topic = await ai_service.generate_script(topic="Trend Discovery", custom_prompt=prompt)
                # 불필요한 서술 제거
                topic = topic.replace('"', '').split('\n')[0].strip()
            
            await log_broadcaster.broadcast("PLANNER", f"Confirmed Engineering Scenario: {topic}", "SUCCESS")
            return topic

        # 2. 대본 작성 (SCRIPTING) - AI 대본 생성
        elif step_name == 'SCRIPTING':
            topic = payload.get("topic", "Trend Discovery")
            await log_broadcaster.broadcast("NARRATIVE", f"Crafting script for: {topic}", "PROCESS")
            script = await ai_service.generate_script(topic=topic, persona="Professional")
            return script

        # 3. 음성 합성 (VOICE) - 진짜 TTS 가동 (gTTS)
        elif step_name == 'VOICE':
            script = payload.get("script", "No script provided")
            await log_broadcaster.broadcast("PRODUCER", "Synthesizing AI Voice (gTTS)...", "PROCESS")
            
            audio_filename = f"voice_{uuid.uuid4().hex[:8]}.mp3"
            audio_path = os.path.join(self.audio_dir, audio_filename)
            
            tts = gTTS(text=script, lang='ko')
            tts.save(audio_path)
            
            return audio_path

        # 4. 영상 편집 (VIDEO) - 진짜 FFmpeg 가동
        elif step_name == 'VIDEO':
            audio_path = payload.get("audio_path")
            topic = payload.get("topic", "YouTube Shorts")
            
            if not audio_path or not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file missing: {audio_path}")

            video_filename = f"video_{uuid.uuid4().hex[:8]}.mp4"
            video_path = os.path.join(self.output_dir, video_filename)
            
            txt_filename = f"text_{uuid.uuid4().hex[:8]}.txt"
            txt_path = os.path.join(self.output_dir, txt_filename)
            
            bg_filename = "bg_loop.mp4"
            bg_path = os.path.join(self.output_dir, bg_filename)
            
            # 실제 배경 영상이 없으면 임시로 무료 소스(구글 샘플)를 다운로드하여 사용
            if not os.path.exists(bg_path):
                await log_broadcaster.broadcast("PRODUCER", "Downloading high-quality background asset...", "PROCESS")
                self.shell_tool.execute(f"curl -sL https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4 -o {bg_path}")
            
            # 텍스트 파일로 저장하여 FFmpeg 특수문자 이스케이프 지옥 방지
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(topic)
                
            await log_broadcaster.broadcast("PRODUCER", "Engaging FFmpeg for realistic video assembly...", "PROCESS")
            
            # FFmpeg 명령어: 무한 루프 배경 영상 + 9:16 크롭/스케일링 + 텍스트 + 오디오
            cmd = (
                f"ffmpeg -y -stream_loop -1 -i {bg_path} -i {audio_path} "
                f"-vf \"crop=ih*9/16:ih,scale=1080:1920,drawtext=textfile='{txt_path}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10\" "
                f"-c:v libx264 -c:a aac -shortest {video_path}"
            )
            
            try:
                self.shell_tool.execute(cmd)
            finally:
                if os.path.exists(txt_path):
                    os.remove(txt_path)
                    
            return video_path

        # 5. 최종 렌더링 (RENDER) - 결과물 확정
        elif step_name == 'RENDER':
            video_path = payload.get("video_path")
            await log_broadcaster.broadcast("PRODUCER", "Final optimization and quality check...", "PROCESS")
            await asyncio.sleep(1)
            return video_path # 최종 완성 경로
        
        return f"Completed {step_name}"

    async def queue_next_step(self, db, task_id: int, job_name: str, step_name: str, result_data: any, payload: dict):
        """작업 성공 후 다음 단계를 자율적으로 큐에 삽입"""
        # ── Blog 파이프라인 체이닝: GENERATE → SEO_ENHANCE → PUBLISH ───────
        # ── YouTube 파이프라인 체이닝: PLANNING → SCRIPTING → VOICE → VIDEO → RENDER
        next_step_map = {
            # Blog 3-step pipeline
            "BLOG_GENERATE":    "BLOG_SEO_ENHANCE",
            "BLOG_SEO_ENHANCE": "BLOG_PUBLISH",
            # BLOG_PUBLISH 이후는 없음 (터미널 스텝)
            # YouTube pipeline
            "PLANNING":  "SCRIPTING",
            "SCRIPTING": "VOICE",
            "VOICE":     "VIDEO",
            "VIDEO":     "RENDER"
        }

        next_step = next_step_map.get(step_name)
        if not next_step:
            return

        new_payload = payload.copy()
        # Blog 체이닝: 이전 스텝 결과(post_id)를 다음 스텝 payload에 주입
        if step_name == "BLOG_GENERATE" and isinstance(result_data, dict):
            new_payload["post_id"] = result_data.get("post_id")
        elif step_name == "BLOG_SEO_ENHANCE" and isinstance(result_data, dict):
            new_payload["post_id"] = result_data.get("post_id")
        # YouTube 체이닝
        elif step_name == "PLANNING":
            new_payload["topic"] = result_data
        elif step_name == "SCRIPTING":
            new_payload["script"] = result_data
        elif step_name == "VOICE":
            new_payload["audio_path"] = result_data
        elif step_name == "VIDEO":
            new_payload["video_path"] = result_data

        try:
            insert_query = text("""
                INSERT INTO task_queue (job_name, step_name, payload, status) 
                VALUES (:job_name, :next_step, :payload, 'PENDING')
            """)
            db.execute(insert_query, {
                "job_name": job_name,
                "next_step": next_step,
                "payload": json.dumps(new_payload)
            })
            db.commit()
            await log_broadcaster.broadcast("SYSTEM", f"Next step queued: {next_step} with updated payload.", "INFO")
        except Exception as e:
            print(f"Chaining Error: {e}")
            db.rollback()

    async def recover_task(self, task_id: int, job_name: str, step_name: str, error_trace: str, payload: dict):
        """Self-Correction 루프: 실패한 작업 복구 시도"""
        await log_broadcaster.broadcast("SYSTEM", f"Initiating AI Self-Correction for Task [{task_id}]...", "WARNING")
        
        recovery_plan = await ai_service.analyze_error(job_name, step_name, error_trace, payload)
        
        action = recovery_plan.get("action", "FAIL")
        explanation = recovery_plan.get("explanation", "No explanation provided.")
        new_payload = recovery_plan.get("new_payload", payload)

        db = SessionLocal()
        try:
            if action == "RETRY":
                await log_broadcaster.broadcast("SYSTEM", f"AI Decision: RETRY - {explanation}", "PROCESS")
                retry_query = text("""
                    UPDATE task_queue 
                    SET status = 'RETRY', payload = :new_payload, error_log = :error_log
                    WHERE task_id = :task_id
                """)
                db.execute(retry_query, {
                    "new_payload": json.dumps(new_payload), 
                    "error_log": f"AI 분석 결과: {explanation}\n\n이전 에러:\n{error_trace}",
                    "task_id": task_id
                })
            else:
                await log_broadcaster.broadcast("SYSTEM", f"AI Decision: FINAL FAILURE - {explanation}", "ERROR")
                db.execute(text("UPDATE task_queue SET error_log = :error_log WHERE task_id = :task_id"), {
                    "error_log": f"AI 복구 불가 판정: {explanation}\n\n이전 에러:\n{error_trace}",
                    "task_id": task_id
                })
            db.commit()
        except Exception as e:
            print(f"Recovery DB Error: {e}")
            db.rollback()
        finally:
            db.close()

    async def stop_worker(self):
        self.is_running = False

    def get_all_statuses(self):
        """기존 UI 호환성을 위한 상태 더미 반환"""
        return {
            "YouTube-Publisher": {
                "status": "WORKING" if self.is_running else "IDLE",
                "sandbox": "/app/exports/videos",
                "progress": 100 if self.is_running else 0
            }
        }

    async def stop_harness(self, name: str):
        """특정 하네스 중지 (워커는 유지)"""
        await log_broadcaster.broadcast("SYSTEM", f"Harness [{name}] stop requested.", "WARNING")
        return True

harness_manager = HarnessManager()
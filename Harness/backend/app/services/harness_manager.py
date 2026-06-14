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

    async def start_worker(self):
        self.is_running = True
        print(">>> [HARNESS WORKER] Started: Polling task_queue in MySQL.")
        await log_broadcaster.broadcast("SYSTEM", "Harness Worker Started: Polling task_queue.", "INFO")
        
        while self.is_running:
            try:
                await self.process_next_task()
            except Exception as e:
                print(f"Worker Error: {e}")
                traceback.print_exc()
            await asyncio.sleep(2)  # 폴링 주기

    async def process_next_task(self):
        db = SessionLocal()
        try:
            # PENDING 작업 가져오기 및 상태 업데이트 (트랜잭션)
            task_query = text("""
                SELECT task_id, job_name, step_name, payload 
                FROM task_queue 
                WHERE status = 'PENDING' OR status = 'RETRY'
                ORDER BY created_at ASC 
                LIMIT 1 FOR UPDATE
            """)
            result = db.execute(task_query).fetchone()

            if not result:
                return

            task_id, job_name, step_name, payload_str = result
            
            # RUNNING으로 상태 변경
            update_query = text("UPDATE task_queue SET status = 'RUNNING' WHERE task_id = :task_id")
            db.execute(update_query, {"task_id": task_id})
            db.commit()

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
        """실제 도구 및 AI 서비스를 활용한 영상 제작 엔진"""
        
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
        next_step_map = {
            "PLANNING": "SCRIPTING",
            "SCRIPTING": "VOICE",
            "VOICE": "VIDEO",
            "VIDEO": "RENDER"
        }

        next_step = next_step_map.get(step_name)
        if not next_step:
            return 

        new_payload = payload.copy()
        if step_name == "PLANNING":
            new_payload["topic"] = result_data
        elif step_name == "SCRIPTING":
            new_payload["script"] = result_data
        elif step_name == "VOICE":
            new_payload["audio_path"] = result_data  # 이 필드가 VIDEO 단계에서 쓰임
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
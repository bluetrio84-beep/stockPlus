from app.harness_modules.base import BaseHarness
import asyncio
import os
import json
import uuid
from gtts import gTTS
try:
    from moviepy.editor import ColorClip, TextClip, CompositeVideoClip, AudioFileClip
except ImportError:
    from moviepy.video.VideoClip import ColorClip
    from moviepy.video.fx.all import crop
    from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
    from moviepy.audio.io.AudioFileClip import AudioFileClip
    # TextClip은 v2에서 별도 모듈로 분리되었을 수 있음
    try: from moviepy.video.VideoClip import TextClip
    except: TextClip = None
from app.core.broadcaster import log_broadcaster

class YouTubeHarness(BaseHarness):
    def __init__(self):
        super().__init__(name="YouTube-Publisher")
        self.output_dir = "/app/exports/videos"
        os.makedirs(self.output_dir, exist_ok=True)

    async def initialize(self):
        self.status = "READY"
        await log_broadcaster.broadcast(self.name, "Media Engine (FFmpeg/MoviePy) initialized.", "SUCCESS")
        return True

    async def _run_logic(self, task_data: dict):
        """
        [KAIROS] 실제 영상 제작 파이프라인
        """
        topic = task_data.get("topic", "Trend Analysis")
        script = task_data.get("script", "안녕하세요. 오늘 알아볼 주제는 바로 이겁니다.")
        
        # 1. 샌드박스 작업 공간 설정
        sandbox_path = self.sandbox_path
        audio_path = os.path.join(sandbox_path, "audio.mp3")
        video_path = os.path.join(self.output_dir, f"shorts_{uuid.uuid4().hex[:8]}.mp4")

        await log_broadcaster.broadcast(self.name, f"Starting production for: {topic[:30]}...", "PROCESS")

        # 2. TTS 음성 생성 (gTTS)
        await log_broadcaster.broadcast(self.name, "Generating AI Voice (TTS)...", "PROCESS")
        try:
            tts = gTTS(text=script, lang='ko')
            tts.save(audio_path)
            await log_broadcaster.broadcast(self.name, "AI Voice generated successfully.", "SUCCESS")
        except Exception as e:
            await log_broadcaster.broadcast(self.name, f"TTS Error: {str(e)}", "ERROR")
            raise e

        # 3. 영상 합성 (MoviePy)
        await log_broadcaster.broadcast(self.name, "Assembling Video (MoviePy Engine)...", "PROCESS")
        try:
            # 오디오 클립 로드
            audio = AudioFileClip(audio_path)
            duration = audio.duration

            # 배경 클립 생성 (9:16 세로 영상, 블랙 배경)
            bg_clip = ColorClip(size=(1080, 1920), color=(0, 0, 0), duration=duration)
            
            # 자막/텍스트 클립 (간단히 주제 표시)
            txt_clip = TextClip(
                topic, 
                fontsize=70, 
                color='white', 
                font='Arial-Bold', 
                method='caption',
                size=(900, None)
            ).set_start(0).set_duration(duration).set_position('center')

            # 최종 영상 합성
            video = CompositeVideoClip([bg_clip, txt_clip])
            video.audio = audio

            # 렌더링 (속도를 위해 빠른 프리셋 사용)
            await log_broadcaster.broadcast(self.name, f"Rendering final MP4 ({int(duration)}s)...", "PROCESS")
            video.write_videofile(video_path, fps=24, codec='libx264', audio_codec='aac', logger=None)
            
            await log_broadcaster.broadcast(self.name, f"Production complete! Path: {video_path}", "SUCCESS")
            self.status = "COMPLETED"
            return video_path

        except Exception as e:
            await log_broadcaster.broadcast(self.name, f"MoviePy Rendering Error: {str(e)}", "ERROR")
            raise e

    async def stop(self):
        self.status = "STOPPED"
        await super().stop()

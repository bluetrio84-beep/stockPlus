import os
import subprocess
import logging

logger = logging.getLogger(__name__)

class FilesystemTool:
    def __init__(self, base_dir: str = "/app/exports"):
        self.base_dir = base_dir

    def read_file(self, filename: str) -> str:
        filepath = os.path.join(self.base_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading file {filepath}: {e}")
            raise e

    def write_file(self, filename: str, content: str) -> bool:
        filepath = os.path.join(self.base_dir, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            logger.error(f"Error writing file {filepath}: {e}")
            raise e

class ShellTool:
    @staticmethod
    def execute(command: str) -> str:
        """Executes a shell command and returns its stdout/stderr."""
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
            return result.stdout
        except subprocess.CalledProcessError as e:
            error_msg = f"Command '{e.cmd}' failed with return code {e.returncode}\nstdout: {e.stdout}\nstderr: {e.stderr}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

class APITool:
    @staticmethod
    def upload_youtube_video(video_path: str, title: str, description: str) -> str:
        # 실제 구현은 api/youtube.py 등에 있는 로직을 호출해야 함
        logger.info(f"Simulating YouTube upload for {video_path}")
        return f"https://youtube.com/watch?v=mock_video_id"

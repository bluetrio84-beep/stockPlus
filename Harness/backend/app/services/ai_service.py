import os
import google.generativeai as genai
from app.core.config import settings

class AiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.model = None

    async def generate_script(self, topic: str, persona: str = "Professional", custom_prompt: str = ""):
        """
        주제와 페르소나를 바탕으로 유튜브 쇼츠 대본을 생성합니다.
        """
        if not self.model:
            return "Error: Gemini API Key not configured."

        from app.core.broadcaster import log_broadcaster
        await log_broadcaster.broadcast("NARRATIVE", f"Initializing narrative generation for topic: '{topic}'...")
        
        base_prompt = f"""
        당신은 유튜브 크리에이터 에이전트입니다.
        주제: {topic}
        말투: {persona}
        지침: {custom_prompt}
        
        위 정보를 바탕으로 시청자의 시선을 끄는 1분 내외의 유튜브 쇼츠 대본을 작성해주세요.
        반드시 [인트로 - 본문 - 아웃트로] 형식을 갖춰야 하며, {persona}의 특징을 잘 살려주세요.
        """

        try:
            await log_broadcaster.broadcast("NARRATIVE", "Connecting to Gemini 1.5 Pro engine...", "PROCESS")
            response = self.model.generate_content(base_prompt)
            
            # 토큰 사용량 및 비용 계산
            input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
            output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
            cost = (input_tokens * 0.000000075) + (output_tokens * 0.0000003)
            
            await log_broadcaster.broadcast("NARRATIVE", f"Script generated successfully. (Tokens: {input_tokens+output_tokens}, Cost: ${cost:.4f})", "SUCCESS")
            return response.text
        except Exception as e:
            await log_broadcaster.broadcast("NARRATIVE", f"Critical Error: {str(e)}", "ERROR")
            return f"Error generating script: {str(e)}"

ai_service = AiService()

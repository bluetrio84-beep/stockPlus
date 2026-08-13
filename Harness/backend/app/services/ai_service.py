import os
import google.generativeai as genai
from app.core.config import settings

# 토큰 1개 ≈ 4자(영문) 기준 실용적 추정치
MAX_PROMPT_CHARS = 12000  # ~3,000 tokens — Gemini Flash 안전 상한

class AiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.model = None

    @staticmethod
    def compact_text(text: str, max_chars: int = MAX_PROMPT_CHARS) -> str:
        """
        [Context Compaction] 텍스트가 max_chars를 초과하면 앞부분을 잘라
        토큰 오버플로우를 방지합니다.
        """
        if len(text) <= max_chars:
            return text
        import logging
        logging.getLogger("ai_service").warning(
            f"[Context Compaction] Prompt too long ({len(text)} chars) → truncating to {max_chars} chars"
        )
        return text[:max_chars] + "\n...[이하 Context Compaction으로 생략됨]"

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

    async def analyze_error(self, job_name: str, step_name: str, error_log: str, payload: dict):
        """
        에러 로그를 분석하여 복구 전략을 제안합니다. (Self-Correction)
        """
        if not self.model:
            return {"action": "FAIL", "explanation": "Gemini API Key not configured."}

        raw_prompt = f"""
        당신은 하네스 자율 주행 에이전트의 '복구 오케스트레이터'입니다.
        현재 작업이 실패했습니다. 에러 로그를 분석하여 해결책을 JSON으로 응답하세요.

        [작업 정보]
        - Job Name: {job_name}
        - Step Name: {step_name}
        - Original Payload: {payload}

        [에러 로그]
        {error_log}

        [응답 형식 (반드시 이 JSON만 출력)]
        {{
            "action": "RETRY" 또는 "FAIL",
            "new_payload": {{ ... 수정된 페이로드 ... }},
            "explanation": "에러 원인 및 수정 사항 요약"
        }}
        """
        # [Context Compaction] 에러 로그가 너무 길 경우 압축
        prompt = self.compact_text(raw_prompt)

        try:
            response = self.model.generate_content(prompt)
            # JSON 응답만 추출 (마크다운 코드 블록 제거 등)
            content = response.text.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            import json
            return json.loads(content)
        except Exception as e:
            return {"action": "FAIL", "explanation": f"Recovery AI failed: {str(e)}"}

    async def generate_blog_insight(self, quant_data: dict) -> str:
        """
        수집된 퀀트 데이터를 바탕으로 3줄 시장 요약 및 종합 주가 전망 코멘트 작성
        """
        themes = quant_data.get("themes", [])
        sectors = quant_data.get("sectors", [])

        top_theme = themes[0]["theme_name"] if themes else "주요 테마"
        top_sector = sectors[0]["industry_name"] if sectors else "주요 업종"

        if not self.model:
            return f"1. 금일 주식 시장은 {top_theme} 및 {top_sector} 업종을 중심 강세를 보였습니다.\n2. 수급 측면에서 기관과 외국인의 매수세가 선별적으로 유입되었습니다.\n3. 주도주 퀀트 분석에 따른 단기 변동성 관리가 필요한 시점입니다."

        raw_prompt = f"""
        당신은 수석 퀀트 에이널리스트입니다. 아래 오늘 자 대한민국 주식 시장 데이터(테마, 업종)를 보고,
        블로그 독자를 위한 '오늘의 3줄 시장 종합 가이드'를 전문적이고 인디고/퀀트 스타일로 3문장 작성해주세요.

        [오늘의 테마 데이터]
        {themes[:5]}

        [오늘의 업종 데이터]
        {sectors[:5]}

        [지침]
        - 구체적인 테마명과 업종명을 언급할 것.
        - 투자의견(주도주 수급 및 단기 대응 전략)을 명확하게 제시할 것.
        - 불필요한 인사말 없이 정확히 3문장의 가이드라인만 출력할 것.
        """
        # [Context Compaction] 실제 적용
        prompt = self.compact_text(raw_prompt)

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"1. 금일 시장은 {top_theme} 섹터를 필두로 한 강세 흐름을 나타냈습니다.\n2. {top_sector} 등 수급 개선 업종을 중심으로 차별화 장세가 이어지고 있습니다.\n3. AI 예측 신뢰도가 높은 상위 종목 중심의 스위칭 전략을 권장합니다."

ai_service = AiService()


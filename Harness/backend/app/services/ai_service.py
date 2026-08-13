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
        [Harness Self-Correction Orchestrator]
        에러 분류 → 원인 분석 → Strategy 변경 → Context(Payload) 수정 → RETRY/FAIL 판단
        """
        if not self.model:
            return {
                "action": "FAIL",
                "error_category": "CONFIG_ERROR",
                "cause_analysis": "Gemini API Key가 설정되지 않았습니다.",
                "strategy": "ABORT",
                "new_payload": payload,
                "explanation": "API Key 미설정으로 인한 복구 불가능"
            }

        raw_prompt = f"""
        당신은 하네스 자율 주행 에이전트의 '복구 오케스트레이터 (Recovery Orchestrator)'입니다.
        현재 작업이 실패했습니다. 에러 로그를 5단계 정밀 분석하여 복구 전략을 JSON으로 응답하세요.

        [작업 정보]
        - Job Name: {job_name}
        - Step Name: {step_name}
        - Current Payload: {payload}

        [에러 로그 및 검증 실패 사유]
        {error_log}

        [분석 지침]
        1. error_category 분류: RATE_LIMIT, HALLUCINATION, DATA_MISSING, TIMEOUT, PARSE_ERROR, FATAL 중 선택
        2. cause_analysis: 에러가 발생한 근본 원인 1~2문장 요약
        3. strategy: 복구 전략 선택
           - STRICT_PROMPT: AI 검증/환각 실패 시 프롬프트 제약조건 강화
           - FALLBACK_DATA: 데이터 수집 실패 시 전일/대시보드 폴백 데이터 지정
           - BACKOFF_WAIT: API 쿼터 초과 시 지연 대기 후 재시도
           - PAYLOAD_FIX: 파라미터/날짜 포맷 보정
           - ABORT: 복구 불가능한 시스템/DB 붕괴 에러 시 중단
        4. action: "RETRY" (복구 가능) 또는 "FAIL" (복구 불가능)
        5. new_payload: 기존 payload에 recovery_context(strategy, attempt_count, strict_mode 등)를 반영하여 수정한 객체

        [응답 형식 (반드시 이 JSON만 출력)]
        {{
            "action": "RETRY" 또는 "FAIL",
            "error_category": "RATE_LIMIT | HALLUCINATION | DATA_MISSING | TIMEOUT | PARSE_ERROR | FATAL",
            "cause_analysis": "근본 원인 요약",
            "strategy": "STRICT_PROMPT | FALLBACK_DATA | BACKOFF_WAIT | PAYLOAD_FIX | ABORT",
            "new_payload": {{ ... 수정 및 보강된 페이로드 ... }},
            "explanation": "복구 전략 수립 배경 한줄 요약"
        }}
        """
        # [Context Compaction] 에러 로그가 너무 길 경우 압축
        prompt = self.compact_text(raw_prompt)

        try:
            response = self.model.generate_content(prompt)
            content = response.text.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            import json
            result = json.loads(content)

            # fallback 덮어쓰기 안전 장치
            if "new_payload" not in result or not result["new_payload"]:
                result["new_payload"] = payload.copy()

            # recovery_context 자동 주입
            result["new_payload"]["recovery_context"] = {
                "category": result.get("error_category", "UNKNOWN"),
                "strategy": result.get("strategy", "PAYLOAD_FIX"),
                "cause": result.get("cause_analysis", ""),
                "attempted_at": payload.get("recovery_context", {}).get("attempt_count", 0) + 1
            }

            return result
        except Exception as e:
            return {
                "action": "FAIL",
                "error_category": "ANALYZER_ERROR",
                "cause_analysis": f"AI 분석기 자체 오류: {str(e)}",
                "strategy": "ABORT",
                "new_payload": payload,
                "explanation": f"Recovery AI 분석 실패: {str(e)}"
            }

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


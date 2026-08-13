"""
HE Rules Engine - 중앙 집중 규칙 관리자
모든 하네스 에이전트는 실행 전 반드시 이 Rules를 통과해야 합니다.
Rules는 에이전트별로 등록되며, 위반 시 실행을 차단합니다.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger("harness.rules")

KST = timezone(timedelta(hours=9))


class RuleViolation(Exception):
    """규칙 위반 예외 - 실행 차단용"""
    pass


class HarnessRuleEngine:
    """
    [Rules Layer] 중앙 규칙 엔진
    에이전트 실행 전 payload/context를 검사하여 규칙 위반 시 차단합니다.
    """

    def evaluate(self, job_name: str, step_name: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Tuple[bool, str]:
        """
        해당 job_name의 모든 규칙을 순서대로 평가합니다.
        Returns: (passed: bool, reason: str)
        """
        rules = self._get_rules(job_name, step_name)
        for rule_fn, rule_name in rules:
            try:
                passed, reason = rule_fn(payload, db)
                if not passed:
                    logger.warning(f"[RuleEngine] BLOCKED - {rule_name}: {reason}")
                    return False, f"[{rule_name}] {reason}"
            except Exception as e:
                logger.error(f"[RuleEngine] Rule error in {rule_name}: {e}")
                return False, f"[{rule_name}] 규칙 평가 중 오류: {str(e)}"

        logger.info(f"[RuleEngine] All rules passed for {job_name}:{step_name}")
        return True, "OK"

    def _get_rules(self, job_name: str, step_name: str):
        """job_name별 규칙 목록 반환 (우선순위 순서)"""
        rules = []

        # ── BLOG 공통 규칙 ────────────────────────────────────────────
        if job_name in ("BLOG", "BLOG_HARNESS"):
            rules.append((self._rule_payload_not_empty, "RULE-B01: Payload 비어있음 금지"))

            if step_name == "BLOG_GENERATE":
                rules.append((self._rule_blog_no_weekend, "RULE-B02: 주말 자동 생성 금지"))
                rules.append((self._rule_blog_no_duplicate, "RULE-B03: 당일 중복 포스팅 금지"))
                rules.append((self._rule_blog_date_format, "RULE-B04: 날짜 포맷 유효성 검사"))

            if step_name in ("BLOG_SEO_ENHANCE", "BLOG_PUBLISH"):
                rules.append((self._rule_blog_post_id_exists, "RULE-B05: post_id 필수 포함"))

        # ── YOUTUBE 공통 규칙 ─────────────────────────────────────────
        elif job_name == "YOUTUBE":
            rules.append((self._rule_payload_not_empty, "RULE-Y01: Payload 비어있음 금지"))
            if step_name == "PLANNING":
                rules.append((self._rule_youtube_topic_exists, "RULE-Y02: 주제(topic) 필수 포함"))

        return rules

    # ── 공통 규칙 ────────────────────────────────────────────────────
    def _rule_payload_not_empty(self, payload: dict, db) -> Tuple[bool, str]:
        if not payload:
            return False, "payload가 비어있습니다. 최소 1개 이상의 키가 필요합니다."
        return True, "OK"

    # ── BLOG 규칙 ────────────────────────────────────────────────────
    def _rule_blog_no_weekend(self, payload: dict, db) -> Tuple[bool, str]:
        """주말(토/일)에는 자동 생성 금지 (단, 수동 요청은 auto_scheduled=False 이므로 허용)"""
        if payload.get("auto_scheduled", False):
            weekday = datetime.now(KST).weekday()
            if weekday >= 5:  # 5=토, 6=일
                day_name = "토요일" if weekday == 5 else "일요일"
                return False, f"오늘은 {day_name}입니다. 주말 자동 생성은 비활성화되어 있습니다."
        return True, "OK"

    def _rule_blog_no_duplicate(self, payload: dict, db) -> Tuple[bool, str]:
        """당일 이미 포스팅이 READY/PUBLISHED 상태로 존재하면 중복 생성 차단"""
        if db is None:
            return True, "OK (no db)"
        target_date = payload.get("target_date", "")
        if not target_date:
            return True, "OK"
        try:
            # YYYY-MM-DD 또는 YYYY.MM.DD 모두 처리
            date_clean = target_date.replace("-", ".").replace("/", ".")
            count = db.execute(text("""
                SELECT COUNT(*) FROM blog_posts
                WHERE DATE_FORMAT(post_date, '%Y.%m.%d') = :d
                AND status IN ('READY', 'PUBLISHED')
            """), {"d": date_clean}).scalar()
            if count > 0:
                return False, f"이미 {date_clean} 날짜의 포스팅이 {count}건 존재합니다. 중복 생성 차단."
        except Exception as e:
            logger.warning(f"Duplicate check failed: {e}")
        return True, "OK"

    def _rule_blog_date_format(self, payload: dict, db) -> Tuple[bool, str]:
        """target_date가 있으면 유효한 날짜 형식인지 검사"""
        target_date = payload.get("target_date", "")
        if not target_date:
            return True, "OK (no date, will use today)"
        try:
            clean = target_date.replace("-", ".").replace("/", ".")
            datetime.strptime(clean, "%Y.%m.%d")
        except ValueError:
            return False, f"날짜 형식이 올바르지 않습니다: '{target_date}' (YYYY-MM-DD 또는 YYYY.MM.DD 필요)"
        return True, "OK"

    def _rule_blog_post_id_exists(self, payload: dict, db) -> Tuple[bool, str]:
        """SEO/Publish 스텝에서는 post_id가 반드시 있어야 함"""
        if not payload.get("post_id"):
            return False, "post_id가 payload에 없습니다. 이전 BLOG_GENERATE 스텝이 먼저 실행되어야 합니다."
        return True, "OK"

    # ── YOUTUBE 규칙 ─────────────────────────────────────────────────
    def _rule_youtube_topic_exists(self, payload: dict, db) -> Tuple[bool, str]:
        if not payload.get("topic", "").strip():
            return False, "YouTube PLANNING 스텝에서 topic이 비어있습니다."
        return True, "OK"


# 싱글턴
rule_engine = HarnessRuleEngine()

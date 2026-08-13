"""
HE Verifier - 실행 결과 검증 계층
에이전트 실행 후 결과물이 올바른지 검증합니다.
검증 실패 시 FAILED로 처리하여 Retry/Recovery 루프를 트리거합니다.
"""
import logging
from typing import Tuple, Any, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger("harness.verifier")


class VerificationError(Exception):
    """검증 실패 예외"""
    pass


class HarnessVerifier:
    """
    [Verification Layer] 실행 결과 검증기
    각 스텝의 결과물이 최소 품질 기준을 충족하는지 확인합니다.
    """

    def verify(self, job_name: str, step_name: str, result: Any, db: Optional[Session] = None) -> Tuple[bool, str]:
        """
        결과 검증 실행
        Returns: (passed: bool, reason: str)
        """
        try:
            verifier = self._get_verifier(job_name, step_name)
            if verifier is None:
                return True, "OK (no verifier defined)"
            return verifier(result, db)
        except VerificationError as e:
            return False, str(e)
        except Exception as e:
            logger.error(f"[Verifier] Unexpected error during verification: {e}")
            return False, f"검증 중 예외 발생: {str(e)}"

    def _get_verifier(self, job_name: str, step_name: str):
        """job_name + step_name 에 맞는 검증 함수 반환"""
        mapping = {
            ("BLOG", "BLOG_GENERATE"):    self._verify_blog_generate,
            ("BLOG_HARNESS", "BLOG_GENERATE"): self._verify_blog_generate,
            ("BLOG", "BLOG_SEO_ENHANCE"): self._verify_blog_seo,
            ("BLOG_HARNESS", "BLOG_SEO_ENHANCE"): self._verify_blog_seo,
            ("BLOG", "BLOG_PUBLISH"):     self._verify_blog_publish,
            ("BLOG_HARNESS", "BLOG_PUBLISH"): self._verify_blog_publish,
        }
        return mapping.get((job_name, step_name))

    # ── BLOG 검증 ─────────────────────────────────────────────────────
    def _verify_blog_generate(self, result: Any, db: Optional[Session]) -> Tuple[bool, str]:
        """BLOG_GENERATE 결과 검증:
        - result가 dict이어야 함
        - post_id가 있어야 함
        - DB에서 실제 post 존재 확인
        - title이 비어있지 않아야 함
        - html_content가 최소 500자 이상이어야 함
        """
        if not isinstance(result, dict):
            return False, f"BLOG_GENERATE 결과가 dict가 아님: {type(result)}"

        post_id = result.get("post_id")
        if not post_id:
            return False, "BLOG_GENERATE 결과에 post_id가 없음"

        if db is not None:
            try:
                from sqlalchemy import text
                row = db.execute(text(
                    "SELECT title, html_content, status FROM blog_posts WHERE id = :id"
                ), {"id": post_id}).fetchone()

                if not row:
                    return False, f"post_id={post_id}가 DB에 존재하지 않음. 저장 실패 의심."

                title, html_content, status = row
                if not title or len(title.strip()) < 5:
                    return False, f"포스팅 제목이 비어있거나 너무 짧음: '{title}'"

                if not html_content or len(html_content) < 500:
                    return False, f"HTML 콘텐츠가 너무 짧음 ({len(html_content or '')}자). 데이터 수집 실패 의심."

            except Exception as e:
                logger.warning(f"[Verifier] DB check failed: {e}")

        logger.info(f"[Verifier] BLOG_GENERATE passed: post_id={post_id}")
        return True, "OK"

    def _verify_blog_seo(self, result: Any, db: Optional[Session]) -> Tuple[bool, str]:
        """BLOG_SEO_ENHANCE 결과 검증:
        - post_id 존재
        - seo_keywords가 최소 1개 이상
        """
        if not isinstance(result, dict):
            return False, f"BLOG_SEO_ENHANCE 결과가 dict가 아님"

        post_id = result.get("post_id")
        if not post_id:
            return False, "post_id 없음"

        keywords = result.get("seo_keywords", "")
        if not keywords or len(keywords.strip()) < 3:
            return False, f"SEO 키워드가 비어있거나 너무 짧음: '{keywords}'"

        logger.info(f"[Verifier] BLOG_SEO_ENHANCE passed: post_id={post_id}")
        return True, "OK"

    def _verify_blog_publish(self, result: Any, db: Optional[Session]) -> Tuple[bool, str]:
        """BLOG_PUBLISH 결과 검증:
        - post_id 존재
        - DB에서 status가 READY인지 확인
        """
        if not isinstance(result, dict):
            return False, f"BLOG_PUBLISH 결과가 dict가 아님"

        post_id = result.get("post_id")
        if not post_id:
            return False, "post_id 없음"

        if db is not None:
            try:
                from sqlalchemy import text
                row = db.execute(text(
                    "SELECT status FROM blog_posts WHERE id = :id"
                ), {"id": post_id}).fetchone()
                if not row or row[0] != "READY":
                    return False, f"post_id={post_id}의 status가 READY가 아님: {row[0] if row else 'NOT FOUND'}"
            except Exception as e:
                logger.warning(f"[Verifier] DB check failed: {e}")

        logger.info(f"[Verifier] BLOG_PUBLISH passed: post_id={post_id}")
        return True, "OK"


# 싱글턴
verifier = HarnessVerifier()

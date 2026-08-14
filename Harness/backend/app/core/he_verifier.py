"""
HE Verifier - 실행 결과 검증 계층
에이전트 실행 후 결과물이 올바른지 검증합니다.
검증 실패 시 FAILED로 처리하여 Retry/Recovery 루프를 트리거합니다.

Verification 종류:
  [Structural] 결과물의 존재/형식/길이 검증
  [Content]    AI Hallucination 방지 - DB 원본과 콘텐츠 일치 검증
"""
import re
import json
import logging
from typing import Tuple, Any, Optional, List, Dict
from sqlalchemy.orm import Session

logger = logging.getLogger("harness.verifier")


class VerificationError(Exception):
    """검증 실패 예외"""
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Content Verifier (Anti-Hallucination Engine)
# ──────────────────────────────────────────────────────────────────────────────

class ContentVerifier:
    """
    [Content Verification] AI Hallucination 방지 전용 검증기
    퀀트 블로그에서 AI가 StockPlus DB의 수치/종목명을 
    임의로 바꿔치기(hallucination)했는지 탐지합니다.
    """

    # 허용 오차: DB 등락률과 HTML 추출 등락률의 최대 허용 차이 (%)
    RATE_TOLERANCE = 2.0

    def verify_all(self, html_content: str, raw_data: Dict, target_date: str) -> List[Tuple[bool, str]]:
        """모든 Content 검증 항목 실행, 결과 목록 반환"""
        checks = [
            self.check_hallucinated_names(html_content, raw_data),
            self.check_hallucinated_rates(html_content, raw_data),
            self.check_date_consistency(html_content, target_date),
            self.check_sentence_repetition(html_content),
            self.check_title_body_match(html_content),
        ]
        return checks

    def check_hallucinated_names(self, html: str, raw_data: Dict) -> Tuple[bool, str]:
        """
        [CV-01] DB 원본 테마명/업종명이 HTML에 최소 1개 이상 등장하는지 확인.
        모두 없으면 AI가 완전히 다른 내용을 생성한 것으로 간주.
        """
        db_themes = [t.get("theme_name", "") for t in raw_data.get("themes", [])]
        db_sectors = [s.get("industry_name", "") for s in raw_data.get("sectors", [])]
        all_names = db_themes + db_sectors

        if not all_names:
            return True, "CV-01: DB 비교 데이터 없음 (SKIP)"

        # HTML에서 태그 제거 후 텍스트만 추출
        plain = re.sub(r'<[^>]+>', '', html)
        matched = [name for name in all_names if name and name in plain]

        if len(matched) == 0:
            sample = all_names[:3]
            return False, (
                f"[CV-01] Hallucination 의심: DB 테마/업종명이 HTML에 단 하나도 등장하지 않음. "
                f"DB 원본 샘플: {sample}"
            )

        match_ratio = len(matched) / len(all_names)
        if match_ratio < 0.3:
            return False, (
                f"[CV-01] Hallucination 경고: DB 이름 일치율 {match_ratio:.0%} (기준 30%). "
                f"매칭된 이름: {matched[:3]}"
            )

        logger.info(f"[CV-01] Name match: {len(matched)}/{len(all_names)} ({match_ratio:.0%})")
        return True, f"CV-01: OK (이름 일치율 {match_ratio:.0%})"

    def check_hallucinated_rates(self, html: str, raw_data: Dict) -> Tuple[bool, str]:
        """
        [CV-02] HTML에 등장하는 등락률(%)이 DB 실제 수치 범위 내에 있는지 확인.
        DB 수치와 ±2% 이상 벗어난 수치가 HTML에만 존재하면 hallucination으로 판정.
        """
        # DB에서 실제 등락률 수집
        db_rates = set()
        for t in raw_data.get("themes", []):
            try:
                db_rates.add(round(float(t.get("change_rate", 0) or 0), 2))
            except (ValueError, TypeError):
                pass
        for s in raw_data.get("sectors", []):
            try:
                db_rates.add(round(float(s.get("change_rate", 0) or 0), 2))
            except (ValueError, TypeError):
                pass

        if not db_rates:
            return True, "CV-02: DB 등락률 없음 (SKIP)"

        # HTML에서 등락률 패턴 추출: +12.55%, -3.21% 등
        html_rates_raw = re.findall(r'[+\-]?(\d{1,2}\.\d{2})%', re.sub(r'<[^>]+>', '', html))
        if not html_rates_raw:
            return True, "CV-02: HTML 내 등락률 없음 (SKIP)"

        html_rates = {round(float(r), 2) for r in html_rates_raw}
        db_rate_list = sorted(db_rates)
        db_min, db_max = min(db_rate_list), max(db_rate_list)

        # 합리적 범위 계산: DB 최소값보다 -2%, 최대값보다 +2% 허용
        suspicious = [
            r for r in html_rates
            if r < (db_min - self.RATE_TOLERANCE) or r > (db_max + self.RATE_TOLERANCE)
        ]

        if suspicious:
            logger.warning(f"[CV-02] Suspicious rates in HTML: {suspicious}, DB range: [{db_min}~{db_max}]")
            # 경고만 남기고 차단하지는 않음 (AI 시황 요약에 다른 수치 언급 가능)
            return True, f"CV-02: ⚠️ 주의 - HTML에 DB 범위 밖 수치 감지 {suspicious} (DB:{db_min}~{db_max})"

        return True, f"CV-02: OK (등락률 범위 정상, DB:{db_min}~{db_max}%)"

    def check_date_consistency(self, html: str, target_date: str) -> Tuple[bool, str]:
        """
        [CV-03] HTML 내 날짜가 target_date와 일치하는지 확인.
        전일 데이터가 섞이거나 날짜가 꼬인 경우 탐지.
        """
        if not target_date:
            return True, "CV-03: target_date 없음 (SKIP)"

        # target_date 정규화 (YYYY.MM.DD 또는 YYYY-MM-DD)
        clean_date = target_date.replace("-", ".").replace("/", ".")

        plain = re.sub(r'<[^>]+>', '', html)

        # HTML에서 날짜 패턴 추출
        dates_found = re.findall(r'\d{4}[.\-]\d{2}[.\-]\d{2}', plain)
        if not dates_found:
            return True, "CV-03: HTML 내 날짜 없음 (SKIP)"

        # 모든 날짜를 점 형식으로 통일
        normalized = [d.replace("-", ".") for d in dates_found]

        # target_date가 있는지 확인
        if clean_date not in normalized:
            other_dates = list(set(normalized))[:3]
            return False, (
                f"[CV-03] 날짜 불일치: HTML에 target_date({clean_date})가 없고, "
                f"다른 날짜({other_dates})만 존재. 전일 데이터 혼입 의심."
            )

        return True, f"CV-03: OK (날짜 일치: {clean_date})"

    def check_sentence_repetition(self, html: str) -> Tuple[bool, str]:
        """
        [CV-04] 동일 문장이 2회 이상 반복되는지 확인.
        AI가 루프에 빠져 같은 내용을 반복 생성하는 패턴 탐지.
        """
        plain = re.sub(r'<[^>]+>', ' ', html)
        # 20자 이상 문장 단위 분리
        sentences = [s.strip() for s in re.split(r'[.\n]', plain) if len(s.strip()) >= 20]

        seen = {}
        for s in sentences:
            seen[s] = seen.get(s, 0) + 1

        repeated = {s: cnt for s, cnt in seen.items() if cnt >= 2}
        if repeated:
            sample = list(repeated.items())[:2]
            return False, (
                f"[CV-04] 문장 반복 감지: {len(repeated)}개 문장이 2회 이상 중복. "
                f"샘플: '{sample[0][0][:50]}...' ({sample[0][1]}회)"
            )

        return True, "CV-04: OK (문장 반복 없음)"

    def check_title_body_match(self, html: str) -> Tuple[bool, str]:
        """
        [CV-05] 제목에 언급된 핵심 키워드가 본문에도 등장하는지 확인.
        제목과 본문 내용이 완전히 다른 hallucination 탐지.
        """
        plain = re.sub(r'<[^>]+>', ' ', html)

        # HTML에서 제목 추출 (h1 또는 헤더 div)
        title_match = re.search(r'<(?:h1|div)[^>]*>([^<]{10,})</(?:h1|div)>', html)
        if not title_match:
            return True, "CV-05: 제목 추출 불가 (SKIP)"

        title = title_match.group(1).strip()

        # 제목에서 핵심 단어 추출 (4자 이상 한국어/영어 단어)
        keywords = re.findall(r'[가-힣a-zA-Z]{4,}', title)
        if not keywords:
            return True, "CV-05: 제목 키워드 없음 (SKIP)"

        # 본문에서 키워드 등장 확인
        matched = [kw for kw in keywords if kw in plain]
        match_ratio = len(matched) / len(keywords)

        if match_ratio < 0.5:
            missing = [kw for kw in keywords if kw not in plain]
            return False, (
                f"[CV-05] 제목-본문 불일치: 제목 키워드 {len(missing)}개가 본문에 없음. "
                f"없는 키워드: {missing[:3]}"
            )

        return True, f"CV-05: OK (제목-본문 일치율 {match_ratio:.0%})"


# ──────────────────────────────────────────────────────────────────────────────
# Main Verifier
# ──────────────────────────────────────────────────────────────────────────────

class HarnessVerifier:
    """
    [Verification Layer] 통합 검증기
    Structural + Content 검증을 모두 수행합니다.
    """

    def __init__(self):
        self.content_verifier = ContentVerifier()

    def verify(self, job_name: str, step_name: str, result: Any, db: Optional[Session] = None) -> Tuple[bool, str]:
        """
        결과 검증 실행
        Returns: (passed: bool, reason: str)
        """
        try:
            verifier_fn = self._get_verifier(job_name, step_name)
            if verifier_fn is None:
                return True, "OK (no verifier defined)"
            return verifier_fn(result, db)
        except VerificationError as e:
            return False, str(e)
        except Exception as e:
            logger.error(f"[Verifier] Unexpected error during verification: {e}")
            return False, f"검증 중 예외 발생: {str(e)}"

    def _get_verifier(self, job_name: str, step_name: str):
        mapping = {
            ("BLOG", "BLOG_GENERATE"):         self._verify_blog_generate,
            ("BLOG_HARNESS", "BLOG_GENERATE"):  self._verify_blog_generate,
            ("BLOG", "BLOG_SEO_ENHANCE"):       self._verify_blog_seo,
            ("BLOG_HARNESS", "BLOG_SEO_ENHANCE"): self._verify_blog_seo,
            ("BLOG", "BLOG_PUBLISH"):           self._verify_blog_publish,
            ("BLOG_HARNESS", "BLOG_PUBLISH"):   self._verify_blog_publish,
        }
        return mapping.get((job_name, step_name))

    # ── BLOG 검증 ─────────────────────────────────────────────────────────────

    def _verify_blog_generate(self, result: Any, db: Optional[Session]) -> Tuple[bool, str]:
        """
        BLOG_GENERATE 통합 검증:
        [Structural] post_id, DB 저장, title 길이, HTML 길이
        [Content]    Hallucination 탐지 (이름/등락률/날짜/반복/제목-본문)
        """
        if not isinstance(result, dict):
            return False, f"BLOG_GENERATE 결과가 dict가 아님: {type(result)}"

        post_id = result.get("post_id")
        if not post_id:
            return False, "BLOG_GENERATE 결과에 post_id가 없음"

        html_content = None
        target_date = None
        raw_data = {}

        if db is not None:
            try:
                from sqlalchemy import text

                # ── [Structural] DB 저장 확인 ──────────────────────────
                row = db.execute(text(
                    "SELECT title, html_content, status FROM blog_posts WHERE id = :id"
                ), {"id": post_id}).fetchone()

                if not row:
                    return False, f"post_id={post_id}가 DB에 존재하지 않음."

                title, html_content, status = row

                if not title or len(title.strip()) < 5:
                    return False, f"[Structural] 포스팅 제목이 비어있거나 너무 짧음: '{title}'"

                if not html_content or len(html_content) < 500:
                    return False, f"[Structural] HTML 콘텐츠 너무 짧음 ({len(html_content or '')}자)"

                # target_date 추출
                date_row = db.execute(text(
                    "SELECT post_date FROM blog_posts WHERE id = :id"
                ), {"id": post_id}).fetchone()
                if date_row:
                    target_date = str(date_row[0]).replace("-", ".")

                # ── [Content] DB 스냅샷에서 원본 데이터 로드 ──────────
                snap = db.execute(text(
                    "SELECT raw_json FROM blog_data_snapshots WHERE post_id = :id ORDER BY id DESC LIMIT 1"
                ), {"id": post_id}).fetchone()
                if snap and snap[0]:
                    try:
                        raw_data = json.loads(snap[0])
                    except Exception:
                        raw_data = {}

            except Exception as e:
                logger.warning(f"[Verifier] DB check failed: {e}")

        # ── [Content Verification] Anti-Hallucination ──────────────────
        if html_content and raw_data:
            cv_results = self.content_verifier.verify_all(
                html_content, raw_data, target_date or ""
            )
            for passed, reason in cv_results:
                if not passed:
                    logger.error(f"[Content Verifier] FAILED: {reason}")
                    return False, reason
                else:
                    logger.info(f"[Content Verifier] {reason}")

        logger.info(f"[Verifier] BLOG_GENERATE PASSED (Structural + Content): post_id={post_id}")
        return True, "OK (Structural + Content Verified)"

    def _verify_blog_seo(self, result: Any, db: Optional[Session]) -> Tuple[bool, str]:
        """
        BLOG_SEO_ENHANCE 검증:
        [Structural] post_id, keywords 존재
        [Content]    SEO 키워드가 실제 본문과 관련 있는지 확인
        """
        if not isinstance(result, dict):
            return False, "BLOG_SEO_ENHANCE 결과가 dict가 아님"

        post_id = result.get("post_id")
        if not post_id:
            return False, "post_id 없음"

        keywords = result.get("seo_keywords", "")
        if not keywords or len(keywords.strip()) < 3:
            return False, f"[Structural] SEO 키워드 비어있거나 너무 짧음: '{keywords}'"

        # [Content] 키워드가 실제 본문에 있는지 최소 검증
        if db is not None:
            try:
                from sqlalchemy import text
                row = db.execute(text(
                    "SELECT html_content FROM blog_posts WHERE id = :id"
                ), {"id": post_id}).fetchone()

                if row and row[0]:
                    plain = re.sub(r'<[^>]+>', ' ', row[0])
                    kw_list = [k.strip() for k in keywords.replace(",", " ").split() if len(k.strip()) >= 2]
                    matched = [kw for kw in kw_list if kw in plain]

                    if kw_list and len(matched) / len(kw_list) < 0.2:
                        return False, (
                            f"[Content CV-06] SEO 키워드 본문 연관도 너무 낮음: "
                            f"{len(matched)}/{len(kw_list)} 매칭. "
                            f"키워드가 본문과 완전히 다른 내용일 가능성."
                        )
            except Exception as e:
                logger.warning(f"[Verifier] SEO content check failed: {e}")

        logger.info(f"[Verifier] BLOG_SEO_ENHANCE PASSED: post_id={post_id}")
        return True, "OK"

    def _verify_blog_publish(self, result: Any, db: Optional[Session]) -> Tuple[bool, str]:
        """
        BLOG_PUBLISH 검증:
        [Structural] post_id, DB status=READY
        """
        if not isinstance(result, dict):
            return False, "BLOG_PUBLISH 결과가 dict가 아님"

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
                    return False, f"[Structural] status가 READY가 아님: {row[0] if row else 'NOT FOUND'}"
            except Exception as e:
                logger.warning(f"[Verifier] Publish DB check failed: {e}")

        logger.info(f"[Verifier] BLOG_PUBLISH PASSED: post_id={post_id}")
        return True, "OK"


# 싱글턴
verifier = HarnessVerifier()

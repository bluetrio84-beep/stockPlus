# ⚠️ [절대 금지: 덮어쓰기 금지 !! 정밀타격 !!]

---

## ✅ [2026-08-14] 동적 SVG 아이콘 레지스트리 & JSON 스키마 기반 인포그래픽 엔진 구축
- **하드코딩 100% 제거:** 하드코딩된 템플릿 대신 `SVG_ICON_REGISTRY` (은행, 채권, PE, 보험, 연기금, PF, GPU, 칩셋, 데이터센터, 전력, 네트워크, 서버, 차트, 로켓, 달러, 조명, 건물, 자동차, 바이오 등 20+ 고화질 벡터 아이콘)를 탑재.
- **주제/데이터별 동적 아이콘 및 항목 자동 매핑:** AI 분석 주제 및 수급 데이터(JSON 스키마)에 맞춰 5단계 프로세스, 아이콘 키, 불릿 항목, 3대 메커니즘, 요약 바가 동적으로 생성되도록 `build_dynamic_infographic(config)` 설계.
- **266KB 고해상도 벡터 렌더링:** Playwright 렌더링 시 아이콘 깨짐 없이 crisp한 벡터 그래픽으로 266KB 스크린샷 이미지 출력.

## ✅ [2026-08-14] AAAA.PNG 100% 동일 품질 고밀도 퀀트 인포그래픽 PNG 자동 생성 엔진 탑재
- **`blog_infographic_builder.py` 2차 고도화 (AAAA.PNG 100% 디테일 이식):**
  - `상단 대형 헤더`: 남색 `#0b1329` 배너 + `➔` 포인트 화살표 + 하이라이트 문구
  - `상단 5단계 밸류체인 프로세스`: 5개 수직 카드 + 남색 필(Pill) 헤더 + 불릿 포인트 리스트 + 체크포인트 효과 박스
  - `중단 3대 메커니즘 & 수급 혁신 박스`: 3개 컬럼 플로우 박스 + 보라색 `수급 혁신 ➔ 퀀트 모멘텀 가속` 그라데이션 컨테이너
  - `하단 3대 데이터 시각화`: TOP 5 실시간 랭킹 + SVG 원형 도넛 차트(수급 비중) + 20D/60D 누적 바 차트
  - `하단 핵심 요약 4단계 바`: 남색 컨테이너 + 4단계 아이콘 요약 연결선
- **1240px 캔버스 비율 최적화:** `blog_screenshot.py` 뷰포트 확대(1260px)로 251KB 고해상도 인포그래픽 이미지 출력.

## ✅ [2026-08-14] AAAA.PNG 스타일 퀀트 인포그래픽 PNG 자동 생성 엔진 탑재
- **`blog_infographic_builder.py` 신규 구축:** `AAAA.PNG` 디자인 시스템(Dark Indigo 헤더, 5단계 수급 메커니즘 카드, AI 퀀트 가이드 박스, 외국인 매집 TOP 10 데이터 카드, 하단 4단계 요약 바)을 100% 반영한 고해상도 인포그래픽 HTML 렌더러 탑재.
- **StockPlus DB "외국인 매집 TOP 10" 연동:** `stock_supply_demand` 테이블에서 당일 외국인 순매수, 5일/20일 누적 수급, 기관 동시 매집(쌍끌이 배지), 현재가 수집.
- **Playwright 고해상도 PNG 스크린샷 엔진 연동:** `GET /api/blog/infographic/foreigner-top10` 엔드포인트 추가 → 실시간 인포그래픽 PNG 이미지(163KB) 즉시 반환.
- **네이버 스마트에디터 100% 호환:** HTML 스타일 손상 없이 통 이미지(PNG)로 복사/다운로드 가능하도록 하네스 퀀트 블로그 파이프라인과 완벽 통합.

## ✅ [2026-08-13] 5단계 정밀 자율 복구 파이프라인 (Harness Self-Correction Orchestrator)
- **개선 사유:** 단순 `except Exception: retry()` 방식 탈피. 에러 발생 시 5단계 정밀 복구 파이프라인을 거치도록 고도화.
- **5단계 복구 파이프라인:**
  1. `실패 감지` (KAIROS / Verifier / DB 에러 Intercept)
  2. `에러 분류 (Error Category)`: `RATE_LIMIT`, `HALLUCINATION`, `DATA_MISSING`, `TIMEOUT`, `PARSE_ERROR`, `FATAL` 6가지 분류
  3. `원인 분석 (Cause Analysis)`: Gemini AI가 에러 로그의 근본 원인을 1~2문장으로 정밀 규명
  4. `전략 변경 (Strategy)`: `STRICT_PROMPT`(프롬프트 강화), `FALLBACK_DATA`(대체 데이터), `BACKOFF_WAIT`(10초 지연 대기), `PAYLOAD_FIX`(파라미터 수정), `ABORT`(중단) 중 동적 선택
  5. `Context 수정 & 재실행`: `new_payload`에 `recovery_context`(시도 횟수, 적용 전략, 사유)를 주입하고 `task_queue`를 `RETRY` 상태로 업데이트하여 재실행.

## ✅ [2026-08-13] Content Verification (Anti-Hallucination) 엔진 구축
- **문제 정의:** 기존 Structural Verification(형식/길이)만으로는 AI가 DB 수치를 hallucination으로 바꿔치기하는 것을 탐지 불가.
- **`ContentVerifier` 클래스 신규 구현 (6가지 검증 항목):**
  - `CV-01` 이름 일치율: DB 원본 테마명/업종명이 HTML에 30% 이상 등장해야 함. 하나도 없으면 Hallucination으로 차단.
  - `CV-02` 등락률 범위: HTML 내 등락률이 DB 실제 수치 ±2% 범위 내에 있는지 확인. 범위 밖 수치 경고 로깅.
  - `CV-03` 날짜 일치: HTML 내 날짜가 target_date와 일치하는지 검사. 전일 데이터 혼입 탐지.
  - `CV-04` 문장 반복: 20자 이상 동일 문장이 2회 이상 반복되면 차단. AI 루프 패턴 탐지.
  - `CV-05` 제목-본문 일치: 제목의 핵심 키워드 50% 이상이 본문에 없으면 차단.
  - `CV-06` SEO 관련성: SEO 키워드가 실제 본문과 20% 이상 매칭되어야 함.
- **우선순위:** `blog_data_snapshots` 테이블에 저장된 원본 `raw_json`을 비교 기준으로 사용하여 DB ↔ HTML 크로스 체크 수행.

## ✅ [2026-08-13] HE Guide STAGE4(Rules) + STAGE6(Verification) 완전 구현 & agents.md 신규 작성
- **[STAGE4] `he_rules.py` 중앙 규칙 엔진 구축:** `RuleEngine` 클래스 + job_name별 규칙 등록 시스템. BLOG 전용 5개 규칙 구현(B01~B05: payload 검사, 주말 차단, 중복 방지, 날짜 포맷, post_id 필수). 규칙 위반 시 `BLOCKED` 상태로 실행 차단.
- **[STAGE6] `he_verifier.py` 결과 품질 검증 계층 구축:** 실행 후 결과물 자동 검증. BLOG 3스텝 전부 커버: `GENERATE`(post_id+DB확인+title5자+HTML500자), `SEO_ENHANCE`(keywords확인), `PUBLISH`(DB status=READY 확인). 검증 실패 시 자동으로 Retry/Recovery 트리거.
- **`harness_manager.py` 파이프라인 통합:** `[RULES] → [EXECUTION] → [VERIFICATION]` 3레이어 순서로 `process_task()`에 완전 통합.
- **`agents.md` 필수 명세서 신규 작성:** 하네스 플랫폼의 에이전트 공식 명세 문서. 전체 8단계 아키텍처 흐름, 5개 에이전트 스펙(파이프라인/Tool/Rules/Verification), 공통 인프라 파일 목록, 추후 추가 예정 에이전트, 신규 추가 체크리스트 포함.

## ✅ [2026-08-13] HE Guide STAGE2 & STAGE4 완전 구현 (Tool Sandbox + Context Compaction)
- **[STAGE4] Context Compaction 실제 구현:** `ai_service.py`에 `compact_text()` 정적 메서드 추가. 프롬프트가 `12,000자`(≈3,000 토큰) 초과 시 자동 잘라내기 & 경고 로그. `generate_blog_insight()` 및 `analyze_error()` 두 곳에 일괄 적용.
- **[STAGE2] Tool Sandbox 강화 - `he_tools.py` 신규:** `BlogTool` 클래스를 만들어 Blog 파이프라인이 DB에 **직접 접근하는 것을 금지**하고, 반드시 `BlogTool.fetch_quant_data()`, `build_post()`, `get_post()`, `update_seo_keywords()`, `publish_post()` 5개 Tool 메서드를 통해서만 접근하도록 아키텍처 준수 강화.
- **`blog_harness.py` 전면 리팩토링:** 모든 DB 직접 접근 코드 제거 → `BlogTool(sandbox_id=self.sandbox_id)` 인스턴스 기반 Tool 접근으로 교체. `sandbox_id` 추적 포함.
- **확장성 설계:** `he_tools.py`는 추후 `YoutubeTool`, `StockAlertTool` 등 다른 하네스 모듈 Tool도 동일 패턴으로 추가 가능한 구조로 설계됨.

## ✅ [2026-08-13] 스케줄러 날짜 포맷 버그 수정 (YYYY-MM-DD vs YYYY.MM.DD)
- **버그 원인:** 자동 스케줄러(`blog_scheduler.py`)는 `"2026-08-13"` (하이픈 형식)으로 날짜 전달, `blog_builder.py`는 `"%Y.%m.%d"` (점 형식)으로 파싱 시도 → `ValueError` 발생 → task_queue는 SUCCESS 표시되나 실제 포스팅 DB 미생성.
- **수정:** `blog_builder.py`에 `target_date = target_date.replace("-", ".")` 한 줄 추가로 하이픈/점 포맷 모두 허용.
- **검증:** 수동 태스크 발주 후 `[2026.08.13] 전자장비와기기·야놀자(Yanolja) 강세` 포스팅 정상 생성 확인(ID=8, status=READY).

## ✅ [2026-08-13] 매일 평일(월~금) 16:00 정각 퀀트 블로그 자동 생성 스케줄러 탑재
- **`blog_scheduler.py` 신규 구축:** 한국 표준시(KST) 기준 **매주 월~금요일 16:00 (오후 4시)** 정각에 오늘 자 퀀트 블로그 포스팅 자율 파이프라인(`BLOG_GENERATE` → `BLOG_SEO_ENHANCE` → `BLOG_PUBLISH`)을 `task_queue`에 자동 발주.
- **주말 스킵 & 중복 방지:** 주말(토/일) 자동 스킵, 하루 1회만 트리거되도록 오늘 날짜(`last_triggered_date`) 체크 및 DB 중복 검사 탑재.
- **`main.py` 백그라운드 태스크 연결:** 백엔드 시작 시 자동 가동되어 16:00 정각에 콘솔 알림과 함께 포스팅 완선.

## ✅ [2026-08-13] 퀀트 블로그 UI 튜닝 & 수급(쌍끌이 순매수) 콘텐츠 풍성화
- **등락률 폰트 & 줄바꿈 수정:** `format_rate()`의 폰트 크기를 `13px`로 1px 축소하고 `white-space: nowrap`, 컬럼 너비 `110px` 지정으로 두 자리수 상승률(`+12.55% ⬆`)이 줄바꿈(밀림) 현상 없이 깔끔하게 표시되도록 보정.
- **`💰 외국인 & 기관 쌍끌이 순매수 TOP 5` 섹션 추가:** 단순 테마/업종 외에 `stock_supply_demand` 테이블의 외국인+기관 메이저 수급 집중 종목을 포스팅 HTML 및 마크다운 템플릿에 신규 섹션으로 추가.

## ✅ [2026-08-13] Agent Fleet Manager 실제 병렬 처리 엔진 & 4대 에이전트 역할 정립
- **`asyncio.Semaphore` 동시성 엔진 탑재:** `HarnessManager` 워커에서 `h_modules` 테이블의 `instances` 값을 동적으로 읽어 job_name별 병렬 슬롯(Semaphore)을 제어하도록 전면 리팩토링.
- **실시간 슬롯 핫리로드 (Hot-Reload):** Fleet Manager UI에서 `+ / -` 버튼 클릭 시 재시작 없이 즉시 백엔드 병렬 슬롯 갱신.
- **4대 에이전트 모듈 정밀 역할 매핑:**
  - `Quant-Data-Scraper` : StockPlus DB 수급/테마/WICS 데이터 파싱
  - `Gemini-Quant-Analyst` : 퀀트 시황 분석 및 블로그 포스팅 템플릿/AI 합성
  - `SEO-Enricher-Agent` : 네이버/티스토리 검색 상위 노출용 인기 키워드 10개 Gemini AI 자동 추출
  - `Human-Inspector-Agent` : KAIROS 셀프 힐링 검수 및 1-Click 복사/발행 조율

## ✅ [2026-08-13] 퀀트 블로그 PNG 이미지 자동 변환 & 네이버 Ctrl+V 발행 시스템 구축
- **`blog_screenshot.py` 신규 구축:** Playwright 헤드리스 Chromium을 이용해 HTML 콘텐츠를 Full-Page PNG 이미지로 100% 완벽 렌더링 변환하는 스크린샷 서비스 탑재.
- **`GET /api/blog/posts/{post_id}/screenshot` 엔드포인트 추가:** PNG 이미지를 bytes로 즉시 반환하는 FastAPI 라우터 추가 완료.
- **프론트엔드 `🖼️ 이미지 복사` 버튼 추가:** 버튼 클릭 시 Playwright 백엔드 렌더링 PNG → `ClipboardItem('image/png')` → 네이버 글쓰기에서 **Ctrl+V** 바로 붙여넣기 완벽 지원.
- **`PNG 저장` 버튼 추가:** PNG 파일 다운로드로 네이버 이미지 직접 업로드 지원.
- **네이버 에디터 서식 문제 완전 우회:** HTML 방식의 배경색 삭제 문제 → 이미지 방식으로 전환하여 남색 박스·배지·표 100% 완벽 보존.

## ✅ [2026-08-13] 우분투 로그인 시 agy 자동 실행 설정
- **`~/.bashrc` 자동 실행 블록 추가:** SSH/터미널 로그인 시 자동으로 `/Projects` 폴더로 이동 후 `agy` 구동.
- **무한 루프 방어:** `AGY_ACTIVE=1` 환경변수로 중복 실행 방지.
- **인터랙티브 터미널만 감지:** 스크립트/SCP/SFTP 등 비인터랙티브 연결 시에는 agy 미실행 안전 처리.

## ✅ [2026-08-13] 네이버 블로그 1x1 Table Cell 배경 박스 완전 호환 구조 전환
- **문제 원인 확인:** 네이버 스마트에디터 ONE이 `<div>` 배경색(`background-color`)을 보안 정책으로 제거하는 특성 발견.
- **`blog_template.py` 1x1 Table Cell 구조 전환:** 헤더 남색 박스 및 AI 가이드 박스를 `<table><tr><td bgcolor>` 구조로 래핑하여 네이버 에디터 필터링 완전 우회.
- **DAILY QUANT MARKET REPORT 배지 폰트 확대:** 0.85rem → 14px로 가독성 향상.

## ✅ [2026-08-13] 네이버 100% 원본 뷰어 팝업 & 복사 엔진 구축
- **`🌟 원본 뷰어` 팝업 창 추가:** HTML 전체 렌더링 팝업 창을 열고 0.3초 후 `execCommand('copy')`로 DOM 실물 선택 복사 자동 수행.
- **`openNaverSmartCopyWindow()` 함수 구현:** `window.open()` + `document.write()` + `Range.selectNodeContents()` 파이프라인 완성.

## ✅ [2026-08-12] 퀀트 블로그 네이버 이미지/서식 복사 시스템 고도화
- **`🎨 렌더링 서식 복사` 버튼 탑재:** `ClipboardItem({'text/html': blob})` 방식으로 Rich Text 클립보드 복사 지원.
- **`handleCopyRichHtml()` / `handleCopyRawText()` 분리 구현:** HTML 탭과 마크다운 탭 각각 최적화된 복사 방식 분기.
- **`id="quant-blog-preview-container"` 추가:** DOM Selection API 기반 실물 렌더링 복사 대상 컨테이너 ID 지정.

## ✅ [2026-08-12] 네이버 블로그 Playwright 100% 매크로 자동 발행 엔진 구축
- **`naver_macro_publisher.py` 신규 구축:** Playwright 헤드리스 Chromium 브라우저 봇으로 네이버 ID/PW 자동 로그인 → 글쓰기 에디터 진입 → 제목/본문 입력 → [발행] 버튼 클릭까지 100% 자동 수행.
- **`blog_auto_publisher.py` 매크로 모드 라우팅 추가:** `mode="macro"` 파라미터로 Playwright 매크로 봇 분기 처리.
- **`AutoPublishRequest` 스키마 확장:** `naver_pw`, `naver_mode`, `nid_aut`, `nid_ses` 필드 추가.
- **`POST /api/blog/posts/{post_id}/auto-publish` 매크로 모드 연동 완료.**
- **`BlogView.jsx` 네이버 발행 모드 토글 UI 추가:**
  - `🤖 100% 매크로 봇 발행` (ID + PW 입력 → 백엔드 Playwright 자동 완주)
  - `🟢 1-Click 스마트 복사` (ID만 입력 → 클립보드 복사 + 네이버 글쓰기 창 자동 오픈)
- **발행 모드 기본값:** `🟢 1-Click 스마트 복사`로 설정 (비밀번호 입력 불필요).
- **`playwright install chromium` + `playwright install-deps` 컨테이너 내 설치 완료.**

## ✅ [2026-08-12] 퀀트 블로그 발행 보조 기능 구축
- **1-Click 원스톱 복사:** `handleDirectAutoPublish()`에서 제목 + 렌더링 서식을 한 번에 클립보드에 복사 후 네이버 글쓰기 창 자동 오픈.
- **`🌐 내 블로그로 직접 자동 게시` 모달 구현:** 네이버(1-Click 스마트/매크로), 티스토리 API, 워드프레스 REST API, Webhook 4가지 플랫폼 탑재.
- **네이버 블로그 SmartEditor HTML 복사 꿀팁 가이드:** `showGuideModal` 팝업으로 네이버 기본에디터 HTML 탭 붙여넣기 3단계 가이드 제공.
- **`.html` / `.md` 파일 1-Click 다운로드 기능 추가.**

## ✅ [2026-08-12] 퀀트 블로그 HTML 템플릿 엔진 네이버 호환 전면 개편
- **`blog_template.py` 완전 재설계:** 네이버 스마트에디터 ONE 인증 순수 인라인 스타일 + 표준 HTML 테이블 구조로 재설계.
- **교차 배경색(zebra striping):** 홀/짝 행 배경색(`#ffffff`/`#f8fafc`) 자동 적용으로 가독성 향상.
- **등락률 색상 개선:** 상승 `#e11d48`(빨강), 하락 `#2563eb`(파랑)으로 선명하게 구분.

## ✅ [2026-08-12] 주요 버그 수정
- **`publishingDirect is not defined` 오류 수정:** `BlogView.jsx` 상태 변수 전체 복구 (`publishingDirect`, `naverId`, `tistoryBlogName`, `wpUrl` 등).
- **`NameError: Optional is not defined` 수정:** `blog_auto_publisher.py`에 `from typing import Optional` 누락 추가.
- **`ReferenceError: Zap is not defined` 수정:** `BlogView.jsx` lucide-react Zap 아이콘 임포트 누락 수정.
- **502 Bad Gateway 영구 해결:** `stockplus-frontend-1` Nginx에 `resolver 127.0.0.11 valid=5s;` 동적 Docker DNS 리졸버 추가.

## ✅ [2026-08-12] TaskQueueView 상세 모달 수정
- **상세 보기 미표시 버그 수정:** `task.payload` 객체를 `JSON.stringify(task.payload, null, 2)`로 안전 직렬화.
- **모달 z-index 강화:** `z-[100]` 오버레이로 상세 모달이 다른 요소에 가려지지 않도록 수정.

## ✅ [2026-08-12] BlogHarness 풀 하네스 엔지니어링 (HE) 알고리즘 100% 완전 연동
- **task_queue 3단계 자율 체이닝:** 단일 생성을 넘어 `BLOG_GENERATE` (DB수집+포스팅생성) → `BLOG_SEO_ENHANCE` (Gemini AI 키워드 강화) → `BLOG_PUBLISH` (READY 확정) 3단계 연쇄 자동 수행.
- **BaseHarness & KAIROS 연동:** `BlogHarness`가 `BaseHarness` 샌드박스 격리(Total Safety Sandbox) 및 KAIROS 재시도 루프(3회)를 직접 실행하도록 `HarnessManager` 라우터 전면 통합.
- **Agent Console & UI 시각화:** `BlogView.jsx` 상단에 3단계 파이프라인 진행 상태바(📡 GENERATE → 🤖 SEO ENHANCE → ✅ PUBLISH) 및 KAIROS 실시간 스트리밍 콘솔 로깅 탑재 완료.
- **엔드투엔드 검증 완료:** 태스크 큐 및 3단계 파이프라인 자율 완주 검증 완료.

## ✅ [2026-08-12] 퀀트 주식 자동 블로그 엔진 (BlogHarness) 구축 완료
- **데이터 파이프라인 연동:** StockPlus MySQL DB (`market_themes`, `industry_quotes`, `stock_supply_demand`, `ai_next_leaders`)에서 실시간 수급/WICS 80개 업종 데이터를 직접 쿼리하는 `blog_data_service.py` 구축 완료.
- **DB 스키마 구축:** `harness_db` 내 포스팅 및 스냅샷 저장용 `blog_posts`, `blog_data_snapshots` 테이블 구축 완료.
- **템플릿 & REST API 연동:** SEO 최적화 제목/마크다운/HTML 포스팅 생성 템플릿(`blog_template.py`), 오케스트레이션 서비스(`blog_builder.py`), FastAPI 라우터(`/api/blog/generate`, `/api/blog/posts`) 탑재 완료.
- **UI 구현:** `BlogView.jsx` 구축 및 `Dashboard.jsx` 연결 완료 (HTML/마크다운 1클립보드 복사, 즉시 포스팅 생성 기능 제공).

## ✅ [2026-08-12] 하네스 1단계 개편 플랜 수립 (고품질 퀀트 주식 블로그 포스팅 엔진)
- **불필요한 모듈 소탕:** 쓰이지 않는 유튜브 대본/영상 생성 모듈(`yt_harness`, `YouTubeView`) 및 관련 레거시 전면 정리 수립.
- **고품질 퀀트 주식 블로그 엔진 구축:** StockPlus 실시간 수급/테마/WICS 데이터 기반 쌈빡한 자동 주식 포스팅 엔진(`BlogHarness`) 탑재 예정.
- **0원 과금 방어 결합:** 구글 AI Studio 무료 키 전용 안전 구조 및 `gemini-2.0-flash` / `thinking` 추론 결합.

## ✅ [2026-04-14] 시스템 전체 부활 및 안정화 완료 (Final Resurrection)
- **4월 11일 안정 버전(`b67ee6f`) 완전 회귀:** 모든 Nginx 설정과 Docker 구성품을 가장 완벽했던 시점으로 타임머신 복구 완료.
- **502 Bad Gateway 및 SSL 오류 소탕:** Nginx의 "Host not found" 문제를 하네스 컨테이너 재가동 및 이름 해석(Resolution) 싱크를 통해 완벽 해결.
- **데이터 100% 복구:** 새 볼륨 대신 기존 데이터가 담긴 `projects_mysql_data`를 정밀 매핑하여 실시간 뉴스 및 보유 종목 데이터 부활.
- **멀티 도메인 포워딩 완성:** `stockPlus`와 `Harness`가 하나의 Nginx 입구를 통해 각자의 컨테이너로 정확히 배달되도록 설정 최적화.

## ✅ [2026-04-10] UI 디테일 최적화 및 테마 완벽 동기화 완료
- **AI Deployment 카드 크기 축소:** 카드 패딩(p-10 -> p-5) 및 폰트 크기 대폭 축소하여 정보 밀도 극대화 (3열 그리드 적용).
- **SettingsView 테마 정밀 제어:** 하네스 테마(#1e293b)와 다크 테마(#000000) 각각의 입력창 배경색 분리 적용.
- **전역 테마 동기화 강화:** Console, YouTube Studio 등 모든 하위 컴포넌트의 하드코딩 색상을 전역 테마 객체 변수로 완전 교체.

## ✅ [2026-04-10] Dashboard 리팩토링 및 시스템 복구 완료
- **502 Bad Gateway 정밀 타격 복구:** stockPlus 공용 Nginx에서 Harness 컨테이너로의 프록시 포트 교정 (3001 -> 80).
- **Dashboard.jsx 비대화 해결:** `DeploymentView`, `ConsoleView`, `SettingsView`, `YouTubeView`로 기능별 컴포넌트 완벽 분리.
- **다크모드 블랙(#000000) 강제 적용:** 시스템 전반의 배경색을 순수 블랙으로 통일 및 셀렉트박스/입력창 스타일 최적화.
- **Harness 오리지널 테마 복구:** 요청에 따라 하네스 전용 테마를 오리지널 딥 네이비(#020617)로 원복.
- **시스템 안정화:** 빌드 캐시 없이 전체 재빌드 및 재배포를 통한 런타임 안정성 확보.

---

# 🦾 Harness Engineering (HE) Platform Project

## 🎯 Project Vision
단순한 자동화 툴이 아니라, **'Agent Harness'** 아키텍처를 기반으로 한 **지능형 에이전트 오케스트레이션 플랫폼**입니다. Anthropic의 Claude Harness와 같은 '에이전트-도구 결합' 방식을 채택하여, 각 기능을 독립적인 하네스 모듈로 관리합니다.

### 🚀 Phase 1: Quant Stock Blog Harness (현재 운영 중)
StockPlus 실시간 시세/수급/테마/WICS 데이터를 기반으로 매일 자동으로 퀀트 주식 블로그 포스팅을 생성·발행하는 완전 자동화 엔진.
- **데이터 소스:** StockPlus MySQL (`market_themes`, `industry_quotes`, `stock_supply_demand`, `ai_next_leaders`)
- **생성:** Gemini AI SEO 강화 → HTML/마크다운 포스팅 자동 생성
- **발행:** 이미지(PNG) 변환 → 네이버 블로그 Ctrl+V 발행 / 티스토리 API 자동 발행

---

## 🏛️ System Architecture

### 1. Harness Platform (Core)
- **Backend:** FastAPI (Python) - 비동기 에이전트 처리
- **Frontend:** React + Vite + Tailwind CSS - 하네스 컨트롤 센터 (관리자 페이지)
- **Database:** MySQL - 에이전트의 기억(Memory)과 작업(Task) 관리

### 2. Harness Interface (Protocol)
모든 하네스 모듈은 다음 표준을 따릅니다.
- `init()`: 모듈 초기화 및 리소스 점검
- `execute()`: 자율적 작업 수행 (에이전트 루프)
- `status()`: 현재 진행 상태 실시간 리포팅
- `stop()`: 긴급 정지 및 자원 회수

---

## 🗄️ Database Schema

### [Core] 하네스 운영 계층
- `h_users`: 사용자 계정 및 권한
- `h_modules`: 등록된 하네스 모듈 (YOUTUBE, BLOG, STOCK 등)
- `h_tasks` / `task_queue`: 중앙 작업 큐 (상태: PENDING, RUNNING, COMPLETED, FAILED)
- `h_logs`: 통합 에이전트 로그

### [Blog] 퀀트 블로그 모듈
- `blog_posts`: 생성된 포스팅 (제목, HTML, 마크다운, SEO 키워드, 발행 상태)
- `blog_data_snapshots`: 포스팅 생성 시점의 원본 수급/테마/업종 데이터 스냅샷

---

## 📁 주요 파일 구조

```
Harness/
├── backend/
│   └── app/
│       ├── api/
│       │   ├── blog.py           # 블로그 REST API (generate, posts, screenshot, auto-publish)
│       │   └── auth.py           # 인증 API
│       ├── services/
│       │   ├── blog_template.py      # HTML/MD 포스팅 생성 템플릿 엔진 (네이버 1x1 Table 호환)
│       │   ├── blog_screenshot.py    # Playwright HTML → PNG 스크린샷 서비스
│       │   ├── blog_auto_publisher.py # 티스토리/워드프레스/Webhook 자동 발행
│       │   └── naver_macro_publisher.py # Playwright 네이버 매크로 자동 발행
│       └── models/
│           └── blog.py           # BlogPost ORM 모델
└── frontend/
    └── src/
        └── components/
            └── BlogView.jsx      # 퀀트 블로그 엔진 UI (이미지복사, PNG저장, 원본뷰어, 자동게시)
```

---

*본 프로젝트는 하네스 엔지니어링 원칙에 따라 모듈의 확장성과 에이전트의 자율성을 최우선으로 합니다.*

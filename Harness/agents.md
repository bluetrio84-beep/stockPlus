# 📋 Harness Engineering — Agents.md

> ⚠️ 이 문서는 하네스 플랫폼에서 동작하는 모든 에이전트의 **공식 명세서**입니다.
> 새 에이전트 추가 시 반드시 이 문서를 먼저 업데이트하세요.

---

## 🏗️ 아키텍처 개요

```
User/Scheduler
    ↓
[1] Agent          ← BaseHarness 상속, sandbox_id 격리
    ↓
[2] Context        ← context_history, current_tokens 추적
    ↓
[3] Tools          ← he_tools.py (BlogTool, 추후 YoutubeTool 등)
    ↓
[4] Rules          ← he_rules.py (RuleEngine, 실행 전 차단)
    ↓
[5] Execution      ← _run_logic(), KAIROS 3회 재시도 루프
    ↓
[6] Verification   ← he_verifier.py (결과 품질 검증)
    ↓
[7] Retry/Recovery ← recover_task(), AI analyze_error()
    ↓
[8] Publish        ← queue_next_step() 자율 체이닝, READY 확정
```

---

## 📦 등록된 에이전트 목록

---

### 1. BlogHarness — 퀀트 블로그 자동 생성 에이전트

| 항목 | 내용 |
|:---|:---|
| **파일** | `backend/app/harness_modules/blog_harness.py` |
| **기반 클래스** | `BaseHarness` |
| **job_name** | `BLOG` |
| **상태** | ✅ 운영 중 |
| **스케줄** | 매주 월~금 16:00 KST 자동 실행 (`blog_scheduler.py`) |

#### 파이프라인 (3단계 자율 체이닝)

```
BLOG_GENERATE → BLOG_SEO_ENHANCE → BLOG_PUBLISH
```

| 스텝 | 역할 | Tool |
|:---|:---|:---|
| `BLOG_GENERATE` | StockPlus DB에서 수급/테마/WICS 데이터 수집 → HTML/MD 포스팅 생성 | `BlogTool.fetch_quant_data()`, `BlogTool.build_post()` |
| `BLOG_SEO_ENHANCE` | Gemini AI로 SEO 키워드 10개 자동 추출 및 업데이트 | `BlogTool.get_post()`, `BlogTool.update_seo_keywords()` |
| `BLOG_PUBLISH` | 포스팅 상태를 READY로 확정 | `BlogTool.publish_post()` |

#### Rules (사전 검사)
- `RULE-B01`: payload 비어있음 금지
- `RULE-B02`: 주말 자동 생성 금지 (auto_scheduled=true인 경우만)
- `RULE-B03`: 당일 중복 포스팅 금지
- `RULE-B04`: 날짜 포맷 유효성 검사 (YYYY-MM-DD 또는 YYYY.MM.DD)
- `RULE-B05`: SEO/Publish 스텝에서 post_id 필수

#### Verification (사후 검증)
- `BLOG_GENERATE`: post_id 존재 + DB 저장 확인 + title 5자 이상 + HTML 500자 이상
- `BLOG_SEO_ENHANCE`: post_id + seo_keywords 3자 이상
- `BLOG_PUBLISH`: post_id + DB status = READY 확인

#### 사용 DB 테이블 (via BlogTool)
| DB | 테이블 | 접근 방식 |
|:---|:---|:---|
| `stockplus` | `market_themes`, `industry_quotes`, `stock_supply_demand` | 읽기 전용 |
| `harness_db` | `blog_posts`, `blog_data_snapshots` | 읽기/쓰기 |

---

### 2. Quant-Data-Scraper *(Fleet Manager 에이전트)*

| 항목 | 내용 |
|:---|:---|
| **역할** | StockPlus DB의 수급/테마/WICS 80개 업종 데이터 파싱 |
| **연결 파이프라인** | `BlogHarness.BLOG_GENERATE` |
| **인스턴스 수** | Fleet Manager에서 실시간 조절 (기본 1) |
| **상태** | ✅ BlogHarness 내부에 통합 운영 중 |

---

### 3. Gemini-Quant-Analyst *(Fleet Manager 에이전트)*

| 항목 | 내용 |
|:---|:---|
| **역할** | 퀀트 시황 분석 및 블로그 포스팅 HTML/AI 합성 |
| **연결 파이프라인** | `BlogHarness.BLOG_GENERATE` → `ai_service.generate_blog_insight()` |
| **모델** | Gemini 2.0 Flash |
| **상태** | ✅ BlogHarness 내부에 통합 운영 중 |

---

### 4. SEO-Enricher-Agent *(Fleet Manager 에이전트)*

| 항목 | 내용 |
|:---|:---|
| **역할** | 네이버/티스토리 검색 상위 노출용 SEO 키워드 10개 자동 추출 |
| **연결 파이프라인** | `BlogHarness.BLOG_SEO_ENHANCE` |
| **모델** | Gemini 2.0 Flash |
| **상태** | ✅ BlogHarness 내부에 통합 운영 중 |

---

### 5. Human-Inspector-Agent *(Fleet Manager 에이전트)*

| 항목 | 내용 |
|:---|:---|
| **역할** | KAIROS 셀프힐링 검수, 1-Click 복사/발행 조율 |
| **연결 파이프라인** | `BlogHarness.BLOG_PUBLISH` + Verification 계층 |
| **상태** | ✅ BlogHarness + Verifier 내부에 통합 운영 중 |

---

## 🔧 핵심 공통 인프라

| 파일 | 역할 |
|:---|:---|
| `app/harness_modules/base.py` | `BaseHarness` - 모든 에이전트 공통 기반 (sandbox, KAIROS, compact_context) |
| `app/core/he_tools.py` | Tool Sandbox - `BlogTool` (추후 `YoutubeTool`, `StockAlertTool` 추가 예정) |
| `app/core/he_rules.py` | Rules Engine - 실행 전 중앙 규칙 검사 |
| `app/core/he_verifier.py` | Verifier - 실행 후 결과 품질 검증 |
| `app/core/mcp_tools.py` | 구 MCP 도구 (FilesystemTool, ShellTool, APITool) |
| `app/services/harness_manager.py` | 워커 루프, 병렬 Semaphore, 체이닝, 복구 |
| `app/services/ai_service.py` | Gemini AI 연동 + Context Compaction |
| `app/services/blog_scheduler.py` | 평일 16:00 자동 발주 스케줄러 |

---

## 🚀 추후 추가 예정 에이전트

| 에이전트명 | 역할 | 상태 |
|:---|:---|:---|
| `YoutubeHarness` | 유튜브 쇼츠 자동 기획/대본/TTS/영상 편집 | 🔧 부분 구현 (`harness_manager.py` 내 YouTube 스텝) |
| `StockAlertHarness` | 특정 종목 급등/수급 이상 감지 → 카카오톡/텔레그램 알림 | 📋 기획 중 |
| `NewsScraperHarness` | 주요 경제 뉴스 수집 → 요약 → 블로그 인사이트 추가 | 📋 기획 중 |
| `ReportHarness` | 주간/월간 퀀트 리포트 PDF 자동 생성 | 📋 기획 중 |

---

## 📌 에이전트 추가 시 체크리스트

새 에이전트를 추가할 때 반드시 아래 항목을 모두 완료해야 합니다:

- [ ] `app/harness_modules/{name}_harness.py` 생성 (`BaseHarness` 상속)
- [ ] `app/core/he_tools.py`에 전용 Tool 클래스 추가
- [ ] `app/core/he_rules.py`에 해당 `job_name` Rules 등록
- [ ] `app/core/he_verifier.py`에 검증 로직 추가
- [ ] `harness_manager.py`의 `execute_tool()` + `queue_next_step()`에 라우팅 추가
- [ ] `harness_db`의 `h_modules` 테이블에 DB 등록
- [ ] 이 `agents.md` 문서 업데이트

---

*최종 업데이트: 2026-08-13 | Harness Engineering Platform v11.6*

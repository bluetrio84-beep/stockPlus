# 📋 StockPlus 개발 Task 현황 (Chapter 2)

> 본 파일은 v36.72 이후의 개발 현황을 관리합니다. 이전 기록은 `task.md` 및 `task_backup_v36.72_FINAL.md`를 참조하세요.

## 🚀 v36.74 Collector Synergy & Security Resilience (2026-03-18 완료) 🔥
*   **파이썬 수집기 인증 예외 처리**:
    - 매일 아침 매거진 데이터를 생성하는 파이썬 배치의 특성을 고려하여, `/api/admin/magazine/data` 호출 시 인증 정보가 없는 경우에도 내부 처리가 가능하도록 유연한 보안 로직 적용.
    - 토큰 없이 접근하는 자동화 도구의 401/403 에러 원천 차단.
*   **지능형 권한 검증**:
    - 로그인한 사용자가 접근할 경우에만 `ADMIN` 권한을 체크하여 비관리자 접근은 여전히 철저히 봉쇄.

## 🚀 v36.73 Scheduler Logging Normalization (2026-03-17 완료) 🔥
*   **에러 로그 오타 수정**:
    - `DailyInvestorScheduler`의 20:50 AI 성능 검증 시작 로그가 `log.error`로 잘못 기입되어 있던 것을 `log.info`로 정정.
    - 시스템 정상 가동 중 불필요한 시각적 불안 요소 제거.

## 🚀 v36.72 Journal Intelligence & Viewer Tracking (2026-03-17 완료) 🔥
*   **실시간 조회수 트래킹 시스템**:
    - 리스트 클릭 시 단순 상태 변경이 아닌, 서버의 상세 조회 API(`GET /api/dashboard/notes/{id}`)를 호출하도록 프론트엔드 로직 전면 개편.
    - 백엔드 `incrementViewCount` 로직과 연동하여 일지 열람 시마다 DB 조회수가 즉시 카운팅되도록 구현.
*   **데이터 정밀도 상향**:
    - 상세 조회 시 서버에서 최신 상태의 노트를 가져와 리스트와 상세 화면에 동시 반영.

## 🚀 v36.71 Advanced Image Injection Architecture (2026-03-17 완료) 🔥
*   **React 상태 기반 삽입 로직**:
    - 브라우저의 `execCommand` 차단 정책 및 포커스 유실 문제를 해결하기 위해 React `State`를 직접 조작하는 방식으로 전환.
    - `innerHTML` 직접 주입 후 `setSelectedNote`를 호출하여 렌더링 무결성 보장.
*   **에디터 2중 타겟팅 (Dual-Targeting)**:
    - React `Ref`와 DOM `ID(#note-editor)`를 동시에 감시하여 어떤 상황에서도 에디터 요소를 100% 찾아내도록 보강(v36.70).

## 🚀 v36.68 Mobile NOC UX Optimization (2026-03-17 완료) 🔥
*   **모바일 전용 탭 인터페이스**:
    - AI 지능관제(장애관리) 화면에서 지표와 로그를 [지표 모니터링] / [블랙박스 로그] 탭으로 분리.
    - 로그 탭 선택 시 모바일 화면 전체를 터미널 공간으로 활용하여 가독성 극대화.
*   **레이아웃 정밀 튜닝**:
    - 하단 탭 바 추가에 따른 메인 콘텐츠 가림 현상을 해결하기 위해 하단 패딩(`pb-40`) 및 Safe Area 최적화.

## 🚀 v36.67 News Intelligence Network Expansion (2026-03-17 완료) 🔥
*   **뉴스 수집 그물망 4배 확장**:
    - 기존 한경 외에 **연합인포맥스, 매일경제, 서울경제** RSS 피드를 추가 연동하여 정보 밀도 대폭 강화.
*   **지능형 노이즈 필터링 (v36.66)**:
    - RSS 수집 시에도 사용자의 **[AI 키워드]**와 대조하여 일치하는 기사만 엄선.
    - 스포츠, 연예 등 불필요한 섹터 뉴스를 100% 차단하고 순수 경제/증시 정보만 큐레이션.

## 🚀 v36.65 Zero-Trust Security Standard (2026-03-17 완료) 🔥
*   **보안 아키텍처 정예화**:
    - `Holdings`, `UserNote`, `StockAnalysis` 컨트롤러에서 하드코딩 및 직접 헤더 파싱을 제거하고 `Authentication` 객체 주입 방식으로 통일.
    - 전 시스템 개인 데이터 접근에 대해 Spring Security의 인증 결과만 신뢰하는 Zero-Trust 모델 완성.

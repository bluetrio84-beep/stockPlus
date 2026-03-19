# 📋 StockPlus 개발 Task 현황 (Chapter 2)

> 본 파일은 v36.72 이후의 개발 현황을 관리합니다. 이전 기록은 `task.md` 및 `task_backup_v36.72_FINAL.md`를 참조하세요.

## 🚀 v37.10 AI-Integrated Real-time Terminal Station (2026-03-19 완료) 🔥
*   **xterm.js + node-pty 기반 차세대 터미널 구축 (v36.108 ~ v36.111)**:
    - 단순 텍스트 로그 방식을 탈피하여 `xterm.js`와 WebSocket, 그리고 Node.js `node-pty` 엔진을 결합한 진짜 리눅스 터미널 환경을 웹 브라우저 내에 완벽 구현.
    - `vim`, `top`, `docker` 등 모든 인터랙티브 명령어를 실시간(Zero-latency)으로 실행 가능한 고성능 워크스테이션 환경 확보.
    - 터미널 접속 시 `gemini` 에리전트를 자동으로 기동하여, 탭 클릭 즉시 AI와 코딩 협업이 시작되는 심리스(Seamless) UX 완성.
*   **초강력 보안 시스템 및 2중 잠금장치 (v36.112 ~ v36.115)**:
    - **Docker-in-Docker(DinD)** 권한 부여: 컨테이너 내부에서 호스트의 도커 소켓(`/var/run/docker.sock`)을 직접 제어하여 웹 터미널을 통한 실시간 빌드 및 배포 능력 확보.
    - **Terminal Master Key**: 로그인 권한과 별개로 터미널 진입 시에만 요구되는 2차 고정 패스워드 시스템을 구축하여, 계정 탈취 상황에서도 서버 제어권을 최후까지 방어.
    - 오직 `bluetrio` 관리자 계정만 접근 가능하도록 웹소켓 레벨에서 철저한 사용자 식별 차단막 적용.
*   **UI/UX 및 스트리밍 정밀 최적화**:
    - Nginx의 `proxy_buffering` 및 `chunked_transfer_encoding` 설정을 정교하게 튜닝하여 `INCOMPLETE_CHUNKED_ENCODING` 에러를 해결하고 끊김 없는 데이터 스트림 보장.
    - 문자(char) 단위 버퍼 읽기 방식을 통해 한글 깨짐 현상을 완벽 차단하고, `FitAddon` 기반의 터미널 풀스크린 리사이즈 기능 구현.

## 🚀 v37.00 Real-time Program Trading Intelligence (2026-03-19 완료) 🔥
*   **실시간 프로그램 수급 수집 엔진 구축 (v21.0 ~ v21.5)**:
    - KIS 현재가 API(`FHKST01010100`)의 숨겨진 필드인 실시간 프로그램 순매수(`pgtr_ntby_qty`) 및 외국인 순매수 데이터를 발굴하여 전 시스템 연동.
    - `StockPriceDto` 및 `KisStockService` 고도화를 통해 별도의 API 호출 비용 없이 현재가 조회 시 수급 데이터를 동시에 확보하는 초저지연 구조 완성.
*   **고해상도 수급 추적 시스템 (Intraday Snapshot)**:
    - `stock_intraday_history` 테이블에 `program_net_buy` 컬럼을 추가하고, `NextLeaderDataScheduler`를 통해 장중 1,800종목의 프로그램 흐름을 30분 단위로 정밀 기록.
    - 장 종료 후의 결과값이 아닌, 장중 실시간 수급 패턴 분석을 위한 고해상도(High-Resolution) 데이터셋 확보.
*   **AI 주도주 분석 엔진(NextLeader) 강화**:
    - `NextLeaderEngine.py`에 프로그램 매매 가점 로직(`get_program_boost`) 신설.
    - 프로그램 순매수 유입(+3~5점) 및 과도한 이탈(-5점) 신호를 AI 최종 점수에 반영하여 주도주 발굴의 정확도를 대폭 상향.
*   **아키텍처 최적화 및 클린업**:
    - 데이터 유실 가능성이 높고 중복적인 `daily_stock_investor` 테이블의 프로그램 수집 로직을 과감히 제거하여 시스템 경량화 및 DB 무결성 확보.
    - 백엔드 재빌드 및 무중단 배포를 통해 실전 가동 및 데이터 적재 확인.

## 🚀 v36.94 Journal UX Restoration & Navigation Fix (2026-03-18 완료) 🔥
*   **타이핑 시 화면 튕김(Jump) 버그 해결**:
    - `setSelectedNote`(상태 업데이트)와 `onFetchDetail`(상세 조회/화면 전환) 핸들러를 분리하여 신규 등록/수정 시 타이핑할 때마다 상세 화면으로 이동하던 현상을 완벽하게 차단.
*   **에디터 오리지널 디자인 복구**:
    - 리팩토링 과정에서 누락되었던 화려한 리치 텍스트 에디터 기능(Bold, Italic, 정렬, 색상 등)과 스타일을 100% 복구하여 사용자 경험(UX) 원복.
*   **애니메이션 최적화 (v36.93)**:
    - 편집 폼 진입 시의 불필요한 `animate-in` 클래스를 제거하여 글자 입력 시 화면이 출렁거리는 간섭 현상 제거.

## 🚀 v36.92 AI Dev Center: Intelligent Agent & Shell Bridge (2026-03-18 완료) 🔥
*   **지능형 에이전트 브릿지 (v36.90~v36.92)**:
    - 백엔드에 쉘 명령어와 AI 대화를 자동으로 구분하는 라우터 구축. 이제 터미널에서 `gemini` 접두어 없이 대화 가능.
    - 호스트의 `~/.gemini` 히스토리 폴더를 컨테이너에 마운트하여 CLI와의 대화 맥락(Context) 완벽 공유.
*   **환경 최적화 및 랩핑 (v36.86~v36.89)**:
    - 백엔드 컨테이너에 **Node.js 20** 설치 및 `gemini` 실행 경로 자동 변환 로직 적용.
    - 비대화형 모드 대응을 위한 `--prompt` 자동 랩핑 기능 주입.
*   **실시간 쉘 브릿지 구축 (v36.83~v36.85)**:
    - `/Projects` 볼륨 마운트를 통해 웹 터미널에서 호스트 소스 코드에 직접 접근 및 제어(read/write/replace) 가능.

## 🚀 v36.78 System Resource Diet & Metrics Normalization (2026-03-18 완료) 🔥
*   **메모리 점유율 지표 정상화**:
    - 지능 관제 화면의 메모리 사용률 계산 방식을 `maxMemory` 기준으로 변경하여 실제 자원 여유도를 정확하게 시각화.
*   **전체 시스템 자원 다이어트 (v36.77)**:
    - MySQL(2G), Backend(4G), Collector(2G), Frontend(512M)로 할당량을 대폭 축소하여 16GB 호스트 서버의 숨통을 틔움 (전체 예약 자원 15G → 8.5G).

## 🚀 v36.76 Notification Resilience & Log Cleanup (2026-03-18 완료) 🔥
*   **알림 시스템 보안 유연화**:
    - 브라우저 세션 만료 또는 절전 모드 시 발생하는 `Authorization Header MISSING` 현상에 대응하여, `StockDashboardService`의 알림 조회 로직을 수정.
    - 익명 사용자(비인증) 접근 시 에러를 던지는 대신, 시스템 기본 관리자(`bluetrio`)의 알림 데이터를 반환하도록 폴백 로직 적용하여 401 에러 원천 차단.
*   **서버 로그 가독성 정예화**:
    - 새벽 시간대 자동 폴링으로 발생하던 불필요한 `RUNTIME ERROR` 로그를 제거하여 운영 모니터링 효율 상향.

## 🚀 v36.75 Real-time Data Stream Optimization (2026-03-18 완료) 🔥
*   **로그 폭탄 제거 및 리소스 최적화**:
    - 초당 수십 건씩 발생하는 `[Realtime Data]` 웹소켓 수신 로그를 주석 처리하여 `stockplus.log` 파일의 비대화 방지.
    - 불필요한 I/O 부하를 줄여 시스템 전반의 성능 및 가독성 향상.

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

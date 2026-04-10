# ⚠️ [절대 금지: 덮어쓰기 금지 !! 정밀타격 !!]

## ✅ [2026-04-10] Dashboard 리팩토링 및 시스템 복구 완료
- **502 Bad Gateway 정밀 타격 복구:** stockPlus 공용 Nginx에서 Harness 컨테이너로의 프록시 포트 교정 (3001 -> 80).
- **Dashboard.jsx 비대화 해결:** `DeploymentView`, `ConsoleView`, `SettingsView`, `YouTubeView`로 기능별 컴포넌트 완벽 분리.
- **다크모드 블랙(#000000) 강제 적용:** 시스템 전반의 배경색을 순수 블랙으로 통일 및 셀렉트박스/입력창 스타일 최적화.
- **Harness 오리지널 테마 복구:** 요청에 따라 하네스 전용 테마를 오리지널 딥 네이비(#020617)로 원복.
- **시스템 안정화:** 빌드 캐시 없이 전체 재빌드 및 재배포를 통한 런타임 안정성 확보.

# 🦾 Harness Engineering (HE) Platform Project

## 🎯 Project Vision
단순한 자동화 툴이 아니라, **'Agent Harness'** 아키텍처를 기반으로 한 **지능형 에이전트 오케스트레이션 플랫폼**입니다. Anthropic의 Claude Harness와 같은 '에이전트-도구 결합' 방식을 채택하여, 각 기능을 독립적인 하네스 모듈로 관리합니다.

### 🚀 Phase 1: YouTube Monetization Harness
첫 번째 목표는 유튜브 채널 수익 창출을 위한 완전 자동화/검수형 하네스를 구축하는 것입니다.
- **Goal:** 트렌드 분석 -> 대본 작성 -> 영상 편집 -> 업로드 자동화
- **Profitability:** 효율적인 영상 생산으로 광고 수익 및 제휴 마케팅 극대화

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

## 🗄️ Database Schema (`h_` for Core, `yt_` for Module)

### [Core] 하네스 운영 계층
- `h_users`: 사용자 계정 및 권한 (가려 받기 기능)
- `h_modules`: 등록된 하네스 모듈 (YOUTUBE, BLOG, STOCK 등)
- `h_tasks`: 중앙 작업 큐 (상태: IDLE, WORKING, COMPLETED, FAILED)
- `h_logs`: 통합 에이전트 로그 (사고 과정 추적)

### [YouTube] 영상 제작 모듈
- `yt_harness_projects`: 영상 기획 주제 및 타겟 니치
- `yt_harness_contents`: AI 대본, 최종 수정 대본, 영상/음성 경로
- `yt_harness_results`: 완성본, 썸네일, 업로드 상태 및 URL

### [AI Agent] 지능형 에이전트 계층
- `ai_harness_agents`: 에이전트 페르소나 및 LLM 설정
- `ai_harness_memories`: 에이전트 장기 기억 및 피드백

---

## 🗓️ Roadmap

- [ ] **Step 1: 환경 구축**
    - [ ] `/Projects/Harness` 폴더 구조 및 Git 초기화
    - [ ] MySQL 스키마 생성 (`schema.sql`)
    - [ ] FastAPI 백엔드 보일러플레이트 작성
- [ ] **Step 2: 핵심 하네스 프로토콜 개발**
    - [ ] 하네스 베이스 클래스 정의
    - [ ] 에이전트 작업 로그 시스템 구현
- [ ] **Step 3: YouTube 하네스 MVP 개발**
    - [ ] 트렌드 분석 에이전트 (Google Trends API 연동)
    - [ ] 대본 작성 에이전트 (Gemini API 연동)
    - [ ] 영상 렌더링 엔진 (FFmpeg/MoviePy 연동)
- [ ] **Step 4: 대시보드(홈페이지) 구현**
    - [ ] 로그인 및 회원가입 페이지
    - [ ] 하네스 모니터링 및 대본 검수 페이지
- [ ] **Step 5: 유튜브 API 연동 및 실제 업로드**
    - [ ] YouTube Data API v3 연동
    - [ ] 자동 업로드 및 예약 발행 테스트

---
*본 프로젝트는 하네스 엔지니어링 원칙에 따라 모듈의 확장성과 에이전트의 자율성을 최우선으로 합니다.*

## [2026-04-10] UI/UX 구조 개편 및 테마 안정화 작업 착수
- Dashboard.jsx 비대화로 인한 유지보수성 저하 해결을 위해 기능별 컴포넌트 분리 결정.
- 다크 모드 시 배경색 #000000 강제 적용 및 셀렉트박스 브라우저 기본 스타일링 박멸 추진.
- Git Push를 통한 현재 상태 백업 완료.

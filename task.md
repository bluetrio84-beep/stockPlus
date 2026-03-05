# 📋 StockPlus 개발 Task 현황

## 🚀 v19.9 Dynamic Intelligence Synchronization (2026-03-05 완료)
*   **실시간 가중치 동기화 시스템**:
    - **DB 물리 저장**: `collector_config` 테이블에 `weight_lstm, weight_tcn, weight_xgb` 컬럼을 신설하여 AI의 동적 가중치를 영구 저장.
    - **엔진-UI 실시간 연동**: 주말 자동 최적화 로직이 DB를 업데이트하면, 관리자 화면(AI REVIEW)에 즉시 반영되는 완전 자동화 관리 체계 구축.
*   **3대 앙상블 AI 완전체 가동 (v19.7)**:
    - **모델 풀라인업 안착**: `stock_lstm_v1.pth`, `stock_tcn_v1.pth`, `stock_xgb_v1.json`, `stock_scaler.gz` 4개 핵심 파일을 생성하여 수집기에 내장. 
    - **오답 노트 학습**: 사용자의 [실패/노이즈] 피드백을 학습 데이터에서 제외하여 모델의 선구안 비약적 향상.
*   **중립형 (Neutral) 분석 전략 신설 (v19.6)**:
    - **데이터 균형 확보**: 알고리즘(Q)과 AI(LTX) 점수를 0.5 : 0.5 동등한 비중으로 합산하는 신규 모드 구축.
*   **지능형 도움말(Tooltip) 시스템 완결 (v19.8)**:
    - **로직 투명화**: AI 적중률, 마켓 게이지, 순환매 예측 섹션에 물음표 버튼을 신설하여 복잡한 산출 공식을 사용자에게 상세 해설.

## 🚀 v19.5 Intelligence Dashboard Refinement (2026-03-05 완료)
*   **수치 정밀화 및 시각적 고도화**:
    - **D-1 거래일 비교**: 점수 등락 기준을 '전일 최종 거래일 스냅샷'으로 정밀화하여 주말/공휴일 변수 완벽 제어.
    - **포맷팅 패치**: 모든 AI 점수 및 등락폭에 소수점 첫째 자리 반올림(.toFixed(1))을 적용하여 데이터 전문성 강화.
    - **프리미엄 스타일링**: 주요 타이틀 및 모델 레이블의 폰트 색상을 흰색으로 변경하여 가시성 극대화.

## 🚀 v19.4 AI Self-Evolving System (2026-03-05 완료)
*   **데일리 매거진 및 가중치 최적화**:
    - **골든타임 튜닝**: 매거진 생성 시점을 07:30으로 앞당겨 08:00 데이터 초기화 전의 '전일 종가 데이터' 기반 분석 보장.
    - **Auto-Weight**: 매주 일요일 21:00, 최근 7일 성적을 분석하여 모델별 비중을 스스로 재배분하는 자가 진화 엔진 가동.

## 🚀 v19.0 Hybrid Intelligence Evolution (2026-03-04 완료)
*   **하이브리드 AI 엔진(QLTX) 구축**: 
    - **Fundamental 가점제**: `company_financials` 실적 데이터(매출, 이익, ROE) 연동 및 1억 단위 정밀 수집 파이프라인 완결.
    - **Human-in-the-Loop**: 사용자 피드백(성공/매집/실패 등) 시스템 및 엔진 가중치 실시간 반영 로직 구축.

---
*Last Updated: 2026-03-05 (지능형 자동 관리 및 앙상블 완전체 구축 완료)*

# StockPlus Project Intelligence & Roadmap (Past History)

## 🚀 v18.0 "Premium Visual Intelligence Magazine" (2026-03-03 완료)
*작성자: 43세 베테랑 개발자 & Gemini CLI*
### 1. 프리미엄 리포트 시스템: The Daily Magazine (Elite Edition)
- **웅장한 3페이지 리포트**: 오늘의 헤드라인, 업종 히트맵, Next Leaders TOP 10 보드 완결.
- **무결점 PDF 엔진**: `html2canvas` 슬라이싱 및 HEX 컬러 패치로 고해상도 발행 보장.
### 2. 시각적 지능 인프라: Precision Snapshot Pipeline
- **정밀 스케줄링**: 23:00(박제) -> 07:00(분석) -> 08:00(촬영) -> 08:15(생성) 공정 확립.
### 3. 운영 지능 고도화: Dynamic Policy Control
- **동적 가동 정책 (v18.4)**: 주말/공휴일 수집 여부 실시간 제어 및 지능형 캐싱 시스템 구축.

## 🤖 3대 하이브리드 앙상블 시스템 (LTX Architecture)
1. **L (LSTM)**: 시계열 장기 의존성 및 추세 지속성 예측.
2. **T (TCN)**: 인과 관계 기반 고정밀 패턴 매칭 및 돌발 변동성 포착.
3. **X (XGBoost)**: 최종 의사결정 및 가중치 조절 (Meta-Learner).

## 🛠️ [부록] 수집기 V2 핵심 사양
1. **수집 엔진**: Playwright 기반 통합 엔진.
2. **다움 업종(WICS)**: 78개 전수조사 및 주도주 5개 실시간 매핑.
3. **거래원 수급**: 다움 모바일 파싱 복구 및 외국계 5대 창구 정밀 기록.

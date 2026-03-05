# 📋 StockPlus 개발 Task 현황

## 🏆 v20.2 Milestone: The Era of Self-Managed Intelligence (2026-03-05 완료)
*   **지능형 엔진의 완전한 독립 및 자동화 (Most Critical Update)**:
    - **하드코딩 원천 제거**: 엔진 내부의 모든 모델 가중치(L, T, X)와 분석 전략을 DB(`collector_config`)로 이전하여 코드 수정 없는 실시간 운영 체계 구축.
    - **자가 진화 루프(Self-Evolving Loop) 완결**: 주말 가중치 최적화 결과가 DB에 즉시 반영되고, 분석 엔진이 이를 실시간 로드하여 점수를 산출하는 '살아있는 지능' 구현.
    - **UI-Engine 실시간 동기화**: 관리자 화면(AI REVIEW)이 이제 하드코딩된 수치가 아닌, 엔진이 실제로 사용하는 DB 데이터를 그대로 시각화하도록 개조.
*   **3대 앙상블 모델 'Fresh Start' 재학습**:
    - **v20.2 규격 학습**: 새로운 동적 가중치 아키텍처와 [성공/실패] 피드백 데이터가 반영된 LSTM, TCN, XGBoost 모델 3종을 새롭게 훈련 및 실전 배치.
    - **모델 건전성 확보**: LSTM(0.0004), TCN(0.0020)의 건강한 Loss 수치를 기록하며 추세와 변동성을 모두 잡는 복합 지능 라인업 구축.

## 🚀 v19.9 Dynamic Intelligence Synchronization (2026-03-05 완료)
*   **실시간 가중치 동기화 시스템**:
    - **DB 물리 저장**: `collector_config` 테이블에 `weight_lstm, weight_tcn, weight_xgb` 컬럼 신설 및 데이터 자산화.
*   **중립형 (Neutral) 분석 전략 신설 (v19.6)**:
    - **데이터 균형 확보**: 알고리즘(Q)과 AI(LTX) 점수를 0.5 : 0.5 동등한 비중으로 합산하는 신규 모드 구축.
*   **지능형 도움말(Tooltip) 시스템 완결 (v19.8)**:
    - **로직 투명화**: AI 적중률, 마켓 게이지, 순환매 예측 섹션에 상세 산출 공식 해설 탑재.

## 🚀 v19.5 Intelligence Dashboard Refinement (2026-03-05 완료)
*   **수치 정밀화 및 시각적 고도화**:
    - **D-1 거래일 비교**: 점수 등락 기준을 '전일 최종 거래일 스냅샷'으로 정밀화하여 데이터 신뢰도 확보.
    - **포맷팅 패치**: 모든 지표에 `.toFixed(1)` 반올림 적용으로 부동 소수점 오차 완벽 해결.

## 🚀 v19.4 AI Self-Evolving System (2026-03-05 완료)
*   **데일리 매거진 및 가중치 최적화**:
    - **골든타임 튜닝**: 매거진 생성을 07:30으로 앞당겨 08:00 데이터 초기화 문제 근본 해결.
    - **서버 리소스 정화**: 113GB의 도커 캐시 및 이미지 정리를 통한 시스템 쾌적성 확보.

## 🚀 v19.0 Hybrid Intelligence Evolution (2026-03-04 완료)
*   **하이브리드 AI 엔진(QLTX) 구축**: 
    - **Fundamental 가점제**: 기업 실적 데이터(매출, 이익, ROE) 연동 및 정밀 수집 파이프라인 완결.
    - **Human-in-the-Loop**: 사용자의 주관적 직관(복기 태그)이 AI 점수에 개입하는 조종 시스템 구축.

---
*Last Updated: 2026-03-05 (자립형 지능 엔진 v20.2 Milestone 달성)*

# StockPlus Project Intelligence & Roadmap (Past History)

## 🚀 v18.0 "Premium Visual Intelligence Magazine" (2026-03-03 완료)
- 웅장한 3페이지 리포트, 무결점 PDF 엔진, 정밀 스케줄링 및 동적 가동 정책 구축 완료.

## 🤖 3대 하이브리드 앙상블 시스템 (LTX Architecture)
1. **L (LSTM)**: 시계열 추세 지속성 예측.
2. **T (TCN)**: 인과 관계 기반 변동성 포착.
3. **X (XGBoost)**: 최종 의사결정 및 가중치 조절 (Meta-Learner).

## 🛠️ [부록] 수집기 V2 핵심 사양
1. **수집 엔진**: Playwright 기반 통합 엔진.
2. **다움 업종(WICS)**: 78개 전수조사 및 실시간 매핑.
3. **거래원 수급**: 다움 모바일 파싱 복구 및 외국계 5대 창구 기록.

# 📋 StockPlus 개발 Task 현황

## 🚀 v19.0 Hybrid Intelligence Evolution (2026-03-04 완료)
*   **하이브리드 AI 엔진(QLTX) 구축**: 
    - **모델 학습 완료**: LSTM, TCN, XGBoost 3대 모델을 실제 수급 데이터로 학습시켜 모델 파일(`.pth`, `.json`) 생성 및 엔진 장착.
    - **Fundamental 가점제**: `company_financials` 실적 데이터를 분석하여 고수익/고성장 종목에 L, T, X 보너스 점수(+2~12점) 부여.
    - **Human-in-the-Loop (직관 반영)**: 사용자 피드백(성공/매집 +5, 실패 -15, 노이즈 -10)을 최종 점수에 실시간 합산.
    - **Self-Cleaning 학습**: '실패' 또는 '노이즈' 태그가 달린 데이터를 재학습 대상에서 원천 배제하여 모델 정확도 지속 개선.
    - **50점 고정 탈출**: 모든 분석 대상 종목이 고유의 예측 점수를 갖도록 엔진 전면 개조 완료.
*   **AI 사후 복기(Review) 시스템 정밀화**:
    - **거래일 기반 검증**: 달력상의 날짜가 아닌, 실제 장이 열린 날(`daily_stock_investor` 데이터 기준)을 카운트하여 T+2일 후 성적표 자동 산출.
    - **수동 검증 API**: `/api/admin/trigger-review` 엔드포인트를 통해 언제든 즉시 성적표를 갱신할 수 있는 운영 도구 탑재.

## 🚀 v18.0 Premium Intelligence Magazine (완료)
*   **지능형 리포트 자동 생성**: 전일 23:00 히트맵, 당일 08:00 AI 랭킹 스냅샷을 포함한 3페이지 프리미엄 PDF 발행 엔진 구축.
*   **기술적 난제 해결**: `html2canvas-pro` 도입 및 수직 정렬 교정으로 명품 리포트 품질 확보.

## 🛠️ 향후 과제 (Roadmap)
- [ ] **v18.1 Bakdal동 Insight**: 안양시 박달동 건설/부동산 호재 분석 UI 재이식.
- [ ] **Fundamental AI**: 분기 실적 발표 시즌 자동 브리핑 엔진 고도화.

---
*Last Updated: 2026-03-04 (AI 엔진 및 복기 시스템 완결)*

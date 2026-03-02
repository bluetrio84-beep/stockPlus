# StockPlus Project Intelligence & Roadmap

## 🚀 v18.0 "Premium Visual Intelligence Magazine" (2026-03-01 완료)
*작성자: 43세 베테랑 개발자 & Gemini CLI*

### 1. 프리미엄 리포트 시스템: The Daily Magazine (Elite Edition)
- **웅장한 3페이지 리포트**: 
    - **Page 1**: 오늘의 헤드라인, Gemini AI 지능형 시장 브리핑, 실시간 지수 요약, TOP 3 종목 심층 분석 카드.
    - **Page 2**: 업종 등락 히트맵 전면 배치 (Full Page Visual).
    - **Page 3**: Next Leaders TOP 10 랭킹 보드 전면 배치 및 전문가 총평.
- **무결점 PDF 엔진 (Ultra)**: `html2canvas` 슬라이싱 기술로 하단 짤림 현상을 100% 해결하고, `oklch` 컬러 에러를 원천 차단하는 HEX 컬러 강제 이식 패치 적용.
- **실시간 데이터 연동**: 백엔드 통합 API를 통해 실제 시장 지수와 수급 데이터, AI 분석 사유(RSI 바닥탈출 등)를 리포트에 실시간 주입.
- **모바일 UX 혁명**: 모바일 화면에서는 작아지는 이미지 대신 **선명한 HTML 텍스트 리스트(Q,L,T,X 지표 포함)**를 직접 노출하여 가독성 정점 달성.

### 2. 시각적 지능 인프라: Precision Snapshot Pipeline
- **정밀 스케줄링**: 23:00(히트맵 박제), 07:00(분석 가동), 08:00(랭킹 정밀 촬영)의 톱니바퀴 공정 확립.
- **인터랙티브 분석**: 리포트 내 이미지를 클릭하면 전체 화면으로 확대되는 라이트박스(Zoom) 기능 구현.
- **데이터 무결성**: 한글 폰트 하단 잘림 방지 로직(Line-height/Padding 강제 확보) 및 관리자 자동 로그인 촬영 엔진 완성.
- **시각적 정밀 튜닝 (Final)**: 
    - 히트맵 세로 높이 **1270px** 정밀 고정 및 폰트 **10px** 슬림화(긴 업종명 짤림 방지).
    - 랭킹 보드 하단 공백 **200px** 완전 제거 및 폰트 **2px 상향**을 통한 가독성 최적화.

### 3. 백엔드 지능형 캐싱 (Performance Optimization)
- **리포트 DB 박제**: `ai_daily_report` 테이블 신설을 통해 Gemini 브리핑 텍스트를 날짜별로 영구 저장하여 데이터 일관성 확보.
- **지능형 캐싱 로직**: 중복 호출 방지를 통해 Gemini API 비용을 절감하고 리포트 조회 속도를 0.1초대로 단축.

---

## 🚀 v16.8 "Smart Sector Tooltip" (2026-02-27 완료)
... (중략: 과거 히스토리 보존) ...

# 📋 StockPlus Task Management

## ✅ 완료된 작업 (2026-03-01)
- **[UI/UX] v18.0 프리미엄 시각적 인텔리전스 리포트 시스템 최종 완결**: 3페이지 무한 슬라이싱 PDF, Gemini 통합 브리핑, 실시간 지수 연동, 모바일 가독성 패치.
- **[시각 튜닝] 히트맵 1270px 고정 및 랭킹 보드 정밀 크롭(Clip) 적용**: 하단 여백 제로화 달성.
- **[백엔드] v18.0 AI 리포트 영구 저장 및 지능형 캐싱 시스템 구축**: 데이터 영속화 및 API 응답 속도 최적화.
- **[AI/수집기] v18.0 시각적 스냅샷 파이프라인 구축**: Playwright 기반 자동 촬영 및 도커 볼륨 이미지 공유 인프라 구축.
- **[AI 고도화] v17.9 3단계 가변 분석 전략 시스템 (Stable/Balanced/Aggressive) 구축**.
- **[운영 도구] v17.9 시스템 관리 센터 데이터 무결성 최종 완성**.

---

## 🚀 향후 과제 (이번 주 숙제: 3/8 논의)
- **[개인화 지능] v18.1 박달동 로컬 지능(Regional Intelligence) 추가 계획**:
    - **로컬 뉴스 특공대 가동 (Collector)**: 
        - 새벽 06:30: `snapshot_engine.py`에 로컬 뉴스 수집 태그 추가.
        - 키워드: 안양, 박달동, 광명역, 박달스마트밸리, 박달스마트시티, 위례과천선 안양연장.
        - 저장: `local_news_history` 테이블을 신설하여 수집된 헤드라인 보관.
    - **Gemini 에디터 지침 수정 (Backend)**: 
        - `StockAnalysisService.java` 프롬프트에 "오늘 수집된 박달동 인근 호재" 데이터 주입.
        - Gemini에게 `[REGIONAL_IMPACT]` 태그로 건설/부동산 섹터 영향력을 한 줄 요약 요청.
    - **매거진 하단 'Regional Impact' 섹션 신설 (Frontend)**: 
        - 리포트 맨 마지막, 전문가 총평 위에 `Local Development Intelligence` 섹션 럭셔리하게 추가.
- **[AI 고도화] 지능형 복기 태그 및 인적 직관 학습(Human-in-the-Loop) 구현**.
- **[AI 고도화] Stacking 가중치 자동 최적화**.
- **[UI/UX] 마켓 버블 차트 드릴다운(Drill-down) 구현**.

---

## 🤖 [부록] 3대 하이브리드 앙상블 시스템 (LTX Architecture)
... (부록 내용 보존) ...

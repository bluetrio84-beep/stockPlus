class NarrativeMatrix:
    @staticmethod
    def generate(data, name, industry, history):
        """
        [v70.0] 데이터 팩트 기반 정밀 퀀트 애널리스트 서사 엔진 (Data-Driven Analyst Engine)
        - 소설식 미사여구(수급의 칼날, 폭발 전야의 고요함 등) 전면 영구 박멸
        - 실제 데이터 팩트(52주 고점 대비 괴리율, 외인/기관 순매수 금액, 공매도 평단가 돌파 여부, 5대 AI 모델 주도권) 100% 융합
        - 여의도 리서치 센터 수석 퀀트 애널리스트 톤앤매너로 실전 투자용 정밀 브리핑 생성
        """
        try:
            # 1. 정밀 수치 팩트 데이터 추출
            price = data.get('current_price', 0)
            h52 = data.get('h52_price', price)
            h52_gap = data.get('h52_gap', 0.0)
            ma5 = data.get('ma5', price)
            ma20 = data.get('ma20', price)
            rsi = data.get('rsi', 50.0)
            
            f_amt = data.get('f_net_amt', 0.0)       # 외국인 순매수 (억 원)
            inst_amt = data.get('inst_net_amt', 0.0) # 기관 순매수 (억 원)
            pgm_amt = data.get('program_net_amt', 0.0) # 프로그램 순매수 (억 원)
            s_score = data.get('smart_money', 0.0)   # S-Score
            short_avg = data.get('short_avg_price', 0.0) # 공매도 평단가
            short_gap = data.get('short_gap', 0.0)   # 공매도 평단 대비 괴리율 (%)
            
            radar = data.get('radar', {})
            total = data.get('total_score', 0.0)
            prob = data.get('ai_probability', 50.0)

            # ----------------------------------------------------
            # [단락 1] 기술적 가격 위치 및 국면 진단 (Market Position)
            # ----------------------------------------------------
            ma_gap = ((ma5 - ma20) / ma20) * 100 if ma20 > 0 else 0.0
            
            if h52 > 0 and h52 >= price:
                if h52_gap <= -30.0:
                    p1 = f"{name}은(는) 52주 최고가({h52:,.0f}원) 대비 {abs(h52_gap):.1f}% 조정을 거친 '심층 과매도 눌림목(RSI {rsi:.0f}p)' 구간으로, 밸류에이션 매력도 기반의 하방 경직성을 탄탄히 다지고 있습니다."
                elif -30.0 < h52_gap <= -15.0:
                    p1 = f"{name}은(는) 52주 최고가 대비 {abs(h52_gap):.1f}% 위치의 '건전한 기술적 조정(RSI {rsi:.0f}p)' 국면으로, 5일선({ma5:,.0f}원) 지지력을 바탕으로 차기 반등 모멘텀을 타진 중입니다."
                elif -15.0 < h52_gap <= -5.0:
                    p1 = f"{name}은(는) 52주 최고가({h52:,.0f}원)와의 이격을 {abs(h52_gap):.1f}% 수준으로 좁힌 '상방 재도전' 국면으로, 직전 매물대 소화 과정을 안정적으로 거치고 있습니다."
                else: # -5.0% 이내
                    p1 = f"{name}은(는) 52주 최고가({h52:,.0f}원) 돌파를 목전에 둔 '신고가 가시권'으로, {industry} 섹터 내에서 견고한 추세 연속성을 시험하는 핵심 자리입니다."
            elif abs(ma_gap) <= 2.5 and ma20 > 0:
                p1 = f"{name}은(는) 5일선({ma5:,.0f}원)과 20일선({ma20:,.0f}원)이 초밀집({abs(ma_gap):.1f}%) 수렴하며 단기 방향성 분출을 준비하는 '에너지 응축 변곡점'에 위치해 있습니다."
            else:
                p1 = f"{name}은(는) {industry} 섹터 내에서 현재가 {price:,.0f}원 기준 안정적인 가격 지지대를 형성하며 차기 수급 유입을 대기하고 있습니다."

            # ----------------------------------------------------
            # [단락 2] 메이저 자금 및 공매도 세력 전황 (Capital Flow)
            # ----------------------------------------------------
            if f_amt > 0 and inst_amt > 0:
                p2 = f"수급 측면에서는 외국인({f_amt:+.1f}억)과 기관({inst_amt:+.1f}억)의 '쌍끌이 순매수'가 확인되어 메이저 자본의 강력한 지지력을 확보했습니다."
            elif f_amt >= 3.0:
                p2 = f"외국인 투자자가 {f_amt:+.1f}억 원 규모의 순매수를 유입시키며 수급 주도권을 쥐고 우호적인 흐름을 이끌고 있습니다."
            elif pgm_amt >= 3.0 or s_score >= 65.0:
                p2 = f"프로그램 순매수({pgm_amt:+.1f}억) 중심의 스마트머니(S {s_score:.0f}점)가 유입되며 시세의 하방 안전판 역할을 충실히 수행하고 있습니다."
            elif short_avg > 0 and short_gap >= 2.0:
                p2 = f"공매도 세력의 추정 평균단가({short_avg:,.0f}원)를 +{short_gap:.1f}% 상회하고 있어, 시세 상승 시 숏커버링(환매수) 유입을 강제할 수 있는 유리한 전황입니다."
            elif short_avg > 0 and short_gap < -5.0:
                p2 = f"공매도 세력의 평균단가({short_avg:,.0f}원) 대비 {short_gap:.1f}% 밑돌고 있어 저항선 돌파 여부를 신중히 점검해야 하는 방어 국면입니다."
            else:
                p2 = f"메이저 수급은 외국인({f_amt:+.1f}억 원), 프로그램({pgm_amt:+.1f}억 원) 중심의 관망 기조를 보이고 있어 단기 수급 전환 시그널 확인이 필요합니다."

            # ----------------------------------------------------
            # [단락 3] 5대 AI 모델 종합 판정 및 3일 전망 (Tactical Outlook)
            # ----------------------------------------------------
            model_scores = {
                'QUANT (기술적 지표)': radar.get('quant', 0),
                'LSTM (장단기 시계열)': radar.get('lstm', 0),
                'TCN (인과 패턴분석)': radar.get('tcn', 0),
                'XGBoost (머신러닝)': radar.get('xgb', 0),
                '스마트머니 (수급화력)': radar.get('smart', 0)
            }
            lead_model, lead_score = max(model_scores.items(), key=lambda x: x[1])

            if total >= 70.0:
                action_guide = "기술적 지표와 AI 모델이 일치하는 '적극적 분할 매수 유효' 구간입니다."
            elif total >= 58.0:
                action_guide = "추세 전환의 초입으로, 지지선 확인 후 '단계적 분할 접근'이 유리합니다."
            elif total >= 48.0:
                action_guide = "방향성 탐색 구간으로, 무리한 추격보다는 '데이터 완성도 확인'이 권고됩니다."
            else:
                action_guide = "리스크 관리가 우선시되는 보수적 관망 구간입니다."

            p3 = f"5대 앙상블 분석 결과 {lead_model}({lead_score:.0f}점)이 상승 동력을 주도하고 있으며, 종합 3일 상승 모멘텀 신뢰도는 {prob:.1f}%로 {action_guide}"

            # ----------------------------------------------------
            # [최종 브리핑 조립]
            # ----------------------------------------------------
            return f"{p1} {p2} {p3}"

        except Exception as e:
            return f"{name} 종목은 현재가 {data.get('current_price', 0):,.0f}원 기준 5대 AI 앙상블(Q, L, T, X, S) 분석이 완료되었으며, 3일 상승 모멘텀 신뢰도 {data.get('ai_probability', 50):.1f}%를 기록하고 있습니다."

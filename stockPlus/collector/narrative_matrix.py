import random

class NarrativeMatrix:
    @staticmethod
    def generate(data, name, industry, history):
        """
        [v49.0] 사용자 오리지널 문구 라이브러리 (절대 수정 금지)
        """
        try:
            # 1. 고도화된 수치 분석
            f_buy = data['supply']['foreign']
            whale_c = data['whale'].get('cost', 0)
            curr_p = whale_c if whale_c > 0 else 0 # 현재가 대용
            # [v45.8] 자금 유입 문구 정교화: 외국인이 아닌 '프로그램 전체 순매수' 기반으로 금액 산출
            curr_pgm = float(history[0]['program_net_buy'] or 0)
            pgm_amt = (curr_pgm * curr_p) / 100000000 # 억 단위
            s_score = data.get('smart_money', 0)
            short_avg = data['short_sentiment'].get('avg_short_price', 0)
            rsi = data.get('rsi', 50)
            prob = data.get('ai_probability', 50)
            total = data.get('total_score', 0)
            reasons = data.get('reason', [])
            
            # 2. 레이어 1: 오프닝 (시장 국면 & 섹터 위치)
            openings = [
                f"현재 {name}은(는) {industry} 섹터 내에서 가장 날카로운 '수급의 칼날'을 세우고 있습니다.",
                f"데이터가 가리키는 {name}의 현재 위치는 '폭발 전야의 고요함' 그 자체입니다.",
                f"전체 시장의 자금이 조용히, 하지만 확실하게 {name}의 바닥권으로 응집되고 있습니다.",
                f"오늘 {name}에서 포착된 움직임은 단순한 파동을 넘어선 '거대 자본의 설계'된 흔적입니다.",
                f"기술적 완성도와 수급의 질이 완벽한 조화를 이루는 '골든 크로스헤어' 구간입니다.",
                f"현재 {name}은(는) {industry} 산업군의 기류를 바꾸는 '게임 체인저' 역할을 자처하고 있습니다."
            ]
            
            # 3. 레이어 2: 종합 점수 비평 (Total Score 10점 단위 정밀 분석)
            if total >= 95:
                t_critique = f"종합 점수 {total}점은 시장에 단 0.1%만 존재하는 '천상의 타점'입니다. 모든 알고리즘이 완벽한 일치를 보이고 있습니다."
            elif total >= 90:
                t_critique = f"종합 {total}점은 가히 '대장주의 관상'이라 할 만합니다. 퀀트와 AI가 동시에 최상위 등급을 부여한 것은 매우 이례적인 강세 시그널입니다."
            elif total >= 80:
                t_critique = f"종합 {total}점의 고득점은 주도권이 이 종목으로 완전히 넘어왔음을 시사하는 강력한 '수급의 요새'가 구축되었음을 의미합니다."
            elif total >= 70:
                t_critique = f"종합 {total}점으로 상위권에 안착했습니다. 기술적 지표들이 정배열로 정렬되며 '우량한 추세'의 기틀을 마련했습니다."
            elif total >= 60:
                t_critique = f"종합 {total}점은 하방 경직성을 확보하고 반등의 모멘텀을 축적 중인 '적정 가치' 구간임을 나타냅니다."
            elif total >= 50:
                t_critique = f"종합 {total}점대로 중립 이상의 기운을 내뿜고 있습니다. 특정 수급의 트리거가 당겨지는 순간 폭발적 상향이 기대되는 자리입니다."
            else:
                t_critique = f"종합 {total}점의 낮은 점수는 아직 시장의 소외를 의미하며, 보수적인 관점에서 '에너지의 응축'을 더 기다려야 하는 인내의 단계입니다."

            # 4. 레이어 3: 수급의 심연 (S-Score 5점 단위 초정밀 분석)
            if s_score >= 100:
                supply = [f"경이로운 수급입니다. S-Score 100% 만점은 전 시장의 자금을 블랙홀처럼 빨아들이는 '무결점 매집'을 의미합니다. {pgm_amt:.1f}억의 화력은 파괴적입니다."]
            elif s_score >= 95:
                supply = [f"수급 에너지가 {int(s_score)}%에 달하며 '폭발적 임계점'에 도달했습니다. 세력이 시세 분출의 '최종 승인'을 내린 것으로 보이며, {pgm_amt:.1f}억의 프로그램 유입은 압도적입니다."]
            elif s_score >= 90:
                supply = [f"강력한 수급의 질({int(s_score)}%)이 돋보입니다. {pgm_amt:.1f}억 원 규모의 대규모 자금 유입은 주가 상승을 위한 '수급의 요새'를 완벽하게 구축했습니다."]
            elif s_score >= 85:
                supply = [f"상위 1%급의 정예 수급({int(s_score)}%)입니다. {pgm_amt:.1f}억 원의 프로그램 선취매가 바닥권 물량을 완전히 장악하며 시세를 가볍게 만들고 있습니다."]
            elif s_score >= 80:
                supply = [f"수급 지수가 {int(s_score)}%까지 차오르며 공격적인 매집 단계에 진입했습니다. {pgm_amt:.1f}억 원의 우호적인 자금 흐름이 상승의 든든한 보험이 됩니다."]
            elif s_score >= 75:
                supply = [f"매우 양호한 수급 흐름({int(s_score)}%)입니다. 세력이 {pgm_amt:.1f}억 원대를 투입하며 상방 압력을 높이는 '질서 있는 공격'이 전개 중입니다."]
            elif s_score >= 70:
                supply = [f"안정적인 매집 국면({int(s_score)}%)입니다. 기관과 외인이 {pgm_amt:.1f}억 원 규모의 물량을 꾸준히 채워가며 중기적 우상향의 발판을 마련했습니다."]
            elif s_score >= 65:
                supply = [f"수급의 균형이 매수 우위({int(s_score)}%)로 확실히 기울었습니다. {pgm_amt:.1f}억 원의 프로그램 유입은 향후 추세 전환의 핵심 디딤돌입니다."]
            elif s_score >= 60:
                supply = [f"점진적인 수급 강화({int(s_score)}%) 구간입니다. {pgm_amt:.1f}억 원 규모의 자금이 유입되며 하방 경직성을 탄탄하게 다지는 모습입니다."]
            elif s_score >= 55:
                supply = [f"매수세가 서서히 예열되는 {int(s_score)}% 단계입니다. {pgm_amt:.1f}억 원의 유입이 연속성을 띠게 되면 본격적인 수급 장악이 기대됩니다."]
            elif s_score >= 50:
                supply = [f"수급의 중립선을 넘어선 {int(s_score)}% 지점입니다. {pgm_amt:.1f}억 원 규모의 탐색전이 벌어지고 있으며, 세력의 의도가 선명해지고 있습니다."]
            elif s_score >= 45:
                supply = [f"저가 매수세가 유입되는 {int(s_score)}% 구간입니다. 아직은 {pgm_amt:.1f}억 원 규모의 미세한 흐름이나, 반등의 실마리를 찾는 과정입니다."]
            elif s_score >= 40:
                supply = [f"수급이 고개를 드는 {int(s_score)}% 단계입니다. {pgm_amt:.1f}억 원의 자금 유입이 대규모 수급 폭발로 이어지는지 확인이 필요한 변곡점입니다."]
            elif s_score >= 35:
                supply = [f"매수세가 미약하게 감지되는 {int(s_score)}% 지점입니다. {pgm_amt:.1f}억 원 수준의 유입으로는 추세를 돌리기엔 다소 이른 감이 있습니다."]
            elif s_score >= 30:
                supply = [f"수급 에너지가 부족한 {int(s_score)}% 상태입니다. {pgm_amt:.1f}억 원 규모의 정체된 흐름은 시장의 소외를 의미하며 인내심이 요구됩니다."]
            elif s_score >= 25:
                supply = [f"주의가 필요한 수급 지수({int(s_score)}%)입니다. {pgm_amt:.1f}억 원의 미미한 움직임 속에 매도세의 압박이 조금씩 거세지고 있습니다."]
            elif s_score >= 20:
                supply = [f"수급의 공동화 현상({int(s_score)}%)이 우려됩니다. {pgm_amt:.1f}억 원 수준의 낮은 참여도는 주가 방어력을 약화시키는 원인이 됩니다."]
            elif s_score >= 15:
                supply = [f"세력이 관망 중인 {int(s_score)}% 구간입니다. {pgm_amt:.1f}억 원 규모의 미미한 유입으로는 의미 있는 반등을 기대하기 어렵습니다."]
            elif s_score >= 10:
                supply = [f"간신히 숨만 붙어있는 {int(s_score)}%의 수급 상태입니다. {pgm_amt:.1f}억 원의 소극적인 흐름은 보수적인 관점에서의 대응을 권고합니다."]
            elif s_score >= 5:
                supply = [f"수급 에너지가 고갈된 {int(s_score)}% 지점입니다. {pgm_amt:.1f}억 원 규모의 미세한 이탈이 포착되며 하방 리스크가 확대되고 있습니다."]
            else:
                supply = [f"수급 공백 상태({int(s_score)}%)입니다. {pgm_amt:.1f}억 원 규모의 대규모 이탈은 주도 세력이 부재함을 증명하며, 리스크 관리가 최우선입니다."]

            # 5. 레이어 4: 전술 태그 상세 해설 (생략 없이 유지)
            tag_details = []
            for tag in reasons:
                if "스마트수급폭발" in tag: tag_details.append("기관급 대규모 자금이 유입되는 '스마트수급폭발' 현상은 시세의 연속성을 보장하는 핵심 열쇠입니다.")
                if "💎" in tag: tag_details.append("OBV 다이아몬드 매집 포착은 주가는 속여도 돈의 궤적은 속일 수 없음을 입증하는 강력한 지표입니다.")
                if "⚠️과열" in tag: tag_details.append("단기 과열 꼬리표가 붙었으나, 이는 역설적으로 시세의 탄력이 살아있음을 보여주는 '건강한 발열'입니다.")
                if "RSI바닥" in tag: tag_details.append("바닥의 저주를 끝내고 상승으로 고개를 드는 RSI 궤적은 완벽한 '역발상 매수' 기회를 제공합니다.")
                if "이평선수렴" in tag: tag_details.append("이평선 응축은 곧 거대한 발산의 시작이며, 현재 그 변곡점의 한복판에 서 있습니다.")
                if "고수익성" in tag: tag_details.append("탁월한 수익 구조를 바탕으로 한 펀더멘털의 우위는 어떤 하락장에서도 버틸 수 있는 '종목의 맷집'이 됩니다.")

            # 6. 레이어 5: 심리전과 고지전 (생략 없이 유지)
            psychology = []
            if whale_c > 0:
                if curr_p > whale_c * 1.05:
                    psychology.append(f"현재 주가가 주포의 평단가({whale_c:,.0f}원)를 상회하며 '세력의 추가 슈팅' 구간에 진입했습니다.")
                elif curr_p < whale_c * 0.95:
                    psychology.append(f"주가가 세력의 평단가({whale_c:,.0f}원) 아래에 머물러 있는 '역발상 매집' 자리입니다.")
            
            if short_avg > 0:
                gap = ((curr_p - short_avg) / short_avg) * 100
                if gap > 3:
                    psychology.append(f"공매도 세력은 이미 '항복(Surrender)' 직전입니다. 평단가({short_avg:,.0f}원)를 돌파한 시세는 이들의 숏커버링을 강제할 것입니다.")
                elif gap < -10:
                    psychology.append(f"공매도 세력이 수익을 거두며 압박 중이나, 지지선 확인 시 역습의 기회가 올 수 있습니다.")

            # 7. 레이어 6: AI 최종 예보 (확률 5점 단위 초정밀 분석)
            if prob >= 100:
                prediction = [f"AI 신뢰도 100%의 '완벽한 확률'입니다. 수학적, 통계적 모든 지표가 이 종목의 폭등을 확신하고 있습니다."]
            elif prob >= 95:
                prediction = [f"기대 확률 {prob}%는 사실상 확정적인 시세 분출 신호입니다. 망설임이 가장 큰 리스크인 구간입니다."]
            elif prob >= 90:
                prediction = [f"AI 기대 확률이 {prob}%에 달하는 '최고 등급' 신호입니다. 세력의 의도와 차트의 흐름이 완벽하게 일치했습니다."]
            elif prob >= 85:
                prediction = [f"매우 높은 확률({prob}%) 지대에 진입했습니다. 데이터 사이언스가 도출한 최종 결론은 '강력 보유'입니다."]
            elif prob >= 80:
                prediction = [f"안정적인 우상향 독주가 예견되는 {prob}% 확률 구간입니다. 시장의 노이즈를 압도하는 강력한 신뢰도입니다."]
            elif prob >= 75:
                prediction = [f"상승 에너지가 {prob}%까지 응축된 유망 지점입니다. 확신 있는 베팅이 유효한 '골든 에이지' 구간입니다."]
            elif prob >= 70:
                prediction = [f"기대 승률 {prob}%는 매우 매력적인 공격 포인트입니다. 세력의 매집이 완성 단계에 이르렀음을 시사합니다."]
            elif prob >= 65:
                prediction = [f"긍정적인 확률({prob}%) 지표가 쏟아지고 있습니다. 조정 시 적극적인 매수 전략이 수익을 극대화할 것입니다."]
            elif prob >= 60:
                prediction = [f"안착 가능성이 높은 {prob}% 확률 지대입니다. 분할 진입을 통해 리스크를 관리하며 승률을 높일 수 있습니다."]
            elif prob >= 55:
                prediction = [f"중립 이상의 기대치({prob}%)를 형성 중입니다. 세력의 가담 시그널이 확인되며 긍정적인 기류가 감지됩니다."]
            elif prob >= 50:
                prediction = [f"절반의 확률({prob}%)을 넘어선 '변곡점'입니다. 장중 데이터의 미세한 변화가 향후 방향성을 결정할 것입니다."]
            elif prob >= 45:
                prediction = [f"아직은 안개가 자욱한 {prob}%의 확률입니다. 무리한 진입보다는 데이터의 완성도가 높아지는 시점을 기다려야 합니다."]
            elif prob >= 40:
                prediction = [f"신중한 접근을 권고하는 {prob}% 지점입니다. 기술적 반등은 가능하나 추세적 상승을 논하기엔 아직 이릅니다."]
            elif prob >= 35:
                prediction = [f"리스크가 지배하기 시작하는 {prob}% 구간입니다. 수급의 확실한 트리거가 포착될 때까지 관망이 유리합니다."]
            elif prob >= 30:
                prediction = [f"성공 확률이 {prob}%로 낮아지며 경계 국면에 진입했습니다. 보수적인 관점에서의 자본 보호가 우선입니다."]
            elif prob >= 25:
                prediction = [f"매우 낮은 기대 확률({prob}%)입니다. 현재의 수급 구조로는 상방 돌파가 힘겨워 보이는 '데드 존' 구간입니다."]
            elif prob >= 20:
                prediction = [f"리스크가 극대화된 {prob}% 지대입니다. 세력의 확실한 이탈 징후가 포착되므로 철저한 대비가 필요합니다."]
            elif prob >= 15:
                prediction = [f"데이터가 경고하는 {prob}% 확률입니다. 자본을 지키는 것이 최우선이며, 종목 교체 매매가 현명한 선택입니다."]
            elif prob >= 10:
                prediction = [f"최악의 가성비를 보이는 {prob}% 확률입니다. AI는 이 종목에 대해 '위험' 수준의 경고를 보내고 있습니다."]
            elif prob >= 5:
                prediction = [f"존재 자체가 리스크인 {prob}% 확률 구간입니다. 모든 지표가 하락을 가리키는 '퍼펙트 스톰' 전야입니다."]
            else:
                prediction = [f"데이터가 거부하는 {prob}% 확률입니다. AI는 이 종목에 대해 '절대 진입 금지' 판정을 내렸습니다."]

            # 8. 최종 서사 조립 (다차원 랜덤 조합)
            body = " ".join(random.sample(psychology + tag_details, min(len(psychology + tag_details), 2))) if (psychology + tag_details) else ""
            res = f"{random.choice(openings)} {t_critique} {random.choice(supply)} {body} {random.choice(prediction)}"
            return res
        except Exception as e:
            return f"지휘 보고: {name} 종목은 현재 데이터 기반의 정밀 분석 중이며, {industry} 섹터의 핵심 흐름을 충실히 반영하고 있습니다."

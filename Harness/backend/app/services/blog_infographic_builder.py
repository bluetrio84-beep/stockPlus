import logging
from typing import Dict, Any, List

logger = logging.getLogger("blog_infographic_builder")

class BlogInfographicBuilder:
    """
    AAAA.PNG 고품질 퀀트 인포그래픽 스타일 템플릿 생성기.
    - 메인 타겟: 외국인 매집 TOP 10 종목 + AI 퀀트 데이터 요약
    - 구조: 상단 5단계 프로세스 + 중단 외국인 TOP 10 카드 + AI 요약 메커니즘 + 하단 핵심 요약 바
    """

    def generate_foreigner_top10_infographic_html(self, date_str: str, raw_data: Dict[str, Any], ai_summary: str = "") -> str:
        foreigner_top10 = raw_data.get("foreigner_top10", [])
        themes = raw_data.get("themes", [])
        sectors = raw_data.get("sectors", [])

        top_theme = themes[0]["theme_name"] if themes else "주요 테마"
        top_sector = sectors[0]["industry_name"] if sectors else "핵심 업종"

        # AI 요약이 없으면 기본 퀀트 문구로 설정
        if not ai_summary:
            ai_summary = (
                f"1. 금일 외국인 수급은 {top_sector} 및 {top_theme} 관련주에 강력하게 유입되었습니다.\n"
                f"2. 외국인 5일/20일 연속 누적 매집 종목을 중심으로 기관 동시 매수세가 가세하고 있습니다.\n"
                f"3. 메이저 수급 유입 상위 종목 중심의 스위칭 및 단기 모멘텀 대응 전략이 유효합니다."
            )

        html_lines = []

        # 전체 인포그래픽 컨테이너 (820px, 고해상도 그래픽 다이어그램)
        html_lines.append('''
        <div style="font-family: 'Apple SD Gothic Neo', '맑은 고딕', 'Noto Sans KR', sans-serif; max-width: 820px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
        ''')

        # ── 1. 메인 헤더 배너 (AAAA.PNG 상단 헤더 스타일) ──
        html_lines.append(f'''
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
                <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 28px; border-radius: 16px; text-align: center;">
                    <div style="font-size: 13px; font-weight: bold; color: #38bdf8; letter-spacing: 2px; margin-bottom: 8px; text-transform: uppercase;">
                        QUANT SUPPLY & DEMAND INFOGRAPHIC
                    </div>
                    <div style="font-size: 22px; font-weight: bold; color: #ffffff; margin-bottom: 10px; line-height: 1.3;">
                        외국인 자본 유입 ➔ <span style="color: #38bdf8;">메이저 수급 집중 TOP 10</span> & 주가 선순환 구조
                    </div>
                    <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                        외국인 연속 매집 ➔ 기관 동시 순매수 ➔ 시가총액/주가 모멘텀 확대 ➔ 퀀트 수급 선순환
                    </div>
                    <div style="margin-top: 14px; display: inline-block; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; color: #38bdf8; font-weight: bold;">
                        작성일자: {date_str} | Harness Quant AI Analysis
                    </div>
                </td>
            </tr>
        </table>
        ''')

        # ── 2. 상단 5단계 프로세스 카드 (AAAA.PNG 상단 1~5번 카드 스타일) ──
        html_lines.append('''
        <div style="margin-bottom: 28px;">
            <div style="font-size: 15px; font-weight: bold; color: #0284c7; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                ⚡ [5단계 메커니즘] 외국인 매집에서 시작되는 주가 상승 파이프라인
            </div>
            <table border="0" cellpadding="0" cellspacing="4" style="width: 100%; border-collapse: separate; table-layout: fixed;">
                <tr>
                    <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 12px 8px; border-radius: 10px; border-top: 3px solid #0284c7; text-align: center;">
                        <div style="font-size: 10px; font-weight: bold; color: #0284c7; margin-bottom: 4px;">1. 외국인 유입</div>
                        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">글로벌 자본</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">연속 순매수 개시</div>
                    </td>
                    <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 12px 8px; border-radius: 10px; border-top: 3px solid #0284c7; text-align: center;">
                        <div style="font-size: 10px; font-weight: bold; color: #0284c7; margin-bottom: 4px;">2. 수급 구조화</div>
                        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">기관 쌍끌이</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">투신/연기금 동반</div>
                    </td>
                    <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 12px 8px; border-radius: 10px; border-top: 3px solid #38bdf8; text-align: center;">
                        <div style="font-size: 10px; font-weight: bold; color: #0369a1; margin-bottom: 4px;">3. 수급 집적</div>
                        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">5일/20일 누적</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">매집 수량 폭발</div>
                    </td>
                    <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 12px 8px; border-radius: 10px; border-top: 3px solid #e11d48; text-align: center;">
                        <div style="font-size: 10px; font-weight: bold; color: #e11d48; margin-bottom: 4px;">4. 모멘텀 형성</div>
                        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">주가 분출</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">신고가/상승 돌파</div>
                    </td>
                    <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 12px 8px; border-radius: 10px; border-top: 3px solid #10b981; text-align: center;">
                        <div style="font-size: 10px; font-weight: bold; color: #10b981; margin-bottom: 4px;">5. 선순환 완성</div>
                        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">가치 재평가</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">시가총액 지속 확대</div>
                    </td>
                </tr>
            </table>
        </div>
        ''')

        # ── 3. AI 퀀트 가이드 박스 (AAAA.PNG AI 가이드 박스 스타일) ──
        html_lines.append(f'''
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr>
                <td bgcolor="#f0f9ff" style="background-color: #f0f9ff; padding: 20px 24px; border-radius: 14px; border-left: 6px solid #0284c7;">
                    <div style="font-size: 15px; font-weight: bold; color: #0369a1; margin-bottom: 8px;">
                        🤖 AI 퀀트 수급 요약 가이드 (Gemini AI 분석)
                    </div>
                    <div style="font-size: 14px; color: #334155; line-height: 1.7;">
                        {ai_summary.replace(chr(10), "<br/>")}
                    </div>
                </td>
            </tr>
        </table>
        ''')

        # ── 4. 외국인 매집 TOP 10 테이블 (AAAA.PNG 정밀 수급 데이터 카드) ──
        html_lines.append('''
        <div style="margin-bottom: 28px;">
            <div style="font-size: 16px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px;">
                🔥 오늘의 외국인 순매수 / 매집 TOP 10 상세 리스트
            </div>
        ''')

        if foreigner_top10:
            html_lines.append('''
            <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
                    <th style="padding: 10px; font-weight: bold; width: 45px; border-radius: 8px 0 0 0;">순위</th>
                    <th style="padding: 10px; font-weight: bold;">종목명 (코드)</th>
                    <th style="padding: 10px; font-weight: bold;">현재가</th>
                    <th style="padding: 10px; font-weight: bold;">당일 외국인 순매수</th>
                    <th style="padding: 10px; font-weight: bold;">5일 누적 수급</th>
                    <th style="padding: 10px; font-weight: bold; border-radius: 0 8px 0 0;">수급 특성</th>
                </tr>
            ''')

            for idx, item in enumerate(foreigner_top10[:10], 1):
                code = item.get("stock_code", "")
                name = item.get("stock_name", code)
                f_buy = item.get("foreign_net_buy", 0) or 0
                f_5d = item.get("foreign_5d", 0) or 0
                inst_buy = item.get("institution_net_buy", 0) or 0
                price = item.get("current_price", 0) or 0

                f_str = f"+{f_buy:,}" if f_buy > 0 else f"{f_buy:,}"
                f5_str = f"+{f_5d:,}" if f_5d > 0 else f"{f_5d:,}"
                price_str = f"{price:,}원" if price > 0 else "-"

                # 수급 특징 배지
                badge = []
                if f_buy > 0 and inst_buy > 0:
                    badge.append('<span style="background:#ffe4e6;color:#e11d48;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">🔥 기관 쌍끌이</span>')
                elif f_5d > 0:
                    badge.append('<span style="background:#e0f2fe;color:#0284c7;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">💰 5일 연속 매집</span>')
                else:
                    badge.append('<span style="background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:4px;font-size:11px;">외국인 주도</span>')

                badge_str = " ".join(badge)
                bg_color = "#ffffff" if idx % 2 != 0 else "#f8fafc"

                html_lines.append(f'''
                <tr style="background-color: {bg_color}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px; font-weight: bold; color: #64748b;">{idx}</td>
                    <td style="padding: 10px; font-weight: bold; color: #0f172a;">{name} <span style="font-size:11px;color:#94a3b8;font-family:monospace;">({code})</span></td>
                    <td style="padding: 10px; color: #334155; font-weight: bold;">{price_str}</td>
                    <td style="padding: 10px; color: #e11d48; font-weight: bold;">{f_str}</td>
                    <td style="padding: 10px; color: #0284c7; font-weight: bold;">{f5_str}</td>
                    <td style="padding: 10px;">{badge_str}</td>
                </tr>
                ''')

            html_lines.append('</table>')
        else:
            html_lines.append('<p style="color:#94a3b8; font-size:13px;">외국인 수급 데이터가 수집되지 않았습니다.</p>')

        html_lines.append('</div>')

        # ── 5. 하단 핵심 요약 바 (AAAA.PNG 하단 4개 아이콘 요약 바 스타일) ──
        html_lines.append(f'''
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
                <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 16px 20px; border-radius: 12px; color: #ffffff;">
                    <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td style="width: 120px; font-weight: bold; font-size: 14px; color: #38bdf8;">
                                🎯 핵심 요약
                            </td>
                            <td style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                                외국인 메이저 자본 유입 ➔ {top_sector}·{top_theme} 중심 수급 집중 ➔ 5일/20일 연속 매집 종목 주가 선순환 확정
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- 하단 해시태그 -->
        <div style="margin-top: 16px; text-align: center; color: #0284c7; font-size: 12px; font-weight: bold;">
            #오늘주식 #외국인순매수 #외국인매집TOP10 #{top_sector} #{top_theme} #퀀트수급분석 #주식투자
        </div>

        </div>
        ''')

        return "\n".join(html_lines)

blog_infographic_builder = BlogInfographicBuilder()

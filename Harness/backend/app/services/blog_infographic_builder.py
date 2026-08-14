import logging
import json
from typing import Dict, Any, List, Optional

logger = logging.getLogger("blog_infographic_builder")

# ─────────────────────────────────────────────────────────
#  동적 SVG 아이콘 레지스트리 (키워드/아이콘 키로 동적 매핑)
# ─────────────────────────────────────────────────────────
SVG_ICON_REGISTRY: Dict[str, str] = {
    "bank": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="21" width="18" height="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 2L3 7v3h18V7l-9-5z"/><line x1="6" y1="10" x2="6" y2="21"/><line x1="10" y1="10" x2="10" y2="21"/><line x1="14" y1="10" x2="14" y2="21"/><line x1="18" y1="10" x2="18" y2="21"/></svg>',
    "bond": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    "pe": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    "shield": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    "pension": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    "pf": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
    "gpu": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><rect x="6" y="6" width="12" height="12" rx="2"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="15" y1="1" x2="15" y2="3"/><line x1="9" y1="21" x2="9" y2="23"/><line x1="15" y1="21" x2="15" y2="23"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="1" y1="15" x2="3" y2="15"/><line x1="21" y1="9" x2="23" y2="9"/><line x1="21" y1="15" x2="23" y2="15"/></svg>',
    "chip": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/></svg>',
    "datacenter": '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    "bolt": '<svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    "network": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    "server": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    "chart": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    "rocket": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71 1.26-1.5 1.5-2.5L4.5 16.5z"/><path d="M12 15l-3-3 7.5-7.5.5.5C18 6 19 8 18 10l-6 5z"/></svg>',
    "money": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    "lightbulb": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.59 2.94 1.5 4 .76.76 1.23 1.52 1.41 2.5h6.18z"/></svg>',
    "check": '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    "building": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>',
    "car": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    "bio": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17"/></svg>'
}

def get_svg_icon(icon_key: str, default: str = "chart") -> str:
    """아이콘 키에 해당하거나 키워드 매칭 시 SVG 반환"""
    key_lower = (icon_key or "").lower().strip()
    if key_lower in SVG_ICON_REGISTRY:
        return SVG_ICON_REGISTRY[key_lower]
    # 키워드 부분 매칭
    for k, v in SVG_ICON_REGISTRY.items():
        if k in key_lower:
            return v
    return SVG_ICON_REGISTRY.get(default, "")


class BlogInfographicBuilder:
    """
    AAAA.PNG 100% 동적 퀀트 인포그래픽 템플릿 엔진.
    데이터 및 주제(JSON 스키마)에 맞춰 5단계 프로세스, 아이콘, 3대 메커니즘, 차트, 요약 바가 동적으로 생성됩니다.
    """

    def build_dynamic_infographic(self, config: Dict[str, Any]) -> str:
        """
        config JSON 객체를 받아 동적으로 AAAA.PNG 스타일 인포그래픽 HTML 렌더링
        """
        title = config.get("title", "금융 자본 ➔ 주도주 퀀트 수급 선순환 메커니즘")
        subtitle = config.get("subtitle", "금융이 리스크를 분산하고 자금을 공급하여 기업의 매출·이익·현금흐름이 확대되는 선순환 구조")
        date_str = config.get("date_str", "2026.08.14")
        theme_color = config.get("theme_color", "#0b1329")

        steps = config.get("steps", [])
        mechanisms = config.get("mechanisms", [])
        innovation = config.get("innovation", {})
        bottom_cards = config.get("bottom_cards", {})
        summary = config.get("summary", {})

        html_lines = []

        # ── 메인 컨테이너 (AAAA.PNG 100% 동일 배경색 #edf2f7) ──
        html_lines.append(f'''
        <div style="font-family: 'Apple SD Gothic Neo', '맑은 고딕', 'Noto Sans KR', sans-serif; width: 1180px; margin: 0 auto; background: #edf2f7; color: #0f172a; padding: 24px; border-radius: 20px; box-sizing: border-box;">
        ''')

        # ── 1. 메인 헤더 배너 (동적 타이틀 & 색상) ──
        html_lines.append(f'''
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td bgcolor="{theme_color}" style="background-color: {theme_color}; padding: 24px 32px; border-radius: 16px; text-align: center; box-shadow: 0 10px 20px rgba(11,19,41,0.2);">
                    <div style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 8px; line-height: 1.3;">
                        {title}
                    </div>
                    <div style="font-size: 13px; color: #94a3b8; font-weight: 500;">
                        {subtitle}
                    </div>
                    <div style="margin-top: 14px; display: inline-block; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.4); color: #38bdf8; padding: 4px 18px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                        작성일자: {date_str} | Harness Quant Engine AI 분석 리포트
                    </div>
                </td>
            </tr>
        </table>
        ''')

        # ── 2. 동적 5단계 밸류체인 프로세스 카드 (아이콘 + 불릿 포인트 동적 매핑) ──
        if steps:
            html_lines.append('''
            <table border="0" cellpadding="0" cellspacing="8" style="width: 100%; border-collapse: separate; table-layout: fixed; margin-bottom: 20px;">
                <tr>
            ''')
            for st in steps[:5]:
                step_num = st.get("num", 1)
                step_title = st.get("title", "")
                step_desc = st.get("desc", "")
                bullets = st.get("bullets", [])
                effect = st.get("effect", "")
                card_color = st.get("color", "#0284c7")
                card_icon_key = st.get("icon_key", "chart")
                card_icon_svg = get_svg_icon(card_icon_key)

                bullet_html = []
                for b in bullets:
                    b_icon = get_svg_icon(b.get("icon", ""), default="check")
                    bullet_html.append(f'<div style="display:flex; align-items:center; gap:5px; margin-bottom:4px;">{b_icon} <span>{b.get("text", "")}</span></div>')

                effect_html = ""
                if effect:
                    effect_html = f'''
                    <div style="margin-top:8px; background:rgba(2,132,199,0.1); border-left:3px solid {card_color}; padding:4px 6px; border-radius:4px; color:{card_color}; font-size:10px; font-weight:bold;">
                        ✔ {effect}
                    </div>
                    '''

                html_lines.append(f'''
                <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 16px 14px; border-radius: 14px; border: 1px solid #cbd5e1; vertical-align: top; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="background-color: {card_color}; color: #ffffff; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 12px; display:flex; align-items:center; justify-content:center; gap:5px;">
                        <span>{step_num}. {step_title}</span>
                    </div>
                    <div style="font-size: 11px; color: #334155; line-height: 1.7;">
                        <div style="font-weight:bold; color:#0f172a; margin-bottom:6px;">{step_desc}</div>
                        {"".join(bullet_html)}
                        {effect_html}
                    </div>
                </td>
                ''')
            html_lines.append('</tr></table>')

        # ── 3. 동적 중단 메커니즘 3개 컬럼 + 보라색 유동성 혁신 박스 ──
        if mechanisms:
            html_lines.append(f'''
            <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="width: 74%; vertical-align: top; padding-right: 12px;">
                        <div style="background: #ffffff; padding: 18px; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                            <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 14px; display:flex; align-items:center; gap:6px;">
                                {get_svg_icon("pf")} AI 인프라 수급을 가속화하는 핵심 메커니즘
                            </div>
                            <table border="0" cellpadding="0" cellspacing="8" style="width: 100%; table-layout: fixed;">
                                <tr>
            ''')
            for idx, m in enumerate(mechanisms[:3], 1):
                m_title = m.get("title", "")
                m_desc = m.get("desc", "")
                m_flow = m.get("flow", "")
                m_color = m.get("color", "#0284c7")
                m_icon = get_svg_icon(m.get("icon_key", "pf"))
                html_lines.append(f'''
                <td bgcolor="#f8fafc" style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
                    <div style="font-size:12px; font-weight:bold; color:{m_color}; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
                        {m_icon} <span>{idx}. {m_title}</span>
                    </div>
                    <div style="font-size:11px; color:#475569; line-height:1.5;">
                        {m_desc}<br/>
                        <div style="margin-top:6px; padding:6px; background:rgba(2,132,199,0.1); border-radius:6px; font-size:10px; font-weight:bold; color:{m_color}; text-align:center;">
                            {m_flow}
                        </div>
                    </div>
                </td>
                ''')
            html_lines.append('''
                                </tr>
                            </table>
                        </div>
                    </td>
            ''')

            # 우측 혁신 박스
            inn_title = innovation.get("title", "금융 혁신 ➔ AI 인프라 투자 가속")
            inn_bullets = innovation.get("bullets", ["더 많은 자금 조달", "리스크 분산", "투명성 향상", "유동성 확대"])
            inn_highlight = innovation.get("highlight", "➔ AI 인프라 투자 규모 확대<br/>➔ 주도주 수요 지속 증가")

            inn_b_html = "".join([f"✔ <b>{b}</b><br/>" for b in inn_bullets])

            html_lines.append(f'''
            <td style="width: 26%; vertical-align: top;">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 18px; border-radius: 16px; color: #ffffff; box-shadow: 0 8px 16px rgba(79,70,229,0.3); height: 100%;">
                    <div style="font-size: 13px; font-weight: bold; margin-bottom: 10px; color: #c7d2fe; display:flex; align-items:center; gap:6px;">
                        {get_svg_icon("lightbulb")} {inn_title}
                    </div>
                    <div style="font-size: 11px; line-height: 1.7; color: #e0e7ff;">
                        {inn_b_html}
                    </div>
                    <div style="margin-top: 12px; background: rgba(255,255,255,0.18); padding: 8px; border-radius: 8px; font-size: 11px; font-weight: bold; text-align: center; color: #ffffff;">
                        {inn_highlight}
                    </div>
                </div>
            </td>
            </tr>
            </table>
            ''')

        # ── 4. 하단 3개 데이터 시각화 카드 ──
        c1 = bottom_cards.get("card1", {})
        c2 = bottom_cards.get("card2_donut", {})
        c3 = bottom_cards.get("card3_bar", {})

        html_lines.append(f'''
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <!-- 카드 1: 수급 프로세스 / 랭킹 -->
                <td style="width: 34%; vertical-align: top; padding-right: 10px;">
                    <div style="background: #ffffff; padding: 16px; border-radius: 16px; border: 1px solid #cbd5e1; height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="font-size: 13px; font-weight: bold; color: #0b1329; margin-bottom: 12px; border-bottom: 2px solid #0284c7; padding-bottom: 6px;">
                            {c1.get("title", "금융이 주도주 매출을 증가시키는 메커니즘")}
                        </div>
                        <div style="font-size: 11px; color: #475569; line-height: 1.6;">
                            {c1.get("flow_text", "<b>1. 금융 자금 조달</b> ➔ <b>2. 데이터센터 건설</b> ➔ <b>3. GPU 대량 구매</b> ➔ <b>4. AI 서비스 확장</b> ➔ <b>5. 더 큰 수요 창출</b>")}
                        </div>
                        <div style="margin-top: 12px; background: #0b1329; color: #38bdf8; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: bold; text-align: center;">
                            {c1.get("badge_text", "🔄 더 많은 자금이 다시 유입되어 규모가 확대되는 선순환")}
                        </div>
                    </div>
                </td>

                <!-- 카드 2: 도넛 차트 -->
                <td style="width: 33%; vertical-align: top; padding-right: 10px;">
                    <div style="background: #ffffff; padding: 16px; border-radius: 16px; border: 1px solid #10b981; height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="font-size: 13px; font-weight: bold; color: #047857; margin-bottom: 12px; border-bottom: 2px solid #10b981; padding-bottom: 6px;">
                            {c2.get("title", "NVIDIA가 창출하는 가치 (매출 구성 예시)")}
                        </div>
                        <div style="text-align: center; margin: 8px 0;">
                            <svg width="120" height="120" viewBox="0 0 42 42">
                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" stroke-width="5"></circle>
                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#10b981" stroke-width="5" stroke-dasharray="75 25" stroke-dashoffset="25"></circle>
                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0284c7" stroke-width="5" stroke-dasharray="15 85" stroke-dashoffset="50"></circle>
                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f59e0b" stroke-width="5" stroke-dasharray="10 90" stroke-dashoffset="35"></circle>
                                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="6" font-weight="900" fill="#76b900">{c2.get("center_text", "NVIDIA")}</text>
                            </svg>
                        </div>
                        <div style="font-size: 10px; color: #475569; line-height: 1.5; text-align: center;">
                            {c2.get("footer_text", "• <b style='color:#10b981;'>GPU (데이터센터)</b>: 70~80% | • <b style='color:#0284c7;'>Networking</b>: 10~15%<br/>• <b style='color:#f59e0b;'>시스템</b>: 5~10% | • <b>소프트웨어/기타</b>: 5% 내외")}
                        </div>
                    </div>
                </td>

                <!-- 카드 3: 바 차트 -->
                <td style="width: 33%; vertical-align: top;">
                    <div style="background: #ffffff; padding: 16px; border-radius: 16px; border: 1px solid #cbd5e1; height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
                            {c3.get("title", "NVIDIA 데이터센터 매출 추이 (최근)")}
                        </div>
                        <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">{c3.get("unit", "단위: 억 달러 (FY2026 1,156억 달러 +114% YoY)")}</div>
                        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; height: 95px; text-align: center; vertical-align: bottom;">
                            <tr>
                                <td style="vertical-align: bottom; padding: 0 4px;">
                                    <div style="font-size: 8px; color: #64748b; font-weight:bold;">106</div>
                                    <div style="background: #cbd5e1; height: 22px; border-radius: 3px 3px 0 0;"></div>
                                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">FY22</div>
                                </td>
                                <td style="vertical-align: bottom; padding: 0 4px;">
                                    <div style="font-size: 8px; color: #64748b; font-weight:bold;">154</div>
                                    <div style="background: #94a3b8; height: 32px; border-radius: 3px 3px 0 0;"></div>
                                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">FY23</div>
                                </td>
                                <td style="vertical-align: bottom; padding: 0 4px;">
                                    <div style="font-size: 8px; color: #0284c7; font-weight:bold;">475</div>
                                    <div style="background: #38bdf8; height: 55px; border-radius: 3px 3px 0 0;"></div>
                                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">FY24</div>
                                </td>
                                <td style="vertical-align: bottom; padding: 0 4px;">
                                    <div style="font-size: 8px; color: #0284c7; font-weight:bold;">603</div>
                                    <div style="background: #0284c7; height: 70px; border-radius: 3px 3px 0 0;"></div>
                                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">FY25</div>
                                </td>
                                <td style="vertical-align: bottom; padding: 0 4px;">
                                    <div style="font-size: 8px; color: #76b900; font-weight:bold;">1,156</div>
                                    <div style="background: #76b900; height: 90px; border-radius: 3px 3px 0 0;"></div>
                                    <div style="font-size: 9px; color: #76b900; font-weight:bold; margin-top: 2px;">FY26</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
        </table>
        ''')

        # ── 5. 하단 4단계 핵심 요약 바 ──
        summary_title = summary.get("title", "🎯 핵심 요약")
        summary_text = summary.get("text", "💳 <b>금융이 AI 인프라에 대규모 자금 공급</b> ➔ 🏛️ <b>프라임 브로커·유동화로 리스크 분산</b> ➔ ⚡ <b>데이터센터 확장과 GPU 수요 폭발</b> ➔ 🚀 <b>NVIDIA가 핵심 공급자로서 막대한 매출·이익 창출 (선순환)</b>")

        html_lines.append(f'''
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
                <td bgcolor="#0b1329" style="background-color: #0b1329; padding: 16px 24px; border-radius: 14px; color: #ffffff; box-shadow: 0 6px 16px rgba(11,19,41,0.3);">
                    <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td style="width: 110px; font-weight: 900; font-size: 14px; color: #38bdf8;">
                                {summary_title}
                            </td>
                            <td style="font-size: 12px; color: #e2e8f0; line-height: 1.6;">
                                {summary_text}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- 하단 출처 & 서명 -->
        <div style="margin-top: 14px; font-size: 11px; color: #64748b; text-align: right; font-weight: 500;">
            출처: Harness Market Intelligence & Quant Data | Made by <b>Harness Engineering</b>
        </div>
        </div>
        ''')

        return "\n".join(html_lines)

    def generate_foreigner_top10_infographic_html(self, date_str: str, raw_data: Dict[str, Any], ai_summary: str = "") -> str:
        """기존 하위 호환성 래퍼 — 기본 NVIDIA/금융 밸류체인 config 빌드"""
        config = {
            "title": "금융이 AI 인프라를 확대 ➔ NVIDIA / 메이저 수급 매출을 폭발적으로 증대시키는 구조",
            "subtitle": "금융이 리스크를 분산하고 자금을 공급하여 AI 데이터센터 건설과 GPU 수요를 지속적으로 창출 ➔ 메이저 주도주의 매출·이익·현금흐름이 확대되는 선순환 구조",
            "date_str": date_str,
            "theme_color": "#0b1329",
            "steps": [
                {
                    "num": 1, "title": "금융 자본의 유입", "desc": "다양한 금융 자본이 AI 인프라 생태계로 유입",
                    "color": "#0f172a",
                    "bullets": [
                        {"text": "<b>은행</b>: 대출·신디케이션", "icon": "bank"},
                        {"text": "<b>채권 시장</b>: 회사채·인프라 채권", "icon": "bond"},
                        {"text": "<b>사모펀드/PE</b>: 인프라·성장 투자", "icon": "pe"},
                        {"text": "<b>보험사</b>: 장기 자금 운용", "icon": "shield"},
                        {"text": "<b>연기금·국부펀드</b>: 전략적 투자", "icon": "pension"}
                    ]
                },
                {
                    "num": 2, "title": "금융 구조화 (수급 핵심)", "desc": "AI 인프라 투자 리스크 분산·재구성",
                    "color": "#0f172a", "effect": "효과: 대규모 장기 자금 조달 & 리스크 분산",
                    "bullets": [
                        {"text": "<b>프로젝트 파이낸싱(PF)</b>: 데이터센터 건설", "icon": "pf"},
                        {"text": "<b>선순위·후순위 구조</b>: 리스크 분산", "icon": "check"},
                        {"text": "<b>인프라 펀드 / JV</b>: 대형 금융사+테크", "icon": "check"},
                        {"text": "<b>GPU Financing / 리스</b>: 담보 자금 조달", "icon": "check"}
                    ]
                },
                {
                    "num": 3, "title": "AI 인프라 확장 (GPU 창출)", "desc": "대규모 데이터센터 건설 & GPU 수요 창출",
                    "color": "#0284c7", "icon_key": "gpu",
                    "bullets": [
                        {"text": "<b>GPU 수요 폭발</b>: AI 학습/추론 확대", "icon": "gpu"},
                        {"text": "<b>전력/냉각</b>: 액체 냉각 솔루션", "icon": "bolt"},
                        {"text": "<b>네트워크</b>: 고속 연결망", "icon": "network"},
                        {"text": "<b>스토리지/서버</b>: AI 서버 장비", "icon": "server"}
                    ]
                },
                {
                    "num": 4, "title": "NVIDIA / 메이저 매출 증대", "desc": "핵심 제품·솔루션 독점 공급",
                    "color": "#e11d48", "effect": "결과: 매출 급증 & 이익·현금흐름 확대",
                    "bullets": [
                        {"text": "<b>GPU (H100, Blackwell)</b>: AI 핵심", "icon": "gpu"},
                        {"text": "<b>NVLink / 네트워킹</b>: 고속 연결", "icon": "network"},
                        {"text": "<b>DGX / AI 서버</b>: AI 시스템", "icon": "server"}
                    ]
                },
                {
                    "num": 5, "title": "선순환 구조 완성", "desc": "NVIDIA의 성장 ➔ 금융 확대",
                    "color": "#10b981", "effect": "선순환 핵심: 금융이 AI 연계 성장 견인",
                    "bullets": [
                        {"text": "<b>NVIDIA 실적 증가</b>: 매출·이익", "icon": "chart"},
                        {"text": "<b>평가 상승</b>: 주가 상승 & 신용도", "icon": "rocket"},
                        {"text": "<b>더 많은 금융 자본 유입</b>", "icon": "money"}
                    ]
                }
            ],
            "mechanisms": [
                {
                    "title": "프라임 브로커 (Prime Broker)", "color": "#0284c7", "icon_key": "bank",
                    "desc": "AI 인프라 투자자에 대한 종합 금융 서비스 제공",
                    "flow": "자금 대출 ➔ 담보 관리 ➔ 리스크 제어"
                },
                {
                    "title": "GPU 자산유동화 (Securitization)", "color": "#7c3aed", "icon_key": "pe",
                    "desc": "GPU를 자산으로 묶어 유동화 ➔ 자본시장에 판매",
                    "flow": "GPU 보유자 ➔ SPV ➔ 투자자 (채권/ABS)"
                },
                {
                    "title": "GPU 선물시장 (Futures Market)", "color": "#db2777", "icon_key": "chart",
                    "desc": "GPU 가격-공급에 대한 가격 발견 및 리스크 헷지",
                    "flow": "가격 발견 ➔ 선물 거래소 ➔ 헷지/위험 관리"
                }
            ],
            "innovation": {
                "title": "금융 혁신 ➔ AI 인프라 투자 가속",
                "bullets": ["더 많은 자금: 더 낮은 비용으로 조달", "리스크 분산: 금융 시스템이 흡수", "투명성 향상: 자산 가치 평가 개선", "유동성 확대: 투자·회수 용이해짐"],
                "highlight": "➔ AI 인프라 투자 규모 확대<br/>➔ GPU 수요 지속 증가"
            },
            "bottom_cards": {
                "card1": {
                    "title": "금융이 NVIDIA/주도주 매출을 증가시키는 메커니즘",
                    "flow_text": "<b>1. 금융 자금 조달</b> ➔ <b>2. 데이터센터 건설</b> ➔ <b>3. GPU 대량 구매</b> ➔ <b>4. AI 서비스 확장</b> ➔ <b>5. 더 큰 수요 창출</b>",
                    "badge_text": "🔄 더 많은 자금이 다시 유입되어 규모가 확대되는 선순환"
                },
                "card2_donut": {
                    "title": "NVIDIA가 창출하는 가치 (매출 구성 예시)",
                    "center_text": "NVIDIA",
                    "footer_text": "• <b style='color:#10b981;'>GPU (데이터센터)</b>: 70~80% | • <b style='color:#0284c7;'>Networking</b>: 10~15%<br/>• <b style='color:#f59e0b;'>시스템</b>: 5~10% | • <b>소프트웨어/기타</b>: 5% 내외"
                },
                "card3_bar": {
                    "title": "NVIDIA 데이터센터 매출 추이 (최근)",
                    "unit": "단위: 억 달러 (FY2026 1,156억 달러 +114% YoY)"
                }
            },
            "summary": {
                "title": "🎯 핵심 요약",
                "text": "💳 <b>금융이 AI 인프라에 대규모 자금 공급</b> ➔ 🏛️ <b>프라임 브로커·유동화로 리스크 분산</b> ➔ ⚡ <b>데이터센터 확장과 GPU 수요 폭발</b> ➔ 🚀 <b>NVIDIA가 핵심 공급자로서 막대한 매출·이익 창출 (선순환)</b>"
            }
        }
        return self.build_dynamic_infographic(config)

blog_infographic_builder = BlogInfographicBuilder()

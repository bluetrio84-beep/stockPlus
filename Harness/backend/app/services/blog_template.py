import json
from datetime import datetime
from typing import Dict, Any, List

class BlogTemplateEngine:
    @staticmethod
    def format_rate(rate) -> str:
        if rate is None:
            return "0.00%"
        try:
            val = float(rate)
            if val > 0:
                return f'<span style="color:#e53e3e;font-weight:bold;">+{val:.2f}% ⬆</span>'
            elif val < 0:
                return f'<span style="color:#3182ce;font-weight:bold;">{val:.2f}% ⬇</span>'
            else:
                return f'<span>0.00%</span>'
        except:
            return str(rate)

    @staticmethod
    def format_rate_md(rate) -> str:
        if rate is None:
            return "0.00%"
        try:
            val = float(rate)
            if val > 0:
                return f"+{val:.2f}% ⬆"
            elif val < 0:
                return f"{val:.2f}% ⬇"
            else:
                return "0.00%"
        except:
            return str(rate)

    def generate_post(self, date_str: str, raw_data: Dict[str, Any], ai_summary: str = "") -> Dict[str, str]:
        themes = raw_data.get("themes", [])
        sectors = raw_data.get("sectors", [])
        supply_demand = raw_data.get("supply_demand", [])
        ai_leaders = raw_data.get("ai_leaders", [])
        indices = raw_data.get("market_index", [])

        # 1. SEO Title
        top_theme_name = themes[0]["theme_name"] if themes else "주요 테마"
        top_sector_name = sectors[0]["industry_name"] if sectors else "핵심 업종"
        title = f"[{date_str}] {top_theme_name}·{top_sector_name} 강세 — 오늘 외국인/기관 순매수 TOP 종목 & 퀀트 분석"

        # SEO Keywords
        seo_keywords = f"오늘주식, {top_theme_name}, {top_sector_name}, 수급분석, 외국인순매수, 주식시황, 퀀트분석"

        # 2. Generate HTML Content
        html_lines = []
        html_lines.append('<div style="font-family:\'Noto Sans KR\', -apple-system, sans-serif; line-height:1.7; color:#2d3748; max-width:800px; margin:0 auto; padding:20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">')
        
        # Header Banner
        html_lines.append(f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 24px; border-radius: 10px; margin-bottom: 24px;">
            <span style="background-color: #38bdf8; color: #0f172a; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">DAILY QUANT MARKET REPORT</span>
            <h1 style="font-size: 1.5rem; margin: 12px 0 8px 0; color: #ffffff; font-weight: 700;">{title}</h1>
            <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">작성일자: {date_str} | StockPlus Quant Engine 분석</p>
        </div>
        ''')

        # AI Summary Block
        if ai_summary:
            html_lines.append(f'''
            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 6px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; color: #0369a1; font-size: 1.1rem; font-weight:bold;">🤖 AI 퀀트 시장 종합 가이드</h3>
                <p style="margin: 0; color: #334155; font-size: 0.95rem; white-space: pre-line;">{ai_summary}</p>
            </div>
            ''')

        # Section 1: Hot Themes
        html_lines.append('<h2 style="font-size: 1.25rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 28px;">🔥 오늘의 핫 테마 TOP 5</h2>')
        if themes:
            html_lines.append('<table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.9rem;">')
            html_lines.append('<tr style="background-color:#f8fafc; text-align:left; border-bottom:2px solid #cbd5e1;"><th style="padding:10px;">순위</th><th style="padding:10px;">테마명</th><th style="padding:10px;">등락률</th><th style="padding:10px;">주도주</th></tr>')
            for idx, t in enumerate(themes[:5], 1):
                rate_str = self.format_rate(t.get('change_rate'))
                stocks = t.get('lead_stocks', '-') or '-'
                html_lines.append(f'<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px;font-weight:bold;color:#64748b;">{idx}</td><td style="padding:10px;font-weight:bold;">{t.get("theme_name")}</td><td style="padding:10px;">{rate_str}</td><td style="padding:10px;color:#475569;">{stocks}</td></tr>')
            html_lines.append('</table>')
        else:
            html_lines.append('<p style="color:#94a3b8;">오늘 수집된 테마 데이터가 없습니다.</p>')

        # Section 2: WICS Sector Leaders
        html_lines.append('<h2 style="font-size: 1.25rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 28px;">🏭 WICS 업종 주도주 동향</h2>')
        if sectors:
            html_lines.append('<table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.9rem;">')
            html_lines.append('<tr style="background-color:#f8fafc; text-align:left; border-bottom:2px solid #cbd5e1;"><th style="padding:10px;">업종명</th><th style="padding:10px;">등락률</th><th style="padding:10px;">업종 주도주</th></tr>')
            for s in sectors[:5]:
                rate_str = self.format_rate(s.get('change_rate'))
                stocks = s.get('lead_stocks', '-') or '-'
                html_lines.append(f'<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px;font-weight:bold;">{s.get("industry_name")}</td><td style="padding:10px;">{rate_str}</td><td style="padding:10px;color:#475569;">{stocks}</td></tr>')
            html_lines.append('</table>')
        else:
            html_lines.append('<p style="color:#94a3b8;">오늘 수집된 업종 데이터가 없습니다.</p>')

        # Section 3: AI Next Leaders
        if ai_leaders:
            html_lines.append('<h2 style="font-size: 1.25rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 28px;">🤖 AI 주도주 예측 (LSTM / XGBoost)</h2>')
            html_lines.append('<table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.9rem;">')
            html_lines.append('<tr style="background-color:#f8fafc; text-align:left; border-bottom:2px solid #cbd5e1;"><th style="padding:10px;">종목코드</th><th style="padding:10px;">종목명</th><th style="padding:10px;">예측 모델</th><th style="padding:10px;">신뢰도</th><th style="padding:10px;">시그널</th></tr>')
            for leader in ai_leaders[:5]:
                score = leader.get('confidence_score', 0)
                signal = leader.get('predicted_signal', 'BUY')
                sig_style = 'color:#e53e3e;font-weight:bold;' if signal == 'BUY' else 'color:#718096;'
                html_lines.append(f'<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px;color:#64748b;">{leader.get("stock_code")}</td><td style="padding:10px;font-weight:bold;">{leader.get("stock_name")}</td><td style="padding:10px;">{leader.get("model_type")}</td><td style="padding:10px;">{score}%</td><td style="padding:10px;{sig_style}">{signal}</td></tr>')
            html_lines.append('</table>')

        # Footer Hashtags
        html_lines.append(f'''
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; color: #0284c7; font-size: 0.85rem; font-weight: 500;">
            #오늘주식 #주식시황 #{top_theme_name} #{top_sector_name} #퀀트분석 #외국인순매수 #StockPlus #주식투자
        </div>
        </div>
        ''')

        html_content = "\n".join(html_lines)

        # 3. Generate Markdown Content
        md_lines = []
        md_lines.append(f"# {title}\n")
        md_lines.append(f"**작성일자**: {date_str} | **분석엔진**: StockPlus Quant Harness Engine\n")

        if ai_summary:
            md_lines.append("### 🤖 AI 퀀트 시장 종합 가이드")
            md_lines.append(f"> {ai_summary.replace(chr(10), chr(10)+'> ')}\n")

        md_lines.append("## 🔥 오늘의 핫 테마 TOP 5")
        if themes:
            md_lines.append("| 순위 | 테마명 | 등락률 | 주도주 |")
            md_lines.append("| :--- | :--- | :--- | :--- |")
            for idx, t in enumerate(themes[:5], 1):
                rate = self.format_rate_md(t.get('change_rate'))
                stocks = t.get('lead_stocks', '-') or '-'
                md_lines.append(f"| {idx} | **{t.get('theme_name')}** | {rate} | {stocks} |")
            md_lines.append("")

        md_lines.append("## 🏭 WICS 업종 주도주 동향")
        if sectors:
            md_lines.append("| 업종명 | 등락률 | 업종 주도주 |")
            md_lines.append("| :--- | :--- | :--- |")
            for s in sectors[:5]:
                rate = self.format_rate_md(s.get('change_rate'))
                stocks = s.get('lead_stocks', '-') or '-'
                md_lines.append(f"| **{s.get('industry_name')}** | {rate} | {stocks} |")
            md_lines.append("")

        if ai_leaders:
            md_lines.append("## 🤖 AI 주도주 예측")
            md_lines.append("| 종목코드 | 종목명 | 예측 모델 | 신뢰도 | 시그널 |")
            md_lines.append("| :--- | :--- | :--- | :--- | :--- |")
            for leader in ai_leaders[:5]:
                md_lines.append(f"| {leader.get('stock_code')} | **{leader.get('stock_name')}** | {leader.get('model_type')} | {leader.get('confidence_score')}% | **{leader.get('predicted_signal')}** |")
            md_lines.append("")

        md_lines.append(f"\n`#오늘주식 #{top_theme_name} #{top_sector_name} #퀀트분석 #주식투자`\n")
        markdown_content = "\n".join(md_lines)

        return {
            "title": title,
            "seo_keywords": seo_keywords,
            "html_content": html_content,
            "markdown_content": markdown_content
        }

blog_template_engine = BlogTemplateEngine()

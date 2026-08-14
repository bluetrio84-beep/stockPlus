import asyncio
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

class BlogScreenshotService:
    """
    Playwright 헤드리스 브라우저를 사용하여
    퀀트 블로그 HTML 콘텐츠를 PNG 이미지로 변환
    """

    @staticmethod
    async def html_to_image(html_content: str, title: str = "") -> bytes:
        """HTML 콘텐츠를 렌더링하여 PNG 스크린샷 bytes로 반환"""
        from playwright.async_api import async_playwright

        # 완전한 HTML 문서로 래핑
        full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1260">
  <title>{title}</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Apple SD Gothic Neo', '맑은 고딕', 'Noto Sans KR', sans-serif;
      background: #ffffff;
      padding: 24px;
      width: 1240px;
    }}
  </style>
</head>
<body>
{html_content}
</body>
</html>"""

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            page = await browser.new_page(viewport={"width": 1260, "height": 1200})
            await page.set_content(full_html, wait_until="networkidle")

            # 전체 페이지 높이에 맞게 스크린샷
            screenshot_bytes = await page.screenshot(
                full_page=True,
                type="png"
            )
            await browser.close()
            return screenshot_bytes

    @staticmethod
    def html_to_image_sync(html_content: str, title: str = "") -> bytes:
        """동기 래퍼 함수 (FastAPI 동기 엔드포인트에서 호출)"""
        return asyncio.run(BlogScreenshotService.html_to_image(html_content, title))

blog_screenshot_service = BlogScreenshotService()

import logging
import time
from typing import Optional
from playwright.sync_api import sync_playwright

logger = logging.getLogger("naver_macro_publisher")

class NaverMacroPublisher:
    """
    Playwright 기반 네이버 블로그 100% 자동 매크로 포스팅 퍼블리셔 엔진
    """

    @staticmethod
    def publish(
        naver_id: str,
        naver_pw: Optional[str] = None,
        nid_aut: Optional[str] = None,
        nid_ses: Optional[str] = None,
        title: str = "",
        content_html: str = ""
    ) -> dict:
        """
        네이버 블로그 매크로 포스팅 자동 수행 함수
        """
        if not naver_id:
            return {"success": False, "error": "네이버 아이디가 누락되었습니다."}

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-blink-features=AutomationControlled"
                    ]
                )
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    viewport={"width": 1280, "height": 800}
                )

                # Cookie session auth if provided
                if nid_aut and nid_ses:
                    context.add_cookies([
                        {"name": "NID_AUT", "value": nid_aut, "domain": ".naver.com", "path": "/"},
                        {"name": "NID_SES", "value": nid_ses, "domain": ".naver.com", "path": "/"}
                    ])
                    logger.info("[Naver Macro] Using NID_AUT & NID_SES cookies for instant login")

                page = context.new_page()

                # If no session cookies, perform ID/PW login
                if not (nid_aut and nid_ses) and naver_pw:
                    logger.info("[Naver Macro] Logging in via ID/PW")
                    page.goto("https://nid.naver.com/nidlogin.login")
                    page.wait_for_selector("#id")
                    
                    page.evaluate(f"document.getElementById('id').value = '{naver_id}';")
                    page.evaluate(f"document.getElementById('pw').value = '{naver_pw}';")
                    time.sleep(0.5)
                    page.click("#log\\.login")
                    time.sleep(2)

                # Go to blog write page
                write_url = f"https://blog.naver.com/{naver_id}?Redirect=Write"
                logger.info(f"[Naver Macro] Navigating to write page: {write_url}")
                page.goto(write_url, wait_until="networkidle")
                time.sleep(2)

                # Handle iframe if present
                frame = page.frame_locator("#mainFrame") if page.locator("#mainFrame").count() > 0 else page

                # Type Title
                title_selector = ".se-documentTitle, .se-ff-nanumgothic, textarea.se-ff-nanumgothic, p.se-ff-nanumgothic"
                if frame.locator(title_selector).count() > 0:
                    frame.locator(title_selector).first.click()
                    frame.locator(title_selector).first.fill(title)
                    logger.info("[Naver Macro] Filled title successfully")

                # Type Content HTML
                content_selector = ".se-main-container, .se-component.se-text"
                if frame.locator(content_selector).count() > 0:
                    frame.locator(content_selector).first.click()
                    page.keyboard.insert_text(content_html)
                    logger.info("[Naver Macro] Injected content HTML successfully")

                # Click Publish button if available
                publish_btn_selector = "button.se-btn-publish, button.publish_btn, .btn_publish"
                if frame.locator(publish_btn_selector).count() > 0:
                    frame.locator(publish_btn_selector).first.click()
                    time.sleep(1)
                    confirm_btn = "button.confirm_btn, button.btn_apply"
                    if frame.locator(confirm_btn).count() > 0:
                        frame.locator(confirm_btn).first.click()
                    logger.info("[Naver Macro] Clicked publish button")

                browser.close()
                return {
                    "success": True,
                    "post_url": f"https://blog.naver.com/{naver_id}",
                    "message": f"🤖 네이버 매크로 봇이 [{title[:15]}...] 포스팅 자동 발행을 완료했습니다! (블로그: https://blog.naver.com/{naver_id})"
                }
        except Exception as e:
            logger.error(f"[Naver Macro Exception] {e}")
            return {"success": False, "error": f"네이버 매크로 연동 중 오류 발생: {str(e)}"}

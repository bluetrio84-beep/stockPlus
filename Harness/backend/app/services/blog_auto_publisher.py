import urllib.request
import urllib.parse
import json
import logging
import base64

logger = logging.getLogger(__name__)

class BlogAutoPublisher:
    """
    퀀트 포스팅을 외부 블로그(티스토리, 네이버 블로그, 워드프레스 등)로
    직접 자동 게시(Direct Auto-Publishing)하는 서비스 엔진
    """

    @staticmethod
    def publish_to_tistory(access_token: str, blog_name: str, title: str, content_html: str, tag: str = "주식,퀀트,수급") -> dict:
        """
        티스토리 공식 Open API (POST /apis/post/write)를 통한 100% 자동 포스팅 게시
        """
        url = "https://www.tistory.com/apis/post/write"
        payload = {
            "access_token": access_token,
            "output": "json",
            "blogName": blog_name,
            "title": title,
            "content": content_html,
            "visibility": "3",  # 3: 발행 (공개)
            "tag": tag
        }
        
        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                if result.get("tistory", {}).get("status") == "200":
                    post_url = result.get("tistory", {}).get("url", f"https://{blog_name}.tistory.com")
                    logger.info(f"[Tistory Auto-Publisher] Success: {post_url}")
                    return {"success": True, "post_url": post_url, "message": "티스토리 자동 게시 완료!"}
                else:
                    err_msg = result.get("tistory", {}).get("error_reason", "알 수 없는 오류")
                    return {"success": False, "error": f"티스토리 API 오류: {err_msg}"}
        except Exception as e:
            logger.error(f"[Tistory Auto-Publisher Exception] {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def publish_to_naver_blog(naver_id: str, title: str, content_html: str) -> dict:
        """
        네이버 블로그 스마트 포스팅 브릿지
        네이버는 2019년 공식 API 서비스를 종료하였으므로,
        스마트에디터 ONE 전용 인라인 HTML 인코딩 파이프라인 및 쓰기 페이지 포워딩을 수행합니다.
        """
        clean_id = naver_id.strip()
        write_url = f"https://blog.naver.com/{clean_id}?Redirect=Write"
        logger.info(f"[Naver Blog Bridge] Opening SmartEditor ONE for ID: {clean_id}")
        return {
            "success": True,
            "post_url": write_url,
            "message": f"네이버 블로그({clean_id}) 스마트에디터 글쓰기 창으로 연결되었습니다! 복사된 HTML을 탭에 붙여넣으세요."
        }

    @staticmethod
    def publish_to_wordpress(wp_url: str, username: str, app_password: str, title: str, content_html: str) -> dict:
        """
        워드프레스 REST API (POST /wp-json/wp/v2/posts)를 통한 자동 게시
        """
        clean_url = wp_url.rstrip("/")
        api_endpoint = f"{clean_url}/wp-json/wp/v2/posts"
        
        auth_string = f"{username}:{app_password}"
        auth_encoded = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")
        
        payload = {
            "title": title,
            "content": content_html,
            "status": "publish"
        }
        
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            api_endpoint,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {auth_encoded}"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                post_link = result.get("link", clean_url)
                return {"success": True, "post_url": post_link, "message": "워드프레스 자동 게시 완료!"}
        except Exception as e:
            logger.error(f"[WordPress Auto-Publisher Exception] {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def publish_via_webhook(webhook_url: str, title: str, content_html: str, markdown: str = "") -> dict:
        """
        커스텀 블로그/웹훅 엔드포인트로 자동 전송
        """
        payload = {
            "title": title,
            "html": content_html,
            "markdown": markdown,
            "source": "Harness Quant Auto-Blogger"
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(webhook_url, data=data, headers={"Content-Type": "application/json"})

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return {"success": True, "message": "웹훅 포스팅 자동 전송 완료!"}
        except Exception as e:
            return {"success": False, "error": str(e)}

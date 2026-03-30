import os
import pymysql
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# DB 설정 (StockPlus 표준)
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

class YoutubeIntelligenceEngine:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv('YOUTUBE_API_KEY', '') # .env에서 로드
        self.conn = None

    def connect(self):
        if not self.conn or not self.conn.open:
            self.conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

    def get_search_categories(self):
        """고퀄리티 주식 인텔리전스를 위한 검색 카테고리 정의"""
        return [
            {'category': '주식공부', 'query': '주식 차트 강의 보는법 매매기법'},
            {'category': '종목추천', 'query': '내일 급등주 추천 주도주 분석'},
            {'category': '시장분석', 'query': '오늘 주식 시황 전망 거시경제'},
            {'category': '수급분석', 'query': '기관 외국인 매집 종목 스마트머니'}
        ]

    def fetch_and_save(self):
        """유튜브 데이터 수집 메인 로직 (카테고리 기반)"""
        if not self.api_key:
            print(">>> [Error] YOUTUBE_API_KEY is missing in .env")
            return

        categories = self.get_search_categories()
        print(f">>> [Youtube] Target Categories: {len(categories)} topics.")

        published_after = (datetime.utcnow() - timedelta(days=90)).isoformat() + "Z"

        for item in categories:
            cat_name = item['category']
            query = item['query']
            
            print(f">>> [Fetching Category] {cat_name}...")
            
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                'part': 'snippet',
                'q': query,
                'key': self.api_key,
                'maxResults': 10, # 카테고리당 10개씩 수집
                'type': 'video',
                'publishedAfter': published_after,
                'order': 'relevance',
                'relevanceLanguage': 'ko' # 한국어 영상 우선
            }

            try:
                res = requests.get(url, params=params)
                if res.status_code == 200:
                    video_items = res.json().get('items', [])
                    self.save_to_db(cat_name, video_items)
                else:
                    print(f">>> [Error] API Call Failed: {res.status_code}")
            except Exception as e:
                print(f">>> [Exception] {e}")

    def save_to_db(self, cat_name, items):
        self.connect()
        with self.conn.cursor() as cursor:
            for item in items:
                v_id = item['id']['videoId']
                snippet = item['snippet']
                title = snippet['title']
                thumb = snippet['thumbnails']['high']['url']
                channel = snippet['channelTitle']
                pub_at = snippet['publishedAt'].replace('T', ' ').replace('Z', '')

                # stock_code 대신 카테고리명을 stock_name 컬럼에 저장하여 UI에서 활용
                sql = """
                INSERT INTO youtube_feeds (video_id, stock_code, stock_name, title, thumbnail_url, channel_name, published_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    title = VALUES(title),
                    thumbnail_url = VALUES(thumbnail_url),
                    published_at = VALUES(published_at),
                    stock_name = VALUES(stock_name)
                """
                cursor.execute(sql, (v_id, 'SYSTEM', cat_name, title, thumb, channel, pub_at))
        self.conn.commit()

if __name__ == "__main__":
    engine = YoutubeIntelligenceEngine()
    # API 키가 있을 때만 가동
    if engine.api_key:
        engine.fetch_and_save()
    else:
        print(">>> Youtube Engine standby... (Wait for API Key)")

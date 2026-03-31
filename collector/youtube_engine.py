import os
import pymysql
import requests
from datetime import datetime, timedelta
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

class YoutubeIntelligenceEngine:
    def __init__(self):
        self.api_key = os.getenv('YOUTUBE_API_KEY', '')
        self.conn = None
        self.search_cache = {}

    def connect(self):
        if not self.conn or not self.conn.open:
            self.conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

    def get_active_users(self):
        self.connect()
        with self.conn.cursor() as cursor:
            cursor.execute("SELECT USRID FROM users WHERE useyn = 'Y'")
            return [row['USRID'] for row in cursor.fetchall()]

    def get_user_favorites(self, usr_id):
        self.connect()
        with self.conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT stock_name FROM watchlist WHERE USRID = %s AND is_favorite = 1", (usr_id,))
            return [row['stock_name'] for row in cursor.fetchall()]

    def fetch_with_cache(self, query, max_res=5):
        cache_key = f"{query}_{max_res}"
        if cache_key in self.search_cache: return self.search_cache[cache_key]
        
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            'part': 'snippet', 'q': query, 'key': self.api_key,
            'maxResults': max_res, 'type': 'video',
            'publishedAfter': (datetime.utcnow() - timedelta(days=30)).isoformat() + "Z",
            'order': 'relevance', 'relevanceLanguage': 'ko'
        }
        try:
            res = requests.get(url, params=params)
            if res.status_code == 200:
                items = res.json().get('items', [])
                self.search_cache[cache_key] = items
                return items
        except: pass
        return []

    def fetch_and_save(self):
        if not self.api_key: return
        users = self.get_active_users()
        for usr_id in users:
            # 1. 즐겨찾기 (20개)
            favorites = self.get_user_favorites(usr_id)
            for stock_name in favorites[:10]:
                videos = self.fetch_with_cache(f"{stock_name} 주식 분석 전망", max_res=2)
                self.save_to_db(usr_id, stock_name, videos)
            
            # 2. 공통 (30개)
            common = [
                {'cat': '무극선생', 'q': '무극선생 주식 분석'}, {'cat': '프리티', 'q': '주식 프리티 분석 추천'},
                {'cat': '수급브리핑', 'q': '전종목 통합 수급 브리핑'}, {'cat': '주식공부', 'q': '주식 차트 강의 매매기법'},
                {'cat': '종목추천', 'q': '내일 급등주 추천 주도주'}, {'cat': '시장전략', 'q': '주식 시황 전망 투자 전략'}
            ]
            for topic in common:
                videos = self.fetch_with_cache(topic['q'], max_res=5)
                self.save_to_db(usr_id, topic['cat'], videos)

    def save_to_db(self, usr_id, cat_name, items):
        self.connect()
        with self.conn.cursor() as cursor:
            for item in items:
                v_id = item['id']['videoId']
                snippet = item['snippet']
                sql = "INSERT INTO youtube_feeds (video_id, usr_id, stock_code, stock_name, title, thumbnail_url, channel_name, published_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE title=VALUES(title), stock_name=VALUES(stock_name)"
                cursor.execute(sql, (v_id, usr_id, 'SYSTEM', cat_name, snippet['title'], snippet['thumbnails']['high']['url'], snippet['channelTitle'], snippet['publishedAt'].replace('T',' ').replace('Z','')))
        self.conn.commit()

if __name__ == "__main__":
    engine = YoutubeIntelligenceEngine()
    if engine.api_key: engine.fetch_and_save()

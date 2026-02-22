FROM python:3.9-slim

WORKDIR /app

# 타임존 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo Asia/Seoul > /etc/timezone

# Playwright 및 리눅스 라이브러리 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# 필수 패키지 설치
RUN pip install --no-cache-dir requests pymysql pytz beautifulsoup4 playwright playwright-stealth

# 브라우저 설치
RUN playwright install chromium
RUN playwright install-deps chromium

# [수정] main.py 뿐만 아니라 ai_engine.py 등 모든 파일 복사
COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py"]

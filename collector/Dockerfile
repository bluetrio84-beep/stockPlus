# 1. Base Image
FROM python:3.9-slim

# 2. 시스템 의존성 설치
RUN ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && echo Asia/Seoul > /etc/timezone
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
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. 딥러닝 및 데이터 분석 패키지 설치 (PyTorch CPU 버전 포함)
RUN pip install --no-cache-dir \
    requests \
    pymysql \
    pytz \
    beautifulsoup4 \
    playwright \
    playwright-stealth \
    pandas \
    numpy \
    scikit-learn \
    xgboost \
    torch --extra-index-url https://download.pytorch.org/whl/cpu

# 5. 브라우저 엔진 설치
RUN playwright install chromium
RUN playwright install-deps chromium

# 6. 소스 코드 복사
COPY . .

# 7. 실행
CMD ["python", "main.py"]

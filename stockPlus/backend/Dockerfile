# Use an official Eclipse Temurin JDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy

# [v30.36] Git, Python3, Node.js 20, util-linux(script), build-essential, Docker CLI 설치
RUN apt-get update && apt-get install -y git python3 curl util-linux build-essential make g++ ca-certificates gnupg lsb-release && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y docker-ce-cli && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the Maven wrapper and the pom.xml file
COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/pom.xml .

# Ensure mvnw has execute permissions
RUN chmod +x mvnw

# [v36.108] Node.js 라이브러리 설치 (node-pty, ws)
RUN npm install node-pty ws

# [추가] 로케일 및 인코딩 환경변수 설정
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PATH=$PATH:/usr/local/npm-global/bin

# Download project dependencies
RUN ./mvnw dependency:go-offline

# Copy the project source code
COPY backend/src src

# [v30.36] 파이썬 스캐너 스크립트 및 터미널 서버 복사
COPY collector/master_spec_generator.py collector/master_spec_generator.py
COPY backend/terminal-server.js terminal-server.js
COPY backend/entrypoint.sh entrypoint.sh

# 실행 권한 부여
RUN chmod +x entrypoint.sh

# Package the application
RUN ./mvnw package -DskipTests

# Expose the ports
EXPOSE 8080 3000

# Command to run the application via entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

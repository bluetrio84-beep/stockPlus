# Use an official Eclipse Temurin JDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy

# [v30.36] Git 및 Python3 설치 (스캐너 엔진 구동용)
RUN apt-get update && apt-get install -y git python3 && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the Maven wrapper and the pom.xml file
COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/pom.xml .

# Ensure mvnw has execute permissions
RUN chmod +x mvnw

# [추가] 로케일 및 인코딩 환경변수 설정
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Download project dependencies
RUN ./mvnw dependency:go-offline

# Copy the project source code
COPY backend/src src

# [v30.36] 파이썬 스캐너 스크립트 복사
COPY collector/master_spec_generator.py collector/master_spec_generator.py

# Package the application
RUN ./mvnw package -DskipTests

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-Dsun.jnu.encoding=UTF-8", "-jar", "target/stock-plus-backend-0.0.1-SNAPSHOT.jar"]

# Use an official Eclipse Temurin JDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy

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

# Package the application
RUN ./mvnw package -DskipTests

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-Dsun.jnu.encoding=UTF-8", "-jar", "target/stock-plus-backend-0.0.1-SNAPSHOT.jar"]

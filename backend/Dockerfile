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

# Download project dependencies
RUN ./mvnw dependency:go-offline

# Copy the project source code
COPY backend/src src

# Package the application
RUN ./mvnw package -DskipTests

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "target/stock-plus-backend-0.0.1-SNAPSHOT.jar"]

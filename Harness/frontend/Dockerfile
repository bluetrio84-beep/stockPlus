# Step 1: 빌드 단계
FROM node:20-slim AS build

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# Step 2: 서빙 단계
FROM nginx:alpine

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 결과물 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 포트 설정
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]

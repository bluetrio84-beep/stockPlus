#### task.md 파일 읽고 StockPlus Project  진행 내용 파악 !!

## 🛠️ Query Implementation Policy (Mandatory)
*   **MyBatis XML 우선 원칙**: 모든 SQL 쿼리는 Java 인터페이스의 어노테이션(`@Select`, `@Update` 등) 대신 반드시 **MyBatis XML 매퍼 파일** 내에 구현한다. 이는 쿼리의 가독성 유지와 복잡한 동적 SQL 처리를 위한 프로젝트 표준 지침이다.

## 🛠️ Docker 빌드 및 배포 가이드 (Essential)
*새 세션 시작 시 반드시 준수할 표준 명령어*

### 1. 전체 시스템 재빌드 및 배포 (클린 부팅)
```bash
docker compose build --no-cache && docker compose down && docker compose up -d
```

### 2. 수집기(Collector) 전용 재빌드 및 배포
```bash
docker compose build collector && docker compose stop collector && docker compose rm -f collector && docker compose up -d collector
```

### 3. 프론트엔드(Frontend) 전용 재빌드 및 배포
```bash
docker compose build frontend && docker compose stop frontend && docker compose rm -f frontend && docker compose up -d frontend
```

### 4. 백엔드(Backend) 전용 재빌드 및 배포
```bash
docker compose build backend && docker compose stop backend && docker compose rm -f backend && docker compose up -d backend
```

### 5. 로그 모니터링 (Collector/Backend)
```bash
# 수집기 로그
docker logs projects-collector-1 -f --tail 100
# 백엔드 로그
docker logs projects-backend-1 -f --tail 100

---
*본 내용은 StockPlus의 차기 핵심 업데이트 지침으로 활용됩니다.*

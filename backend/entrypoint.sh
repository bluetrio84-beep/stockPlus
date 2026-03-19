#!/bin/bash

# 1. 터미널 사이드카 서버 실행 (백그라운드)
echo ">>> Starting Terminal Sidecar Server (Node.js)..."
node /app/terminal-server.js &

# 2. 메인 스프링 부트 앱 실행
echo ">>> Starting StockPlus Backend (Java)..."
java -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 -jar /app/target/stock-plus-backend-0.0.1-SNAPSHOT.jar

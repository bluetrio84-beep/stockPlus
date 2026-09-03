-- ============================================================================
-- StockPlus Integrated System Master Schema (v31.70)
-- 100% Comprehensive Sync: Pure Live Database Inventory (29 Tables)
-- ============================================================================

DROP TABLE IF EXISTS company_financials;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS user_note;
DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS user_market_insight;
DROP TABLE IF EXISTS user_keyword;
DROP TABLE IF EXISTS stock_master;
DROP TABLE IF EXISTS news_item;
DROP TABLE IF EXISTS stock_info;
DROP TABLE IF EXISTS stock_analysis_log;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS trade_history;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- SECTION I. SERVICE ARCHITECTURE (Core Application Tables)
-- ============================================================================

CREATE TABLE users (
    USRID VARCHAR(50) PRIMARY KEY COMMENT '사용자 아이디',
    USRNAME VARCHAR(50) NOT NULL COMMENT '사용자 성명',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호',
    phone_number VARCHAR(20) NOT NULL UNIQUE COMMENT '연락처',
    email VARCHAR(100) NOT NULL COMMENT '이메일',
    role VARCHAR(20) DEFAULT 'USER' COMMENT '권한',
    useyn CHAR(1) DEFAULT 'Y' COMMENT '사용여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '가입일'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
) COMMENT '시스템 사용자 마스터';

CREATE TABLE stock_master (
    stock_code VARCHAR(20) COMMENT '종목코드',
    stock_name VARCHAR(100) COMMENT '종목명',
    market_type VARCHAR(20) COMMENT '시장구분',
    exchange_code VARCHAR(10) COMMENT '거래소코드',
    PRIMARY KEY (stock_code, exchange_code)
) COMMENT '상장 종목 마스터';

CREATE TABLE watchlist (
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    stock_code VARCHAR(20) NOT NULL COMMENT '종목코드',
    stock_name VARCHAR(100) COMMENT '종목명',
    exchange_code VARCHAR(10) COMMENT '거래소코드',
    group_id INT DEFAULT 1 COMMENT '그룹ID',
    is_favorite BOOLEAN DEFAULT FALSE COMMENT '즐겨찾기',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    PRIMARY KEY (USRID, stock_code, group_id),
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '사용자 관심종목';

CREATE TABLE holdings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '보유ID',
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    stock_code VARCHAR(20) NOT NULL COMMENT '종목코드',
    stock_name VARCHAR(100) COMMENT '종목명',
    quantity INT NOT NULL DEFAULT 0 COMMENT '수량',
    avg_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '평단가',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '매수일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    UNIQUE KEY uk_holding_user_stock (USRID, stock_code),
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '실시간 주식 보유 현황';

CREATE TABLE trade_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '이력ID',
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    stock_code VARCHAR(20) NOT NULL COMMENT '종목코드',
    trade_type VARCHAR(10) NOT NULL COMMENT '매수/매도',
    quantity INT NOT NULL COMMENT '수량',
    price DECIMAL(15, 2) NOT NULL COMMENT '가격',
    trade_date DATE NOT NULL COMMENT '거래일',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '기록일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '매매 체결 히스토리';

CREATE TABLE user_note (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '노트ID',
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    ref_code VARCHAR(50) COMMENT '참조코드(종목코드)', 
    stock_name VARCHAR(100) COMMENT '종목명',
    title VARCHAR(200) COMMENT '제목',
    content TEXT COMMENT '내용(마크다운)',
    category VARCHAR(20) DEFAULT 'GENERAL' COMMENT '분류(JOURNAL/ANALYSIS/STRATEGY/STUDY/GENERAL)',
    is_important BOOLEAN DEFAULT FALSE COMMENT '중요여부',
    view_count INT DEFAULT 0 COMMENT '조회수',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '작성일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '사용자 개인 투자 일지 및 메모';

CREATE TABLE user_keyword (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '키워드ID',
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    keyword VARCHAR(100) NOT NULL COMMENT '키워드명',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '뉴스 탐지 키워드';

CREATE TABLE notification_log (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '알림ID',
    USRID VARCHAR(50) COMMENT '사용자ID',
    message TEXT COMMENT '알림메시지',
    type VARCHAR(50) COMMENT '알림타입',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '발생일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '시스템 알림 로그';

CREATE TABLE user_market_insight (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '인사이트ID',
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    insight_text TEXT COMMENT '분석본문',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (USRID) REFERENCES users(USRID) ON DELETE CASCADE
) COMMENT '사용자 맞춤형 AI 인사이트';

CREATE TABLE company_financials (
    stock_code VARCHAR(10) NOT NULL COMMENT '종목코드',
    report_year INT NOT NULL COMMENT '결산년도',
    report_code VARCHAR(10) NOT NULL COMMENT '보고서코드',
    revenue BIGINT DEFAULT 0 COMMENT '매출액',
    op_profit BIGINT DEFAULT 0 COMMENT '영업이익',
    roe DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'ROE',
    PRIMARY KEY (stock_code, report_year, report_code)
) COMMENT '기업 주요 재무제표';

-- ============================================================================
-- SECTION II. LIVE COLLECTOR & AI ENGINE SCHEMAS (Collector & AI Engine Tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collector_config (
    id INT PRIMARY KEY COMMENT '설정ID',
    collect_interval INT DEFAULT 600 COMMENT '수집주기(초)',
    is_running BOOLEAN DEFAULT TRUE COMMENT '가동여부',
    current_mode VARCHAR(20) DEFAULT 'NORMAL' COMMENT '현재모드',
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '최종생존신호',
    ai_strategy_mode VARCHAR(20) DEFAULT 'STABLE' COMMENT 'AI전략모드',
    weight_lstm DECIMAL(4,2) DEFAULT 0.20 COMMENT 'LSTM가중치',
    weight_tcn DECIMAL(4,2) DEFAULT 0.20 COMMENT 'TCN가중치',
    weight_xgb DECIMAL(4,2) DEFAULT 0.60 COMMENT 'XGB가중치'
) COMMENT '데이터 수집기 핵심 설정';

CREATE TABLE IF NOT EXISTS stock_intraday_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기록ID',
    stock_code VARCHAR(10) NOT NULL COMMENT '종목코드',
    price DECIMAL(15,2) COMMENT '현재가',
    volume BIGINT COMMENT '거래량',
    captured_at DATETIME NOT NULL COMMENT '캡처시간',
    rsi FLOAT COMMENT 'RSI지표',
    ma20 DECIMAL(15,2) COMMENT '20일이평',
    bb_upper DECIMAL(15,2) COMMENT '볼린저상단',
    bb_lower DECIMAL(15,2) COMMENT '볼린저하단',
    macd FLOAT COMMENT 'MACD',
    obv BIGINT DEFAULT 0 COMMENT 'OBV지표'
) COMMENT '장중 분단위 시세 및 기술적 분석 데이터';

CREATE TABLE IF NOT EXISTS ai_daily_report (
    report_date DATE PRIMARY KEY COMMENT '리포트일자',
    content TEXT NOT NULL COMMENT '리포트전문',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성시간'
) COMMENT 'AI 시장 종합 일간 리포트';

CREATE TABLE IF NOT EXISTS ai_prediction (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '예측ID',
    target_name VARCHAR(50) NOT NULL COMMENT '대상명',
    prediction_score DECIMAL(5,2) NOT NULL COMMENT 'AI점수',
    signal_type VARCHAR(10) NOT NULL COMMENT '신호타입',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '예측시간'
) COMMENT '종목별 등락 예측 데이터';

CREATE TABLE IF NOT EXISTS ai_next_leaders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '추천ID',
    stock_code VARCHAR(10) NOT NULL COMMENT '종목코드',
    stock_name VARCHAR(100) NOT NULL COMMENT '종목명',
    total_score DECIMAL(5,2) COMMENT '종합점수',
    reason TEXT COMMENT '추천근거',
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '분석시간'
) COMMENT 'AI 선정 차기 주도주';

CREATE TABLE IF NOT EXISTS daily_stock_investor (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '고유번호',
    stock_code VARCHAR(10) NOT NULL COMMENT '종목코드',
    bsop_date DATE NOT NULL COMMENT '영업일자',
    close_price DECIMAL(15,2) DEFAULT 0 COMMENT '종가',
    individual_net_buy BIGINT DEFAULT 0 COMMENT '개인수급',
    foreign_net_buy BIGINT DEFAULT 0 COMMENT '외인수급',
    institution_net_buy BIGINT DEFAULT 0 COMMENT '기관수급',
    volume BIGINT DEFAULT 0 COMMENT '거래량',
    UNIQUE KEY uk_stock_date (stock_code, bsop_date)
) COMMENT '일별 투자자별 수급동향';

CREATE TABLE IF NOT EXISTS stock_supply_demand (
    stock_code VARCHAR(10) PRIMARY KEY COMMENT '종목코드',
    current_price DECIMAL(15,2) COMMENT '실시간가격',
    foreign_net_buy BIGINT COMMENT '외인수급',
    top_brokers TEXT COMMENT '거래원정보(JSON)',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
) COMMENT '실시간 수급 분석 데이터';

CREATE TABLE IF NOT EXISTS stock_rankings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '랭킹ID',
    ranking_type VARCHAR(20) COMMENT '랭킹종류',
    rank_val INT COMMENT '순위',
    stock_code VARCHAR(10) COMMENT '종목코드',
    stock_name VARCHAR(100) COMMENT '종목명',
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '캡처시간'
) COMMENT '거래대금/등락률 랭킹 정보';

CREATE TABLE IF NOT EXISTS news_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '뉴스ID',
    title VARCHAR(500) NOT NULL COMMENT '제목',
    link VARCHAR(500) UNIQUE NOT NULL COMMENT '링크',
    description TEXT COMMENT '요약',
    pub_date DATETIME COMMENT '발행일',
    is_ai_summarized TINYINT(1) DEFAULT 0 COMMENT 'AI요약여부',
    ai_summary TEXT COMMENT 'AI요약본',
    usrid VARCHAR(50) DEFAULT 'admin' COMMENT '담당자ID'
) COMMENT '실시간 수집 뉴스 마스터';

CREATE TABLE IF NOT EXISTS monitoring_queue (
    stock_code VARCHAR(10) PRIMARY KEY COMMENT '종목코드',
    priority INT DEFAULT 1 COMMENT '우선순위',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록시간',
    last_collected_at TIMESTAMP COMMENT '최종수집시간'
) COMMENT '수집 대상 종목 큐';

CREATE TABLE IF NOT EXISTS industry_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기록ID',
    industry_name VARCHAR(100) COMMENT '업종명',
    change_rate DECIMAL(5,2) COMMENT '등락률',
    trade_amount BIGINT DEFAULT 0 COMMENT '거래대금',
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '기록시간'
) COMMENT '업종별 등락 히트맵 기록';

CREATE TABLE IF NOT EXISTS market_holidays (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '번호',
    holiday_date DATE NOT NULL UNIQUE COMMENT '휴장일자',
    holiday_name VARCHAR(100) NOT NULL COMMENT '명칭',
    holiday_year INT NOT NULL COMMENT '해당연도'
) COMMENT '국내 시장 휴장일 정보';

CREATE TABLE IF NOT EXISTS market_index_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기록ID',
    index_name VARCHAR(50) NOT NULL COMMENT '지수명',
    index_value DECIMAL(10,2) NOT NULL COMMENT '수치',
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '기록시간'
) COMMENT '시장 지수 히스토리';

CREATE TABLE IF NOT EXISTS program_trading (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기록ID',
    stock_code VARCHAR(10) COMMENT '종목코드',
    net_buy_qty BIGINT COMMENT '프로그램순매수',
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '기록시간'
) COMMENT '프로그램 매매 데이터';

CREATE TABLE IF NOT EXISTS collector_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '로그ID',
    log_level VARCHAR(10) COMMENT '레벨',
    message TEXT COMMENT '메시지',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '시간'
) COMMENT '수집기 운영 로그';

CREATE TABLE IF NOT EXISTS collector_hourly_stats (
    stat_hour VARCHAR(13) PRIMARY KEY COMMENT '시간(YYYYMMDDHH)',
    row_count INT DEFAULT 0 COMMENT '처리건수',
    avg_latency_ms INT DEFAULT 0 COMMENT '평균지연시간'
) COMMENT '수집기 성능 통계';

CREATE TABLE IF NOT EXISTS stock_analysis_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '로그ID',
    USRID VARCHAR(50) NOT NULL COMMENT '사용자ID',
    stock_code VARCHAR(20) COMMENT '종목코드',
    analysis_result TEXT COMMENT '결과전문',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '분석시간'
) COMMENT 'AI 분석 이력 로그';

CREATE TABLE IF NOT EXISTS industry_quotes (
    industry_name VARCHAR(100) PRIMARY KEY COMMENT '업종명',
    change_rate DECIMAL(5,2) COMMENT '등락률',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
) COMMENT '실시간 업종 정보';

CREATE TABLE IF NOT EXISTS market_themes (
    theme_name VARCHAR(100) PRIMARY KEY COMMENT '테마명',
    avg_change_rate DECIMAL(5,2) COMMENT '평균등락률',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
) COMMENT '실시간 테마 정보';

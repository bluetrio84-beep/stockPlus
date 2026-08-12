-- --------------------------------------------------------
-- Harness Platform Core Tables
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `h_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'USER') DEFAULT 'USER',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `h_modules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE, -- 'YOUTUBE', 'BLOG', 'STOCK'
    `description` TEXT,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `h_tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `module_id` INT,
    `user_id` INT,
    `status` ENUM('IDLE', 'WORKING', 'COMPLETED', 'FAILED') DEFAULT 'IDLE',
    `progress` INT DEFAULT 0,
    `started_at` TIMESTAMP NULL,
    `ended_at` TIMESTAMP NULL,
    `error_msg` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`module_id`) REFERENCES `h_modules`(`id`),
    FOREIGN KEY (`user_id`) REFERENCES `h_users`(`id`)
);

CREATE TABLE IF NOT EXISTS `h_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_id` INT,
    `level` ENUM('INFO', 'WARNING', 'ERROR', 'DEBUG') DEFAULT 'INFO',
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`task_id`) REFERENCES `h_tasks`(`id`) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- YouTube Harness Module Tables
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `yt_harness_projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT,
    `topic` VARCHAR(255) NOT NULL,
    `niche` VARCHAR(100),
    `status` ENUM('PLANNING', 'SCRIPTING', 'EDITING', 'COMPLETED', 'FAILED') DEFAULT 'PLANNING',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `h_users`(`id`)
);

CREATE TABLE IF NOT EXISTS `yt_harness_contents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT,
    `ai_script` LONGTEXT,
    `final_script` LONGTEXT,
    `voice_path` VARCHAR(512),
    `video_path` VARCHAR(512),
    `thumbnail_path` VARCHAR(512),
    `youtube_url` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `yt_harness_projects`(`id`) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- AI Agent Memory & Identity
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `ai_harness_agents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `type` VARCHAR(50), -- 'RESEARCH', 'CREATIVE', 'EXECUTOR'
    `llm_model` VARCHAR(100) DEFAULT 'gemini-1.5-pro',
    `system_prompt` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `ai_harness_memories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `agent_id` INT,
    `key` VARCHAR(100),
    `value` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`agent_id`) REFERENCES `ai_harness_agents`(`id`) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Autonomous Harness Agent Runtime
-- --------------------------------------------------------

-- 1. 작업 관리 테이블 (task_queue)
CREATE TABLE IF NOT EXISTS `task_queue` (
    `task_id` INT AUTO_INCREMENT PRIMARY KEY,
    `job_name` VARCHAR(255) NOT NULL,
    `step_name` VARCHAR(100),
    `status` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRY') DEFAULT 'PENDING',
    `payload` JSON,
    `result_path` TEXT,
    `error_log` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 에이전트 기억 테이블 (agent_memory)
CREATE TABLE IF NOT EXISTS `agent_memory` (
    `mem_id` INT AUTO_INCREMENT PRIMARY KEY,
    `category` VARCHAR(50),
    `content` TEXT NOT NULL,
    `relevance_score` FLOAT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Quant Blog Engine Tables
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `blog_posts` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `post_date`        DATE NOT NULL,
    `post_type`        ENUM('DAILY_MARKET','THEME_ANALYSIS','SECTOR_LEADER','SUPPLY_DEMAND') NOT NULL DEFAULT 'DAILY_MARKET',
    `title`            VARCHAR(500) NOT NULL,
    `html_content`     LONGTEXT,
    `markdown_content` LONGTEXT,
    `status`           ENUM('DRAFT','READY','PUBLISHED') DEFAULT 'DRAFT',
    `seo_keywords`     VARCHAR(500),
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `published_at`     TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS `blog_data_snapshots` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `post_id`     INT,
    `data_type`   VARCHAR(50),
    `raw_json`    JSON,
    `captured_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE CASCADE
);
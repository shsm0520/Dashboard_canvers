-- Dashboard Canvas Database Initialization Script

CREATE DATABASE IF NOT EXISTS dashboard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dashboard_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    canvas_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    canvas_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    course_code VARCHAR(255),
    color VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_canvas_id (canvas_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks/Assignments table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255),
    canvas_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    points_possible DECIMAL(10, 2),
    submission_type VARCHAR(255),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_due_date (due_date),
    INDEX idx_completed (is_completed),
    INDEX idx_canvas_id (canvas_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    items_synced INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_sync_type (sync_type),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for express-session
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    expires BIGINT UNSIGNED NOT NULL,
    data TEXT,
    INDEX idx_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (optional)
-- INSERT INTO users (id, email, name) VALUES 
-- ('admin', 'admin@example.com', 'Administrator')
-- ON DUPLICATE KEY UPDATE email=email;

-- Create views for analytics
CREATE OR REPLACE VIEW v_user_task_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) as completed_tasks,
    SUM(CASE WHEN t.is_completed = 0 AND t.due_date < NOW() THEN 1 ELSE 0 END) as overdue_tasks,
    SUM(CASE WHEN t.is_completed = 0 AND t.due_date >= NOW() THEN 1 ELSE 0 END) as upcoming_tasks
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id
GROUP BY u.id, u.name;

CREATE OR REPLACE VIEW v_course_task_summary AS
SELECT 
    c.id as course_id,
    c.name as course_name,
    c.user_id,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) as completed_tasks,
    SUM(t.points_possible) as total_points
FROM courses c
LEFT JOIN tasks t ON c.id = t.course_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.user_id;

-- Grant privileges (adjust as needed)
-- GRANT ALL PRIVILEGES ON dashboard_db.* TO 'dashboard_user'@'%';
-- FLUSH PRIVILEGES;

-- Indexes for performance optimization
ALTER TABLE tasks ADD INDEX idx_user_due (user_id, due_date);
ALTER TABLE tasks ADD INDEX idx_course_due (course_id, due_date);
ALTER TABLE sync_logs ADD INDEX idx_user_started (user_id, started_at);

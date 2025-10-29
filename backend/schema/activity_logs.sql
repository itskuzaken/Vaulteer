-- Activity Logs Table (MySQL)
-- Stores all system activity and audit logs

USE vaulteer_db;

CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,

-- Log Classification
type VARCHAR(50) NOT NULL, -- AUTH, VOLUNTEER_MANAGEMENT, STAFF_MANAGEMENT, etc.
action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, LOGIN, etc.
severity ENUM(
    'INFO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
) DEFAULT 'INFO',

-- Who performed the action
performed_by_user_id INT, -- Foreign key to users table
performed_by_name VARCHAR(255) NOT NULL,
performed_by_role ENUM(
    'admin',
    'staff',
    'volunteer',
    'system',
    'unknown'
) NOT NULL,

-- What was affected (optional - not all actions have a target)
target_resource_type VARCHAR(50), -- volunteer, staff, event, post, etc.
target_resource_id VARCHAR(255),

-- Change details
changes JSON, -- Stores the actual changes made (old/new values)
description TEXT, -- Human-readable description
metadata JSON, -- Additional context (method, path, statusCode, etc.)

-- Request information
ip_address VARCHAR(45), -- IPv4 or IPv6
user_agent TEXT,
session_id VARCHAR(255),

-- Timestamps
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- Foreign key to users table
FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for performance
CREATE INDEX idx_activity_logs_type ON activity_logs(type);

CREATE INDEX idx_activity_logs_performed_by ON activity_logs (performed_by_user_id);

CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at DESC);

CREATE INDEX idx_activity_logs_severity ON activity_logs (severity);

CREATE INDEX idx_activity_logs_target ON activity_logs (
    target_resource_type,
    target_resource_id
);

CREATE INDEX idx_activity_logs_role ON activity_logs (performed_by_role);

-- Composite indexes for common query patterns
CREATE INDEX idx_activity_logs_user_date ON activity_logs (
    performed_by_user_id,
    created_at DESC
);

CREATE INDEX idx_activity_logs_type_date ON activity_logs(type, created_at DESC);

-- Full-text search index for descriptions and actions
CREATE FULLTEXT INDEX idx_activity_logs_search ON activity_logs (description, action);

-- Sample queries for MySQL reference:

-- Get all high severity logs from last 7 days
-- SELECT * FROM activity_logs
-- WHERE severity IN ('HIGH', 'CRITICAL')
-- AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- ORDER BY created_at DESC;

-- Get activity by specific user
-- SELECT * FROM activity_logs
-- WHERE performed_by_user_id = 1
-- ORDER BY created_at DESC
-- LIMIT 50;

-- Get all volunteer management actions
-- SELECT * FROM activity_logs
-- WHERE type = 'VOLUNTEER_MANAGEMENT'
-- AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- ORDER BY created_at DESC;

-- Get security events
-- SELECT * FROM activity_logs
-- WHERE type = 'SECURITY'
-- ORDER BY created_at DESC;

-- Full-text search logs by description
-- SELECT * FROM activity_logs
-- WHERE MATCH(description, action) AGAINST('approved volunteer' IN NATURAL LANGUAGE MODE)
-- ORDER BY created_at DESC;

-- Get daily activity count
-- SELECT
--     DATE(created_at) as activity_date,
--     COUNT(*) as total_activities,
--     SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity
-- FROM activity_logs
-- WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- GROUP BY DATE(created_at)
-- ORDER BY activity_date DESC;

-- Get most active users
-- SELECT
--     u.name,
--     al.performed_by_role,
--     COUNT(*) as activity_count
-- FROM activity_logs al
-- LEFT JOIN users u ON al.performed_by_user_id = u.user_id
-- WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- GROUP BY al.performed_by_user_id, u.name, al.performed_by_role
-- ORDER BY activity_count DESC
-- LIMIT 10;

-- Data retention: Delete logs older than 90 days (except HIGH/CRITICAL)
-- DELETE FROM activity_logs
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
-- AND severity NOT IN ('HIGH', 'CRITICAL');
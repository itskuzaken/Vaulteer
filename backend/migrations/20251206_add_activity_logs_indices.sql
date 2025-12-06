-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db

-- Migration: Add indices to activity_logs for better search and query performance

-- Add idx_activity_performed_by if missing
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND INDEX_NAME = 'idx_activity_performed_by');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE activity_logs ADD INDEX idx_activity_performed_by (performed_by_user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add idx_activity_target if missing
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND INDEX_NAME = 'idx_activity_target');
SET @sql := IF(@idx_count = 0, "ALTER TABLE activity_logs ADD INDEX idx_activity_target (target_resource_type, target_resource_id)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add FULLTEXT index for action + description if supported in this DB
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND INDEX_NAME = 'fts_activity_text');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE activity_logs ADD FULLTEXT INDEX fts_activity_text (action, description)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

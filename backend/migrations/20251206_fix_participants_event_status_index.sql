-- Migration: Ensure idx_participants_event_status exists
-- This migration ensures event_participants has the composite index on (event_id, status)
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND INDEX_NAME = 'idx_participants_event_status');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE event_participants ADD INDEX idx_participants_event_status (event_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

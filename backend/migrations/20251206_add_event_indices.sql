-- Migration: Add composite indices for improved event and participant queries
-- Added: idx_participants_event_status, idx_participants_event_regdate, idx_events_status_end, idx_events_status_start, idx_updates_event_type_created

-- Dynamically add event_participants indices if absent
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND INDEX_NAME = 'idx_participants_event_status');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE event_participants ADD INDEX idx_participants_event_status (event_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND INDEX_NAME = 'idx_participants_event_regdate');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE event_participants ADD INDEX idx_participants_event_regdate (event_id, registration_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND INDEX_NAME = 'idx_participants_user_status');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE event_participants ADD INDEX idx_participants_user_status (user_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Dynamically add events indices if absent
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND INDEX_NAME = 'idx_events_status_end');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE events ADD INDEX idx_events_status_end (status, end_datetime)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND INDEX_NAME = 'idx_events_status_start');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE events ADD INDEX idx_events_status_start (status, start_datetime)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Dynamically add event_updates index if absent
SET @idx_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_updates' AND INDEX_NAME = 'idx_updates_event_type_created');
SET @sql := IF(@idx_count = 0, 'ALTER TABLE event_updates ADD INDEX idx_updates_event_type_created (event_id, update_type, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Keep existing indexes intact; the new indexes support scheduler queries and participant counts.

-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- ============================================
-- Migration: Add postponed metadata to events
-- Date: 2025-11-22
-- ============================================

ALTER TABLE events
ADD COLUMN postponed_at DATETIME NULL AFTER archived_by_user_id,
ADD COLUMN postponed_until DATETIME NULL AFTER postponed_at,
ADD COLUMN postponed_reason TEXT NULL AFTER postponed_until,
ADD COLUMN postponed_by_user_id INT NULL AFTER postponed_reason,
ADD COLUMN previous_start_datetime DATETIME NULL AFTER postponed_by_user_id,
ADD COLUMN previous_end_datetime DATETIME NULL AFTER previous_start_datetime,
ADD CONSTRAINT fk_events_postponed_by FOREIGN KEY (postponed_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL;
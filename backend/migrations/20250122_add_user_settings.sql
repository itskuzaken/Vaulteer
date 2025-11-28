-- Active: 1763829170672@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Migration: Add user settings storage
-- Date: 2025-01-22
-- Purpose: Add settings column to user_profiles for storing user preferences (theme, push notifications, etc.)

USE vaulteer_db;

-- Add settings column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN settings JSON DEFAULT NULL COMMENT 'User preferences and settings (theme, notifications, etc.)';

-- Create an index on settings for better query performance
-- Note: MySQL supports indexing on JSON columns using generated columns
-- This is optional but recommended if you frequently query specific settings

-- Example of how settings will be stored:
-- {
--   "theme": "dark" | "light" | "system",
--   "pushNotifications": {
--     "enabled": true,
--     "fcmToken": "token-string"
--   },
--   "emailNotifications": true,
--   "language": "en",
--   "timezone": "UTC"
-- }

-- Initialize settings for existing users (optional - can be done on first access)
-- UPDATE user_profiles
-- SET settings = JSON_OBJECT(
--   'theme', 'system',
--   'pushNotifications', JSON_OBJECT('enabled', false),
--   'emailNotifications', true
-- )
-- WHERE settings IS NULL;

-- Verify the changes
DESCRIBE user_profiles;

-- Show sample data
SELECT
    user_id,
    first_name,
    middle_initial,
    last_name,
    settings,
    created_at
FROM user_profiles
LIMIT 5;

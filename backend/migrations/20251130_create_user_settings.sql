-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Migration: Create user_settings table
-- Date: 2025-11-30
-- Purpose: Store user preferences and settings including push notification tokens

USE vaulteer_db;

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  setting_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  theme ENUM('light', 'dark', 'system') DEFAULT 'system' COMMENT 'UI theme preference',
  push_notifications_enabled BOOLEAN DEFAULT FALSE COMMENT 'Enable push notifications via FCM',
  fcm_token VARCHAR(500) DEFAULT NULL COMMENT 'Firebase Cloud Messaging device token',
  email_notifications_enabled BOOLEAN DEFAULT TRUE COMMENT 'Enable email notifications',
  language VARCHAR(10) DEFAULT 'en' COMMENT 'Preferred language code',
  timezone VARCHAR(50) DEFAULT 'UTC' COMMENT 'User timezone',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  INDEX idx_user_id (user_id),
  INDEX idx_push_enabled (push_notifications_enabled),
  INDEX idx_fcm_token (fcm_token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User preferences and notification settings';

-- Initialize default settings for existing users (optional)
-- Uncomment if you want to create settings for all existing users
-- INSERT INTO user_settings (user_id, theme, push_notifications_enabled, email_notifications_enabled)
-- SELECT user_id, 'system', FALSE, TRUE
-- FROM users
-- WHERE user_id NOT IN (SELECT user_id FROM user_settings);

-- Verify the table structure
DESCRIBE user_settings;

-- Show sample data (will be empty initially)
SELECT * FROM user_settings LIMIT 5;

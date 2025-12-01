-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Migration: Initialize Complete Notification System
-- Date: 2025-12-01
-- Purpose: Ensure all notification tables and settings are properly initialized

USE vaulteer_db;

-- =====================================================
-- STEP 1: Verify notifications table exists
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'alert', 'success', 'warning', 'message', 'task', 'system') NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url VARCHAR(500) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP DEFAULT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STEP 2: Verify user_settings table exists
-- =====================================================
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
  INDEX idx_fcm_token (fcm_token(255)),
  INDEX idx_email_enabled (email_notifications_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User preferences and notification settings';

-- =====================================================
-- STEP 3: Initialize default settings for existing users
-- =====================================================
-- This creates user_settings entries for any users who don't have them yet
INSERT IGNORE INTO user_settings (user_id, theme, push_notifications_enabled, email_notifications_enabled, language, timezone)
SELECT 
  user_id, 
  'system', 
  FALSE, 
  TRUE, 
  'en', 
  'UTC'
FROM users
WHERE status = 'active'
  AND user_id NOT IN (SELECT user_id FROM user_settings);

-- =====================================================
-- STEP 4: Verification Queries
-- =====================================================

-- Check notifications table structure
SELECT 
  'notifications' AS table_name,
  COUNT(*) AS total_notifications,
  SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread_notifications,
  COUNT(DISTINCT user_id) AS users_with_notifications
FROM notifications;

-- Check user_settings table structure
SELECT 
  'user_settings' AS table_name,
  COUNT(*) AS total_settings,
  SUM(CASE WHEN push_notifications_enabled = 1 THEN 1 ELSE 0 END) AS users_with_push_enabled,
  SUM(CASE WHEN email_notifications_enabled = 1 THEN 1 ELSE 0 END) AS users_with_email_enabled,
  SUM(CASE WHEN fcm_token IS NOT NULL THEN 1 ELSE 0 END) AS users_with_fcm_token
FROM user_settings;

-- Show users without settings
SELECT 
  COUNT(*) AS users_without_settings
FROM users u
WHERE u.status = 'active'
  AND u.user_id NOT IN (SELECT user_id FROM user_settings);

-- Show sample user settings
SELECT 
  us.user_id,
  u.name,
  u.email,
  us.push_notifications_enabled,
  us.email_notifications_enabled,
  CASE WHEN us.fcm_token IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_fcm_token,
  us.created_at
FROM user_settings us
JOIN users u ON us.user_id = u.user_id
WHERE u.status = 'active'
ORDER BY us.created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 6: Success Summary
-- =====================================================
SELECT '✅ Notification system initialized successfully!' AS status;
SELECT 
  CONCAT('Total notifications: ', COUNT(*)) AS info
FROM notifications
UNION ALL
SELECT 
  CONCAT('Total user settings: ', COUNT(*)) AS info
FROM user_settings
UNION ALL
SELECT 
  CONCAT('Users with push enabled: ', SUM(CASE WHEN push_notifications_enabled = 1 THEN 1 ELSE 0 END)) AS info
FROM user_settings
UNION ALL
SELECT 
  CONCAT('Users with email enabled: ', SUM(CASE WHEN email_notifications_enabled = 1 THEN 1 ELSE 0 END)) AS info
FROM user_settings;

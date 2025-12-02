-- Test Script: Verify User Settings Database Integration
-- Run this in your MySQL client to verify the setup

-- 1. Check if user_settings table exists
SHOW TABLES LIKE 'user_settings';

-- 2. View table structure
DESCRIBE user_settings;

-- 3. Check indexes
SHOW INDEXES FROM user_settings;

-- 4. View all user settings (limit 10 for safety)
SELECT 
    us.setting_id,
    us.user_id,
    u.email,
    u.name,
    us.theme,
    us.push_notifications_enabled,
    us.email_notifications_enabled,
    us.language,
    us.timezone,
    us.created_at,
    us.updated_at
FROM user_settings us
LEFT JOIN users u ON us.user_id = u.user_id
ORDER BY us.updated_at DESC
LIMIT 10;

-- 5. Count users with settings
SELECT COUNT(*) as users_with_settings FROM user_settings;

-- 6. Count users with push notifications enabled
SELECT COUNT(*) as push_enabled FROM user_settings WHERE push_notifications_enabled = 1;

-- 7. Count users by theme preference
SELECT 
    theme,
    COUNT(*) as count
FROM user_settings
GROUP BY theme;

-- 8. Count users by language
SELECT 
    language,
    COUNT(*) as count
FROM user_settings
GROUP BY language
ORDER BY count DESC;

-- 9. Find users without settings (users table exists but no settings record)
SELECT 
    u.user_id,
    u.email,
    u.name,
    u.role
FROM users u
LEFT JOIN user_settings us ON u.user_id = us.user_id
WHERE us.setting_id IS NULL
LIMIT 10;

-- 10. Sample query to manually create default settings for a user
-- Replace USER_ID_HERE with actual user_id
/*
INSERT INTO user_settings 
    (user_id, theme, push_notifications_enabled, email_notifications_enabled, language, timezone)
VALUES 
    (USER_ID_HERE, 'system', 0, 1, 'en', 'UTC');
*/

-- 11. Sample query to update settings for a user
-- Replace USER_ID_HERE with actual user_id
/*
UPDATE user_settings 
SET 
    theme = 'dark',
    language = 'es',
    timezone = 'America/New_York'
WHERE user_id = USER_ID_HERE;
*/

-- 12. Verify foreign key constraint
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'user_settings'
    AND TABLE_SCHEMA = 'vaulteer_db'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

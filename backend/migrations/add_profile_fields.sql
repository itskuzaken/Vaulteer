-- Migration: Add profile fields to users table
-- Date: 2025-10-27

USE vaulteer_db;

-- Add profile_picture column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255) DEFAULT NULL COMMENT 'URL or path to user profile picture';

-- Add phone column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL COMMENT 'User phone number';

-- Add address column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL COMMENT 'User address';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Verify the changes
DESCRIBE users;

-- Show sample data
SELECT
    user_id,
    name,
    email,
    phone,
    address,
    profile_picture,
    status
FROM users
LIMIT 5;
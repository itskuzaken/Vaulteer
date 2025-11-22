ALTER TABLE users
ADD COLUMN last_login_at DATETIME NULL DEFAULT NULL AFTER date_added,
ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE users
SET
    last_login_at = IFNULL(last_login_at, date_added),
    updated_at = IFNULL(updated_at, NOW());
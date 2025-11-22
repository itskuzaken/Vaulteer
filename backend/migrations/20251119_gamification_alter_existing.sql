-- -----------------------------------------------------
-- 2025-11-19: Gamification upgrades for existing tables
-- -----------------------------------------------------
SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS, UNIQUE_CHECKS = 0;

SET
    @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS,
    FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- Add badge_code column when missing
SELECT COUNT(*) INTO @col_missing
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'achievements'
    AND COLUMN_NAME = 'badge_code';

SET
    @alter_sql := IF(
        @col_missing = 0,
        'ALTER TABLE `achievements` ADD COLUMN `badge_code` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `achievement_id`;',
        'SET @noop := 0;'
    );

PREPARE alter_stmt FROM @alter_sql;

EXECUTE alter_stmt;

DEALLOCATE PREPARE alter_stmt;

-- threshold_type
SELECT COUNT(*) INTO @col_missing
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'achievements'
    AND COLUMN_NAME = 'threshold_type';

SET
    @alter_sql := IF(
        @col_missing = 0,
        'ALTER TABLE `achievements` ADD COLUMN `threshold_type` ENUM(''POINTS'',''EVENT_REGISTER'',''EVENT_ATTEND'',''EVENT_HOST'',''STREAK_DAYS'',''CUSTOM'') COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `achievement_points`;',
        'SET @noop := 0;'
    );

PREPARE alter_stmt FROM @alter_sql;

EXECUTE alter_stmt;

DEALLOCATE PREPARE alter_stmt;

-- threshold_value
SELECT COUNT(*) INTO @col_missing
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'achievements'
    AND COLUMN_NAME = 'threshold_value';

SET
    @alter_sql := IF(
        @col_missing = 0,
        'ALTER TABLE `achievements` ADD COLUMN `threshold_value` INT DEFAULT NULL AFTER `threshold_type`;',
        'SET @noop := 0;'
    );

PREPARE alter_stmt FROM @alter_sql;

EXECUTE alter_stmt;

DEALLOCATE PREPARE alter_stmt;

-- is_active
SELECT COUNT(*) INTO @col_missing
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'achievements'
    AND COLUMN_NAME = 'is_active';

SET
    @alter_sql := IF(
        @col_missing = 0,
        'ALTER TABLE `achievements` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `threshold_value`;',
        'SET @noop := 0;'
    );

PREPARE alter_stmt FROM @alter_sql;

EXECUTE alter_stmt;

DEALLOCATE PREPARE alter_stmt;

-- display_order
SELECT COUNT(*) INTO @col_missing
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'achievements'
    AND COLUMN_NAME = 'display_order';

SET
    @alter_sql := IF(
        @col_missing = 0,
        'ALTER TABLE `achievements` ADD COLUMN `display_order` INT DEFAULT 0 AFTER `is_active`;',
        'SET @noop := 0;'
    );

PREPARE alter_stmt FROM @alter_sql;

EXECUTE alter_stmt;

DEALLOCATE PREPARE alter_stmt;

SET
    @needs_badge_idx = (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE
            TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'achievements'
            AND INDEX_NAME = 'uniq_badge_code'
    );

SET
    @badge_idx_stmt = IF(
        @needs_badge_idx = 0,
        'ALTER TABLE `achievements` ADD UNIQUE KEY `uniq_badge_code` (`badge_code`);',
        'DO 0;'
    );

PREPARE badge_stmt FROM @badge_idx_stmt;

EXECUTE badge_stmt;

DEALLOCATE PREPARE badge_stmt;

DROP VIEW IF EXISTS `view_user_badges`;

CREATE VIEW `view_user_badges` AS
SELECT ua.user_achievement_id, ua.user_id, a.badge_code, a.achievement_name, a.achievement_description, a.achievement_icon, a.achievement_category, a.achievement_points, a.threshold_type, a.threshold_value, ua.earned_date, ua.created_at
FROM
    user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.achievement_id;

INSERT INTO
    `achievements` (
        `badge_code`,
        `achievement_name`,
        `achievement_description`,
        `achievement_icon`,
        `achievement_category`,
        `achievement_points`,
        `threshold_type`,
        `threshold_value`,
        `display_order`
    )
VALUES (
        'FIRST_ATTENDANCE',
        'First Steps',
        'Attend your first event to start earning badges.',
        '🥉',
        'engagement',
        20,
        'EVENT_ATTEND',
        1,
        10
    ),
    (
        'FIVE_EVENTS',
        'Steady Hands',
        'Attend five events to prove your reliability.',
        '🥈',
        'engagement',
        35,
        'EVENT_ATTEND',
        5,
        20
    ),
    (
        'TEN_EVENTS',
        'Community Pillar',
        'Attend ten events and become a dependable volunteer.',
        '🥇',
        'engagement',
        50,
        'EVENT_ATTEND',
        10,
        30
    ),
    (
        'HUNDRED_POINTS',
        'Momentum Starter',
        'Earn 100 lifetime points across any activity.',
        '⚡',
        'points',
        40,
        'POINTS',
        100,
        40
    ),
    (
        'STREAK_SEVEN',
        'Weeklong Warrior',
        'Maintain a 7-day rolling streak of point-earning actions.',
        '🔥',
        'streak',
        60,
        'STREAK_DAYS',
        7,
        50
    )
ON DUPLICATE KEY UPDATE
    achievement_name = VALUES(achievement_name),
    achievement_description = VALUES(achievement_description),
    achievement_icon = VALUES(achievement_icon),
    achievement_category = VALUES(achievement_category),
    achievement_points = VALUES(achievement_points),
    threshold_type = VALUES(threshold_type),
    threshold_value = VALUES(threshold_value),
    display_order = VALUES(display_order),
    is_active = 1;

COMMIT;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
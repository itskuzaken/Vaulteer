-- -----------------------------------------------------
-- 2025-11-19: Gamification base schema + seed badges
-- -----------------------------------------------------
SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS, UNIQUE_CHECKS = 0;

SET
    @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS,
    FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `user_gamification_stats` (
    `user_id` INT NOT NULL,
    `total_points` INT NOT NULL DEFAULT 0,
    `lifetime_points` INT NOT NULL DEFAULT 0,
    `current_level` INT NOT NULL DEFAULT 1,
    `current_streak` INT NOT NULL DEFAULT 0,
    `longest_streak` INT NOT NULL DEFAULT 0,
    `last_rewarded_at` TIMESTAMP NULL DEFAULT NULL,
    `last_streak_event` TIMESTAMP NULL DEFAULT NULL,
    `events_registered` INT NOT NULL DEFAULT 0,
    `events_attended` INT NOT NULL DEFAULT 0,
    `events_hosted` INT NOT NULL DEFAULT 0,
    `badges_earned` INT NOT NULL DEFAULT 0,
    `last_badge_awarded_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_user_gamification_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_events` (
    `gamification_event_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `event_id` INT DEFAULT NULL,
    `action` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
    `points_delta` INT NOT NULL DEFAULT 0,
    `metadata` JSON DEFAULT NULL,
    `dedupe_key` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`gamification_event_id`),
    UNIQUE KEY `uniq_gamification_dedupe` (`dedupe_key`),
    KEY `idx_gamification_user` (`user_id`),
    KEY `idx_gamification_action` (`action`),
    KEY `idx_gamification_event` (`event_id`),
    KEY `idx_gamification_created_at` (`created_at`),
    CONSTRAINT `fk_gamification_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gamification_events_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

COMMIT;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
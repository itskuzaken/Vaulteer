-- Migration: Create posts table for News & Updates and Announcements
-- Date: 2025-11-30

CREATE TABLE IF NOT EXISTS posts (
  post_id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  post_type ENUM('news_update', 'announcement') NOT NULL,
  status ENUM('draft', 'published', 'scheduled', 'archived') DEFAULT 'draft',
  author_id INT NOT NULL,
  attachments JSON DEFAULT NULL COMMENT 'Array of attachment objects with filename, url, size for news_update posts only',
  publish_at DATETIME DEFAULT NULL COMMENT 'Timestamp when post was published',
  scheduled_for DATETIME DEFAULT NULL COMMENT 'Timestamp for scheduled publishing',
  archived_at DATETIME DEFAULT NULL COMMENT 'Timestamp when post was archived',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_post_type (post_type),
  INDEX idx_status (status),
  INDEX idx_author (author_id),
  INDEX idx_scheduled (scheduled_for),
  INDEX idx_publish_at (publish_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample posts for testing
INSERT INTO posts (uid, title, content, post_type, status, author_id, publish_at) VALUES
(UUID(), 'Welcome to RedVault News', '<h2>Welcome to our new news and updates section!</h2><p>We are excited to share important updates, stories, and announcements with our community.</p>', 'news_update', 'published', 1, NOW()),
(UUID(), 'Important: System Maintenance Scheduled', '<p>Our systems will undergo scheduled maintenance on <strong>December 5th, 2025</strong> from 2:00 AM to 4:00 AM EST.</p><p>During this time, the platform may be temporarily unavailable. We appreciate your patience.</p>', 'announcement', 'published', 1, NOW()),
(UUID(), 'Community Impact Report - Q4 2025', '<h3>Quarterly Highlights</h3><ul><li>500+ volunteer hours logged</li><li>15 community events completed</li><li>200+ people served</li></ul><p>Thank you to all our dedicated volunteers!</p>', 'news_update', 'draft', 1, NULL);

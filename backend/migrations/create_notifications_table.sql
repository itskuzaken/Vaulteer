-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM(
        'info',
        'alert',
        'success',
        'warning',
        'message',
        'task',
        'system'
    ) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(500) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_user_unread (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Add some sample notifications for testing
-- Note: Replace user_id with actual user IDs from your users table
-- INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
-- (1, 'Welcome to Vaulteer!', 'Thank you for joining our volunteer management system.', 'info', FALSE),
-- (1, 'New Task Assigned', 'You have been assigned to help with the community cleanup event.', 'task', FALSE),
-- (1, 'Application Approved', 'Your volunteer application has been approved. Welcome aboard!', 'success', TRUE);
-- Create application_settings table
CREATE TABLE IF NOT EXISTS application_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  is_open BOOLEAN DEFAULT FALSE NOT NULL,
  deadline DATETIME NULL,
  opened_at DATETIME NULL,
  opened_by VARCHAR(255) NULL,
  closed_at DATETIME NULL,
  closed_by VARCHAR(255) NULL,
  auto_closed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_open_deadline (is_open, deadline),
  INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default row (applications closed by default)
INSERT INTO application_settings (is_open, created_at, updated_at) 
VALUES (FALSE, NOW(), NOW());

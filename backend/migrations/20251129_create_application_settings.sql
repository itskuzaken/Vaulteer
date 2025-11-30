-- Migration: Create application_settings table
-- Date: 2025-11-29
-- Purpose: Manage volunteer application open/close status with deadline functionality

CREATE TABLE IF NOT EXISTS application_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  is_open BOOLEAN DEFAULT false,
  deadline DATETIME NULL,
  opened_at DATETIME NULL,
  opened_by VARCHAR(255) NULL,
  closed_at DATETIME NULL,
  closed_by VARCHAR(255) NULL,
  auto_closed BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default row (applications closed by default)
INSERT INTO application_settings (is_open) VALUES (false);

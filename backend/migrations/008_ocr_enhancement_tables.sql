-- OCR Field Mapping Enhancement Migration
-- Creates tables for tracking unmapped keys, processing logs, and user feedback

-- Create OCR unmapped keys tracking table
CREATE TABLE IF NOT EXISTS ocr_unmapped_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  original_key VARCHAR(500) NOT NULL,
  normalized_key VARCHAR(500) NOT NULL,
  extracted_value TEXT,
  confidence_score DECIMAL(5,2),
  page_type ENUM('front', 'back', 'unknown') DEFAULT 'unknown',
  context_info JSON,
  frequency_count INT DEFAULT 1,
  suggested_mapping VARCHAR(100),
  mapping_status ENUM('unmapped', 'suggested', 'approved', 'ignored') DEFAULT 'unmapped',
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_original_key (original_key(255)),
  INDEX idx_normalized_key (normalized_key(255)),
  INDEX idx_mapping_status (mapping_status),
  INDEX idx_frequency (frequency_count DESC),
  INDEX idx_page_type (page_type),
  INDEX idx_last_seen (last_seen DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OCR processing logs table
CREATE TABLE IF NOT EXISTS ocr_processing_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) NOT NULL,
  total_fields INT DEFAULT 0,
  mapped_fields INT DEFAULT 0,
  unmapped_fields INT DEFAULT 0,
  overall_confidence DECIMAL(5,2),
  processing_time_ms INT,
  extraction_method VARCHAR(50),
  page_type ENUM('front', 'back') NOT NULL,
  mapping_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_fields > 0 THEN (mapped_fields / total_fields * 100)
      ELSE 0 
    END
  ) STORED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_extraction_method (extraction_method),
  INDEX idx_mapping_rate (mapping_rate DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OCR user feedback table
CREATE TABLE IF NOT EXISTS ocr_user_feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  original_value TEXT,
  corrected_value TEXT,
  feedback_type ENUM('correction', 'confirmation', 'flag_error') NOT NULL,
  user_id INT,
  confidence_before DECIMAL(5,2),
  original_key VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_field_name (field_name),
  INDEX idx_feedback_type (feedback_type),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint for user_id in ocr_user_feedback table
ALTER TABLE ocr_user_feedback 
ADD CONSTRAINT fk_ocr_feedback_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) 
ON DELETE SET NULL;

-- Insert initial tracking data if tables are empty
INSERT IGNORE INTO ocr_processing_logs (session_id, total_fields, mapped_fields, unmapped_fields, overall_confidence, extraction_method, page_type)
VALUES 
('initial_baseline', 97, 68, 29, 75.50, 'forms+layout', 'front'),
('initial_baseline', 97, 68, 29, 75.50, 'forms+layout', 'back');
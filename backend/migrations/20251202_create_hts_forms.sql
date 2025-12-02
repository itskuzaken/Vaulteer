-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Create HTS Forms table for managing encrypted form submissions
CREATE TABLE IF NOT EXISTS hts_forms (
  form_id INT PRIMARY KEY AUTO_INCREMENT,
  control_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT NOT NULL,
  front_image_iv VARCHAR(255) NOT NULL,
  back_image_iv VARCHAR(255) NOT NULL,
  encryption_key TEXT NOT NULL,
  test_result ENUM('reactive', 'non-reactive') NOT NULL,
  status ENUM('pending', 'processing', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_test_result (test_result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

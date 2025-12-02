-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Migration: Encrypt extracted_data field
-- Date: 2025-12-03
-- Description: Add columns for encrypted extracted_data and its IV, rename old column

-- Add new columns for encrypted data
ALTER TABLE hts_forms 
ADD COLUMN extracted_data_encrypted TEXT NULL AFTER extracted_data,
ADD COLUMN extracted_data_iv VARCHAR(500) NULL AFTER extracted_data_encrypted;

-- Update comment to mark old column as deprecated
ALTER TABLE hts_forms 
MODIFY COLUMN extracted_data JSON NULL COMMENT 'DEPRECATED - Use extracted_data_encrypted instead';

-- Note: We keep the old column to support existing records during transition
-- Old records will have extracted_data (plaintext JSON)
-- New records will have extracted_data_encrypted + extracted_data_iv

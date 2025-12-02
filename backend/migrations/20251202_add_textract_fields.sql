-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Add columns for OCR/Textract data
ALTER TABLE hts_forms 
ADD COLUMN extracted_data JSON NULL COMMENT 'Parsed data from AWS Textract OCR';

ALTER TABLE hts_forms 
ADD COLUMN extraction_confidence DECIMAL(5,2) NULL COMMENT 'Average confidence score (0-100)';

ALTER TABLE hts_forms 
ADD COLUMN extracted_at TIMESTAMP NULL COMMENT 'When OCR extraction completed';

ALTER TABLE hts_forms 
ADD COLUMN ocr_status ENUM('pending', 'processing', 'completed', 'failed') 
DEFAULT 'pending' COMMENT 'Status of OCR processing';

-- Add index for filtering by OCR status
CREATE INDEX idx_ocr_status ON hts_forms(ocr_status);

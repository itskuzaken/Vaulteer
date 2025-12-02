-- Migration to update HTS forms table for OCR-first workflow with S3 storage
-- This migration converts from base64 TEXT storage to S3 key references
-- and updates OCR fields for pre-submission extraction workflow

-- Step 1: Add new S3 key columns
ALTER TABLE hts_forms 
ADD COLUMN front_image_s3_key VARCHAR(500) NULL COMMENT 'S3 object key for encrypted front image';

ALTER TABLE hts_forms 
ADD COLUMN back_image_s3_key VARCHAR(500) NULL COMMENT 'S3 object key for encrypted back image';

-- Step 2: Update extracted_data to be NOT NULL (OCR always runs before submission)
ALTER TABLE hts_forms 
MODIFY COLUMN extracted_data JSON NOT NULL COMMENT 'Pre-extracted OCR data from submission';

-- Step 3: Update extraction_confidence to be NOT NULL 
ALTER TABLE hts_forms 
MODIFY COLUMN extraction_confidence DECIMAL(5,2) NOT NULL COMMENT 'OCR confidence score from pre-submission analysis';

-- Step 4: Rename extracted_at to ocr_completed_at for clarity
ALTER TABLE hts_forms 
CHANGE COLUMN extracted_at ocr_completed_at TIMESTAMP NULL COMMENT 'When pre-submission OCR analysis completed';

-- Step 5: Drop ocr_status column (no longer needed - OCR always completes before submission)
ALTER TABLE hts_forms 
DROP INDEX idx_ocr_status;

ALTER TABLE hts_forms 
DROP COLUMN ocr_status;

-- Step 6: Add indexes for S3 keys (for faster lookups during admin review)
CREATE INDEX idx_front_image_s3_key ON hts_forms(front_image_s3_key);
CREATE INDEX idx_back_image_s3_key ON hts_forms(back_image_s3_key);

-- Step 7: Migrate existing base64 data to S3 (if any records exist)
-- Note: This requires application-level migration script to:
-- 1. Decrypt base64 images using stored encryption keys
-- 2. Upload to S3 with SSE-S3
-- 3. Update S3 key columns
-- 4. Set front_image_url and back_image_url to NULL
-- Manual intervention required for existing data!

-- Step 8: Update old columns to allow NULL (for backward compatibility during migration)
ALTER TABLE hts_forms 
MODIFY COLUMN front_image_url TEXT NULL COMMENT 'Deprecated: use front_image_s3_key instead';

ALTER TABLE hts_forms 
MODIFY COLUMN back_image_url TEXT NULL COMMENT 'Deprecated: use back_image_s3_key instead';

-- Step 9: Add check constraint to ensure either base64 OR S3 keys exist (not both, not neither)
-- Note: MySQL 8.0.16+ supports CHECK constraints
ALTER TABLE hts_forms 
ADD CONSTRAINT chk_image_storage 
CHECK (
  (front_image_url IS NOT NULL AND back_image_url IS NOT NULL AND front_image_s3_key IS NULL AND back_image_s3_key IS NULL)
  OR
  (front_image_s3_key IS NOT NULL AND back_image_s3_key IS NOT NULL AND front_image_url IS NULL AND back_image_url IS NULL)
);

-- Step 10: After full migration to S3, the old columns can be dropped:
-- ALTER TABLE hts_forms DROP COLUMN front_image_url;
-- ALTER TABLE hts_forms DROP COLUMN back_image_url;
-- ALTER TABLE hts_forms DROP COLUMN front_image_iv;
-- ALTER TABLE hts_forms DROP COLUMN back_image_iv;
-- (Encryption IVs stored in S3 metadata, not needed in database)


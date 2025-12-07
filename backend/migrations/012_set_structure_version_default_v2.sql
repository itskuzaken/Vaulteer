-- Migration: Set default structure_version to v2 (nested) and update existing records
-- Date: 2025-12-07
-- Description: Change default value of structure_version to 'v2' and update existing rows to v2 if not set

-- Modify the column default to v2
ALTER TABLE hts_forms
  MODIFY COLUMN structure_version VARCHAR(10) DEFAULT 'v2' COMMENT 'Field structure version (v1=flat, v2=nested)';

-- Update existing rows to v2 if null or set to v1
UPDATE hts_forms
  SET structure_version = 'v2'
  WHERE structure_version IS NULL OR structure_version = 'v1';

-- Migration marker
INSERT INTO schema_migrations (version, description, applied_at)
  VALUES (12, 'Set structure_version default to v2 and update existing rows', NOW())
  ON DUPLICATE KEY UPDATE applied_at = NOW();

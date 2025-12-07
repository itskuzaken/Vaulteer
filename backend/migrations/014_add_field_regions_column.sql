-- Migration 014: Add field_regions column to hts_forms table
-- Purpose: Store bounding box coordinates for all extracted fields (composite, conditional, and base fields)
-- Format: JSON array with region objects containing x, y, width, height, page
-- Use case: Visual debugging, correction UI, field validation, audit trail

-- Ensure the schema_migrations table exists so this script can record the migration
CREATE TABLE IF NOT EXISTS schema_migrations (
	version INT PRIMARY KEY,
	description VARCHAR(255),
	applied_at DATETIME
);

-- Add field_regions column to store coordinate data for all fields (idempotent)
ALTER TABLE hts_forms 
ADD COLUMN field_regions JSON DEFAULT NULL COMMENT 'Bounding box coordinates for all extracted fields (supports visual debugging and correction UI)';

-- Add VIRTUAL generated column to indicate existence of field_regions (for indexing)
-- Drop index if exists to prevent duplicate index errors

-- If the index exists, remove it first (will be treated as non-fatal by migrate.js)
DROP INDEX idx_field_regions_exists ON hts_forms;
ALTER TABLE hts_forms 
	ADD COLUMN field_regions_exists TINYINT(1) GENERATED ALWAYS AS (CASE WHEN field_regions IS NOT NULL THEN 1 ELSE 0 END) VIRTUAL;
CREATE INDEX idx_field_regions_exists ON hts_forms (field_regions_exists);

INSERT INTO schema_migrations (version, description, applied_at) 
VALUES (14, 'Add field_regions JSON column for coordinate preservation', NOW()) 
ON DUPLICATE KEY UPDATE applied_at = NOW();

-- SAMPLE DATA STRUCTURE:
-- field_regions format:
-- {
--   "fullName": {
--     "region": { "x": 0.123, "y": 0.456, "width": 0.234, "height": 0.012, "page": 1 },
--     "components": {
--       "firstName": { "region": { "x": 0.123, "y": 0.456, "width": 0.078, "height": 0.012, "page": 1 } },
--       "lastName": { "region": { "x": 0.201, "y": 0.456, "width": 0.156, "height": 0.012, "page": 1 } }
--     }
--   },
--   "riskSexMale": {
--     "region": { "x": 0.100, "y": 0.500, "width": 0.050, "height": 0.020, "page": 2 },
--     "components": {
--       "yes": {
--         "total": { "region": { "x": 0.200, "y": 0.500, "width": 0.030, "height": 0.015, "page": 2 } },
--         "firstDate": { "region": { "x": 0.250, "y": 0.500, "width": 0.080, "height": 0.015, "page": 2 } }
--       }
--     }
--   }
-- }

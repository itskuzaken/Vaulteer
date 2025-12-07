-- Active: 1758876153427@@vaulteer-db.c7csay8a2c32.ap-southeast-2.rds.amazonaws.com@3306@vaulteer_db
-- Migration: Add nested field support for HTS forms
-- Date: 2025-12-06
-- Description: Adds JSON columns for storing composite and nested field structures

-- Add columns for nested field data (storing checkbox groups, conditional fields, composite structures)
ALTER TABLE hts_forms 
ADD COLUMN extracted_data_structured JSON COMMENT 'Structured nested field data with checkbox groups and conditional fields',
ADD COLUMN field_components JSON COMMENT 'Component mappings for composite fields (e.g., fullName components, address parts)',
ADD COLUMN checkbox_states JSON COMMENT 'Raw checkbox states (SELECTED/NOT_SELECTED) for all checkbox groups',
ADD COLUMN structure_version VARCHAR(10) DEFAULT 'v2' COMMENT 'Field structure version (v1=flat, v2=nested)';

-- Note: JSON functional indexes will be added in a separate statement to avoid syntax errors
-- These help with queries like: WHERE extracted_data_structured->>'$.fullName.value' = 'John Doe'

-- Example query to extract nested data:
-- SELECT 
--   id,
--   JSON_EXTRACT(extracted_data_structured, '$.fullName.value') as full_name,
--   JSON_EXTRACT(extracted_data_structured, '$.fullName.components.firstName') as first_name,
--   JSON_EXTRACT(extracted_data_structured, '$.sex.components') as sex_checkboxes,
--   JSON_EXTRACT(extracted_data_structured, '$.riskSexMale.components') as risk_sex_male_data
-- FROM hts_forms
-- WHERE structure_version = 'v2';

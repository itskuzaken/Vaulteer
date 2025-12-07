ALTER TABLE hts_forms MODIFY COLUMN structure_version VARCHAR(10) DEFAULT 'v2' COMMENT 'Field structure version (v1=flat, v2=nested)';

UPDATE hts_forms SET structure_version = 'v2' WHERE structure_version IS NULL OR structure_version = 'v1';

INSERT INTO schema_migrations (version, description, applied_at) VALUES (13, 'Enforce structure_version default v2 and migrate existing rows', NOW()) ON DUPLICATE KEY UPDATE applied_at = NOW();

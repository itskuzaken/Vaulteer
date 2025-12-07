-- Migration 000: Create schema_migrations table (if not exists)
-- Purpose: Manage applied migrations and avoid missing-table errors
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT PRIMARY KEY,
  description VARCHAR(255),
  applied_at DATETIME
);

-- Record this migration as applied
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (0, 'Create schema_migrations table', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();

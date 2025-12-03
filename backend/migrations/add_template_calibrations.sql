-- Migration: Add template calibrations table
-- Description: Store template calibration history and versions
-- Date: 2025-12-03
-- Database: SQL Server

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'template_calibrations')
BEGIN
    CREATE TABLE template_calibrations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        template_id VARCHAR(100) NOT NULL,
        version VARCHAR(20) NOT NULL,
        calibration_count INT DEFAULT 0,
        template_data NVARCHAR(MAX) NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        last_updated DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_template_calibrations_template_version UNIQUE(template_id, version)
    );

    CREATE INDEX idx_template_calibrations_template_id ON template_calibrations(template_id);
    CREATE INDEX idx_template_calibrations_version ON template_calibrations(version);
    CREATE INDEX idx_template_calibrations_last_updated ON template_calibrations(last_updated DESC);

    -- Add extended properties (SQL Server equivalent of comments)
    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'Stores OCR template calibration history with auto-learned coordinate adjustments',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'template_calibrations';

    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'Unique identifier for the form template (e.g., doh-hts-2021-v2)',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'template_calibrations',
        @level2type = N'COLUMN', @level2name = 'template_id';

    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'Template version in semver format (e.g., 1.0.0)',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'template_calibrations',
        @level2type = N'COLUMN', @level2name = 'version';

    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'Number of auto-calibrations applied to this version',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'template_calibrations',
        @level2type = N'COLUMN', @level2name = 'calibration_count';

    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'Complete template metadata with calibrated coordinates (JSON)',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'template_calibrations',
        @level2type = N'COLUMN', @level2name = 'template_data';
END;

-- Insert initial record for current template
IF NOT EXISTS (SELECT 1 FROM template_calibrations WHERE template_id = 'doh-hts-2021-v2' AND version = '1.0.0')
BEGIN
    INSERT INTO template_calibrations (template_id, version, calibration_count, template_data)
    VALUES ('doh-hts-2021-v2', '1.0.0', 0, '{}');
END;

GO

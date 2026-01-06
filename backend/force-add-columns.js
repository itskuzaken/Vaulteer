const { initPool } = require('./db/pool');

async function addColumns() {
  try {
    const pool = await initPool();
    
    console.log('Adding analytics columns...\n');
    
    // Execute ALTER TABLE statement
    const alterSQL = `ALTER TABLE event_reports 
      ADD COLUMN age_distribution JSON DEFAULT NULL COMMENT 'Age range breakdown',
      ADD COLUMN gender_distribution JSON DEFAULT NULL COMMENT 'Gender breakdown',
      ADD COLUMN location_distribution JSON DEFAULT NULL COMMENT 'Location breakdown',
      ADD COLUMN role_distribution JSON DEFAULT NULL COMMENT 'Role breakdown',
      ADD COLUMN event_start_datetime DATETIME DEFAULT NULL,
      ADD COLUMN event_end_datetime DATETIME DEFAULT NULL,
      ADD COLUMN first_checkin_time DATETIME DEFAULT NULL,
      ADD COLUMN last_checkin_time DATETIME DEFAULT NULL,
      ADD COLUMN on_time_checkins INT DEFAULT 0,
      ADD COLUMN late_checkins INT DEFAULT 0,
      ADD COLUMN avg_checkin_minutes_from_start DECIMAL(8,2) DEFAULT NULL,
      ADD COLUMN feedback_count INT DEFAULT 0,
      ADD COLUMN avg_rating DECIMAL(3,2) DEFAULT NULL,
      ADD COLUMN total_points_awarded INT DEFAULT 0,
      ADD COLUMN badges_earned_count INT DEFAULT 0,
      ADD COLUMN waitlisted_count INT DEFAULT 0,
      ADD COLUMN cancelled_count INT DEFAULT 0,
      ADD COLUMN no_show_count INT DEFAULT 0,
      ADD COLUMN pdf_s3_key VARCHAR(512) DEFAULT NULL,
      ADD COLUMN pdf_generated_at DATETIME DEFAULT NULL,
      ADD COLUMN is_auto_generated TINYINT(1) DEFAULT 0,
      ADD COLUMN report_version VARCHAR(10) DEFAULT 'v1.0',
      ADD COLUMN last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;
    
    await pool.query(alterSQL);
    console.log('✅ ALTER TABLE executed\n');
    
    // Verify
    const [cols] = await pool.query('DESCRIBE event_reports');
    console.log(`Total columns: ${cols.length}`);
    console.log('Columns:', cols.map(c => c.Field).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addColumns();

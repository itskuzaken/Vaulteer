const { initPool } = require('./db/pool');
const fs = require('fs');

async function createTable() {
  try {
    const pool = await initPool();
    
    // Read and execute the CREATE TABLE statement
    const sql = fs.readFileSync('./migrations/20260106_create_event_reports_table.sql', 'utf8');
    
    console.log('Executing SQL...');
    const [result] = await pool.query(sql);
    console.log('✅ Table created successfully');
    console.log('Result:', result);
    
    // Verify table exists
    const [tables] = await pool.query('SHOW TABLES LIKE "event_reports"');
    console.log('\nVerification:', tables.length > 0 ? '✅ Table EXISTS' : '❌ Table NOT found');
    
    if (tables.length > 0) {
      const [cols] = await pool.query('DESCRIBE event_reports');
      console.log(`\nColumns (${cols.length}):`, cols.map(c => c.Field).join(', '));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTable();

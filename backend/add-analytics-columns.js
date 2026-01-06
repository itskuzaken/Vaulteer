const { initPool } = require('./db/pool');

async function checkColumns() {
  try {
    const pool = await initPool();
    
    // Verify columns
    const [cols] = await pool.query('DESCRIBE event_reports');
    console.log(`✅ Total columns: ${cols.length}\n`);
    
    // Show all columns
    console.log('All columns:');
    cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    
    // Check event_feedback table
    const [feedbackTables] = await pool.query('SHOW TABLES LIKE "event_feedback"');
    console.log(`\n✅ event_feedback table: ${feedbackTables.length > 0 ? 'EXISTS' : 'NOT found'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkColumns();

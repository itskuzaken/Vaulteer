const { initPool } = require('./db/pool');

async function checkSchema() {
  try {
    const pool = await initPool();
    
    const [cols] = await pool.query('DESCRIBE event_participants');
    console.log('event_participants columns:');
    cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

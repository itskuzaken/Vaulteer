const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await conn.query('SHOW TABLES LIKE "event_reports"');
  
  if (rows.length > 0) {
    console.log('✅ event_reports table EXISTS');
    const [cols] = await conn.query('DESCRIBE event_reports');
    console.log('\nColumns:', cols.length);
    console.log(cols.map(c => `  - ${c.Field} (${c.Type})`).join('\n'));
  } else {
    console.log('❌ event_reports table DOES NOT EXIST');
  }
  
  await conn.end();
}

checkTable().catch(console.error);

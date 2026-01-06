const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

conn.connect(() => {
  conn.query('SHOW TABLES', (err, tables) => {
    if (err) {
      console.error(err);
    } else {
      console.log('\n📊 Tables in database:\n');
      tables.forEach((t, i) => {
        const tableName = Object.values(t)[0];
        console.log(`${(i+1).toString().padStart(2)}. ${tableName}`);
      });
      console.log(`\n✅ Total: ${tables.length} tables`);
    }
    conn.end();
  });
});

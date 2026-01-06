const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sqlFile = path.join(__dirname, '..', 'vaulteer_db_reordered.sql');

console.log('🔄 Starting database migration...\n');

// Create connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true
});

// Connect to database
connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to database:', process.env.DB_NAME);
  
  // Disable foreign key checks
  connection.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
    if (err) {
      console.error('❌ Could not disable foreign key checks:', err.message);
      connection.end();
      process.exit(1);
    }
    
    console.log('⚠️  Foreign key checks disabled');
    console.log('📂 Reading SQL file:', sqlFile, '\n');
  
    // Read SQL file
    let sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Remove BOM if present
  sql = sql.replace(/^\uFEFF/, '');
  
  // Smart SQL statement parser that handles multi-line VIEWs and comments
  const statements = [];
  let currentStatement = '';
  let inComment = false;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    // Handle string literals
    if ((char === '"' || char === "'") && !inComment) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && sql[i - 1] !== '\\') {
        inString = false;
      }
      currentStatement += char;
      continue;
    }
    
    // Skip if inside string
    if (inString) {
      currentStatement += char;
      continue;
    }
    
    // Handle MySQL conditional comments /*! ... */
    if (char === '/' && nextChar === '*') {
      currentStatement += char;
      inComment = true;
      continue;
    }
    
    if (inComment && char === '*' && nextChar === '/') {
      currentStatement += char + nextChar;
      inComment = false;
      i++; // Skip next char
      continue;
    }
    
    // Handle semicolons (only split if not in comment or string)
    if (char === ';' && !inComment && !inString) {
      currentStatement += char;
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      currentStatement = '';
      continue;
    }
    
    currentStatement += char;
  }
  
  // Add final statement if exists
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }
  
  console.log(`⚙️  Executing ${statements.length} SQL statements...\n`);
  
  let completed = 0;
  let failed = 0;
  
  // Execute statements sequentially
  const executeNext = (index) => {
    if (index >= statements.length) {
      console.log(`\n✅ Migration completed!`);
      console.log(`   Successful: ${completed}`);
      console.log(`   Failed: ${failed}`);
      
      // Re-enable foreign key checks
      connection.query('SET FOREIGN_KEY_CHECKS = 1', () => {
        console.log('✅ Foreign key checks re-enabled');
        
        // Verify tables
        connection.query('SHOW TABLES', (err, tables) => {
          if (err) {
            console.error('❌ Could not verify tables:', err.message);
          } else {
            console.log(`\n✅ Total tables in database: ${tables.length}`);
          }
          connection.end();
          console.log('\n✅ Migration complete! Database connection closed.');
          process.exit(failed > 0 ? 1 : 0);
        });
      });
      return;
    }
    
    const statement = statements[index].trim();
    // Don't add semicolon if already present
    const finalStatement = statement.endsWith(';') ? statement : statement + ';';
    
    connection.query(finalStatement, (error) => {
      if (error) {
        // Ignore non-critical errors
        if (!error.message.includes('already exists') && 
            !error.message.includes('Duplicate') &&
            !error.message.includes('DROP VIEW')) {
          console.error(`❌ Error on statement ${index + 1}:`, error.message.substring(0, 100));
          failed++;
        }
      } else {
        completed++;
        if (completed % 50 === 0) {
          console.log(`   Progress: ${completed}/${statements.length} statements completed...`);
        }
      }
      executeNext(index + 1);
    });
  };
    
    executeNext(0);
  });
});

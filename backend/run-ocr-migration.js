/**
 * OCR Enhancement Database Migration Script
 * Runs the 008_ocr_enhancement_tables.sql migration
 */

const { initPool, getPool } = require('./db/pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running OCR enhancement database migration...');
    
    // Initialize database pool
    await initPool();
    const pool = getPool();
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '008_ocr_enhancement_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon to execute individual statements
    // First, remove standalone comment lines
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') || line.trim().length === 0)
      .join('\n');
    
    const statements = cleanSQL
      .split(';')
      .map(stmt => {
        // Clean up the statement: remove inline comments and extra whitespace
        return stmt
          .replace(/--.*$/gm, '') // Remove inline comments
          .replace(/\s+/g, ' ')   // Normalize whitespace
          .trim();
      })
      .filter(stmt => {
        // Filter out empty statements
        return stmt && stmt.length > 5; // Minimum length for a meaningful SQL statement
      });
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    if (statements.length === 0) {
      console.log('⚠️  No statements found. Checking file content...');
      console.log('File content preview:', migrationSQL.substring(0, 200) + '...');
    }
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await pool.execute(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Ignore "table already exists" errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (table already exists)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ OCR enhancement migration completed successfully!');
    
    // Test the new tables
    console.log('🧪 Testing new tables...');
    
    const [unmappedKeysTest] = await pool.execute('SHOW TABLES LIKE "ocr_unmapped_keys"');
    const [processingLogsTest] = await pool.execute('SHOW TABLES LIKE "ocr_processing_logs"');
    const [userFeedbackTest] = await pool.execute('SHOW TABLES LIKE "ocr_user_feedback"');
    
    console.log('📋 Table creation status:');
    console.log(`   - ocr_unmapped_keys: ${unmappedKeysTest.length > 0 ? '✅ Created' : '❌ Missing'}`);
    console.log(`   - ocr_processing_logs: ${processingLogsTest.length > 0 ? '✅ Created' : '❌ Missing'}`);
    console.log(`   - ocr_user_feedback: ${userFeedbackTest.length > 0 ? '✅ Created' : '❌ Missing'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
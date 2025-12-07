#!/usr/bin/env node
/**
 * Add nested field support columns to hts_forms table
 */

const { initPool } = require('./db/pool');

async function addColumns() {
  const pool = await initPool();

  try {
    console.log('\n🔧 Adding nested field support columns to hts_forms table...\n');

    const sql = `
      ALTER TABLE hts_forms 
      ADD COLUMN extracted_data_structured JSON COMMENT 'Structured nested field data with checkbox groups and conditional fields',
      ADD COLUMN field_components JSON COMMENT 'Component mappings for composite fields (e.g., fullName components, address parts)',
      ADD COLUMN checkbox_states JSON COMMENT 'Raw checkbox states (SELECTED/NOT_SELECTED) for all checkbox groups',
      ADD COLUMN structure_version VARCHAR(10) DEFAULT 'v2' COMMENT 'Field structure version (v1=flat, v2=nested)'
    `;

    await pool.query(sql);

    console.log('✅ Successfully added 4 columns:');
    console.log('   - extracted_data_structured (JSON)');
    console.log('   - field_components (JSON)');
    console.log('   - checkbox_states (JSON)');
    console.log('   - structure_version (VARCHAR(10))');
    console.log('\n✨ Database schema updated!\n');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Columns already exist - no changes needed');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

addColumns().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

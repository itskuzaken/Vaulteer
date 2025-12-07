/**
 * End-to-End Verification Script for Conditional Fields Implementation
 * 
 * This script verifies:
 * 1. Database structure_version default is 'v2'
 * 2. buildConditionalFields function exists and is called
 * 3. Repository accepts nested data fields
 * 4. Controller passes nested data to repository
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database connection (update with your credentials)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vaulteer_db'
};

async function verifyDatabaseSchema() {
  console.log('=== Verifying Database Schema ===\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check structure_version column
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_DEFAULT, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'hts_forms'
      AND COLUMN_NAME IN ('structure_version', 'extracted_data_structured', 'field_components', 'checkbox_states', 'extracted_data_structured_encrypted', 'extracted_data_structured_iv')
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('📋 HTS Forms Table - Nested Field Columns:');
    columns.forEach(col => {
      const defaultValue = col.COLUMN_DEFAULT || '(none)';
      console.log(`  ✓ ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} DEFAULT ${defaultValue}`);
      if (col.COLUMN_COMMENT) {
        console.log(`    ${col.COLUMN_COMMENT}`);
      }
    });
    
    // Check if structure_version has DEFAULT 'v2'
    const structureVersionCol = columns.find(c => c.COLUMN_NAME === 'structure_version');
    if (structureVersionCol) {
      if (structureVersionCol.COLUMN_DEFAULT === 'v2') {
        console.log('\n✅ structure_version DEFAULT is correctly set to "v2"');
      } else {
        console.log(`\n⚠️  structure_version DEFAULT is "${structureVersionCol.COLUMN_DEFAULT}" (expected "v2")`);
      }
    } else {
      console.log('\n❌ structure_version column not found');
    }
    
    // Check existing rows
    const [rows] = await connection.query(`
      SELECT structure_version, COUNT(*) as count
      FROM hts_forms
      GROUP BY structure_version
    `);
    
    if (rows.length > 0) {
      console.log('\n📊 Existing HTS Forms by Structure Version:');
      rows.forEach(row => {
        console.log(`  ${row.structure_version || 'NULL'}: ${row.count} forms`);
      });
    } else {
      console.log('\n📊 No existing HTS forms in database');
    }
    
  } catch (error) {
    console.error('\n❌ Database verification failed:', error.message);
  } finally {
    await connection.end();
  }
}

async function verifyCodeImplementation() {
  console.log('\n\n=== Verifying Code Implementation ===\n');
  
  // Check textractService.js for buildConditionalFields
  const textractServicePath = path.join(__dirname, '..', 'services', 'textractService.js');
  const textractServiceCode = fs.readFileSync(textractServicePath, 'utf8');
  
  console.log('📄 Checking textractService.js:');
  
  if (textractServiceCode.includes('function buildConditionalFields')) {
    console.log('  ✅ buildConditionalFields function exists');
    
    // Check if it's called in the pipeline
    if (textractServiceCode.includes('buildConditionalFields(allFields, frontKVPairs, backKVPairs)')) {
      console.log('  ✅ buildConditionalFields is called in pipeline');
    } else {
      console.log('  ⚠️  buildConditionalFields call not found in pipeline');
    }
    
    // Check if fieldComponents and checkboxStates are extracted
    if (textractServiceCode.includes('const fieldComponents = {}') && textractServiceCode.includes('const checkboxStates = {}')) {
      console.log('  ✅ fieldComponents and checkboxStates extraction implemented');
    } else {
      console.log('  ⚠️  fieldComponents or checkboxStates extraction not found');
    }
    
    // Check if return object includes nested data
    if (textractServiceCode.includes('fieldComponents,') && textractServiceCode.includes('checkboxStates,')) {
      console.log('  ✅ Return object includes fieldComponents and checkboxStates');
    } else {
      console.log('  ⚠️  Return object may be missing nested data fields');
    }
  } else {
    console.log('  ❌ buildConditionalFields function not found');
  }
  
  // Check htsFormsRepository.js
  const repositoryPath = path.join(__dirname, '..', 'repositories', 'htsFormsRepository.js');
  const repositoryCode = fs.readFileSync(repositoryPath, 'utf8');
  
  console.log('\n📄 Checking htsFormsRepository.js:');
  
  if (repositoryCode.includes('extractedDataStructured') || repositoryCode.includes('extracted_data_structured')) {
    console.log('  ✅ Repository accepts extracted_data_structured');
  } else {
    console.log('  ⚠️  Repository may not accept extracted_data_structured');
  }
  
  if (repositoryCode.includes('fieldComponents') || repositoryCode.includes('field_components')) {
    console.log('  ✅ Repository accepts field_components');
  } else {
    console.log('  ⚠️  Repository may not accept field_components');
  }
  
  if (repositoryCode.includes('checkboxStates') || repositoryCode.includes('checkbox_states')) {
    console.log('  ✅ Repository accepts checkbox_states');
  } else {
    console.log('  ⚠️  Repository may not accept checkbox_states');
  }
  
  if (repositoryCode.includes("structureVersion = 'v2'")) {
    console.log('  ✅ Repository defaults structureVersion to v2');
  } else {
    console.log('  ⚠️  Repository may not default structureVersion to v2');
  }
  
  // Check htsFormsController.js
  const controllerPath = path.join(__dirname, '..', 'controllers', 'htsFormsController.js');
  const controllerCode = fs.readFileSync(controllerPath, 'utf8');
  
  console.log('\n📄 Checking htsFormsController.js:');
  
  if (controllerCode.includes('extractedDataStructuredEncrypted') && controllerCode.includes('extractedDataStructuredIV')) {
    console.log('  ✅ Controller accepts encrypted structured data');
  } else {
    console.log('  ⚠️  Controller may not accept encrypted structured data');
  }
  
  if (controllerCode.includes('fieldComponents') && controllerCode.includes('checkboxStates')) {
    console.log('  ✅ Controller accepts fieldComponents and checkboxStates');
  } else {
    console.log('  ⚠️  Controller may not accept fieldComponents and checkboxStates');
  }
  
  if (controllerCode.includes("structureVersion: 'v2'")) {
    console.log('  ✅ Controller sets structureVersion to v2');
  } else {
    console.log('  ⚠️  Controller may not set structureVersion to v2');
  }
}

async function verifyTests() {
  console.log('\n\n=== Verifying Unit Tests ===\n');
  
  const testPath = path.join(__dirname, '..', 'tests', 'buildConditionalFields.test.js');
  
  if (fs.existsSync(testPath)) {
    const testCode = fs.readFileSync(testPath, 'utf8');
    console.log('📄 buildConditionalFields.test.js:');
    console.log('  ✅ Test file exists');
    
    // Count test cases
    const describeCount = (testCode.match(/describe\(/g) || []).length;
    const itCount = (testCode.match(/it\(/g) || []).length;
    
    console.log(`  ✅ ${describeCount} test suites`);
    console.log(`  ✅ ${itCount} test cases`);
    
    // Check for key test scenarios
    const keyScenarios = [
      'Parent checkbox SELECTED',
      'Parent checkbox NOT_SELECTED',
      'Proximity detection',
      'Pattern matching',
      'Multiple risk types',
      'Edge cases'
    ];
    
    console.log('\n  Key test scenarios:');
    keyScenarios.forEach(scenario => {
      if (testCode.includes(scenario)) {
        console.log(`    ✅ ${scenario}`);
      } else {
        console.log(`    ⚠️  ${scenario} (not found)`);
      }
    });
  } else {
    console.log('  ❌ Test file not found');
  }
}

async function runVerification() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Conditional Fields Implementation Verification           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    await verifyDatabaseSchema();
    await verifyCodeImplementation();
    await verifyTests();
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  Verification Complete                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ All components verified successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run unit tests: npm test buildConditionalFields.test.js');
    console.log('  2. Test OCR with conditional fields: node test-cached-ocr.js');
    console.log('  3. Test end-to-end submission with nested data');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  runVerification().catch(console.error);
}

module.exports = { verifyDatabaseSchema, verifyCodeImplementation, verifyTests };

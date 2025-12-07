/**
 * Enable OCR Debug Mode and Test Calibration
 * 
 * This script:
 * 1. Enables OCR_DEBUG mode to generate calibration reports
 * 2. Instructions for testing with a real form
 * 3. How to apply calibration updates
 */

console.log('='.repeat(60));
console.log('OCR REGION CALIBRATION GUIDE');
console.log('='.repeat(60));
console.log();

console.log('STEP 1: Enable Debug Mode');
console.log('-'.repeat(60));
console.log('Set environment variable in your .env file:');
console.log('');
console.log('  OCR_DEBUG=true');
console.log('');
console.log('Or set it temporarily in PowerShell:');
console.log('  $env:OCR_DEBUG="true"');
console.log('');

console.log('STEP 2: Submit an HTS Form');
console.log('-'.repeat(60));
console.log('1. Start the backend server');
console.log('2. Submit an HTS form through the frontend');
console.log('3. Check backend/logs/ for a calibration report');
console.log('   Format: ocr-calibration-[timestamp].md');
console.log('');

console.log('STEP 3: Review Calibration Report');
console.log('-'.repeat(60));
console.log('The report will show:');
console.log('  - Fields with coordinate mismatches');
console.log('  - Distance between expected and actual positions');
console.log('  - Suggested coordinate updates in JSON format');
console.log('');

console.log('STEP 4: Apply Calibration (if needed)');
console.log('-'.repeat(60));
console.log('Option A - Manual Update:');
console.log('  1. Review suggested coordinates in the report');
console.log('  2. Update backend/assets/form-templates/hts/template-metadata.json');
console.log('  3. Restart backend server');
console.log('');
console.log('Option B - Automatic Update:');
console.log('  Run: node backend/scripts/apply-calibration.js [report-file]');
console.log('');

console.log('STEP 5: Verify Improvements');
console.log('-'.repeat(60));
console.log('1. Submit the same form again');
console.log('2. Check extraction stats:');
console.log('   - Query-extracted should be > 8 fields');
console.log('   - Coordinate-extracted should be > 30 fields');
console.log('   - Failed should be < 10 fields');
console.log('   - Overall confidence should be > 75%');
console.log('');

console.log('='.repeat(60));
console.log('CURRENT STATUS');
console.log('='.repeat(60));

// Check if OCR_DEBUG is enabled
const debugEnabled = process.env.OCR_DEBUG === 'true' || process.env.NODE_ENV === 'development';
console.log(`OCR_DEBUG: ${debugEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);

// Check if logs directory exists
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '../logs');

if (fs.existsSync(logsDir)) {
  console.log(`Logs directory: ✅ ${logsDir}`);
  
  // List existing calibration reports
  const reports = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('ocr-calibration-') && f.endsWith('.md'))
    .sort()
    .reverse();
  
  if (reports.length > 0) {
    console.log(`\nExisting calibration reports (${reports.length}):`);
    reports.slice(0, 5).forEach(report => {
      const stats = fs.statSync(path.join(logsDir, report));
      console.log(`  - ${report} (${new Date(stats.mtime).toLocaleString()})`);
    });
  } else {
    console.log('\nNo calibration reports yet. Submit a form to generate one.');
  }
} else {
  console.log(`Logs directory: ❌ Not found (will be created automatically)`);
}

console.log('');
console.log('='.repeat(60));

if (!debugEnabled) {
  console.log('⚠️  To enable calibration, set OCR_DEBUG=true in .env');
  console.log('   Then restart the backend server and submit a form.');
}

console.log('='.repeat(60));

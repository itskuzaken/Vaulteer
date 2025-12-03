/**
 * Apply OCR Calibration Script
 * 
 * Reads the latest calibration report and applies suggested
 * coordinate updates to the template metadata
 * 
 * Usage:
 *   node backend/scripts/apply-calibration.js [report-file]
 *   node backend/scripts/apply-calibration.js  (uses latest report)
 */

const fs = require('fs');
const path = require('path');
const OCRRegionCalibrator = require('../utils/calibrateOCRRegions');

// Parse command line arguments
const args = process.argv.slice(2);
const logsDir = path.join(__dirname, '../logs');
const templatePath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const backupPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.backup.json');

console.log('='.repeat(60));
console.log('OCR CALIBRATION APPLICATION TOOL');
console.log('='.repeat(60));
console.log();

// Find calibration report
let reportPath = args[0];

if (!reportPath) {
  console.log('🔍 Looking for latest calibration report...');
  
  if (!fs.existsSync(logsDir)) {
    console.error('❌ Logs directory not found:', logsDir);
    console.log('   Run OCR extraction with OCR_DEBUG=true to generate reports');
    process.exit(1);
  }

  const reports = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('ocr-calibration-') && f.endsWith('.md'))
    .sort()
    .reverse();

  if (reports.length === 0) {
    console.error('❌ No calibration reports found');
    console.log('   Submit an HTS form with OCR_DEBUG=true to generate a report');
    process.exit(1);
  }

  reportPath = path.join(logsDir, reports[0]);
  console.log(`✅ Found latest report: ${reports[0]}`);
} else {
  if (!path.isAbsolute(reportPath)) {
    reportPath = path.resolve(reportPath);
  }
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Report file not found:', reportPath);
    process.exit(1);
  }
}

console.log();

// Parse the report to extract suggestions
console.log('📄 Parsing calibration report...');
const reportContent = fs.readFileSync(reportPath, 'utf8');

// Extract JSON suggestions from report
const jsonMatch = reportContent.match(/```json\n([\s\S]+?)\n```/);

if (!jsonMatch) {
  console.error('❌ No calibration suggestions found in report');
  console.log('   The report may not contain any coordinate mismatches');
  process.exit(1);
}

let suggestions = {};
try {
  suggestions = JSON.parse(jsonMatch[1]);
} catch (error) {
  console.error('❌ Failed to parse suggestions:', error.message);
  process.exit(1);
}

const totalSuggestions = Object.keys(suggestions).length;
console.log(`✅ Found ${totalSuggestions} suggested coordinate updates`);
console.log();

// Show preview of changes
console.log('📋 Preview of changes:');
console.log('-'.repeat(60));

let changeCount = 0;
for (const [fieldName, suggestion] of Object.entries(suggestions)) {
  console.log(`${++changeCount}. ${suggestion.label} (${fieldName})`);
  console.log(`   New region: x=${suggestion.region.x}, y=${suggestion.region.y}`);
  console.log(`   Reason: ${suggestion.reasoning}`);
  console.log();
}

console.log('-'.repeat(60));
console.log();

// Confirm before applying
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Apply these calibration updates? (yes/no): ', (answer) => {
  readline.close();

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('❌ Calibration cancelled');
    process.exit(0);
  }

  console.log();
  console.log('🔧 Applying calibration...');

  // Backup original template
  if (!fs.existsSync(backupPath)) {
    console.log('💾 Creating backup of original template...');
    fs.copyFileSync(templatePath, backupPath);
    console.log(`✅ Backup saved: ${backupPath}`);
  }

  // Load template
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  // Apply updates
  let updateCount = 0;
  for (const [fieldName, suggestion] of Object.entries(suggestions)) {
    // Find the field in front or back page
    for (const pageName of ['front', 'back']) {
      const fieldConfig = template.ocrMapping[pageName]?.fields?.[fieldName];
      
      if (fieldConfig && fieldConfig.region) {
        const oldRegion = { ...fieldConfig.region };
        fieldConfig.region = suggestion.region;
        
        console.log(`✅ Updated ${fieldName}:`);
        console.log(`   Old: (${oldRegion.x.toFixed(3)}, ${oldRegion.y.toFixed(3)})`);
        console.log(`   New: (${suggestion.region.x.toFixed(3)}, ${suggestion.region.y.toFixed(3)})`);
        
        updateCount++;
      }
    }
  }

  // Save updated template
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');

  console.log();
  console.log('='.repeat(60));
  console.log(`✅ Calibration applied: ${updateCount} fields updated`);
  console.log('='.repeat(60));
  console.log();
  console.log('📝 Next steps:');
  console.log('  1. Restart the backend server');
  console.log('  2. Submit the same HTS form again');
  console.log('  3. Verify extraction improvements');
  console.log();
  console.log('💡 To revert changes, restore from backup:');
  console.log(`   Copy: ${backupPath}`);
  console.log(`   To:   ${templatePath}`);
  console.log();
});

/**
 * Apply Comprehensive Calibration
 * 
 * Applies calibration updates from comprehensive-calibration.js output
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const templatePath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const backupPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.backup.json');

console.log('='.repeat(70));
console.log('APPLY COMPREHENSIVE CALIBRATION');
console.log('='.repeat(70));
console.log();

// Get calibration file from command line
const calibrationFile = process.argv[2];

if (!calibrationFile) {
  console.error('❌ Usage: node apply-comprehensive-calibration.js <calibration-file.json>');
  process.exit(1);
}

if (!fs.existsSync(calibrationFile)) {
  console.error('❌ Calibration file not found:', calibrationFile);
  process.exit(1);
}

console.log('📄 Loading calibration data...');
const calibrationData = JSON.parse(fs.readFileSync(calibrationFile, 'utf8'));

const frontSuggestions = calibrationData.front || [];
const backSuggestions = calibrationData.back || [];
const totalSuggestions = frontSuggestions.length + backSuggestions.length;

console.log(`✅ Front page: ${frontSuggestions.length} fields`);
if (backSuggestions.length > 0) {
  console.log(`✅ Back page: ${backSuggestions.length} fields`);
}
console.log(`✅ Total: ${totalSuggestions} coordinate updates`);
console.log();

if (totalSuggestions === 0) {
  console.log('❌ No calibration suggestions found');
  process.exit(1);
}

// Show preview
console.log('📋 Preview of changes (first 15):');
console.log('-'.repeat(70));

let previewCount = 0;
for (const suggestion of [...frontSuggestions, ...backSuggestions].slice(0, 15)) {
  console.log(`${++previewCount}. ${suggestion.label} (${suggestion.fieldName})`);
  console.log(`   Matched: "${suggestion.matched}" → "${suggestion.value.substring(0, 40)}"`);
  console.log(`   Old: (${suggestion.oldRegion.x || 0}, ${suggestion.oldRegion.y || 0})`);
  console.log(`   New: (${suggestion.newRegion.x}, ${suggestion.newRegion.y})`);
  console.log(`   Distance: ${suggestion.distance} | Confidence: ${suggestion.confidence.toFixed(0)}%`);
  console.log();
}

if (totalSuggestions > 15) {
  console.log(`... and ${totalSuggestions - 15} more fields`);
  console.log();
}

console.log('-'.repeat(70));
console.log();

// Confirm
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Apply these calibration updates? (yes/no): ', (answer) => {
  rl.close();

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('❌ Calibration cancelled');
    process.exit(0);
  }

  console.log();
  console.log('🔧 Applying calibration...');

  // Create backup if not exists
  if (!fs.existsSync(backupPath)) {
    console.log('💾 Creating backup of original template...');
    fs.copyFileSync(templatePath, backupPath);
    console.log(`✅ Backup saved: ${backupPath}`);
  }

  // Load template
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  let updateCount = 0;
  let skippedCount = 0;

  // Apply front page updates
  for (const suggestion of frontSuggestions) {
    const fieldConfig = template.ocrMapping.front.fields[suggestion.fieldName];
    
    if (fieldConfig) {
      fieldConfig.region = suggestion.newRegion;
      updateCount++;
      console.log(`✅ Updated ${suggestion.fieldName} (front)`);
    } else {
      console.warn(`⚠️  Field not found: ${suggestion.fieldName} (front)`);
      skippedCount++;
    }
  }

  // Apply back page updates
  for (const suggestion of backSuggestions) {
    const fieldConfig = template.ocrMapping.back.fields[suggestion.fieldName];
    
    if (fieldConfig) {
      fieldConfig.region = suggestion.newRegion;
      updateCount++;
      console.log(`✅ Updated ${suggestion.fieldName} (back)`);
    } else {
      console.warn(`⚠️  Field not found: ${suggestion.fieldName} (back)`);
      skippedCount++;
    }
  }

  // Save updated template
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');

  console.log();
  console.log('='.repeat(70));
  console.log(`✅ Calibration applied: ${updateCount} fields updated`);
  if (skippedCount > 0) {
    console.log(`⚠️  ${skippedCount} fields skipped (not found in template)`);
  }
  console.log('='.repeat(70));
  console.log();
  console.log('📝 Next steps:');
  console.log('  1. Restart the backend server');
  console.log('  2. Submit an HTS form');
  console.log('  3. Verify extraction improvements');
  console.log();
  console.log('💡 To revert changes, restore from backup:');
  console.log(`   Copy: ${backupPath}`);
  console.log(`   To:   ${templatePath}`);
  console.log();
});

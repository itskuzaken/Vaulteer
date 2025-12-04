/**
 * Apply front page calibration to template metadata
 * Reads calibration log and updates template-metadata.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const calibrationPath = process.argv[2] || path.join(__dirname, '../logs/front-all-fields-calibration-1764809920326.json');
const templatePath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');

console.log('📖 Reading calibration data...');
const calibration = JSON.parse(fs.readFileSync(calibrationPath, 'utf-8'));
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

// Method mapping
const methodMap = {
  'query': 'query',
  'forms': 'form-field',
  'checkbox': 'checkbox-detection',
  'text-after-checkbox': 'text-after-checkbox'
};

let updatedCount = 0;
let stats = {
  query: 0,
  forms: 0,
  checkbox: 0,
  'text-after-checkbox': 0
};

const frontFields = calibration.front || calibration;
console.log(`\n🔄 Processing ${frontFields.length} fields...\n`);

// Apply calibration
frontFields.forEach(field => {
  const fieldName = field.fieldName;
  
  if (template.ocrMapping.front.fields[fieldName]) {
    const templateField = template.ocrMapping.front.fields[fieldName];
    const newMethod = methodMap[field.method] || field.method;
    
    // Update coordinates
    if (field.newRegion && Object.keys(field.newRegion).length > 0) {
      templateField.region = { ...field.newRegion };
    }
    
    // Update extraction method
    if (templateField.extractionMethod !== newMethod) {
      console.log(`   ${fieldName}: ${templateField.extractionMethod} → ${newMethod}`);
      templateField.extractionMethod = newMethod;
      stats[field.method]++;
    }
    
    updatedCount++;
  }
});

// Save updated template
fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf-8');

console.log(`\n✅ Applied calibration to ${updatedCount} fields`);
console.log(`\n📊 Extraction Methods Updated:`);
console.log(`   Query API: ${stats.query} fields`);
console.log(`   Forms API: ${stats.forms} fields`);
console.log(`   Checkbox Detection: ${stats.checkbox} fields`);
console.log(`   Text After Checkbox: ${stats['text-after-checkbox']} fields`);
console.log(`\n💾 Template saved: ${templatePath}`);

/**
 * Validate Frontend-Backend Field Synchronization
 * Compares field lists in frontend components with backend template
 */

const path = require('path');
const fs = require('fs');

// Load backend template
const templatePath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

// Extract all fields from backend template
const getAllFields = (sections) => {
  const result = {};
  Object.entries(sections).forEach(([name, data]) => {
    result[name] = data.fields.map(f => typeof f === 'string' ? f : f.name).filter(Boolean);
  });
  return result;
};

const backendFront = getAllFields(template.structure.front.sections);
const backendBack = getAllFields(template.structure.back.sections);

// Parse frontend files to extract field lists
const parseFormFields = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/const formFields = \{([\s\S]*?)\n  \};/);
  if (!match) return null;
  
  const fieldsStr = match[1];
  const sections = {};
  
  // Extract each section
  const sectionRegex = /'([^']+)':\s*\[([\s\S]*?)\]/g;
  let sectionMatch;
  
  while ((sectionMatch = sectionRegex.exec(fieldsStr)) !== null) {
    const sectionName = sectionMatch[1];
    const fieldsStr = sectionMatch[2];
    
    // Extract field names
    const fields = [];
    const fieldRegex = /'([^']+)'/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
      fields.push(fieldMatch[1]);
    }
    
    sections[sectionName] = fields;
  }
  
  return sections;
};

const parseSectionConstants = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const sections = { front: {}, back: {} };
  
  // Parse FRONT_PAGE_SECTIONS
  const frontMatch = content.match(/const FRONT_PAGE_SECTIONS = \{([\s\S]*?)\n\};/);
  if (frontMatch) {
    const sectionsStr = frontMatch[1];
    const sectionRegex = /'([^']+)':\s*\[([\s\S]*?)\]/g;
    let sectionMatch;
    
    while ((sectionMatch = sectionRegex.exec(sectionsStr)) !== null) {
      const sectionName = sectionMatch[1];
      const fieldsStr = sectionMatch[2];
      const fields = [];
      const fieldRegex = /'([^']+)'/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
        fields.push(fieldMatch[1]);
      }
      sections.front[sectionName] = fields;
    }
  }
  
  // Parse BACK_PAGE_SECTIONS
  const backMatch = content.match(/const BACK_PAGE_SECTIONS = \{([\s\S]*?)\n\};/);
  if (backMatch) {
    const sectionsStr = backMatch[1];
    const sectionRegex = /'([^']+)':\s*\[([\s\S]*?)\]/g;
    let sectionMatch;
    
    while ((sectionMatch = sectionRegex.exec(sectionsStr)) !== null) {
      const sectionName = sectionMatch[1];
      const fieldsStr = sectionMatch[2];
      const fields = [];
      const fieldRegex = /'([^']+)'/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
        fields.push(fieldMatch[1]);
      }
      sections.back[sectionName] = fields;
    }
  }
  
  return sections;
};

// Load frontend field definitions
const editModalPath = path.join(__dirname, '../../frontend/src/components/navigation/Form/HTSFormEditModal.js');
const adminViewPath = path.join(__dirname, '../../frontend/src/components/ui/AdminHTSDetailView.js');

const editModalFields = parseFormFields(editModalPath);
const adminViewFields = parseSectionConstants(adminViewPath);

console.log('🔍 Frontend-Backend Field Synchronization Validation\n');
console.log('=' .repeat(80));

// Compare fields
let allMatch = true;
let totalMismatches = 0;

// Check HTSFormEditModal
console.log('\n📝 HTSFormEditModal.js vs Backend Template:\n');

const compareFields = (frontendFields, backendFields, page) => {
  Object.keys(backendFields).forEach(section => {
    const backendFieldList = backendFields[section];
    const frontendFieldList = frontendFields[section];
    
    if (!frontendFieldList) {
      console.log(`❌ ${section}: MISSING in frontend`);
      allMatch = false;
      totalMismatches++;
      return;
    }
    
    const missing = backendFieldList.filter(f => !frontendFieldList.includes(f));
    const extra = frontendFieldList.filter(f => !backendFieldList.includes(f));
    
    if (missing.length === 0 && extra.length === 0) {
      console.log(`✅ ${section}: ${backendFieldList.length} fields match`);
    } else {
      console.log(`⚠️  ${section}:`);
      console.log(`   Backend: ${backendFieldList.length} fields`);
      console.log(`   Frontend: ${frontendFieldList.length} fields`);
      if (missing.length > 0) {
        console.log(`   Missing in frontend: ${missing.join(', ')}`);
      }
      if (extra.length > 0) {
        console.log(`   Extra in frontend: ${extra.join(', ')}`);
      }
      allMatch = false;
      totalMismatches++;
    }
  });
};

compareFields(editModalFields, backendFront, 'front');
compareFields(editModalFields, backendBack, 'back');

// Check AdminHTSDetailView
console.log('\n\n📊 AdminHTSDetailView.js vs Backend Template:\n');

compareFields(adminViewFields.front, backendFront, 'front');
compareFields(adminViewFields.back, backendBack, 'back');

// Summary
console.log('\n' + '='.repeat(80));
if (allMatch) {
  console.log('✅ ALL FRONTEND COMPONENTS SYNCHRONIZED WITH BACKEND!');
  console.log('\n📊 Statistics:');
  console.log(`   Backend: ${Object.keys(backendFront).length + Object.keys(backendBack).length} sections`);
  const backendTotal = Object.values(backendFront).reduce((sum, arr) => sum + arr.length, 0) +
                       Object.values(backendBack).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`   Backend: ${backendTotal} total fields`);
  console.log('   Frontend: All fields match backend template');
} else {
  console.log(`⚠️  SYNCHRONIZATION INCOMPLETE: ${totalMismatches} mismatches found`);
  console.log('\nPlease update frontend components to match backend template structure.');
}

process.exit(allMatch ? 0 : 1);

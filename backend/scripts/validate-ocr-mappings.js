#!/usr/bin/env node
/**
 * OCR Field Mapping Validator
 * 
 * Validates consistency between:
 * 1. Query aliases in textractService.js (snake_case)
 * 2. QUERY_ALIAS_MAP (snake_case -> camelCase)
 * 3. Template metadata field names (camelCase)
 * 4. Frontend FIELD_METADATA (camelCase)
 * 
 * Run: node backend/scripts/validate-ocr-mappings.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('='.repeat(80), 'cyan');
  log(message, 'cyan');
  log('='.repeat(80), 'cyan');
  console.log('');
}

/**
 * Extract query aliases from generateHTSFormQueries function
 */
function extractQueryAliases() {
  const textractServicePath = path.join(__dirname, '../services/textractService.js');
  const content = fs.readFileSync(textractServicePath, 'utf8');
  
  const aliasRegex = /alias:\s*['"]([^'"]+)['"]/g;
  const aliases = [];
  let match;
  
  while ((match = aliasRegex.exec(content)) !== null) {
    aliases.push(match[1]);
  }
  
  return [...new Set(aliases)].sort(); // Remove duplicates and sort
}

/**
 * Extract QUERY_ALIAS_MAP from textractService.js
 */
function extractQueryAliasMap() {
  const textractServicePath = path.join(__dirname, '../services/textractService.js');
  const content = fs.readFileSync(textractServicePath, 'utf8');
  
  // Find QUERY_ALIAS_MAP definition
  const mapRegex = /const QUERY_ALIAS_MAP = \{([^}]+)\}/s;
  const match = content.match(mapRegex);
  
  if (!match) {
    log('⚠️  Could not find QUERY_ALIAS_MAP definition', 'yellow');
    return {};
  }
  
  const mapContent = match[1];
  const entryRegex = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;
  const map = {};
  let entry;
  
  while ((entry = entryRegex.exec(mapContent)) !== null) {
    map[entry[1]] = entry[2];
  }
  
  return map;
}

/**
 * Load template metadata field names
 */
function loadTemplateMetadata() {
  const metadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  
  const frontFields = Object.keys(metadata.ocrMapping.front.fields || {});
  const backFields = Object.keys(metadata.ocrMapping.back.fields || {});
  
  return {
    front: frontFields.sort(),
    back: backFields.sort(),
    all: [...new Set([...frontFields, ...backFields])].sort()
  };
}

/**
 * Load frontend FIELD_METADATA
 */
function loadFrontendFieldMetadata() {
  const componentPath = path.join(__dirname, '../../frontend/src/components/ui/TemplateBasedOCRReview.js');
  
  if (!fs.existsSync(componentPath)) {
    log('⚠️  Frontend component not found, skipping', 'yellow');
    return [];
  }
  
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Extract field names from FIELD_METADATA object
  const fieldRegex = /^\s+(\w+):\s*\{/gm;
  const fields = [];
  let match;
  
  while ((match = fieldRegex.exec(content)) !== null) {
    fields.push(match[1]);
  }
  
  return fields.sort();
}

/**
 * Main validation
 */
function validateMappings() {
  header('OCR Field Mapping Validation');
  
  // Step 1: Extract all data
  log('📊 Loading OCR mapping data...', 'blue');
  const queryAliases = extractQueryAliases();
  const aliasMap = extractQueryAliasMap();
  const templateFields = loadTemplateMetadata();
  const frontendFields = loadFrontendFieldMetadata();
  
  log(`   Query aliases found: ${queryAliases.length}`, 'blue');
  log(`   QUERY_ALIAS_MAP entries: ${Object.keys(aliasMap).length}`, 'blue');
  log(`   Template metadata fields: ${templateFields.all.length}`, 'blue');
  log(`   Frontend FIELD_METADATA fields: ${frontendFields.length}`, 'blue');
  
  // Step 2: Validate query aliases have mappings
  header('Validation: Query Aliases → QUERY_ALIAS_MAP');
  const unmappedAliases = queryAliases.filter(alias => !aliasMap[alias]);
  
  if (unmappedAliases.length === 0) {
    log('✅ All query aliases have mappings in QUERY_ALIAS_MAP', 'green');
  } else {
    log(`❌ ${unmappedAliases.length} query aliases missing from QUERY_ALIAS_MAP:`, 'red');
    unmappedAliases.forEach(alias => log(`   - ${alias}`, 'red'));
  }
  
  // Step 3: Validate mapped fields exist in template
  header('Validation: QUERY_ALIAS_MAP → Template Metadata');
  const mappedFields = Object.values(aliasMap);
  const missingInTemplate = mappedFields.filter(field => !templateFields.all.includes(field));
  
  if (missingInTemplate.length === 0) {
    log('✅ All mapped fields exist in template metadata', 'green');
  } else {
    log(`❌ ${missingInTemplate.length} mapped fields missing from template metadata:`, 'red');
    missingInTemplate.forEach(field => log(`   - ${field} (mapped from ${Object.keys(aliasMap).find(k => aliasMap[k] === field)})`, 'red'));
  }
  
  // Step 4: Validate template fields have query mappings
  header('Validation: Template Metadata → QUERY_ALIAS_MAP');
  const templateWithoutQuery = templateFields.all.filter(field => !mappedFields.includes(field));
  
  if (templateWithoutQuery.length === 0) {
    log('✅ All template fields have query mappings', 'green');
  } else {
    log(`⚠️  ${templateWithoutQuery.length} template fields without query mappings (may use coordinate-only):`, 'yellow');
    templateWithoutQuery.forEach(field => log(`   - ${field}`, 'yellow'));
  }
  
  // Step 5: Compare frontend and backend fields
  header('Validation: Frontend ↔ Backend Field Names');
  const backendFields = templateFields.all;
  const missingInFrontend = backendFields.filter(field => !frontendFields.includes(field));
  const missingInBackend = frontendFields.filter(field => !backendFields.includes(field));
  
  if (missingInFrontend.length === 0 && missingInBackend.length === 0) {
    log('✅ Frontend and backend field names are synchronized', 'green');
  } else {
    if (missingInFrontend.length > 0) {
      log(`⚠️  ${missingInFrontend.length} backend fields missing from frontend:`, 'yellow');
      missingInFrontend.slice(0, 10).forEach(field => log(`   - ${field}`, 'yellow'));
      if (missingInFrontend.length > 10) log(`   ... and ${missingInFrontend.length - 10} more`, 'yellow');
    }
    if (missingInBackend.length > 0) {
      log(`⚠️  ${missingInBackend.length} frontend fields missing from backend:`, 'yellow');
      missingInBackend.slice(0, 10).forEach(field => log(`   - ${field}`, 'yellow'));
      if (missingInBackend.length > 10) log(`   ... and ${missingInBackend.length - 10} more`, 'yellow');
    }
  }
  
  // Step 6: Summary
  header('Validation Summary');
  const totalErrors = unmappedAliases.length + missingInTemplate.length;
  const totalWarnings = templateWithoutQuery.length + missingInFrontend.length + missingInBackend.length;
  
  if (totalErrors === 0 && totalWarnings === 0) {
    log('🎉 All validations passed! OCR field mappings are consistent.', 'green');
    return 0;
  } else {
    if (totalErrors > 0) {
      log(`❌ ${totalErrors} critical error(s) found - OCR extraction may fail`, 'red');
    }
    if (totalWarnings > 0) {
      log(`⚠️  ${totalWarnings} warning(s) found - review recommended`, 'yellow');
    }
    return totalErrors > 0 ? 1 : 0;
  }
}

// Run validation
const exitCode = validateMappings();
process.exit(exitCode);

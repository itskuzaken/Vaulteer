/**
 * Validate that all ocrMapping fields have coordinates embedded in structure
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');

function validateCompleteRemap() {
  console.log('🔍 Validating coordinate remapping completeness...\n');

  // Clear require cache to ensure fresh load
  delete require.cache[TEMPLATE_PATH];
  
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  let allMapped = true;
  let mappedCount = 0;
  let notFoundCount = 0;
  const notFoundFields = [];

  // Check front page
  console.log('📄 Checking FRONT page fields...');
  const frontResult = validatePageFields(
    template.ocrMapping.front.fields,
    template.structure.front.sections,
    'front'
  );
  mappedCount += frontResult.mapped;
  notFoundCount += frontResult.notFound;
  notFoundFields.push(...frontResult.missing);
  if (frontResult.notFound > 0) allMapped = false;

  // Check back page
  console.log('\n📄 Checking BACK page fields...');
  const backResult = validatePageFields(
    template.ocrMapping.back.fields,
    template.structure.back.sections,
    'back'
  );
  mappedCount += backResult.mapped;
  notFoundCount += backResult.notFound;
  notFoundFields.push(...backResult.missing);
  if (backResult.notFound > 0) allMapped = false;

  // Summary
  console.log('\n' + '='.repeat(80));
  if (allMapped) {
    console.log('✅ ALL COORDINATES SUCCESSFULLY REMAPPED!');
  } else {
    console.log('⚠️  INCOMPLETE REMAPPING');
  }
  console.log(`   Mapped: ${mappedCount}/${mappedCount + notFoundCount}`);
  console.log(`   Not found in structure: ${notFoundCount}`);

  if (notFoundFields.length > 0) {
    console.log('\n❌ ocrMapping fields missing from structure:');
    notFoundFields.forEach(field => {
      console.log(`   - ${field}`);
    });
  }

  console.log('\n📊 Coverage: ' + Math.round((mappedCount / (mappedCount + notFoundCount)) * 100) + '%');

  return { allMapped, mappedCount, notFoundCount, notFoundFields };
}

function validatePageFields(ocrFields, sections, page) {
  let mapped = 0;
  let notFound = 0;
  const missing = [];

  for (const [fieldName, fieldData] of Object.entries(ocrFields)) {
    // Only validate fields that have region coordinates
    if (!fieldData.region) {
      console.log(`   ⚠️  ${fieldName} - no region in ocrMapping (skipped)`);
      continue;
    }

    const found = findFieldInStructure(fieldName, sections);
    if (found) {
      if (found.region) {
        console.log(`   ✅ ${fieldName} - found with coordinates`);
        mapped++;
      } else {
        console.log(`   ⚠️  ${fieldName} - found but missing region (found object keys: ${Object.keys(found).join(', ')})`);
        notFound++;
        missing.push(`${page}/${fieldName}`);
      }
    } else {
      console.log(`   ❌ ${fieldName} - NOT FOUND in structure`);
      notFound++;
      missing.push(`${page}/${fieldName}`);
    }
  }

  return { mapped, notFound, missing };
}

function findFieldInStructure(fieldName, sections) {
  for (const [sectionName, sectionData] of Object.entries(sections)) {
    const found = findFieldRecursive(fieldName, sectionData.fields);
    if (found) return found;
  }
  return null;
}

function findFieldRecursive(fieldName, fields) {
  if (!Array.isArray(fields)) return null;

  // FIRST PASS: Check current level for exact match with coordinates
  for (const field of fields) {
    if (typeof field === 'object' && field !== null && field.name === fieldName) {
      return field; // Return immediately if found at current level
    }
  }

  // SECOND PASS: Check for string fields at current level
  for (const field of fields) {
    if (typeof field === 'string' && field === fieldName) {
      return { name: fieldName }; // String field without coordinates
    }
  }

  // THIRD PASS: Recursively check subfields and options ONLY if not found at current level
  for (const field of fields) {
    if (typeof field === 'object' && field !== null) {
      // Check subfields
      if (Array.isArray(field.subfields)) {
        const found = findFieldRecursive(fieldName, field.subfields);
        if (found) return found;
      }

      // Check options
      if (Array.isArray(field.options)) {
        const found = findFieldRecursive(fieldName, field.options);
        if (found) return found;
      }
    }
  }

  return null;
}

if (require.main === module) {
  const result = validateCompleteRemap();
  process.exit(result.allMapped ? 0 : 1);
}

module.exports = { validateCompleteRemap };

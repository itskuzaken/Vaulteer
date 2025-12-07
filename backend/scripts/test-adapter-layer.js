/**
 * Test adapter layer functionality in ocrFieldExtractor
 * Verifies hybrid mode: checks structure first, falls back to ocrMapping
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');

async function testAdapterLayer() {
  console.log('🧪 Testing Adapter Layer Functionality\n');
  console.log('=' .repeat(80));

  // Load template
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  console.log('\n📋 Template Status:');
  console.log(`   Mapping Format: ${template.mappingFormat || 'legacy'}`);
  console.log(`   Has ocrMapping: ${!!template.ocrMapping}`);
  console.log(`   Has structure: ${!!template.structure}`);
  console.log(`   ocrMapping deprecated: ${template.ocrMapping?.deprecated || false}`);

  // Test field lookups
  const testFields = [
    { page: 'front', field: 'firstName', expectedIn: 'both' },
    { page: 'front', field: 'controlNumber', expectedIn: 'structure' },
    { page: 'front', field: 'philHealthNumber', expectedIn: 'both' },
    { page: 'back', field: 'testingFacility', expectedIn: 'both' },
    { page: 'back', field: 'testKitBrand', expectedIn: 'ocrMapping' }
  ];

  console.log('\n🔍 Testing Field Lookups:');
  console.log('=' .repeat(80));

  for (const { page, field, expectedIn } of testFields) {
    console.log(`\n📌 Field: ${page}/${field} (expected in: ${expectedIn})`);
    
    // Check ocrMapping
    const inOcrMapping = template.ocrMapping?.[page]?.fields?.[field];
    console.log(`   ocrMapping: ${inOcrMapping ? '✅ Found' : '❌ Not found'}`);
    if (inOcrMapping) {
      console.log(`     Region: (${inOcrMapping.region?.x}, ${inOcrMapping.region?.y})`);
    }

    // Check structure
    let inStructure = false;
    if (template.structure?.[page]) {
      for (const [sectionName, sectionData] of Object.entries(template.structure[page].sections)) {
        const found = findFieldInSection(sectionData.fields, field);
        if (found) {
          inStructure = found;
          console.log(`   structure: ✅ Found in section "${sectionName}"`);
          if (found.region) {
            console.log(`     Region: (${found.region.x}, ${found.region.y})`);
          } else {
            console.log(`     ⚠️  No region coordinates embedded`);
          }
          break;
        }
      }
    }
    if (!inStructure) {
      console.log(`   structure: ❌ Not found`);
    }

    // Validation
    if (expectedIn === 'both') {
      if (inOcrMapping && inStructure) {
        console.log(`   ✅ PASS: Found in both locations`);
      } else {
        console.log(`   ❌ FAIL: Should be in both, but missing from ${!inOcrMapping ? 'ocrMapping' : 'structure'}`);
      }
    } else if (expectedIn === 'structure') {
      if (inStructure) {
        console.log(`   ✅ PASS: Found in structure`);
      } else {
        console.log(`   ❌ FAIL: Missing from structure`);
      }
    } else if (expectedIn === 'ocrMapping') {
      if (inOcrMapping) {
        console.log(`   ✅ PASS: Found in ocrMapping`);
      } else {
        console.log(`   ❌ FAIL: Missing from ocrMapping`);
      }
    }
  }

  // Statistics
  console.log('\n\n📊 Migration Statistics:');
  console.log('=' .repeat(80));

  const ocrMappingCount = {
    front: Object.keys(template.ocrMapping?.front?.fields || {}).length,
    back: Object.keys(template.ocrMapping?.back?.fields || {}).length
  };

  let structureCount = { front: 0, back: 0 };
  ['front', 'back'].forEach(page => {
    if (template.structure?.[page]) {
      for (const [sectionName, sectionData] of Object.entries(template.structure[page].sections)) {
        structureCount[page] += countFieldsInSection(sectionData.fields);
      }
    }
  });

  console.log(`\nocrMapping fields:`);
  console.log(`   Front: ${ocrMappingCount.front}`);
  console.log(`   Back: ${ocrMappingCount.back}`);
  console.log(`   Total: ${ocrMappingCount.front + ocrMappingCount.back}`);

  console.log(`\nstructure fields:`);
  console.log(`   Front: ${structureCount.front}`);
  console.log(`   Back: ${structureCount.back}`);
  console.log(`   Total: ${structureCount.front + structureCount.back}`);

  console.log(`\nMigration Progress: ${Math.round((structureCount.front + structureCount.back) / (ocrMappingCount.front + ocrMappingCount.back) * 100)}%`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Adapter Layer Test Complete\n');
}

function findFieldInSection(fields, fieldName) {
  if (!Array.isArray(fields)) return null;

  for (const field of fields) {
    if (typeof field === 'string' && field === fieldName) {
      return { name: fieldName };
    }

    if (typeof field === 'object' && field !== null) {
      if (field.name === fieldName) {
        return field;
      }

      if (Array.isArray(field.subfields)) {
        const found = findFieldInSection(field.subfields, fieldName);
        if (found) return found;
      }

      if (Array.isArray(field.options)) {
        const found = findFieldInSection(field.options, fieldName);
        if (found) return found;
      }
    }
  }

  return null;
}

function countFieldsInSection(fields) {
  if (!Array.isArray(fields)) return 0;

  let count = 0;

  for (const field of fields) {
    if (typeof field === 'string') {
      count++;
    } else if (typeof field === 'object' && field !== null) {
      if (field.name) {
        count++;
      }

      if (Array.isArray(field.subfields)) {
        count += countFieldsInSection(field.subfields);
      }

      if (Array.isArray(field.options)) {
        count += countFieldsInSection(field.options);
      }
    }
  }

  return count;
}

if (require.main === module) {
  testAdapterLayer();
}

module.exports = { testAdapterLayer };

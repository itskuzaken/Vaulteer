/**
 * Complete coordinate remapping to new sectionMapping structure
 * Ensures ALL fields in structure have embedded region coordinates from ocrMapping
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const BACKUP_PATH = path.join(__dirname, '../assets/form-templates/hts/backups', `template-pre-remap-${Date.now()}.json`);

function remapAllCoordinates() {
  console.log('🗺️  Starting complete coordinate remapping...\n');

  // Load template
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  // Backup current state
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(template, null, 2));
  console.log(`📦 Backup created: ${path.basename(BACKUP_PATH)}\n`);

  if (!template.ocrMapping || !template.structure) {
    console.error('❌ Missing ocrMapping or structure sections');
    process.exit(1);
  }

  let totalMapped = 0;
  let alreadyMapped = 0;
  let notFound = [];

  // Process front page
  console.log('📄 Mapping FRONT page coordinates...');
  const frontResult = remapPageCoordinates(
    template.structure.front.sections,
    template.ocrMapping.front.fields,
    'front'
  );
  totalMapped += frontResult.mapped;
  alreadyMapped += frontResult.alreadyMapped;
  notFound.push(...frontResult.notFound);

  // Process back page
  console.log('\n📄 Mapping BACK page coordinates...');
  const backResult = remapPageCoordinates(
    template.structure.back.sections,
    template.ocrMapping.back.fields,
    'back'
  );
  totalMapped += backResult.mapped;
  alreadyMapped += backResult.alreadyMapped;
  notFound.push(...backResult.notFound);

  // Save updated template
  fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2));

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ Coordinate remapping completed!');
  console.log(`   Newly mapped: ${totalMapped}`);
  console.log(`   Already had coordinates: ${alreadyMapped}`);
  console.log(`   Not found in ocrMapping: ${notFound.length}`);

  if (notFound.length > 0) {
    console.log('\n⚠️  Fields in structure without ocrMapping coordinates:');
    notFound.forEach(field => {
      console.log(`   - ${field.page}/${field.section}/${field.name}`);
    });
  }

  console.log('\n📊 Statistics:');
  console.log(`   Total fields processed: ${totalMapped + alreadyMapped + notFound.length}`);
  console.log(`   Coverage: ${Math.round((totalMapped + alreadyMapped) / (totalMapped + alreadyMapped + notFound.length) * 100)}%`);

  return { totalMapped, alreadyMapped, notFound };
}

function remapPageCoordinates(sections, ocrFields, page) {
  let mapped = 0;
  let alreadyMapped = 0;
  let notFound = [];

  for (const [sectionName, sectionData] of Object.entries(sections)) {
    console.log(`   Section: ${sectionName}`);
    
    const result = remapFieldsRecursive(
      sectionData.fields,
      ocrFields,
      page,
      sectionName
    );
    
    mapped += result.mapped;
    alreadyMapped += result.alreadyMapped;
    notFound.push(...result.notFound);
  }

  return { mapped, alreadyMapped, notFound };
}

function remapFieldsRecursive(fields, ocrFields, page, sectionName, depth = 0) {
  let mapped = 0;
  let alreadyMapped = 0;
  let notFound = [];

  if (!Array.isArray(fields)) return { mapped, alreadyMapped, notFound };

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (typeof field === 'string') {
      // Convert string to object with coordinates
      const fieldName = field;
      
      if (ocrFields[fieldName]) {
        const ocrField = ocrFields[fieldName];
        fields[i] = {
          name: fieldName,
          ...(ocrField.region && { region: ocrField.region }),
          ...(ocrField.boundingBox && { boundingBox: ocrField.boundingBox }),
          ...(ocrField.label && { label: ocrField.label }),
          ...(ocrField.type && { type: ocrField.type }),
          ...(ocrField.extractionMethod && { extractionMethod: ocrField.extractionMethod }),
          ...(ocrField.query && { query: ocrField.query }),
          ...(ocrField.pattern && { pattern: ocrField.pattern }),
          ...(ocrField.required !== undefined && { required: ocrField.required }),
          ...(ocrField.priority && { priority: ocrField.priority }),
          ...(ocrField.nearbyLabel && { nearbyLabel: ocrField.nearbyLabel }),
          ...(ocrField.validation && { validation: ocrField.validation }),
          ...(ocrField.options && { options: ocrField.options }),
          ...(ocrField.checkboxes && { checkboxes: ocrField.checkboxes }),
          ...(ocrField.sections && { sections: ocrField.sections })
        };
        mapped++;
        console.log(`      ✅ Mapped: ${fieldName}`);
      } else {
        notFound.push({ page, section: sectionName, name: fieldName });
        console.log(`      ⚠️  Not found in ocrMapping: ${fieldName}`);
      }
      
    } else if (typeof field === 'object' && field !== null) {
      const fieldName = field.name;
      
      if (!fieldName) {
        console.log(`      ⚠️  Field without name property at index ${i}`);
        continue;
      }

      // Check if already has region
      if (field.region) {
        alreadyMapped++;
        console.log(`      ↩️  Already has coordinates: ${fieldName}`);
      } else if (ocrFields[fieldName]) {
        // Embed coordinates from ocrMapping
        const ocrField = ocrFields[fieldName];
        Object.assign(field, {
          ...(ocrField.region && { region: ocrField.region }),
          ...(ocrField.boundingBox && { boundingBox: ocrField.boundingBox }),
          ...(ocrField.label && { label: ocrField.label }),
          ...(ocrField.type && { type: ocrField.type }),
          ...(ocrField.extractionMethod && { extractionMethod: ocrField.extractionMethod }),
          ...(ocrField.query && { query: ocrField.query }),
          ...(ocrField.pattern && { pattern: ocrField.pattern }),
          ...(ocrField.required !== undefined && { required: ocrField.required }),
          ...(ocrField.priority && { priority: ocrField.priority }),
          ...(ocrField.nearbyLabel && { nearbyLabel: ocrField.nearbyLabel }),
          ...(ocrField.validation && { validation: ocrField.validation }),
          ...(ocrField.options && { options: ocrField.options }),
          ...(ocrField.checkboxes && { checkboxes: ocrField.checkboxes }),
          ...(ocrField.sections && { sections: ocrField.sections })
        });
        mapped++;
        console.log(`      ✅ Mapped: ${fieldName}`);
      } else {
        notFound.push({ page, section: sectionName, name: fieldName });
        console.log(`      ⚠️  Not found in ocrMapping: ${fieldName}`);
      }

      // Recursively process subfields
      if (Array.isArray(field.subfields)) {
        const subResult = remapFieldsRecursive(
          field.subfields,
          ocrFields,
          page,
          sectionName,
          depth + 1
        );
        mapped += subResult.mapped;
        alreadyMapped += subResult.alreadyMapped;
        notFound.push(...subResult.notFound);
      }

      // Recursively process options
      if (Array.isArray(field.options)) {
        const optResult = remapFieldsRecursive(
          field.options,
          ocrFields,
          page,
          sectionName,
          depth + 1
        );
        mapped += optResult.mapped;
        alreadyMapped += optResult.alreadyMapped;
        notFound.push(...optResult.notFound);
      }
    }
  }

  return { mapped, alreadyMapped, notFound };
}

if (require.main === module) {
  remapAllCoordinates();
}

module.exports = { remapAllCoordinates };

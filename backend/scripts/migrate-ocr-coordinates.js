/**
 * Migrate OCR coordinates from flat ocrMapping to nested structure format
 * Embeds region/boundingBox/extractionMethod/query into structure.sections.fields
 * Preserves all 107 calibrated coordinate regions
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');

function migrateOcrCoordinates() {
  console.log('🔄 Starting OCR coordinate migration...\n');

  // Read current template
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  if (!template.ocrMapping) {
    console.error('❌ No ocrMapping found');
    process.exit(1);
  }

  if (!template.structure) {
    console.error('❌ No structure section found');
    process.exit(1);
  }

  let migratedCount = 0;
  let unmappedFields = [];

  // Process front page sections
  console.log('📄 Migrating FRONT page coordinates...');
  for (const [sectionName, sectionData] of Object.entries(template.structure.front.sections)) {
    console.log(`   Processing section: ${sectionName}`);
    
    const migratedFields = migrateFieldsInSection(
      sectionData.fields,
      template.ocrMapping.front.fields,
      'front',
      sectionName,
      unmappedFields
    );
    
    migratedCount += migratedFields;
  }

  // Process back page sections
  console.log('\n📄 Migrating BACK page coordinates...');
  for (const [sectionName, sectionData] of Object.entries(template.structure.back.sections)) {
    console.log(`   Processing section: ${sectionName}`);
    
    const migratedFields = migrateFieldsInSection(
      sectionData.fields,
      template.ocrMapping.back.fields,
      'back',
      sectionName,
      unmappedFields
    );
    
    migratedCount += migratedFields;
  }

  // Add metadata
  template.mappingFormat = 'hybrid-v1';
  template.migrationDate = new Date().toISOString();
  template.lastUpdated = new Date().toISOString().split('T')[0];

  // Mark ocrMapping as deprecated
  template.ocrMapping.deprecated = true;
  template.ocrMapping.deprecationReason = 'Migrated to structure.sections.fields format. Will be removed in next major version.';
  template.ocrMapping.deprecationDate = new Date().toISOString();

  // Write updated template
  fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2));

  // Summary
  console.log('\n✅ Migration completed!');
  console.log(`   Migrated fields: ${migratedCount}`);
  console.log(`   Unmapped fields: ${unmappedFields.length}`);
  
  if (unmappedFields.length > 0) {
    console.log('\n⚠️  Fields in structure without coordinates:');
    unmappedFields.forEach(field => {
      console.log(`   - ${field.page}/${field.section}/${field.name}`);
    });
  }

  return { migratedCount, unmappedFields };
}

/**
 * Recursively migrate fields and embed coordinates
 */
function migrateFieldsInSection(fields, ocrFields, page, sectionName, unmappedFields) {
  let count = 0;

  if (!Array.isArray(fields)) {
    console.error(`   ⚠️  Invalid fields structure in ${sectionName}`);
    return count;
  }

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (typeof field === 'string') {
      // Simple field: 'fieldName'
      const fieldName = field;
      
      if (ocrFields[fieldName]) {
        // Convert string to object with coordinates
        fields[i] = {
          name: fieldName,
          ...ocrFields[fieldName]
        };
        count++;
      } else {
        unmappedFields.push({ page, section: sectionName, name: fieldName });
      }
      
    } else if (typeof field === 'object' && field !== null) {
      // Complex field: { name: 'fieldName', type: 'composite', subfields: [...] }
      
      if (field.name) {
        const fieldName = field.name;
        
        // Check if parent field has coordinates
        if (ocrFields[fieldName]) {
          Object.assign(field, {
            region: ocrFields[fieldName].region,
            label: ocrFields[fieldName].label,
            extractionMethod: ocrFields[fieldName].extractionMethod,
            ...(ocrFields[fieldName].query && { query: ocrFields[fieldName].query }),
            ...(ocrFields[fieldName].boundingBox && { boundingBox: ocrFields[fieldName].boundingBox }),
            ...(ocrFields[fieldName].pattern && { pattern: ocrFields[fieldName].pattern }),
            ...(ocrFields[fieldName].required !== undefined && { required: ocrFields[fieldName].required }),
            ...(ocrFields[fieldName].priority && { priority: ocrFields[fieldName].priority })
          });
          count++;
        }
        
        // Recursively process subfields
        if (Array.isArray(field.subfields)) {
          for (let j = 0; j < field.subfields.length; j++) {
            const subfield = field.subfields[j];
            
            if (typeof subfield === 'string' && ocrFields[subfield]) {
              // Convert subfield string to object with coordinates
              field.subfields[j] = {
                name: subfield,
                ...ocrFields[subfield]
              };
              count++;
            }
          }
        }
        
        // Recursively process options (for checkbox-group, conditional fields)
        if (Array.isArray(field.options)) {
          for (let j = 0; j < field.options.length; j++) {
            const option = field.options[j];
            
            if (typeof option === 'string' && ocrFields[option]) {
              // Convert option string to object with coordinates
              field.options[j] = {
                name: option,
                ...ocrFields[option]
              };
              count++;
            } else if (typeof option === 'object' && option.value && ocrFields[option.value]) {
              // Option with value property
              Object.assign(option, ocrFields[option.value]);
              count++;
              
              // Recursively process option subfields
              if (Array.isArray(option.subfields)) {
                const subCount = migrateFieldsInSection(option.subfields, ocrFields, page, sectionName, unmappedFields);
                count += subCount;
              }
            }
          }
        }
      }
    }
  }

  return count;
}

if (require.main === module) {
  migrateOcrCoordinates();
}

module.exports = { migrateOcrCoordinates };

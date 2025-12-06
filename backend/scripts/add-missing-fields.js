/**
 * Add missing ocrMapping fields to structure with their coordinates
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const BACKUP_PATH = path.join(__dirname, '../assets/form-templates/hts/backups', `template-pre-missing-fields-${Date.now()}.json`);

// Manual mapping of ocrMapping fields to structure sections
const FIELD_TO_SECTION_MAP = {
  // Front page
  'parentalCode': { page: 'front', section: 'DEMOGRAPHIC DATA', insertAfter: 'lastName' },
  'workedOverseas': { page: 'front', section: 'EDUCATION & OCCUPATION', insertAfter: 'currentlyWorking' },
  'overseasReturnYear': { page: 'front', section: 'EDUCATION & OCCUPATION', insertAfter: 'workedOverseas' },
  
  // Back page - Risk Assessment (parent field)
  'riskAssessment': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'motherHIV' },
  'riskSexMaleStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskAssessment' },
  'riskSexMaleTotal': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexMaleStatus' },
  'riskSexMaleDate1': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexMaleTotal' },
  'riskSexFemaleStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexMaleDate1' },
  'riskSexFemaleTotal': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexFemaleStatus' },
  'riskSexFemaleDate1': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexFemaleTotal' },
  'riskPaidForSexStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexFemaleDate1' },
  'riskReceivedPaymentStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskPaidForSexStatus' },
  'riskSexUnderDrugsStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskReceivedPaymentStatus' },
  'riskSharedNeedlesStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSexUnderDrugsStatus' },
  'riskBloodTransfusionStatus': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskSharedNeedlesStatus' },
  'riskBloodTransfusionDate': { page: 'back', section: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', insertAfter: 'riskBloodTransfusionStatus' },
  
  // Reasons for testing (parent field)
  'reasonsForTesting': { page: 'back', section: 'REASONS FOR HIV TESTING', insertAt: 'start' },
  
  // Previous test details
  'previousTestResult': { page: 'back', section: 'PREVIOUS HIV TEST', insertAfter: 'previouslyTested' },
  'previousTestDate': { page: 'back', section: 'PREVIOUS HIV TEST', insertAfter: 'previousTestResult' },
  'previousTestCity': { page: 'back', section: 'PREVIOUS HIV TEST', insertAfter: 'previousTestDate' },
  
  // Medical history
  'symptoms': { page: 'back', section: 'MEDICAL HISTORY & CLINICAL PICTURE', insertAfter: 'clinicalPicture' },
  
  // Testing details
  'testingAccepted': { page: 'back', section: 'TESTING DETAILS', insertAfter: 'modeOfReach' },
  'testingModality': { page: 'back', section: 'TESTING DETAILS', insertAfter: 'testingAccepted' },
  'linkageToCare': { page: 'back', section: 'TESTING DETAILS', insertAt: 'end' },
  'otherServices': { page: 'back', section: 'TESTING DETAILS', insertAt: 'end' },
  
  // HTS Provider details
  'counselorName': { page: 'back', section: 'HTS PROVIDER DETAILS', insertAfter: 'facilityEmail' },
  'counselorRole': { page: 'back', section: 'HTS PROVIDER DETAILS', insertAfter: 'counselorName' },
  'counselorSignature': { page: 'back', section: 'HTS PROVIDER DETAILS', insertAfter: 'counselorRole' },
  'formCompletionDate': { page: 'back', section: 'HTS PROVIDER DETAILS', insertAt: 'end' }
};

function addMissingFields() {
  console.log('🔧 Adding missing ocrMapping fields to structure...\n');

  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  // Backup
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(template, null, 2));
  console.log(`📦 Backup created: ${path.basename(BACKUP_PATH)}\n`);

  let addedCount = 0;

  for (const [fieldName, mapping] of Object.entries(FIELD_TO_SECTION_MAP)) {
    const ocrField = template.ocrMapping[mapping.page].fields[fieldName];
    
    if (!ocrField) {
      console.log(`⚠️  ${fieldName} - not found in ocrMapping, skipping`);
      continue;
    }

    if (!ocrField.region && !ocrField.boundingBox) {
      console.log(`⚠️  ${fieldName} - no coordinates in ocrMapping, skipping`);
      continue;
    }

    const section = template.structure[mapping.page].sections[mapping.section];
    if (!section) {
      console.log(`❌ ${fieldName} - section "${mapping.section}" not found`);
      continue;
    }

    // Create field object with coordinates
    const newField = {
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

    // Insert field
    if (mapping.insertAt === 'start') {
      section.fields.unshift(newField);
      console.log(`✅ ${fieldName} - added at start of ${mapping.section}`);
    } else if (mapping.insertAt === 'end') {
      section.fields.push(newField);
      console.log(`✅ ${fieldName} - added at end of ${mapping.section}`);
    } else if (mapping.insertAfter) {
      const index = section.fields.findIndex(f => 
        (typeof f === 'string' && f === mapping.insertAfter) ||
        (typeof f === 'object' && f.name === mapping.insertAfter)
      );
      
      if (index !== -1) {
        section.fields.splice(index + 1, 0, newField);
        console.log(`✅ ${fieldName} - added after ${mapping.insertAfter} in ${mapping.section}`);
      } else {
        section.fields.push(newField);
        console.log(`⚠️  ${fieldName} - ${mapping.insertAfter} not found, added at end of ${mapping.section}`);
      }
    }

    addedCount++;
  }

  // Save updated template
  fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Added ${addedCount} missing fields to structure`);
  console.log(`📄 Updated: ${TEMPLATE_PATH}`);

  return { addedCount };
}

if (require.main === module) {
  addMissingFields();
}

module.exports = { addMissingFields };

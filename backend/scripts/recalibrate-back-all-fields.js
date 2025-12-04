/**
 * Complete Back Page Recalibration - ALL FIELDS
 * Combines QUERIES and FORMS APIs for maximum detection
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');

// Configuration
const templateMetadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const backImagePath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-back.jpg');

// Initialize Textract client
const textractClient = new TextractClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Prepare image for Textract
 */
async function prepareImageForTextract(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  console.log(`Original image: ${metadata.width}x${metadata.height}`);

  if (metadata.width > 4000 || metadata.height > 4000) {
    const resized = await sharp(imageBuffer)
      .resize(4000, 4000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 95 })
      .toBuffer();
    
    const newMeta = await sharp(resized).metadata();
    console.log(`Resized to: ${newMeta.width}x${newMeta.height}`);
    return resized;
  }

  return imageBuffer;
}

/**
 * Generate queries for back page fields - Starting from TOP
 */
function generateQueryBatches() {
  const batch1 = [
    // TOP OF FORM - Birth mother HIV question
    { Alias: 'motherHIV', Text: 'Did your birth mother have HIV when you were born? Answer Yes or No.' },
    
    // RISK ASSESSMENT - Sex partners
    { Alias: 'sexWithMale', Text: 'Did the person have sex with a male? Answer Yes or No.' },
    { Alias: 'sexWithMaleTotal', Text: 'How many total male sex partners including transgender?' },
    { Alias: 'sexWithMaleDate', Text: 'What is the date of most recent sex with male in MM/YYYY?' },
    { Alias: 'sexWithFemale', Text: 'Did the person have sex with a female? Answer Yes or No.' },
    { Alias: 'sexWithFemaleTotal', Text: 'How many total female sex partners?' },
    { Alias: 'sexWithFemaleDate', Text: 'What is the date of most recent sex with female in MM/YYYY?' },
    
    // RISK ASSESSMENT - Payment for sex
    { Alias: 'paidForSex', Text: 'Did the person pay for sex in cash or kind? Answer Yes or No.' },
    { Alias: 'paidForSexDate', Text: 'When did they last pay for sex in MM/YYYY?' },
    { Alias: 'receivedPaymentSex', Text: 'Did they receive payment for sex? Answer Yes or No.' },
    { Alias: 'receivedPaymentDate', Text: 'When did they last receive payment for sex in MM/YYYY?' },
    
    // RISK ASSESSMENT - Drugs and needles
    { Alias: 'sexUnderDrugs', Text: 'Did they have sex under influence of drugs? Answer Yes or No.' },
    { Alias: 'sexUnderDrugsDate', Text: 'When was the last time having sex under drugs in MM/YYYY?' },
    { Alias: 'sharedNeedles', Text: 'Did they share needles for drug injection? Answer Yes or No.' },
    { Alias: 'sharedNeedlesDate', Text: 'When did they last share needles in MM/YYYY?' }
  ];
  
  const batch2 = [
    // RISK ASSESSMENT - Blood and occupational
    { Alias: 'bloodTransfusion', Text: 'Did they receive blood transfusion? Answer Yes or No.' },
    { Alias: 'bloodTransfusionDate', Text: 'When did they receive blood transfusion in MM/YYYY?' },
    { Alias: 'occupationalExposure', Text: 'Was there occupational exposure like needlestick? Answer Yes or No.' },
    { Alias: 'occupationalDate', Text: 'When was the occupational exposure in MM/YYYY?' },
    
    // REASONS FOR TESTING
    { Alias: 'testReasonExposure', Text: 'Is possible exposure to HIV a reason for testing? Answer Yes or No.' },
    { Alias: 'testReasonPregnancy', Text: 'Is pregnancy a reason for testing? Answer Yes or No.' },
    { Alias: 'testReasonSymptoms', Text: 'Are HIV symptoms a reason for testing? Answer Yes or No.' },
    { Alias: 'testReasonPartner', Text: 'Is partner having HIV a reason for testing? Answer Yes or No.' },
    { Alias: 'testReasonReferred', Text: 'Was the person referred by physician for testing? Answer Yes or No.' },
    { Alias: 'testReasonEmployment', Text: 'Is employment overseas or local a reason for testing? Answer Yes or No.' },
    { Alias: 'testReasonInsurance', Text: 'Is requirement for insurance a reason for testing? Answer Yes or No.' },
    { Alias: 'testReasonOther', Text: 'What is the other reason for HIV testing if specified?' },
    { Alias: 'testReasonMessage', Text: 'Did a text message or email encourage the person to get tested? Answer Yes or No.' },
    
    // PREVIOUS HIV TEST
    { Alias: 'previouslyTested', Text: 'Have you ever been tested for HIV before? Answer Yes or No.' }
  ];
  
  const batch3 = [
    // PREVIOUS TEST DETAILS
    { Alias: 'previousTestDate', Text: 'If previously tested, what is the date of the most recent HIV test in MM/YYYY?' },
    { Alias: 'previousTestFacility', Text: 'Which HTS provider facility or organization did the previous test?' },
    { Alias: 'previousTestCity', Text: 'What city or municipality was the previous HIV test done in?' },
    { Alias: 'previousTestResult', Text: 'What was the result of the previous HIV test? Reactive, Non-reactive, Indeterminate, or Unable to get result?' },
    
    // MEDICAL HISTORY
    { Alias: 'medicalHistoryTB', Text: 'Is the person a current TB patient? Answer Yes or No.' },
    { Alias: 'medicalHistorySTI', Text: 'Has the person been diagnosed with other STIs? Answer Yes or No.' },
    { Alias: 'medicalHistoryHepB', Text: 'Does the person have Hepatitis B? Answer Yes or No.' },
    { Alias: 'medicalHistoryHepC', Text: 'Does the person have Hepatitis C? Answer Yes or No.' },
    { Alias: 'medicalHistoryPEP', Text: 'Is the person taking or has taken PEP? Answer Yes or No.' },
    { Alias: 'medicalHistoryPrEP', Text: 'Is the person taking or has taken PrEP? Answer Yes or No.' },
    
    // CLINICAL PICTURE & WHO STAGING
    { Alias: 'clinicalPicture', Text: 'Is the patient asymptomatic or symptomatic?' },
    { Alias: 'symptoms', Text: 'Describe the signs and symptoms if symptomatic.' },
    { Alias: 'whoStaging', Text: 'What is the WHO clinical staging? Stage 1, 2, 3, or 4?' },
    
    // CLIENT TYPE & VENUE
    { Alias: 'clientType', Text: 'What is the client type? Walk-in/outpatient, Admitted, Emergency, or Outreach?' },
    { Alias: 'testingVenue', Text: 'What is the testing venue? Facility-based, Mobile HTS, Community-based, or Self-testing?' }
  ];
  
  const batch4 = [
    // MODE OF REACH
    { Alias: 'modeOfReach', Text: 'What is the mode of reach? Clinical, Online, Index testing, Social network, or Outreach?' },
    
    // HIV TESTING STATUS
    { Alias: 'testingAccepted', Text: 'Did the person accept or refuse HIV testing?' },
    { Alias: 'refusalReason', Text: 'If refused, what is the reason for refusing HIV testing?' },
    { Alias: 'testingModality', Text: 'What is the HIV testing modality? Facility-based, Non-laboratory, Community-based, or Self-testing?' },
    
    // TEST KIT INFORMATION
    { Alias: 'testKitBrand', Text: 'What is the brand name of the HIV test kit used?' },
    { Alias: 'testKitLotNumber', Text: 'What is the lot number of the HIV test kit?' },
    { Alias: 'testKitExpiration', Text: 'What is the expiration date of the HIV test kit in MM/DD/YYYY?' },
    
    // TESTING FACILITY
    { Alias: 'testingFacility', Text: 'What is the name of the testing facility or organization?' },
    { Alias: 'facilityAddress', Text: 'What is the complete mailing address of the testing facility?' },
    { Alias: 'facilityContact', Text: 'What are the contact numbers of the testing facility?' },
    { Alias: 'facilityEmail', Text: 'What is the email address of the testing facility?' },
    
    // SERVICE PROVIDER
    { Alias: 'counselorName', Text: 'What is the name of the HIV counselor or service provider?' },
    { Alias: 'counselorRole', Text: 'What is the role of the service provider? HIV Counsellor, Medical Doctor, Nurse, Midwife, etc?' },
    { Alias: 'counselorSignatureDate', Text: 'What is the date of the service provider signature in MM/DD/YYYY?' }
  ];
  
  const batch5 = [
    // OTHER SERVICES PROVIDED TO CLIENT (Section 25)
    { Alias: 'servicesIEC', Text: 'Were IEC materials or information provided to the client? Answer Yes or No.' },
    { Alias: 'servicesCondoms', Text: 'Were condoms provided to the client? Answer Yes or No.' },
    { Alias: 'servicesPEP', Text: 'Was PEP referral or provision done for the client? Answer Yes or No.' },
    { Alias: 'servicesPrEP', Text: 'Was PrEP referral or provision done for the client? Answer Yes or No.' },
    { Alias: 'servicesSTI', Text: 'Was STI screening or treatment provided to the client? Answer Yes or No.' },
    { Alias: 'servicesTB', Text: 'Was TB screening or referral provided to the client? Answer Yes or No.' },
    { Alias: 'servicesHepB', Text: 'Was Hepatitis B screening or vaccination provided to the client? Answer Yes or No.' },
    { Alias: 'servicesART', Text: 'Was ART linkage or referral provided to the client? Answer Yes or No.' },
    { Alias: 'servicesOther', Text: 'What other services were provided to the client if any?' }
  ];
  
  return { batch1, batch2, batch3, batch4, batch5 };
}

/**
 * Analyze with QUERIES
 */
async function analyzeWithQueries(imageBuffer, queries) {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['QUERIES'],
    QueriesConfig: { Queries: queries }
  });
  return await textractClient.send(command);
}

/**
 * Analyze with FORMS
 */
async function analyzeWithForms(imageBuffer) {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['FORMS', 'TABLES']
  });
  return await textractClient.send(command);
}

/**
 * Extract query results
 */
function extractQueryResults(blocks) {
  const results = {};
  const queryBlocks = blocks.filter(b => b.BlockType === 'QUERY');
  const queryResultBlocks = blocks.filter(b => b.BlockType === 'QUERY_RESULT');
  
  for (const query of queryBlocks) {
    const alias = query.Query?.Alias;
    if (!alias) continue;
    
    const resultRelation = query.Relationships?.find(r => r.Type === 'ANSWER');
    if (!resultRelation || !resultRelation.Ids || resultRelation.Ids.length === 0) continue;
    
    const resultId = resultRelation.Ids[0];
    const resultBlock = queryResultBlocks.find(b => b.Id === resultId);
    
    if (resultBlock && resultBlock.Text) {
      results[alias] = {
        text: resultBlock.Text,
        confidence: resultBlock.Confidence || 0,
        bbox: resultBlock.Geometry?.BoundingBox,
        method: 'query'
      };
    }
  }
  
  return results;
}

/**
 * Extract FORMS key-value pairs
 */
function extractKeyValuePairs(blocks) {
  const kvPairs = [];
  const keyBlocks = blocks.filter(b => b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes?.includes('KEY'));
  
  for (const keyBlock of keyBlocks) {
    const valueRelation = keyBlock.Relationships?.find(r => r.Type === 'VALUE');
    if (!valueRelation) continue;
    
    const valueBlock = blocks.find(b => valueRelation.Ids.includes(b.Id));
    if (!valueBlock) continue;
    
    const keyText = extractText(keyBlock, blocks);
    const valueText = extractText(valueBlock, blocks);
    
    if (keyText && valueText) {
      kvPairs.push({
        key: keyText.trim(),
        value: valueText.trim(),
        valueBBox: valueBlock.Geometry?.BoundingBox,
        confidence: Math.min(keyBlock.Confidence || 0, valueBlock.Confidence || 0),
        method: 'forms'
      });
    }
  }
  
  return kvPairs;
}

function extractText(block, allBlocks) {
  const childRelation = block.Relationships?.find(r => r.Type === 'CHILD');
  if (!childRelation) return '';
  
  const childTexts = childRelation.Ids
    .map(id => allBlocks.find(b => b.Id === id))
    .filter(b => b && b.Text)
    .map(b => b.Text);
  
  return childTexts.join(' ');
}

/**
 * Extract SELECTION_ELEMENT (checkboxes) with nearby text labels
 * Note: Checkboxes are always to the LEFT of their labels
 */
function extractCheckboxes(blocks) {
  const checkboxes = blocks.filter(b => 
    b.BlockType === 'SELECTION_ELEMENT' && 
    b.SelectionStatus === 'SELECTED'
  );
  
  const textBlocks = blocks.filter(b => b.BlockType === 'WORD' && b.Text);
  
  return checkboxes.map(cb => {
    const cbX = cb.Geometry.BoundingBox.Left;
    const cbY = cb.Geometry.BoundingBox.Top;
    const cbRight = cbX + cb.Geometry.BoundingBox.Width;
    
    // Find text to the RIGHT of checkbox (checkbox is left of label)
    const nearbyTexts = textBlocks
      .filter(txt => {
        const txtX = txt.Geometry.BoundingBox.Left;
        const txtY = txt.Geometry.BoundingBox.Top;
        const verticalDist = Math.abs(txtY - cbY);
        // Text must be to the right (txtX > cbRight) and vertically aligned
        return txtX > cbRight && txtX < (cbRight + 0.2) && verticalDist < 0.015;
      })
      .map(txt => ({
        text: txt.Text,
        x: txt.Geometry.BoundingBox.Left,
        distance: txt.Geometry.BoundingBox.Left - cbRight
      }))
      .sort((a, b) => a.x - b.x); // Sort by x position (left to right)
    
    // Take first 2-3 words to form the label
    const label = nearbyTexts.slice(0, 3).map(t => t.text).join(' ');
    
    return {
      status: cb.SelectionStatus,
      bbox: cb.Geometry?.BoundingBox,
      confidence: cb.Confidence || 0,
      label: label.trim(),
      method: 'checkbox'
    };
  });
}

/**
 * Create expanded field-to-query alias mapping for all individual fields
 */
function getFieldToQueryMap() {
  return {
    // Mother HIV
    'motherHIV': 'motherHIV',
    
    // Risk Assessment - Sex partners (individual fields, not grouped)
    'riskSexMaleStatus': 'sexWithMale',
    'riskSexMaleTotal': 'sexWithMaleTotal',
    'riskSexMaleDate1': 'sexWithMaleDate',
    'riskSexFemaleStatus': 'sexWithFemale',
    'riskSexFemaleTotal': 'sexWithFemaleTotal',
    'riskSexFemaleDate1': 'sexWithFemaleDate',
    
    // Risk Assessment - Payment for sex
    'riskPaidForSexStatus': 'paidForSex',
    'riskPaidForSexDate': 'paidForSexDate',
    'riskReceivedPaymentStatus': 'receivedPaymentSex',
    'riskReceivedPaymentDate': 'receivedPaymentDate',
    
    // Risk Assessment - Drugs and needles
    'riskSexUnderDrugsStatus': 'sexUnderDrugs',
    'riskSexUnderDrugsDate': 'sexUnderDrugsDate',
    'riskSharedNeedlesStatus': 'sharedNeedles',
    'riskSharedNeedlesDate': 'sharedNeedlesDate',
    
    // Risk Assessment - Blood and occupational
    'riskBloodTransfusionStatus': 'bloodTransfusion',
    'riskBloodTransfusionDate': 'bloodTransfusionDate',
    'riskOccupationalStatus': 'occupationalExposure',
    'riskOccupationalDate': 'occupationalDate',
    
    // Reasons for Testing (individual fields, not grouped)
    'testReasonExposure': 'testReasonExposure',
    'testReasonPregnancy': 'testReasonPregnancy',
    'testReasonSymptoms': 'testReasonSymptoms',
    'testReasonPartner': 'testReasonPartner',
    'testReasonReferred': 'testReasonReferred',
    'testReasonEmployment': 'testReasonEmployment',
    'testReasonInsurance': 'testReasonInsurance',
    'testReasonOther': 'testReasonOther',
    'testReasonMessage': 'testReasonMessage',
    
    // Previous HIV Test
    'previouslyTested': 'previouslyTested',
    'previousTestDate': 'previousTestDate',
    'previousTestFacility': 'previousTestFacility',
    'previousTestCity': 'previousTestCity',
    'previousTestResult': 'previousTestResult',
    
    // Medical History (individual fields, not grouped)
    'medicalHistoryTB': 'medicalHistoryTB',
    'medicalHistorySTI': 'medicalHistorySTI',
    'medicalHistoryHepB': 'medicalHistoryHepB',
    'medicalHistoryHepC': 'medicalHistoryHepC',
    'medicalHistoryPEP': 'medicalHistoryPEP',
    'medicalHistoryPrEP': 'medicalHistoryPrEP',
    
    // Clinical Picture & WHO Staging
    'clinicalPicture': 'clinicalPicture',
    'symptoms': 'symptoms',
    'whoStaging': 'whoStaging',
    
    // Client Type & Venue
    'clientType': 'clientType',
    'testingVenue': 'testingVenue',
    'modeOfReach': 'modeOfReach',
    
    // HIV Testing Status (individual field, not grouped)
    'testingAccepted': 'testingAccepted',
    'refusalReason': 'refusalReason',
    'testingModality': 'testingModality',
    
    // Test Kit Information
    'testKitBrand': 'testKitBrand',
    'testKitLotNumber': 'testKitLotNumber',
    'testKitExpiration': 'testKitExpiration',
    
    // Testing Facility
    'testingFacility': 'testingFacility',
    'facilityAddress': 'facilityAddress',
    'facilityContact': 'facilityContact',
    'facilityEmail': 'facilityEmail',
    
    // Service Provider
    'counselorName': 'counselorName',
    'counselorRole': 'counselorRole',
    'counselorSignature': 'counselorSignatureDate',
    
    // Other Services (individual fields, not grouped)
    'servicesIEC': 'servicesIEC',
    'servicesCondoms': 'servicesCondoms',
    'servicesPEP': 'servicesPEP',
    'servicesPrEP': 'servicesPrEP',
    'servicesSTI': 'servicesSTI',
    'servicesTB': 'servicesTB',
    'servicesHepB': 'servicesHepB',
    'servicesART': 'servicesART',
    'servicesOther': 'servicesOther'
  };
}

/**
 * Match field to detection results - individual fields only
 */
function findBestMatch(fieldName, fieldConfig, queryResults, kvPairs, checkboxes) {
  // Get field-to-query mapping
  const fieldToQueryMap = getFieldToQueryMap();
  
  // Priority 1: Query results with alias mapping
  const queryAlias = fieldToQueryMap[fieldName] || fieldName;
  
  if (queryResults[queryAlias]) {
    return queryResults[queryAlias];
  }
  
  // Priority 2: FORMS key-value pairs
  const label = fieldConfig.label?.toLowerCase() || '';
  for (const kv of kvPairs) {
    const kvKey = kv.key.toLowerCase();
    if (kvKey.includes(label) || label.includes(kvKey)) {
      return {
        text: kv.value,
        confidence: kv.confidence,
        bbox: kv.valueBBox,
        method: 'forms'
      };
    }
  }
  
  // Priority 3: Checkbox detection (for checkbox fields with options)
  if (fieldConfig.type === 'checkbox' && checkboxes.length > 0) {
    // If field has options (like Asymptomatic/Symptomatic), match by label and position
    if (fieldConfig.options && fieldConfig.options.length > 0) {
      // Try to match by label text
      for (const option of fieldConfig.options) {
        const optionValue = option.value.toLowerCase();
        const matchingCheckbox = checkboxes.find(cb => {
          const label = cb.label.toLowerCase();
          // Check if the label contains the option value
          return label.includes(optionValue) || 
                 // Check for common variations
                 (optionValue.includes('reactive') && label.includes('reactive')) ||
                 (optionValue.includes('asymptomatic') && label.includes('asymptomatic')) ||
                 (optionValue.includes('symptomatic') && label.includes('symptomatic'));
        });
        
        if (matchingCheckbox) {
          return {
            text: option.value, // Return the actual value
            confidence: matchingCheckbox.confidence,
            bbox: matchingCheckbox.bbox,
            method: 'checkbox'
          };
        }
      }
      
      // Fallback: Match by proximity to option's checkbox coordinates
      for (const option of fieldConfig.options) {
        if (option.checkbox) {
          const optX = option.checkbox.x;
          const optY = option.checkbox.y;
          const matchingCheckbox = checkboxes.find(cb => {
            const distX = Math.abs(cb.bbox.Left - optX);
            const distY = Math.abs(cb.bbox.Top - optY);
            return distX < 0.05 && distY < 0.05;
          });
          
          if (matchingCheckbox) {
            return {
              text: option.value,
              confidence: matchingCheckbox.confidence,
              bbox: matchingCheckbox.bbox,
              method: 'checkbox'
            };
          }
        }
      }
    }
    
    // Fallback: Find checkbox closest to field region
    const fieldY = fieldConfig.region?.y || 0;
    const closestCheckbox = checkboxes
      .map(cb => ({
        ...cb,
        distance: Math.abs(cb.bbox.Top - fieldY)
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    
    if (closestCheckbox && closestCheckbox.distance < 0.15) {
      return {
        text: closestCheckbox.label || closestCheckbox.status,
        confidence: closestCheckbox.confidence,
        bbox: closestCheckbox.bbox,
        method: 'checkbox'
      };
    }
  }
  
  return null;
}

/**
 * Main calibration
 */
async function runCompleteCalibration() {
  try {
    console.log('📤 Loading template metadata...');
    const templateMetadata = JSON.parse(fs.readFileSync(templateMetadataPath, 'utf8'));
    console.log(`✅ Template: ${templateMetadata.name}`);
    console.log();

    console.log('📤 Loading and processing back page image...');
    const backImageBufferRaw = fs.readFileSync(backImagePath);
    const backImageBuffer = await prepareImageForTextract(backImageBufferRaw);
    console.log('✅ Image prepared');
    console.log();

    console.log('🚀 Running Textract - Multiple APIs for maximum detection...');
    console.log('='.repeat(70));
    
    // Run QUERIES in batches
    const { batch1, batch2, batch3, batch4, batch5 } = generateQueryBatches();
    console.log(`📊 QUERIES Batch 1: ${batch1.length} queries...`);
    const queryResult1 = await analyzeWithQueries(backImageBuffer, batch1);
    console.log(`✅ Batch 1: ${queryResult1.Blocks?.length || 0} blocks`);
    
    console.log(`📊 QUERIES Batch 2: ${batch2.length} queries...`);
    const queryResult2 = await analyzeWithQueries(backImageBuffer, batch2);
    console.log(`✅ Batch 2: ${queryResult2.Blocks?.length || 0} blocks`);
    
    console.log(`📊 QUERIES Batch 3: ${batch3.length} queries...`);
    const queryResult3 = await analyzeWithQueries(backImageBuffer, batch3);
    console.log(`✅ Batch 3: ${queryResult3.Blocks?.length || 0} blocks`);
    
    console.log(`📊 QUERIES Batch 4: ${batch4.length} queries...`);
    const queryResult4 = await analyzeWithQueries(backImageBuffer, batch4);
    console.log(`✅ Batch 4: ${queryResult4.Blocks?.length || 0} blocks`);
    
    console.log(`📊 QUERIES Batch 5: ${batch5.length} queries...`);
    const queryResult5 = await analyzeWithQueries(backImageBuffer, batch5);
    console.log(`✅ Batch 5: ${queryResult5.Blocks?.length || 0} blocks`);
    
    // Run FORMS
    console.log(`📊 FORMS + TABLES analysis...`);
    const formsResult = await analyzeWithForms(backImageBuffer);
    console.log(`✅ FORMS: ${formsResult.Blocks?.length || 0} blocks`);
    console.log();

    console.log('🔬 Extracting all detection results...');
    const queryResults1 = extractQueryResults(queryResult1.Blocks || []);
    const queryResults2 = extractQueryResults(queryResult2.Blocks || []);
    const queryResults3 = extractQueryResults(queryResult3.Blocks || []);
    const queryResults4 = extractQueryResults(queryResult4.Blocks || []);
    const queryResults5 = extractQueryResults(queryResult5.Blocks || []);
    const queryResults = { ...queryResults1, ...queryResults2, ...queryResults3, ...queryResults4, ...queryResults5 };
    
    const kvPairs = extractKeyValuePairs(formsResult.Blocks || []);
    const checkboxes = extractCheckboxes(formsResult.Blocks || []);
    
    console.log(`✅ Query results: ${Object.keys(queryResults).length}`);
    console.log(`✅ Key-value pairs: ${kvPairs.length}`);
    console.log(`✅ Selected checkboxes: ${checkboxes.length}`);
    console.log();
    
    console.log('📋 Detected Checkboxes with Labels:');
    checkboxes.forEach((cb, i) => {
      console.log(`  ${i + 1}. "${cb.label}" at (${cb.bbox.Left.toFixed(3)}, ${cb.bbox.Top.toFixed(3)})`);
    });
    console.log();

    console.log('🔄 Matching ALL BACK PAGE fields...');
    console.log('='.repeat(70));
    
    const suggestions = [];
    const backFields = templateMetadata.ocrMapping.back.fields;
    let detectedCount = 0;
    
    for (const [fieldName, fieldConfig] of Object.entries(backFields)) {
      const match = findBestMatch(fieldName, fieldConfig, queryResults, kvPairs, checkboxes);
      
      if (match && match.bbox) {
        const oldRegion = fieldConfig.region || {};
        const newRegion = {
          x: parseFloat(match.bbox.Left.toFixed(3)),
          y: parseFloat(match.bbox.Top.toFixed(3)),
          width: parseFloat(match.bbox.Width.toFixed(3)),
          height: parseFloat(match.bbox.Height.toFixed(3))
        };
        
        const distanceX = Math.abs((oldRegion.x || 0) - newRegion.x);
        const distanceY = Math.abs((oldRegion.y || 0) - newRegion.y);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        suggestions.push({
          fieldName,
          label: fieldConfig.label,
          value: match.text,
          confidence: match.confidence,
          method: match.method,
          oldRegion,
          newRegion,
          distance: totalDistance.toFixed(3)
        });
        
        detectedCount++;
        const status = totalDistance > 0.05 ? '⚠️' : '✓';
        console.log(`${status} ${fieldConfig.label}`);
        console.log(`   Method: ${match.method} | Value: "${match.text.substring(0, 40)}"`);
        console.log(`   Distance: ${totalDistance.toFixed(3)} | Confidence: ${match.confidence.toFixed(1)}%`);
      } else {
        console.log(`❌ ${fieldConfig.label} (${fieldName}) - NOT DETECTED`);
      }
    }
    
    console.log();
    console.log('='.repeat(70));
    console.log('📊 COMPLETE BACK PAGE CALIBRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total fields in template: ${Object.keys(backFields).length}`);
    console.log(`Fields detected: ${detectedCount}`);
    console.log(`Fields missing: ${Object.keys(backFields).length - detectedCount}`);
    console.log();
    
    const wellCalibrated = suggestions.filter(s => parseFloat(s.distance) < 0.05).length;
    const needsUpdate = suggestions.filter(s => parseFloat(s.distance) >= 0.05).length;
    console.log(`✓ Well calibrated: ${wellCalibrated}`);
    console.log(`⚠️ Needs update: ${needsUpdate}`);
    console.log();
    
    // Detection method breakdown
    const byMethod = {
      query: suggestions.filter(s => s.method === 'query').length,
      forms: suggestions.filter(s => s.method === 'forms').length,
      checkbox: suggestions.filter(s => s.method === 'checkbox').length
    };
    console.log('📊 Detection Methods:');
    console.log(`   QUERIES API: ${byMethod.query} fields`);
    console.log(`   FORMS API: ${byMethod.forms} fields`);
    console.log(`   Checkbox Detection: ${byMethod.checkbox} fields`);
    console.log();

    // Save calibration
    const outputPath = path.join(__dirname, '../logs', `back-all-fields-calibration-${Date.now()}.json`);
    const calibrationData = { back: suggestions };
    fs.writeFileSync(outputPath, JSON.stringify(calibrationData, null, 2));
    console.log(`💾 Calibration saved: ${outputPath}`);
    console.log();
    
    console.log('✅ Complete back page calibration finished!');
    console.log('Next: Run apply-comprehensive-calibration.js to apply updates');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

runCompleteCalibration();

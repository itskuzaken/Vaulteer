const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { textractClient } = require('../config/aws');
const { decryptFormImages } = require('../utils/imageDecryption');
const { getPool } = require('../db/pool');
const fs = require('fs');
const path = require('path');
const templateMatcher = require('./templateMatcher');
const { validateAndCorrectFields, applyValidationCorrections, getValidationSummary } = require('../utils/ocrValidation');
const ocrFieldExtractor = require('./ocrFieldExtractor');
const OCRRegionCalibrator = require('../utils/calibrateOCRRegions');
const imagePreprocessor = require('./imagePreprocessor');
const templateManager = require('./templateManager');

// Load DOH HTS Form 2021 metadata for field extraction
const metadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
let formMetadata = null;

try {
  formMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log('✅ Loaded HTS Form metadata:', formMetadata.name);
} catch (error) {
  console.warn('⚠️ Could not load form metadata:', error.message);
}

/**
 * Multi-strategy field extraction with fallbacks
 * Tries multiple extraction methods in priority order
 * @param {Array} blocks - Textract blocks
 * @param {Array} kvPairs - Key-value pairs from Textract
 * @param {string} fieldName - Name of field to extract
 * @param {Array} strategies - Array of strategy objects with type, priority, minConfidence
 * @returns {Object} Extracted field data with highest confidence
 */
function extractFieldWithFallback(blocks, kvPairs, fieldName, strategies) {
  const results = [];

  // Try each strategy
  for (const strategy of strategies) {
    let result = null;

    try {
      switch (strategy.type) {
        case 'template':
          result = templateMatcher.extractFieldByTemplate(blocks, strategy.template, fieldName);
          break;

        case 'keyword':
          result = extractByKeyword(blocks, strategy.keywords);
          break;

        case 'pattern':
          result = extractByPattern(blocks, strategy.pattern);
          break;

        case 'kvpair':
          result = extractFromKVPairs(kvPairs, strategy.keys);
          break;

        default:
          console.warn(`[Fallback] Unknown strategy type: ${strategy.type}`);
      }

      if (result && result.confidence >= strategy.minConfidence) {
        results.push({
          ...result,
          strategy: strategy.type,
          priority: strategy.priority
        });
      }
    } catch (error) {
      console.error(`[Fallback] Error in ${strategy.type} strategy for ${fieldName}:`, error.message);
    }
  }

  // Return highest confidence result
  if (results.length > 0) {
    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  }

  return {
    text: null,
    confidence: 0,
    strategy: 'none'
  };
}

/**
 * Extract field by searching for keywords
 */
function extractByKeyword(blocks, keywords) {
  const lines = extractTextLines(blocks);
  
  for (const line of lines) {
    const lowerText = line.text.toLowerCase();
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return {
          text: line.text,
          confidence: line.confidence,
          method: 'keyword'
        };
      }
    }
  }
  
  return null;
}

/**
 * Extract field by pattern matching (regex)
 */
function extractByPattern(blocks, pattern) {
  const lines = extractTextLines(blocks);
  
  for (const line of lines) {
    const match = line.text.match(pattern);
    if (match) {
      return {
        text: match[0],
        confidence: line.confidence,
        method: 'pattern'
      };
    }
  }
  
  return null;
}

/**
 * Extract field from key-value pairs
 */
function extractFromKVPairs(kvPairs, keys) {
  for (const key of keys) {
    for (const pair of kvPairs) {
      if (pair.key.toLowerCase().includes(key.toLowerCase())) {
        return {
          text: pair.value,
          confidence: pair.confidence,
          method: 'kvpair'
        };
      }
    }
  }
  
  return null;
}

/**
 * Call AWS Textract AnalyzeDocument API
 */
async function analyzeDocument(imageBuffer, featureTypes = ['FORMS']) {
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: imageBuffer
    },
    FeatureTypes: featureTypes
  });
  
  const response = await textractClient.send(command);
  return response;
}

/**
 * Analyze document with AWS Textract Queries API
 * @param {Buffer} imageBuffer - Image buffer
 * @param {Array} queries - Array of query objects with {text, alias, pages}
 * @param {Array} featureTypes - Additional feature types (e.g., ['FORMS', 'TABLES'])
 * @returns {Promise<Object>} Textract response with QUERY and QUERY_RESULT blocks
 */
async function analyzeDocumentWithQueries(imageBuffer, queries = [], featureTypes = []) {
  if (queries.length === 0) {
    console.warn('[Textract] No queries provided, falling back to standard analysis');
    return analyzeDocument(imageBuffer, featureTypes.length > 0 ? featureTypes : ['FORMS']);
  }

  // Build Textract command with Queries
  const params = {
    Document: {
      Bytes: imageBuffer
    },
    FeatureTypes: [...featureTypes, 'QUERIES']
  };

  // Add queries configuration
  // Note: Pages parameter not supported in synchronous AnalyzeDocument API
  params.QueriesConfig = {
    Queries: queries.map(q => ({
      Text: q.text,
      Alias: q.alias || q.text.substring(0, 50) // Use first 50 chars if no alias
    }))
  };

  console.log(`[Textract] Analyzing with ${queries.length} queries and features: ${params.FeatureTypes.join(', ')}`);

  const command = new AnalyzeDocumentCommand(params);
  const response = await textractClient.send(command);
  
  return response;
}

/**
 * Extract results from Textract QUERY_RESULT blocks
 * @param {Array} blocks - Textract blocks from response
 * @returns {Object} Map of alias -> {text, confidence, boundingBox}
 */
function extractFromQueryResults(blocks) {
  const queryResults = {};
  const blockMap = {};

  // Build block map for lookups
  blocks.forEach(block => {
    blockMap[block.Id] = block;
  });

  // Find QUERY blocks and their results
  blocks.forEach(block => {
    if (block.BlockType === 'QUERY') {
      const alias = block.Query?.Alias || block.Query?.Text;
      
      // Find associated QUERY_RESULT
      const resultRelationship = block.Relationships?.find(rel => rel.Type === 'ANSWER');
      if (resultRelationship && resultRelationship.Ids && resultRelationship.Ids.length > 0) {
        const resultBlock = blockMap[resultRelationship.Ids[0]];
        
        if (resultBlock && resultBlock.BlockType === 'QUERY_RESULT') {
          queryResults[alias] = {
            text: resultBlock.Text || null,
            confidence: resultBlock.Confidence || 0,
            boundingBox: resultBlock.Geometry?.BoundingBox || null,
            queryText: block.Query?.Text || null
          };
        }
      } else {
        // No result found for this query
        queryResults[alias] = {
          text: null,
          confidence: 0,
          boundingBox: null,
          queryText: block.Query?.Text || null
        };
      }
    }
  });

  return queryResults;
}

/**
 * Split queries into batches of specified size
 * @param {Array} queries - Array of query objects
 * @param {number} batchSize - Maximum queries per batch (default: 15)
 * @returns {Array} Array of query batches
 */
function batchQueries(queries, batchSize = 15) {
  const batches = [];
  for (let i = 0; i < queries.length; i += batchSize) {
    batches.push(queries.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Process multiple query batches and merge results
 * @param {Buffer} imageBuffer - Image buffer
 * @param {Array} batches - Array of query batches
 * @returns {Promise<Object>} Merged query results
 */
async function processBatchQueries(imageBuffer, batches) {
  const allResults = {};
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`  📋 Processing batch ${i + 1}/${batches.length} (${batches[i].length} queries)...`);
    
    try {
      const textractResult = await analyzeDocumentWithQueries(imageBuffer, batches[i]);
      const batchResults = extractFromQueryResults(textractResult.Blocks || []);
      
      // Merge results
      Object.assign(allResults, batchResults);
      
      console.log(`  ✅ Batch ${i + 1} complete: ${Object.keys(batchResults).length} fields extracted`);
    } catch (error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        console.warn(`  ⚠️ Rate limit hit on batch ${i + 1}, retrying after delay...`);
        
        // Exponential backoff: wait longer for each retry
        const delay = Math.min(5000 * Math.pow(2, i), 30000); // Max 30s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry this batch
        const textractResult = await analyzeDocumentWithQueries(imageBuffer, batches[i]);
        const batchResults = extractFromQueryResults(textractResult.Blocks || []);
        Object.assign(allResults, batchResults);
        
        console.log(`  ✅ Batch ${i + 1} complete after retry: ${Object.keys(batchResults).length} fields extracted`);
      } else {
        throw error;
      }
    }
    
    // Add delay between batches to avoid rate limiting (only if more batches remain)
    if (i < batches.length - 1) {
      const delayMs = 2000; // 2 second delay between batches
      console.log(`  ⏳ Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return allResults;
}

/**
 * Generate HTS Form queries for Textract Queries API
 * @param {string} page - 'front' or 'back'
 * @returns {Array} Array of query objects
 */
function generateHTSFormQueries(page = 'front') {
  // AWS Textract Queries API limit: 15 queries per document
  // Comprehensive field coverage across multiple batches
  const queries = {
    front: [
      // BATCH 1 - Core identification fields (15 queries)
      { text: 'What is the HIV test date at the top of the form?', alias: 'test_date' },
      { text: 'What is the 12-digit PhilHealth Number in format XX-XXXXXXXXX-X?', alias: 'phil_health_number' },
      { text: 'What is the 16-digit PhilSys Number in the ID section, written as exactly 16 consecutive digits without dashes or spaces?', alias: 'phil_sys_number' },
      { text: "What is the patient's first name?", alias: 'first_name' },
      { text: "What is the patient's middle name only, not including the words 'Middle Name'?", alias: 'middle_name' },
      { text: "What is the patient's last name?", alias: 'last_name' },
      { text: "What is the patient's name suffix such as Jr, Sr, III, or IV?", alias: 'suffix' },
      { text: "What are the first 2 letters of mother's first name?", alias: 'parental_code_mother' },
      { text: "What are the first 2 letters of father's first name?", alias: 'parental_code_father' },
      { text: "What is the birth order among mother's children?", alias: 'birth_order' },
      { text: "What is the patient's date of birth?", alias: 'birth_date' },
      { text: "What is the patient's age in years?", alias: 'age' },
      { text: "What is the patient's age in months?", alias: 'age_months' },
      { text: "What is the patient's sex assigned at birth - Male or Female?", alias: 'sex' },
      { text: "What is the patient's civil status - Single, Married, Separated, Widowed, or Divorced?", alias: 'civil_status' },
      
      // BATCH 2 - Address and residency information (15 queries)
      { text: "What is the city or municipality of the patient's current residence?", alias: 'current_residence_city' },
      { text: "What is the province of the patient's current residence?", alias: 'current_residence_province' },
      { text: "What is the city or municipality of the patient's permanent residence?", alias: 'permanent_residence_city' },
      { text: "What is the province of the patient's permanent residence?", alias: 'permanent_residence_province' },
      { text: "What is the city or municipality where the patient was born?", alias: 'place_of_birth_city' },
      { text: "What is the province where the patient was born?", alias: 'place_of_birth_province' },
      { text: "What is the patient's nationality?", alias: 'nationality' },
      { text: "If the patient's nationality is not Filipino, what is it?", alias: 'nationality_other' },
      { text: "Is the patient currently living with a partner?", alias: 'living_with_partner' },
      { text: "How many children does the patient have?", alias: 'number_of_children' },
      { text: "Is the patient currently pregnant? (for female only)", alias: 'is_pregnant' },
      { text: "What is the patient's highest educational attainment?", alias: 'educational_attainment' },
      { text: "Is the patient currently in school?", alias: 'currently_in_school' },
      { text: "Is the patient currently working?", alias: 'currently_working' },
      { text: "What is the patient's current or previous occupation?", alias: 'occupation' },
      
      // BATCH 3 - Work history and overseas information (6 queries for front page)
      { text: "Has the patient worked overseas or abroad in the past 5 years?", alias: 'worked_overseas' },
      { text: "If the patient worked overseas, what year did they return from their last contract?", alias: 'overseas_return_year' },
      { text: "Where was the patient based while working overseas - on a ship or on land?", alias: 'overseas_location' },
      { text: "What country did the patient last work in while overseas?", alias: 'overseas_country' },
      { text: "What are the contact numbers for the patient?", alias: 'contact_number' },
      { text: "What is the email address of the patient?", alias: 'email_address' }
      // Total: 36 queries across 3 batches (15 + 15 + 6)
    ],
    back: [
      // BATCH 1 - Medical history and risk assessment (15 queries)
      { text: 'Has the patient had unprotected sex in the past 12 months?', alias: 'risk_unprotected_sex' },
      { text: 'When was the last time the patient had unprotected sex?', alias: 'risk_unprotected_sex_date' },
      { text: 'Has the patient had multiple sexual partners in the past 12 months?', alias: 'risk_multiple_partners' },
      { text: 'When did the patient last have multiple sexual partners?', alias: 'risk_multiple_partners_date' },
      { text: 'Has the patient had sex with someone who injects drugs?', alias: 'risk_sex_with_pwid' },
      { text: 'Has the patient received payment for sex?', alias: 'risk_payment_for_sex' },
      { text: 'Has the patient had sex under the influence of drugs?', alias: 'risk_sex_under_drugs' },
      { text: 'Has the patient shared needles for drug injection?', alias: 'risk_shared_needles' },
      { text: 'Has the patient received a blood transfusion?', alias: 'risk_blood_transfusion' },
      { text: 'Has the patient had occupational exposure to needlestick or sharps?', alias: 'risk_occupational_exposure' },
      { text: 'What are the reasons the patient is seeking HIV testing?', alias: 'reasons_for_testing' },
      { text: 'Is the patient a current TB patient?', alias: 'medical_tb' },
      { text: 'Has the patient been diagnosed with other STIs?', alias: 'medical_sti' },
      { text: 'Has the patient taken PEP (Post-Exposure Prophylaxis)?', alias: 'medical_pep' },
      { text: 'Is the patient currently taking PrEP (Pre-Exposure Prophylaxis)?', alias: 'medical_prep' },
      
      // BATCH 2 - Clinical and testing information (15 queries)
      { text: 'Does the patient have hepatitis B?', alias: 'medical_hepatitis_b' },
      { text: 'Does the patient have hepatitis C?', alias: 'medical_hepatitis_c' },
      { text: 'What is the clinical picture - Asymptomatic or Symptomatic?', alias: 'clinical_picture' },
      { text: 'Describe the signs or symptoms the patient is experiencing?', alias: 'symptoms' },
      { text: 'What is the WHO staging of the patient?', alias: 'who_staging' },
      { text: 'What is the client type - Inpatient, Walk-in/outpatient, PDL, or Mobile HTS?', alias: 'client_type' },
      { text: 'What is the mode of reach - Clinical, Online, Index testing, Network testing, or Outreach?', alias: 'mode_of_reach' },
      { text: 'Did the patient refuse or accept HIV testing?', alias: 'testing_accepted' },
      { text: 'If testing was refused, what was the reason?', alias: 'testing_refused_reason' },
      { text: 'What HIV testing modality was used - Facility-based, Non-laboratory, Community-based, or Self-testing?', alias: 'testing_modality' },
      { text: 'Has the patient been tested for HIV before?', alias: 'previously_tested' },
      { text: 'What was the previous HIV test result - Reactive, Non-reactive, Indeterminate, or Unable to get result?', alias: 'previous_test_result' },
      { text: 'When was the previous HIV test date?', alias: 'previous_test_date' },
      { text: 'Which HTS provider or facility conducted the previous test?', alias: 'previous_test_provider' },
      { text: 'In what city or municipality was the previous test conducted?', alias: 'previous_test_city' },
      
      // BATCH 3 - Test kit and facility information (9 queries)
      { text: 'What is the brand of test kit used for this HIV test?', alias: 'test_kit_brand' },
      { text: 'What is the test kit lot number?', alias: 'test_kit_lot_number' },
      { text: 'What is the test kit expiration date?', alias: 'test_kit_expiration' },
      { text: 'What is the name of the testing facility or organization?', alias: 'testing_facility' },
      { text: 'What is the complete mailing address of the testing facility?', alias: 'facility_address' },
      { text: 'What are the contact numbers for the testing facility?', alias: 'facility_contact_number' },
      { text: 'What is the email address of the testing facility?', alias: 'facility_email' },
      { text: 'What is the name of the HTS service provider or counselor?', alias: 'counselor_name' },
      { text: 'What is the role of the counselor - HIV Counselor, Medical Technologist, CBS Motivator, or Others?', alias: 'counselor_role' }
      // Total: 39 queries across 3 batches (15 + 15 + 9)
    ]
  };

  return queries[page] || [];
}

/**
 * Extract text lines from Textract blocks
 */
function extractTextLines(blocks) {
  const lines = blocks
    .filter(block => block.BlockType === 'LINE')
    .map(block => ({
      text: block.Text,
      confidence: block.Confidence
    }));
  
  return lines;
}

/**
 * Extract key-value pairs from Textract blocks (for forms)
 */
function extractKeyValuePairs(blocks) {
  const keyMap = {};
  const valueMap = {};
  const blockMap = {};
  
  // Build block map
  blocks.forEach(block => {
    blockMap[block.Id] = block;
  });
  
  // Find KEY_VALUE_SET blocks
  blocks.forEach(block => {
    if (block.BlockType === 'KEY_VALUE_SET') {
      if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
        keyMap[block.Id] = block;
      } else if (block.EntityTypes && block.EntityTypes.includes('VALUE')) {
        valueMap[block.Id] = block;
      }
    }
  });
  
  // Match keys to values
  const kvPairs = [];
  Object.values(keyMap).forEach(keyBlock => {
    const valueBlock = keyBlock.Relationships?.find(r => r.Type === 'VALUE');
    if (valueBlock) {
      const valueId = valueBlock.Ids[0];
      const value = valueMap[valueId];
      
      const keyText = getText(keyBlock, blockMap);
      const valueText = getText(value, blockMap);
      
      kvPairs.push({
        key: keyText,
        value: valueText,
        confidence: Math.min(keyBlock.Confidence, value?.Confidence || 0)
      });
    }
  });
  
  return kvPairs;
}

/**
 * Get text from block with CHILD relationships
 */
function getText(block, blockMap) {
  if (!block) return '';
  
  let text = '';
  if (block.Relationships) {
    block.Relationships.forEach(relationship => {
      if (relationship.Type === 'CHILD') {
        relationship.Ids.forEach(childId => {
          const word = blockMap[childId];
          if (word && word.BlockType === 'WORD') {
            text += word.Text + ' ';
          }
        });
      }
    });
  }
  
  return text.trim();
}

/**
 * Extract test result from text (REACTIVE or NON-REACTIVE)
 * Based on DOH HTS Form 2021 - Question 19 "PREVIOUS HIV TEST"
 */
function extractTestResult(blocks) {
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ').toUpperCase();
  
  // Look for the test result section context first
  const hasTestSection = /PREVIOUS\s+HIV\s+TEST|WHAT\s+WAS\s+THE\s+RESULT/i.test(allText);
  
  // Common patterns for test results (case-insensitive)
  const reactivePattern = /\b(REACTIVE|POSITIVE)\b/i;
  const nonReactivePattern = /\b(NON-REACTIVE|NON\s+REACTIVE|NONREACTIVE|NEGATIVE)\b/i;
  const indeterminatePattern = /\bINDETERMINATE\b/i;
  
  // Extract result with context awareness
  if (reactivePattern.test(allText)) {
    return 'reactive';
  } else if (nonReactivePattern.test(allText)) {
    return 'non-reactive';
  } else if (indeterminatePattern.test(allText)) {
    return 'indeterminate';
  }
  
  return null;
}

/**
 * Extract test date from DOH HTS Form 2021
 * Format: DD/MM/YYYY from DEMOGRAPHIC DATA section, Question 1
 */
function extractTestDate(blocks) {
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ');
  
  // Pattern for DD/MM/YYYY format
  const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
  const match = allText.match(datePattern);
  
  if (match) {
    return {
      raw: match[0],
      day: match[1],
      month: match[2],
      year: match[3]
    };
  }
  
  return null;
}

/**
 * Extract full name components from DOH HTS Form 2021
 * Question 4: First Name / Middle Name / Last Name / Suffix
 */
function extractFullName(blocks, kvPairs) {
  const name = {
    firstName: null,
    middleName: null,
    lastName: null,
    suffix: null,
    fullName: null
  };
  
  // Look for name fields in key-value pairs
  const nameFields = kvPairs.filter(kv => 
    /name|first\s+name|last\s+name|middle\s+name|surname|given|suffix/i.test(kv.key)
  );
  
  nameFields.forEach(field => {
    const key = field.key.toLowerCase();
    const value = field.value?.trim();
    
    if (!value || value === 'N/A' || value === '-') return;
    
    if (key.includes('first') || key.includes('given')) {
      name.firstName = normalizeNameField(value);
    } else if (key.includes('middle')) {
      name.middleName = normalizeNameField(value);
    } else if (key.includes('last') || key.includes('surname')) {
      name.lastName = normalizeNameField(value);
    } else if (key.includes('suffix')) {
      name.suffix = value.toUpperCase();
    }
  });
  
  // Construct full name from components
  if (name.firstName || name.lastName) {
    const parts = [name.firstName, name.middleName, name.lastName, name.suffix].filter(Boolean);
    name.fullName = parts.join(' ');
  }
  
  return name;
}

/**
 * Normalize name field (Title Case, trim spaces)
 */
function normalizeNameField(text) {
  if (!text) return null;
  
  // Remove extra spaces
  text = text.replace(/\s+/g, ' ').trim();
  
  // Convert to Title Case (capitalizes first letter of each word)
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract PhilHealth number from DOH HTS Form 2021
 * Question 2: PhilHealth Number (12 digits)
 */
function extractPhilHealthNumber(blocks, kvPairs) {
  // Look for PhilHealth number in key-value pairs
  const philHealthPair = kvPairs.find(kv => 
    /philhealth|phil\s*health|phic/i.test(kv.key)
  );
  
  if (philHealthPair && philHealthPair.value) {
    // Remove hyphens, dots, spaces
    const normalized = philHealthPair.value.replace(/[-.\s]/g, '');
    // Extract exactly 12 digits
    const match = normalized.match(/\d{12}/);
    return match ? match[0] : null;
  }
  
  // Fallback: Search all text for 12-digit pattern
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ');
  const normalizedText = allText.replace(/[-.\s]/g, '');
  const match = normalizedText.match(/\d{12}/);
  
  return match ? match[0] : null;
}

/**
 * Extract sex/gender from DOH HTS Form 2021
 * Question 8: Sex at Birth (Male/Female)
 */
function extractSex(blocks, kvPairs) {
  // Look for sex/gender field
  const sexPair = kvPairs.find(kv => 
    /sex|gender|male|female/i.test(kv.key)
  );
  
  if (sexPair && sexPair.value) {
    const value = sexPair.value.toLowerCase();
    if (/male/i.test(value) && !/female/i.test(value)) return 'male';
    if (/female/i.test(value)) return 'female';
  }
  
  // Fallback: Search all text
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ');
  
  // Look for checkbox patterns
  if (/☑\s*male|✓\s*male|✔\s*male|\[x\]\s*male/i.test(allText)) return 'male';
  if (/☑\s*female|✓\s*female|✔\s*female|\[x\]\s*female/i.test(allText)) return 'female';
  
  return null;
}

/**
 * Extract age from DOH HTS Form 2021
 * Question 7: Age
 */
function extractAge(blocks, kvPairs) {
  // Look for age field
  const agePair = kvPairs.find(kv => 
    /\bage\b/i.test(kv.key)
  );
  
  if (agePair && agePair.value) {
    const match = agePair.value.match(/\d{1,3}/);
    if (match) {
      const age = parseInt(match[0]);
      // Validate reasonable age range
      if (age >= 15 && age <= 120) return age;
    }
  }
  
  return null;
}

/**
 * Extract civil status from DOH HTS Form 2021
 * Question 9: Civil Status
 */
function extractCivilStatus(blocks, kvPairs) {
  // Look for civil status field
  const statusPair = kvPairs.find(kv => 
    /civil\s*status|marital\s*status/i.test(kv.key)
  );
  
  if (statusPair && statusPair.value) {
    const value = statusPair.value.toLowerCase();
    if (/single/i.test(value)) return 'single';
    if (/married/i.test(value)) return 'married';
    if (/widow/i.test(value)) return 'widowed';
    if (/separat/i.test(value)) return 'separated';
    if (/living[-\s]in|live[-\s]in/i.test(value)) return 'living-in';
  }
  
  // Fallback: Search all text for checkboxes
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ');
  
  if (/☑\s*single|✓\s*single|✔\s*single/i.test(allText)) return 'single';
  if (/☑\s*married|✓\s*married|✔\s*married/i.test(allText)) return 'married';
  if (/☑\s*widow|✓\s*widow|✔\s*widow/i.test(allText)) return 'widowed';
  if (/☑\s*separat|✓\s*separat|✔\s*separat/i.test(allText)) return 'separated';
  if (/☑\s*living[-\s]in|✓\s*living[-\s]in/i.test(allText)) return 'living-in';
  
  return null;
}

/**
 * Extract contact number from DOH HTS Form 2021
 * Question 10: Contact Number
 */
function extractContactNumber(blocks, kvPairs) {
  // Look for contact number field
  const contactPair = kvPairs.find(kv => 
    /contact|phone|mobile|cellphone|tel/i.test(kv.key)
  );
  
  if (contactPair && contactPair.value) {
    // Remove spaces, hyphens, parentheses
    const normalized = contactPair.value.replace(/[\s\-()]/g, '');
    // Match Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX
    const match = normalized.match(/(?:\+639|09)\d{9}/);
    return match ? match[0] : null;
  }
  
  // Fallback: Search all text
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ').replace(/[\s\-()]/g, '');
  const match = allText.match(/(?:\+639|09)\d{9}/);
  
  return match ? match[0] : null;
}

/**
 * Extract complete address from DOH HTS Form 2021
 * Question 11: Complete Address
 */
function extractAddress(blocks, kvPairs) {
  // Look for address field
  const addressPair = kvPairs.find(kv => 
    /address|residence|location/i.test(kv.key)
  );
  
  if (addressPair && addressPair.value) {
    const value = addressPair.value.trim();
    if (value && value !== 'N/A' && value !== '-') {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract HTS Code from DOH HTS Form 2021
 * Question 3: HTS Code (unique identifier)
 */
function extractHTSCode(blocks, kvPairs) {
  // Look for HTS code field
  const htsPair = kvPairs.find(kv => 
    /hts\s*code|client\s*code|code/i.test(kv.key)
  );
  
  if (htsPair && htsPair.value) {
    const value = htsPair.value.trim();
    if (value && value !== 'N/A' && value !== '-') {
      return value.toUpperCase();
    }
  }
  
  return null;
}

/**
 * Extract test kit used from DOH HTS Form 2021
 * HTS Provider Details section
 */
function extractTestKitUsed(blocks, kvPairs) {
  // Look for test kit field
  const kitPair = kvPairs.find(kv => 
    /test\s*kit|kit\s*used|screening\s*test|rapid\s*test/i.test(kv.key)
  );
  
  if (kitPair && kitPair.value) {
    const value = kitPair.value.trim();
    if (value && value !== 'N/A' && value !== '-') {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract counselor name from DOH HTS Form 2021
 * HTS Provider Details section
 */
function extractCounselorName(blocks, kvPairs) {
  // Look for counselor name field
  const counselorPair = kvPairs.find(kv => 
    /counselor|health\s*worker|provider|staff/i.test(kv.key)
  );
  
  if (counselorPair && counselorPair.value) {
    const value = counselorPair.value.trim();
    if (value && value !== 'N/A' && value !== '-') {
      return normalizeNameField(value);
    }
  }
  
  return null;
}

/**
 * Generic field extractor - finds any field by regex pattern
 */
function extractGenericField(blocks, kvPairs, pattern) {
  const pair = kvPairs.find(kv => pattern.test(kv.key));
  if (pair && pair.value) {
    const value = pair.value.trim();
    if (value && value !== 'N/A' && value !== '-' && value !== '') {
      return value;
    }
  }
  return null;
}

/**
 * Extract checkbox value (Yes/No or checked option)
 */
function extractCheckbox(blocks, kvPairs, pattern) {
  const pair = kvPairs.find(kv => pattern.test(kv.key));
  if (pair && pair.value) {
    const value = pair.value.toLowerCase();
    if (/yes|✓|✔|☑|\[x\]/i.test(value)) return 'Yes';
    if (/no/i.test(value)) return 'No';
    return pair.value.trim();
  }
  
  // Check text for checkbox patterns
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ');
  if (pattern.test(allText)) {
    if (/☑|✓|✔|\[x\]/i.test(allText)) return 'Yes';
  }
  
  return null;
}

/**
 * Extract multiple checkbox selections
 */
function extractCheckboxList(blocks, kvPairs, sectionPattern) {
  const items = [];
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join('\n');
  
  // Find lines with checkboxes
  lines.forEach(line => {
    if (/☑|✓|✔|\[x\]/i.test(line.text)) {
      const cleaned = line.text.replace(/☑|✓|✔|\[x\]|□/gi, '').trim();
      if (cleaned && cleaned.length > 2) {
        items.push(cleaned);
      }
    }
  });
  
  return items.length > 0 ? items : null;
}

/**
 * Extract number from field
 */
function extractNumber(blocks, kvPairs, pattern) {
  const pair = kvPairs.find(kv => pattern.test(kv.key));
  if (pair && pair.value) {
    const match = pair.value.match(/\d+/);
    if (match) return parseInt(match[0]);
  }
  return null;
}

/**
 * Extract testing facility from DOH HTS Form 2021
 * Section: HTS PROVIDER DETAILS
 */
function extractTestingFacility(blocks) {
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join('\n');
  
  // Look for LoveYourself Inc. or facility name patterns
  const facilityPattern = /(?:Name\s+of\s+Testing\s+Facility[\/\s]*Organization[:\s]*)?([^\n]+(?:LoveYourself|Testing\s+Center|Clinic|Hospital)[^\n]*)/i;
  const match = allText.match(facilityPattern);
  
  if (match) {
    return match[1].trim();
  }
  
  // Also check for specific facility
  if (/LoveYourself\s+Inc/i.test(allText)) {
    const loveYourselfMatch = allText.match(/LoveYourself\s+Inc[^\n]*/i);
    return loveYourselfMatch ? loveYourselfMatch[0].trim() : null;
  }
  
  return null;
}

/**
 * Extract control number from text
 */
function extractControlNumber(blocks) {
  const lines = extractTextLines(blocks);
  const allText = lines.map(l => l.text).join(' ');
  
  // Pattern: HTS-{timestamp}-{random}
  const pattern = /HTS-\d{13}-[A-Z0-9]{6}/;
  const match = allText.match(pattern);
  
  return match ? match[0] : null;
}

/**
 * Calculate average confidence from blocks
 */
function calculateAverageConfidence(blocks) {
  const confidenceValues = blocks
    .filter(block => block.Confidence)
    .map(block => block.Confidence);
  
  if (confidenceValues.length === 0) return 0;
  
  const sum = confidenceValues.reduce((a, b) => a + b, 0);
  return sum / confidenceValues.length;
}

/**
 * Parse HTS form data from Textract results
 * Extracts ALL 56 fields from DOH HTS Form 2021 (Questions 1-27 + consent fields)
 * Returns complete JSON matching template-metadata.json structure
 */
function parseHTSFormData(frontResult, backResult) {
  const frontBlocks = frontResult.Blocks || [];
  const backBlocks = backResult.Blocks || [];
  
  const frontLines = extractTextLines(frontBlocks);
  const backLines = extractTextLines(backBlocks);
  const frontKVPairs = extractKeyValuePairs(frontBlocks);
  const backKVPairs = extractKeyValuePairs(backBlocks);
  
  const allKVPairs = [...frontKVPairs, ...backKVPairs];
  
  console.log(`📊 Extracting ALL 56 fields from ${frontBlocks.length} front + ${backBlocks.length} back blocks`);
  
  // Extract name components (Question 4 - front page)
  const nameData = extractFullName(frontBlocks, frontKVPairs);
  
  // Extract dates from front page
  const testDateObj = extractTestDate(frontBlocks);
  const birthDateObj = extractTestDate(frontBlocks); // Both dates on front page
  
  // Calculate age
  let calculatedAge = null;
  if (birthDateObj && testDateObj) {
    const birthYear = parseInt(birthDateObj.year);
    const testYear = parseInt(testDateObj.year);
    calculatedAge = testYear - birthYear;
  }
  
  // Build complete extracted data with ALL 56 fields
  const extractedData = {
    // ========== TEMPLATE METADATA ==========
    templateId: formMetadata?.templateId || 'doh-hts-2021',
    templateName: formMetadata?.name || 'DOH Personal Information Sheet (HTS Form 2021)',
    extractedAt: new Date().toISOString(),
    
    // ========== FRONT PAGE: DEMOGRAPHIC DATA (Q1-12) ==========
    testDate: testDateObj ? `${testDateObj.month}/${testDateObj.day}/${testDateObj.year}` : null,
    philHealthNumber: extractPhilHealthNumber(frontBlocks, frontKVPairs),
    philSysNumber: extractGenericField(frontBlocks, frontKVPairs, /philsys|phil\s*sys/i),
    
    firstName: nameData.firstName,
    middleName: nameData.middleName,
    lastName: nameData.lastName,
    suffix: nameData.suffix,
    fullName: nameData.fullName,
    
    parentalCode: extractGenericField(frontBlocks, frontKVPairs, /parental\s*code|mother.*father.*birth/i),
    
    birthDate: birthDateObj ? `${birthDateObj.month}/${birthDateObj.day}/${birthDateObj.year}` : null,
    age: extractAge(frontBlocks, frontKVPairs) || calculatedAge,
    
    sex: extractSex(frontBlocks, frontKVPairs),
    
    // Q8: Residence fields
    currentResidenceCity: extractGenericField(frontBlocks, frontKVPairs, /current.*city|current.*municipality/i),
    currentResidenceProvince: extractGenericField(frontBlocks, frontKVPairs, /current.*province/i),
    permanentResidenceCity: extractGenericField(frontBlocks, frontKVPairs, /permanent.*city|permanent.*municipality/i),
    permanentResidenceProvince: extractGenericField(frontBlocks, frontKVPairs, /permanent.*province/i),
    placeOfBirthCity: extractGenericField(frontBlocks, frontKVPairs, /place.*birth.*city|birth.*municipality/i),
    placeOfBirthProvince: extractGenericField(frontBlocks, frontKVPairs, /place.*birth.*province|birth.*province/i),
    
    nationality: extractGenericField(frontBlocks, frontKVPairs, /nationality/i) || 'Filipino',
    civilStatus: extractCivilStatus(frontBlocks, frontKVPairs),
    livingWithPartner: extractCheckbox(frontBlocks, frontKVPairs, /living.*partner|live.*partner/i),
    numberOfChildren: extractNumber(frontBlocks, frontKVPairs, /number.*children|children/i),
    isPregnant: extractCheckbox(frontBlocks, frontKVPairs, /pregnant/i),
    
    // ========== FRONT PAGE: EDUCATION & OCCUPATION (Q13-16) ==========
    educationalAttainment: extractCheckbox(frontBlocks, frontKVPairs, /educational.*attainment|highest.*education/i),
    currentlyInSchool: extractCheckbox(frontBlocks, frontKVPairs, /currently.*school|in\s*school/i),
    currentlyWorking: extractCheckbox(frontBlocks, frontKVPairs, /currently.*working|working/i),
    workedOverseas: extractCheckbox(frontBlocks, frontKVPairs, /worked.*overseas|overseas.*abroad/i),
    overseasReturnYear: extractGenericField(frontBlocks, frontKVPairs, /return.*year|year.*return/i),
    overseasLocation: extractCheckbox(frontBlocks, frontKVPairs, /ship|land/i),
    overseasCountry: extractGenericField(frontBlocks, frontKVPairs, /country.*work|work.*country/i),
    
    // ========== BACK PAGE: RISK ASSESSMENT (Q17) ==========
    riskAssessment: extractCheckboxList(backBlocks, backKVPairs, /risk|exposure|history/i),
    
    // ========== BACK PAGE: TESTING REASONS (Q18) ==========
    reasonsForTesting: extractCheckboxList(backBlocks, backKVPairs, /reason.*test|why.*test/i),
    
    // ========== BACK PAGE: PREVIOUS HIV TEST (Q19) ==========
    previouslyTested: extractCheckbox(backBlocks, backKVPairs, /tested.*before|ever.*tested/i),
    previousTestDate: extractTestDate(backBlocks)?.raw || null,
    previousTestResult: extractTestResult(backBlocks),
    
    // ========== BACK PAGE: MEDICAL HISTORY (Q20-21) ==========
    medicalHistory: extractCheckboxList(backBlocks, backKVPairs, /medical.*history|health.*condition/i),
    clinicalPicture: extractCheckbox(backBlocks, backKVPairs, /asymptomatic|symptomatic/i),
    symptoms: extractGenericField(backBlocks, backKVPairs, /symptom|describe.*s\/sx/i),
    whoStaging: extractGenericField(backBlocks, backKVPairs, /who.*staging/i),
    
    // ========== BACK PAGE: TESTING DETAILS (Q22-25) ==========
    clientType: extractCheckbox(backBlocks, backKVPairs, /client.*type|type.*client/i),
    modeOfReach: extractCheckbox(backBlocks, backKVPairs, /mode.*reach|how.*reach/i),
    testingAccepted: extractCheckbox(backBlocks, backKVPairs, /accepted|refused/i) || 'Accepted',
    refusalReason: extractGenericField(backBlocks, backKVPairs, /reason.*refusal|why.*refuse/i),
    otherServices: extractCheckboxList(backBlocks, backKVPairs, /other.*service|additional.*service/i),
    
    // ========== BACK PAGE: INVENTORY (Q25) ==========
    testKitBrand: extractTestKitUsed(backBlocks, backKVPairs),
    testKitLotNumber: extractGenericField(backBlocks, backKVPairs, /lot.*number|batch.*number/i),
    testKitExpiration: extractGenericField(backBlocks, backKVPairs, /expir.*date|expiry/i),
    
    // ========== BACK PAGE: HTS PROVIDER (Q26-27) ==========
    testingFacility: extractTestingFacility(backBlocks),
    counselorName: extractCounselorName(backBlocks, backKVPairs),
    counselorSignature: null, // Signature requires special handling
    
    // ========== FRONT PAGE: INFORMED CONSENT ==========
    contactNumber: extractContactNumber(frontBlocks, frontKVPairs),
    emailAddress: extractGenericField(frontBlocks, frontKVPairs, /email/i),
    
    // ========== INTERNAL TRACKING ==========
    controlNumber: extractControlNumber(frontBlocks) || extractControlNumber(backBlocks),
    frontConfidence: calculateAverageConfidence(frontBlocks),
    backConfidence: calculateAverageConfidence(backBlocks),
    
    _rawData: {
      frontText: frontLines.map(l => l.text).join('\n'),
      backText: backLines.map(l => l.text).join('\n'),
      keyValuePairs: { front: frontKVPairs.length, back: backKVPairs.length, total: allKVPairs.length }
    }
  };
  
  // Log extraction summary
  console.log('✅ Extraction complete:');
  console.log(`   - Test Date: ${extractedData.testDate || 'NOT FOUND'}`);
  console.log(`   - Name: ${extractedData.fullName || 'NOT FOUND'}`);
  console.log(`   - Birth Date: ${extractedData.birthDate || 'NOT FOUND'}`);
  console.log(`   - Sex: ${extractedData.sex || 'NOT FOUND'}`);
  console.log(`   - Previous Test: ${extractedData.previouslyTested || 'NOT FOUND'}`);
  console.log(`   - Result: ${extractedData.previousTestResult || 'NOT FOUND'}`);
  console.log(`   - Facility: ${extractedData.testingFacility || 'NOT FOUND'}`);
  
  return extractedData;
}

/**
 * Analyze HTS form images using coordinate-based field extraction
 * NEW: Enhanced OCR mapping with per-field extraction
 * @param {Buffer} frontImageBuffer - Front page image
 * @param {Buffer} backImageBuffer - Back page image
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extracted data with field-level confidence
 */
async function analyzeHTSFormEnhanced(frontImageBuffer, backImageBuffer, options = {}) {
  const { useQueries = false, extractionMode = 'hybrid', preprocessImages = true } = options;
  
  console.log(`📤 [Enhanced OCR] Starting field extraction (mode: ${extractionMode}, queries: ${useQueries}, preprocess: ${preprocessImages})...`);
  
  try {
    // Step 0: Preprocess images for better OCR accuracy
    if (preprocessImages) {
      console.log('🖼️ Preprocessing images for optimal OCR...');
      
      try {
        const [frontProcessed, backProcessed] = await Promise.all([
          imagePreprocessor.process(frontImageBuffer, { mode: 'auto' }),
          imagePreprocessor.process(backImageBuffer, { mode: 'auto' })
        ]);

        console.log(`✅ [Preprocessing] Front: ${frontProcessed.applied.join(', ')}`);
        console.log(`✅ [Preprocessing] Back: ${backProcessed.applied.join(', ')}`);

        // Use preprocessed images
        frontImageBuffer = frontProcessed.buffer;
        backImageBuffer = backProcessed.buffer;
      } catch (preprocessError) {
        console.warn('⚠️ [Preprocessing] Failed, using original images:', preprocessError.message);
        // Continue with original images if preprocessing fails
      }
    }

    let queryResults = null;

    // Step 1: Run Textract with Queries API if enabled (with batching support)
    if (useQueries && extractionMode !== 'coordinate') {
      console.log('🔍 Running Textract Queries API with batch support...');
      
      const frontQueries = generateHTSFormQueries('front');
      const backQueries = generateHTSFormQueries('back');
      
      // AWS Textract limit: 15 queries per request
      // Split into batches if needed
      const frontBatches = batchQueries(frontQueries, 15);
      const backBatches = batchQueries(backQueries, 15);
      
      console.log(`📊 Front page: ${frontQueries.length} queries in ${frontBatches.length} batch(es)`);
      console.log(`📊 Back page: ${backQueries.length} queries in ${backBatches.length} batch(es)`);
      
      // Process batches SEQUENTIALLY to avoid rate limiting
      // First process front page, then back page with delay between them
      console.log('🔄 Processing front page batches...');
      const frontResults = await processBatchQueries(frontImageBuffer, frontBatches);
      
      // Add delay between front and back processing
      if (backBatches.length > 0) {
        console.log('⏳ Waiting 2s before processing back page...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('🔄 Processing back page batches...');
      const backResults = await processBatchQueries(backImageBuffer, backBatches);

      // Merge results from all batches
      queryResults = {
        front: frontResults,
        back: backResults
      };

      const totalFields = Object.keys(queryResults.front).length + Object.keys(queryResults.back).length;
      console.log(`✅ Query extraction complete: Front=${Object.keys(queryResults.front).length}, Back=${Object.keys(queryResults.back).length}, Total=${totalFields}`);
      
      // Auto-calibrate template coordinates based on high-confidence query results
      try {
        const calibrator = new OCRRegionCalibrator();
        const calibrationResult = calibrator.autoCalibrate(queryResults, 85);
        
        if (calibrationResult.stats.front > 0 || calibrationResult.stats.back > 0) {
          console.log(`🎯 [Auto-Calibration] Front: ${calibrationResult.stats.front} fields, Back: ${calibrationResult.stats.back} fields, Skipped: ${calibrationResult.stats.skipped}`);
          
          // Apply updates to in-memory template for this request
          calibrator.applyUpdates(calibrationResult.updates);
        }
      } catch (calibError) {
        console.warn('⚠️ [Auto-Calibration] Failed:', calibError.message);
      }
      
      // Generate calibration report if in development/debug mode
      if (process.env.OCR_DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        try {
          const calibrator = new OCRRegionCalibrator();
          // Note: textractResults only available for last batch in current implementation
          // For full calibration, consider storing all batch results
          const calibrationAnalysis = calibrator.analyzeFieldPositions(queryResults, {});
          
          const reportPath = path.join(__dirname, '../logs', `ocr-calibration-${Date.now()}.md`);
          calibrator.saveReport(calibrationAnalysis, reportPath);
          
          console.log(`📊 [Calibration] Report generated: ${reportPath}`);
        } catch (calibError) {
          console.warn('⚠️ [Calibration] Failed to generate report:', calibError.message);
        }
      }
    }

    // Step 2: Use OCR Field Extractor with hybrid strategy
    const extractionResult = await ocrFieldExtractor.extractAllFields(
      frontImageBuffer,
      backImageBuffer,
      {
        queryResults,
        extractionMode
      }
    );

    console.log(`✅ [Enhanced OCR] Extracted ${Object.keys(extractionResult.fields).length} fields`);
    console.log(`   - High confidence: ${extractionResult.stats.highConfidence}`);
    console.log(`   - Medium confidence: ${extractionResult.stats.mediumConfidence}`);
    console.log(`   - Low confidence: ${extractionResult.stats.lowConfidence}`);
    console.log(`   - Requires review: ${extractionResult.stats.requiresReview}`);
    
    if (extractionResult.stats.extractionMethods) {
      console.log(`   - Query-extracted: ${extractionResult.stats.extractionMethods.query}`);
      console.log(`   - Coordinate-extracted: ${extractionResult.stats.extractionMethods.coordinate}`);
      console.log(`   - Failed: ${extractionResult.stats.extractionMethods.failed}`);
    }

    // Step 3: Apply validation
    console.log('🔍 Applying validation rules...');
    const validations = validateAndCorrectFields(extractionResult.fields);
    const correctedData = applyValidationCorrections(extractionResult.fields, validations);
    const validationSummary = getValidationSummary(validations);

    console.log(`✅ Validation complete: ${validationSummary.corrected} auto-corrections`);

    return {
      fields: correctedData,
      confidence: extractionResult.overallConfidence,
      stats: extractionResult.stats,
      validationSummary,
      validations,
      extractionMethod: extractionMode,
      extractionMode: extractionResult.extractionMode,
      templateId: 'doh-hts-2021-v2'
    };
  } catch (error) {
    console.error('❌ [Enhanced OCR] Extraction failed:', error);
    throw error;
  }
}

/**
 * Analyze HTS form images and return extracted data (LEGACY)
 * Called by /api/hts-forms/analyze-ocr endpoint BEFORE encryption
 * @deprecated Use analyzeHTSFormEnhanced for better accuracy
 */
async function analyzeHTSForm(frontImageBuffer, backImageBuffer, options = {}) {
  // Check if enhanced extraction is enabled (default: true)
  const useEnhanced = options.useEnhanced !== false;
  
  if (useEnhanced) {
    console.log('🚀 Using enhanced coordinate-based extraction');
    return await analyzeHTSFormEnhanced(frontImageBuffer, backImageBuffer, options);
  }

  console.log('📤 [Legacy] Sending raw images to AWS Textract...');
  
  try {
    // Send to Textract (parallel processing)
    const [frontResult, backResult] = await Promise.all([
      analyzeDocument(frontImageBuffer, ['FORMS']),
      analyzeDocument(backImageBuffer, ['FORMS'])
    ]);
    
    console.log('✅ Textract completed. Parsing results...');
    
    // Parse extracted data
    const extractedData = parseHTSFormData(frontResult, backResult);
    
    // Apply pattern validation and corrections
    console.log('🔍 Applying pattern validation...');
    const validations = validateAndCorrectFields(extractedData);
    const correctedData = applyValidationCorrections(extractedData, validations);
    const validationSummary = getValidationSummary(validations);
    
    console.log(`✅ Validation complete: ${validationSummary.corrected} auto-corrections, ${validationSummary.validPercentage}% valid`);
    
    // Calculate confidence
    const frontConfidence = calculateAverageConfidence(frontResult.Blocks || []);
    const backConfidence = calculateAverageConfidence(backResult.Blocks || []);
    const avgConfidence = (frontConfidence + backConfidence) / 2;
    
    // Adjust confidence based on validation results
    const adjustedConfidence = (avgConfidence + validationSummary.avgConfidence) / 2;
    
    console.log(`✅ Extraction complete. Raw confidence: ${avgConfidence.toFixed(2)}%, Adjusted: ${adjustedConfidence.toFixed(2)}%`);
    
    return {
      ...correctedData,
      confidence: adjustedConfidence,
      rawConfidence: avgConfidence,
      frontConfidence,
      backConfidence,
      validationSummary,
      validations,
      extractionMethod: 'full-page'
    };
  } catch (error) {
    console.error('❌ OCR analysis failed:', error);
    throw error;
  }
}

/**
 * Process encrypted HTS form with Textract OCR
 * @deprecated Use analyzeHTSForm for OCR-first workflow
 */
async function processEncryptedHTSForm(formId) {
  const pool = await getPool();
  
  try {
    // Fetch form data from database
    const [rows] = await pool.query(
      `SELECT * FROM hts_forms WHERE form_id = ?`,
      [formId]
    );
    
    if (rows.length === 0) {
      throw new Error(`Form not found: ${formId}`);
    }
    
    const formData = rows[0];
    
    // Update status to processing
    await pool.query(
      `UPDATE hts_forms SET ocr_status = 'processing' WHERE form_id = ?`,
      [formId]
    );
    
    // Decrypt images
    console.log(`Decrypting images for form ${formId}...`);
    const { frontImage, backImage } = await decryptFormImages(formData);
    
    // Convert base64 to buffer
    const frontBuffer = Buffer.from(frontImage.split(',')[1] || frontImage, 'base64');
    const backBuffer = Buffer.from(backImage.split(',')[1] || backImage, 'base64');
    
    // Analyze both images with Textract
    console.log(`Analyzing front image with Textract...`);
    const frontResult = await analyzeDocument(frontBuffer);
    
    console.log(`Analyzing back image with Textract...`);
    const backResult = await analyzeDocument(backBuffer);
    
    // Parse extracted data
    const extractedData = parseHTSFormData(frontResult, backResult);
    
    // Calculate overall confidence
    const overallConfidence = (
      (extractedData.frontConfidence + extractedData.backConfidence) / 2
    ).toFixed(2);
    
    // Update database with extracted data
    await pool.query(
      `UPDATE hts_forms 
       SET extracted_data = ?, 
           extraction_confidence = ?, 
           extracted_at = NOW(),
           ocr_status = 'completed'
       WHERE form_id = ?`,
      [JSON.stringify(extractedData), overallConfidence, formId]
    );
    
    console.log(`OCR completed for form ${formId} with confidence ${overallConfidence}%`);
    
    return {
      success: true,
      formId,
      extractedData,
      confidence: overallConfidence
    };
    
  } catch (error) {
    console.error(`OCR failed for form ${formId}:`, error);
    
    // Update status to failed
    await pool.query(
      `UPDATE hts_forms SET ocr_status = 'failed' WHERE form_id = ?`,
      [formId]
    );
    
    throw error;
  }
}

module.exports = {
  analyzeDocument,
  analyzeDocumentWithQueries,
  extractFromQueryResults,
  generateHTSFormQueries,
  batchQueries,
  processBatchQueries,
  analyzeHTSForm,
  analyzeHTSFormEnhanced,
  extractTextLines,
  extractKeyValuePairs,
  extractTestResult,
  extractTestDate,
  extractFullName,
  extractPhilHealthNumber,
  extractTestingFacility,
  extractControlNumber,
  extractSex,
  extractAge,
  extractCivilStatus,
  extractContactNumber,
  extractAddress,
  extractHTSCode,
  extractTestKitUsed,
  extractCounselorName,
  normalizeNameField,
  calculateAverageConfidence,
  parseHTSFormData,
  processEncryptedHTSForm
};

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

// Fuzzy matching for enhanced field mapping
const FuzzySet = require('fuzzyset.js');

// Caches for performance optimization
const keyNormalizationCache = new Map();
let fieldNameFuzzyMatcher = null;

// Load DOH HTS Form 2021 metadata for field extraction
const metadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
let formMetadata = null;

try {
  formMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log('✅ Loaded HTS Form metadata:', formMetadata.name);
} catch (error) {
  console.warn('⚠️ Could not load form metadata:', error.message);
}

// ======= OCR Debugging Helpers =======
const OCR_DEBUG = process.env.OCR_DEBUG === 'true' || process.env.NODE_ENV === 'development';
const OCR_DUMP_JSON = process.env.OCR_DUMP_JSON === 'true';
const OCR_MASK_PII = process.env.OCR_MASK_PII === 'true';
const OCR_DEBUG_MAX_TEXT_LENGTH = Number(process.env.OCR_DEBUG_MAX_TEXT_LENGTH || 1024);
const USE_CACHED_TEXTRACT = process.env.USE_CACHED_TEXTRACT === 'true';

/**
 * Mask common PII fields in the extracted JSON before logging
 * @param {any} obj
 * @returns {any} masked copy
 */
function maskPII(obj) {
  try {
    const clone = JSON.parse(JSON.stringify(obj));

    const maskString = (s, keepStart = 1, keepEnd = 0) => {
      if (!s || typeof s !== 'string') return s;
      const len = s.length;
      if (len <= keepStart + keepEnd) return '*'.repeat(len);
      const start = s.slice(0, keepStart);
      const end = keepEnd > 0 ? s.slice(len - keepEnd) : '';
      const mid = '*'.repeat(Math.max(0, len - keepStart - keepEnd));
      return `${start}${mid}${end}`;
    };

    const maskPhone = (s) => {
      if (!s || typeof s !== 'string') return s;
      const digits = s.replace(/[^0-9]/g, '');
      if (digits.length <= 4) return '*'.repeat(digits.length);
      return '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
    };

    const maskEmail = (s) => {
      if (!s || typeof s !== 'string') return s;
      const parts = s.split('@');
      if (parts.length !== 2) return maskString(s, 1, 1);
      return `${parts[0][0]}***@${parts[1]}`;
    };

    const keyMatches = (k, keywords) => keywords.some(kw => k.toLowerCase().includes(kw));

    (function recurse(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(recurse);
        return;
      }
      Object.keys(node).forEach(k => {
        const v = node[k];
        const lowerKey = k.toLowerCase();

        // Handle PII keys
        if (typeof v === 'string') {
          if (keyMatches(lowerKey, ['firstname', 'first_name', 'first name', 'given name', 'givenname'])) {
            node[k] = maskString(v, 1, 0);
            return;
          }
          if (keyMatches(lowerKey, ['lastname', 'last_name', 'last name', 'surname', 'family name'])) {
            node[k] = maskString(v, 1, 0);
            return;
          }
          if (keyMatches(lowerKey, ['fullname', 'full_name', 'full name', 'client name', 'name'])) {
            node[k] = maskString(v, 1, 1);
            return;
          }
          if (keyMatches(lowerKey, ['phone', 'contact', 'mobile', 'tel', 'telephone'])) {
            node[k] = maskPhone(v);
            return;
          }
          if (keyMatches(lowerKey, ['email'])) {
            node[k] = maskEmail(v);
            return;
          }
          if (keyMatches(lowerKey, ['philhealth', 'phic']) || /\bphil\s*health|phic\b/.test(lowerKey)) {
            node[k] = maskString(v, 0, 4);
            return;
          }
          if (lowerKey === '_rawdata' || lowerKey === '_raw') {
            // mask raw text a bit by truncating long texts
            if (v.frontText) node[k].frontText = v.frontText.slice(0, Math.max(0, OCR_DEBUG_MAX_TEXT_LENGTH)) + (v.frontText.length > OCR_DEBUG_MAX_TEXT_LENGTH ? '... (truncated)' : '');
            if (v.backText) node[k].backText = v.backText.slice(0, Math.max(0, OCR_DEBUG_MAX_TEXT_LENGTH)) + (v.backText.length > OCR_DEBUG_MAX_TEXT_LENGTH ? '... (truncated)' : '');
            return;
          }
        }

        // Recurse into nested objects
        if (typeof v === 'object') recurse(v);
      });
    })(clone);

    return clone;
  } catch (err) {
    // If masking fails, return original copy
    return obj;
  }
}

/**
 * Log extracted JSON (masked and/or written to logs directory) when OCR_DEBUG is enabled
 * @param {string} label
 * @param {object} data
 * @param {object} options { sessionId }
 */
function logExtractedJSON(label, data, options = {}) {
  if (!OCR_DEBUG) return;

  const sessionId = options.sessionId || `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  let payload = data;
  try {
    // Deep copy
    payload = JSON.parse(JSON.stringify(data));

    // Truncate very large raw text fields
    if (payload && typeof payload === 'object') {
      if (payload._rawData && typeof payload._rawData === 'object') {
        if (payload._rawData.frontText && OCR_DEBUG_MAX_TEXT_LENGTH > 0) {
          payload._rawData.frontText = payload._rawData.frontText.slice(0, OCR_DEBUG_MAX_TEXT_LENGTH) + (payload._rawData.frontText.length > OCR_DEBUG_MAX_TEXT_LENGTH ? '... (truncated)' : '');
        }
        if (payload._rawData.backText && OCR_DEBUG_MAX_TEXT_LENGTH > 0) {
          payload._rawData.backText = payload._rawData.backText.slice(0, OCR_DEBUG_MAX_TEXT_LENGTH) + (payload._rawData.backText.length > OCR_DEBUG_MAX_TEXT_LENGTH ? '... (truncated)' : '');
        }
      }
    }

    // Mask PII if requested
    if (OCR_MASK_PII) {
      payload = maskPII(payload);
    }
  } catch (err) {
    console.warn('[OCR JSON] Failed to prepare payload for logging:', err.message);
  }

  try {
    console.log(`🔎 [OCR JSON] ${label} (session: ${sessionId}):`);
    console.log(JSON.stringify(payload, null, 2));

    if (OCR_DUMP_JSON) {
      try {
        const dumpPath = path.join(__dirname, '../logs', `ocr-extracted-${sessionId}.json`);
        fs.writeFileSync(dumpPath, JSON.stringify(payload, null, 2));
        console.log(`💾 [OCR JSON] Saved to: ${dumpPath}`);
      } catch (err) {
        console.error('[OCR JSON] Failed to write JSON dump file:', err.message);
      }
    }
  } catch (err) {
    console.error('[OCR JSON] Logging error:', err.message);
  }
}
// ======= End OCR Debugging Helpers =======

/**
 * Load cached Textract results from local folders
 * @param {string} page - 'front' or 'back'
 * @returns {Object} Textract response with Blocks array
 */
function loadCachedTextractResults(page) {
  const folderName = page === 'front' ? 'HTS-FORM-FRONT' : 'HTS-FORM-BACK';
  const resultPath = path.join(__dirname, '../assets/HTS-FORM', folderName, 'analyzeDocResponse.json');
  
  try {
    const rawData = fs.readFileSync(resultPath, 'utf8');
    const textractResponse = JSON.parse(rawData);
    console.log(`📁 Loaded cached ${page} page Textract results: ${textractResponse.Blocks?.length || 0} blocks`);
    return textractResponse;
  } catch (error) {
    console.error(`❌ Failed to load cached Textract results for ${page} page:`, error.message);
    throw new Error(`Cached Textract data not found for ${page} page at ${resultPath}`);
  }
}

/**
 * Load key-value pairs from CSV file (alternative to parsing Blocks)
 * @param {string} page - 'front' or 'back'
 * @returns {Array} Array of {key, value, confidence} objects
 */
function loadKeyValuesFromCSV(page) {
  const folderName = page === 'front' ? 'HTS-FORM-FRONT' : 'HTS-FORM-BACK';
  const csvPath = path.join(__dirname, '../assets/HTS-FORM', folderName, 'keyValues.csv');
  
  try {
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n').slice(1); // Skip header
    const kvPairs = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Parse CSV line (handle quoted fields)
      const match = line.match(/'([^']*)',?/g);
      if (!match || match.length < 5) return;
      
      const pageNum = match[0].replace(/'/g, '').replace(/,/g, '');
      const key = match[1].replace(/'/g, '').replace(/,/g, '');
      const value = match[2].replace(/'/g, '').replace(/,/g, '');
      const keyConfidence = parseFloat(match[3].replace(/'/g, '').replace(/,/g, ''));
      const valueConfidence = parseFloat(match[4].replace(/'/g, '').replace(/,/g, ''));
      
      if (key && value !== 'NOT_SELECTED') {
        kvPairs.push({
          key: key.trim(),
          value: value === '' ? null : value.trim(),
          confidence: Math.min(keyConfidence, valueConfidence)
        });
      }
    });
    
    console.log(`📊 Loaded ${kvPairs.length} key-value pairs from ${page} page CSV`);
    return kvPairs;
  } catch (error) {
    console.error(`❌ Failed to load CSV for ${page} page:`, error.message);
    return [];
  }
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
 * @deprecated Use analyzeHTSFormWithForms() with FORMS-only approach instead
 * @deprecated This function will be removed in next major version
 * @deprecated FORMS+LAYOUT is now the default. Set OCR_USE_LEGACY_QUERIES=true for old method
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
 * @deprecated Use analyzeHTSFormWithForms() with FORMS-only approach instead
 * @deprecated This function will be removed in next major version
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
 * @deprecated Use analyzeHTSFormWithForms() with FORMS-only approach instead
 * @deprecated This function will be removed in next major version
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
 * Query alias to field name mapping
 * Maps snake_case query aliases to camelCase metadata field names
 * Total: 97 fields (37 front + 60 back)
 * @deprecated Use FORMS_FIELD_MAPPING instead for FORMS-only approach
 * @deprecated This mapping will be removed in next major version
 */
const QUERY_ALIAS_MAP = {
  // FRONT PAGE - INFORMED CONSENT & CONTACT (2 fields)
  'contact_number': 'contactNumber',
  'email_address': 'emailAddress',
  
  // FRONT PAGE - TEST IDENTIFICATION (3 fields)
  'test_date': 'testDate',
  'phil_health_number': 'philHealthNumber',
  'phil_sys_number': 'philSysNumber',
  
  // FRONT PAGE - PATIENT NAME (4 fields)
  'first_name': 'firstName',
  'middle_name': 'middleName',
  'last_name': 'lastName',
  'suffix': 'suffix',
  
  // FRONT PAGE - PARENTAL CODES (3 fields)
  'parental_code_mother': 'parentalCodeMother',
  'parental_code_father': 'parentalCodeFather',
  'birth_order': 'birthOrder',
  
  // FRONT PAGE - DEMOGRAPHIC DATA (5 fields)
  'birth_date': 'birthDate',
  'age': 'age',
  'age_months': 'ageMonths',
  'sex': 'sex',
  'gender_identity': 'genderIdentity',
  
  // FRONT PAGE - RESIDENCE (6 fields)
  'current_residence_city': 'currentResidenceCity',
  'current_residence_province': 'currentResidenceProvince',
  'permanent_residence_city': 'permanentResidenceCity',
  'permanent_residence_province': 'permanentResidenceProvince',
  'place_of_birth_city': 'placeOfBirthCity',
  'place_of_birth_province': 'placeOfBirthProvince',
  
  // FRONT PAGE - PERSONAL STATUS (6 fields)
  'nationality': 'nationality',
  'nationality_other': 'nationalityOther',
  'civil_status': 'civilStatus',
  'living_with_partner': 'livingWithPartner',
  'number_of_children': 'numberOfChildren',
  'is_pregnant': 'isPregnant',
  
  // FRONT PAGE - EDUCATION & OCCUPATION (8 fields)
  'educational_attainment': 'educationalAttainment',
  'currently_in_school': 'currentlyInSchool',
  'currently_working': 'currentlyWorking',
  'occupation': 'occupation',
  'worked_overseas': 'workedOverseas',
  'overseas_return_year': 'overseasReturnYear',
  'overseas_location': 'overseasLocation',
  'overseas_country': 'overseasCountry',
  
  // BACK PAGE - MOTHER HIV STATUS (1 field)
  'mother_hiv': 'motherHIV',
  
  // BACK PAGE - RISK ASSESSMENT: SEX WITH MALE (4 fields)
  'risk_sex_male_status': 'riskSexMaleStatus',
  'risk_sex_male_total': 'riskSexMaleTotal',
  'risk_sex_male_date1': 'riskSexMaleDate1',
  'risk_sex_male_date2': 'riskSexMaleDate2',
  
  // BACK PAGE - RISK ASSESSMENT: SEX WITH FEMALE (4 fields)
  'risk_sex_female_status': 'riskSexFemaleStatus',
  'risk_sex_female_total': 'riskSexFemaleTotal',
  'risk_sex_female_date1': 'riskSexFemaleDate1',
  'risk_sex_female_date2': 'riskSexFemaleDate2',
  
  // BACK PAGE - RISK ASSESSMENT: PAID FOR SEX (2 fields)
  'risk_paid_for_sex_status': 'riskPaidForSexStatus',
  'risk_paid_for_sex_date': 'riskPaidForSexDate',
  
  // BACK PAGE - RISK ASSESSMENT: RECEIVED PAYMENT (2 fields)
  'risk_received_payment_status': 'riskReceivedPaymentStatus',
  'risk_received_payment_date': 'riskReceivedPaymentDate',
  
  // BACK PAGE - RISK ASSESSMENT: SEX UNDER DRUGS (2 fields)
  'risk_sex_under_drugs_status': 'riskSexUnderDrugsStatus',
  'risk_sex_under_drugs_date': 'riskSexUnderDrugsDate',
  
  // BACK PAGE - RISK ASSESSMENT: SHARED NEEDLES (2 fields)
  'risk_shared_needles_status': 'riskSharedNeedlesStatus',
  'risk_shared_needles_date': 'riskSharedNeedlesDate',
  
  // BACK PAGE - RISK ASSESSMENT: BLOOD TRANSFUSION (2 fields)
  'risk_blood_transfusion_status': 'riskBloodTransfusionStatus',
  'risk_blood_transfusion_date': 'riskBloodTransfusionDate',
  
  // BACK PAGE - RISK ASSESSMENT: OCCUPATIONAL EXPOSURE (2 fields)
  'risk_occupational_exposure_status': 'riskOccupationalExposureStatus',
  'risk_occupational_exposure_date': 'riskOccupationalExposureDate',
  
  // BACK PAGE - REASONS FOR TESTING (1 field)
  'reasons_for_testing': 'reasonsForTesting',
  
  // BACK PAGE - PREVIOUS HIV TEST (5 fields)
  'previously_tested': 'previouslyTested',
  'previous_test_date': 'previousTestDate',
  'previous_test_provider': 'previousTestProvider',
  'previous_test_city': 'previousTestCity',
  'previous_test_result': 'previousTestResult',
  
  // BACK PAGE - MEDICAL HISTORY (6 fields)
  'medical_tb': 'medicalTB',
  'medical_sti': 'medicalSTI',
  'medical_pep': 'medicalPEP',
  'medical_prep': 'medicalPrEP',
  'medical_hepatitis_b': 'medicalHepatitisB',
  'medical_hepatitis_c': 'medicalHepatitisC',
  
  // BACK PAGE - CLINICAL PICTURE (3 fields)
  'clinical_picture': 'clinicalPicture',
  'symptoms': 'symptoms',
  'who_staging': 'whoStaging',
  
  // BACK PAGE - TESTING DETAILS (7 fields)
  'client_type': 'clientType',
  'mode_of_reach': 'modeOfReach',
  'testing_accepted': 'testingAccepted',
  'testing_refused_reason': 'testingRefusedReason',
  'testing_modality': 'testingModality',
  'linkage_to_care': 'linkageToCare',
  'other_services': 'otherServices',
  
  // BACK PAGE - INVENTORY INFORMATION (3 fields)
  'test_kit_brand': 'testKitBrand',
  'test_kit_lot_number': 'testKitLotNumber',
  'test_kit_expiration': 'testKitExpiration',
  
  // BACK PAGE - HTS PROVIDER DETAILS (15 fields)
  'testing_facility': 'testingFacility',
  'facility_address': 'facilityAddress',
  'facility_contact_number': 'facilityContactNumber',
  'facility_email': 'facilityEmail',
  'counselor_role': 'counselorRole',
  'counselor_name': 'counselorName',
  'facility_code': 'facilityCode',
  'facility_region': 'facilityRegion',
  'facility_province': 'facilityProvince',
  'facility_city': 'facilityCity',
  'counselor_signature': 'counselorSignature',
  'form_completion_date': 'formCompletionDate',
  'counselor_license': 'counselorLicense',
  'counselor_designation': 'counselorDesignation',
  'counselor_contact': 'counselorContact'
};

/**
 * Generate HTS Form queries for Textract Queries API
 * Organized by HTS Form structure and category
 * @deprecated Use analyzeHTSFormWithForms() with FORMS-only approach instead
 * @deprecated This function will be removed in next major version
 * @param {string} page - 'front' or 'back'
 * @returns {Array} Array of query objects
 */
function generateHTSFormQueries(page = 'front') {
  // AWS Textract Queries API limit: 15 queries per document
  // Queries are organized by HTS Form categories for clarity
  const queries = {
    front: [
      // ============================================================
      // BATCH 1: INFORMED CONSENT & DEMOGRAPHIC DATA (15 queries)
      // ============================================================

      // INFORMED CONSENT - Contact information
      { text: "What are the contact numbers for the patient?", alias: 'contact_number' },
      { text: "What is the email address of the patient?", alias: 'email_address' },
      
      // INFORMED CONSENT - Test identification
      { text: 'What is the HIV test date at the top of the form?', alias: 'test_date' },
      { text: 'What is the 12-digit PhilHealth Number in format XX-XXXXXXXXX-X?', alias: 'phil_health_number' },
      { text: 'What is the 16-digit PhilSys Number in the ID section, written as exactly 16 consecutive digits without dashes or spaces?', alias: 'phil_sys_number' },
      
      // INFORMED CONSENT - Patient name
      { text: "What is the patient's first name?", alias: 'first_name' },
      { text: "What is the patient's middle name only, not including the words 'Middle Name'?", alias: 'middle_name' },
      { text: "What is the patient's last name?", alias: 'last_name' },
      { text: "What is the patient's name suffix such as Jr, Sr, III, or IV?", alias: 'suffix' },
      
      // INFORMED CONSENT - Parental codes
      { text: "What are the first 2 letters of mother's first name?", alias: 'parental_code_mother' },
      { text: "What are the first 2 letters of father's first name?", alias: 'parental_code_father' },
      { text: "What is the birth order among mother's children?", alias: 'birth_order' },
      
      // DEMOGRAPHIC DATA - Basic information
      { text: "What is the patient's date of birth?", alias: 'birth_date' },
      { text: "What is the patient's age in years?", alias: 'age' },
      { text: "What is the patient's age in months?", alias: 'age_months' },
      { text: "What is the patient's sex assigned at birth - Male or Female?", alias: 'sex' },
      { text: "What is the patient's gender identity - Man, Woman, or Other?(Specify)", alias: 'gender_identity' },
      
      // ============================================================
      // BATCH 2: DEMOGRAPHIC DATA & EDUCATION (15 queries)
      // ============================================================
      
      // DEMOGRAPHIC DATA - Residence
      { text: "What is the city or municipality of the patient's current residence?", alias: 'current_residence_city' },
      { text: "What is the province of the patient's current residence?", alias: 'current_residence_province' },
      { text: "What is the city or municipality of the patient's permanent residence?", alias: 'permanent_residence_city' },
      { text: "What is the province of the patient's permanent residence?", alias: 'permanent_residence_province' },
      
      // DEMOGRAPHIC DATA - Place of birth
      { text: "What is the city or municipality where the patient was born?", alias: 'place_of_birth_city' },
      { text: "What is the province where the patient was born?", alias: 'place_of_birth_province' },
      
      // DEMOGRAPHIC DATA - Personal status
      { text: "What is the patient's nationality?", alias: 'nationality' },
      { text: "If the patient's nationality is not Filipino, what is it?", alias: 'nationality_other' },
      { text: "What is the patient's civil status - Single, Married, Separated, Widowed, or Divorced?", alias: 'civil_status' },
      { text: "Is the patient currently living with a partner?", alias: 'living_with_partner' },
      { text: "How many children does the patient have?", alias: 'number_of_children' },
      { text: "Is the patient currently pregnant? (for female only)", alias: 'is_pregnant' },
      
      // EDUCATION & OCCUPATION
      { text: "What is the patient's highest educational attainment? - No grade completed, Pre-school, Elementary, Highschool, College, Vocational, or Post-Graduate?", alias: 'educational_attainment' },
      { text: "Is the patient currently in school?", alias: 'currently_in_school' },
      { text: "Is the patient currently working?", alias: 'currently_working' },
      
      // ============================================================
      // BATCH 3: EDUCATION & OCCUPATION + CONTACT INFO (7 queries)
      // ============================================================
      
      // EDUCATION & OCCUPATION - Work details
      { text: "What is the patient's current or previous occupation?", alias: 'occupation' },
      { text: "Has the patient worked overseas or abroad in the past 5 years?", alias: 'worked_overseas' },
      { text: "If the patient worked overseas, what year did they return from their last contract?", alias: 'overseas_return_year' },
      { text: "Where was the patient based while working overseas - on a ship or on land?", alias: 'overseas_location' },
      { text: "What country did the patient last work in while overseas?", alias: 'overseas_country' },
      // Total: 37 queries across 3 batches (15 + 15 + 7)
    ],
    back: [
      // ============================================================
      // BATCH 1: HISTORY OF EXPOSURE / RISK ASSESSMENT (15 queries)
      // ============================================================
      
      // Mother's HIV status
      { text: 'Is the mother of the patient known to have HIV?', alias: 'mother_hiv' },
      
      // Risk Factor: Sex with MALE
      { text: 'Has the patient had sex with a male partner? Answer Yes or No', alias: 'risk_sex_male_status' },
      { text: 'If yes to sex with male, what is the total number?', alias: 'risk_sex_male_total' },
      { text: 'If yes to sex with male, what is the first date in MM/YYYY format?', alias: 'risk_sex_male_date1' },
      { text: 'If yes to sex with male, what is the second date in MM/YYYY format?', alias: 'risk_sex_male_date2' },
      
      // Risk Factor: Sex with FEMALE
      { text: 'Has the patient had sex with a female partner? Answer Yes or No', alias: 'risk_sex_female_status' },
      { text: 'If yes to sex with female, what is the total number?', alias: 'risk_sex_female_total' },
      { text: 'If yes to sex with female, what is the first date in MM/YYYY format?', alias: 'risk_sex_female_date1' },
      { text: 'If yes to sex with female, what is the second date in MM/YYYY format?', alias: 'risk_sex_female_date2' },
      
      // Risk Factor: Paid for sex
      { text: 'Has the patient paid for sex in cash or kind? Answer Yes or No', alias: 'risk_paid_for_sex_status' },
      { text: 'If yes to paid for sex, what is the date in MM/YYYY format?', alias: 'risk_paid_for_sex_date' },
      
      // Risk Factor: Received payment for sex
      { text: 'Has the patient received payment for sex? Answer Yes or No', alias: 'risk_received_payment_status' },
      { text: 'If yes to received payment, what is the date in MM/YYYY format?', alias: 'risk_received_payment_date' },
      
      // Risk Factor: Sex under influence of drugs
      { text: 'Has the patient had sex under the influence of drugs? Answer Yes or No', alias: 'risk_sex_under_drugs_status' },
      { text: 'If yes to sex under drugs, what is the date in MM/YYYY format?', alias: 'risk_sex_under_drugs_date' },
      
      // ============================================================
      // BATCH 2: RISK ASSESSMENT + TESTING HISTORY (15 queries)
      // ============================================================
      
      // Risk Factor: Shared needles
      { text: 'Has the patient shared needles for drug injection? Answer Yes or No', alias: 'risk_shared_needles_status' },
      { text: 'If yes to shared needles, what is the date in MM/YYYY format?', alias: 'risk_shared_needles_date' },
      
      // Risk Factor: Blood transfusion
      { text: 'Has the patient received blood transfusion? Answer Yes or No', alias: 'risk_blood_transfusion_status' },
      { text: 'If yes to blood transfusion, what is the date in MM/YYYY format?', alias: 'risk_blood_transfusion_date' },
      
      // Risk Factor: Occupational exposure
      { text: 'Has the patient had occupational exposure to needlestick or sharps? Answer Yes or No', alias: 'risk_occupational_exposure_status' },
      { text: 'If yes to occupational exposure, what is the date in MM/YYYY format?', alias: 'risk_occupational_exposure_date' },
      
      // REASONS FOR HIV TESTING
      { text: 'What are the reasons the patient is seeking HIV testing?', alias: 'reasons_for_testing' },
      
      // PREVIOUS HIV TEST
      { text: 'Has the patient been tested for HIV before?', alias: 'previously_tested' },
      { text: 'If yes, when was the previous HIV test date?', alias: 'previous_test_date' },
      { text: 'Which HTS provider or facility conducted the previous test?', alias: 'previous_test_provider' },
      { text: 'In what city or municipality was the previous test conducted?', alias: 'previous_test_city' },
      { text: 'What was the previous HIV test result - Reactive, Non-reactive, Indeterminate, or Unable to get result?', alias: 'previous_test_result' },
      
      // MEDICAL HISTORY & CLINICAL PICTURE
      { text: 'Is the patient a current TB patient?', alias: 'medical_tb' },
      { text: 'Has the patient been diagnosed with other STIs?', alias: 'medical_sti' },
      { text: 'Has the patient taken PEP (Post-Exposure Prophylaxis)?', alias: 'medical_pep' },
      { text: 'Is the patient currently taking PrEP (Pre-Exposure Prophylaxis)?', alias: 'medical_prep' },
      
      // ============================================================
      // BATCH 3: MEDICAL HISTORY + TESTING DETAILS (15 queries)
      // ============================================================
      
      // MEDICAL HISTORY & CLINICAL PICTURE (continued)
      { text: 'Does the patient have hepatitis B?', alias: 'medical_hepatitis_b' },
      { text: 'Does the patient have hepatitis C?', alias: 'medical_hepatitis_c' },
      { text: 'What is the clinical picture - Asymptomatic or Symptomatic?', alias: 'clinical_picture' },
      { text: 'If Symptomatic, describe the signs or symptoms the patient is experiencing?', alias: 'symptoms' },
      { text: 'What is the WHO staging of the patient?', alias: 'who_staging' },
      
      // TESTING DETAILS
      { text: 'What is the client type - Inpatient, Walk-in/outpatient, PDL, or Mobile HTS/Outreach?', alias: 'client_type' },
      { text: 'What is the mode of reach - Clinical, Online, Index testing, Network testing, or Outreach?', alias: 'mode_of_reach' },
      { text: 'Did the patient refuse or accept HIV testing?', alias: 'testing_accepted' },
      { text: 'If testing was refused, what was the reason?', alias: 'testing_refused_reason' },
      { text: 'What HIV testing modality was used - Facility-based, Non-laboratory, Community-based, or Self-testing?', alias: 'testing_modality' },
      { text: 'What is the linkage to care plan for the patient after testing? - Refer to ART, Advised for retesting, Refer for Confirmatory Testing, or Suggested date:(MM/DD/YYYY)', alias: 'linkage_to_care' },
      { text: 'What are the other services provided to client?', alias: 'other_services' },
      
      // INVENTORY INFORMATION
      { text: 'What is the brand of test kit used for this HIV test?', alias: 'test_kit_brand' },
      { text: 'What is the test kit lot number?', alias: 'test_kit_lot_number' },
      { text: 'What is the test kit expiration date?', alias: 'test_kit_expiration' },
      
      // ============================================================
      // BATCH 4: HTS PROVIDER DETAILS (15 queries)
      // ============================================================
      
      // HTS PROVIDER DETAILS
      { text: 'What is the name of the testing facility or organization?', alias: 'testing_facility' },
      { text: 'What is the complete mailing address of the testing facility?', alias: 'facility_address' },
      { text: 'What are the contact numbers for the testing facility?', alias: 'facility_contact_number' },
      { text: 'What is the email address of the testing facility?', alias: 'facility_email' },
      { text: 'What is the role of the counselor - HIV Counselor, Medical Technologist, CBS Motivator, or Others?', alias: 'counselor_role' },
      { text: 'What is the name of the HTS service provider or counselor?', alias: 'counselor_name' },
      
      // Additional fields to complete batch
      { text: 'What is the facility code or identifier?', alias: 'facility_code' },
      { text: 'What region is the testing facility located in?', alias: 'facility_region' },
      { text: 'What province is the testing facility located in?', alias: 'facility_province' },
      { text: 'What city or municipality is the testing facility located in?', alias: 'facility_city' },
      { text: 'What is the signature of the service provider?', alias: 'counselor_signature' },
      { text: 'What is the date when the form was completed?', alias: 'form_completion_date' },
      { text: 'What is the license number of the counselor or service provider?', alias: 'counselor_license' },
      { text: 'What is the designation or position of the service provider?', alias: 'counselor_designation' },
      { text: 'What is the contact number of the service provider?', alias: 'counselor_contact' }
      // Total: 60 queries across 4 batches (15 + 15 + 15 + 15)
    ],
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
  // Debug log extracted JSON (masked/truncated/dumped depending on env)
  try {
    const sessionId = `parse_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    logExtractedJSON('parseHTSFormData', extractedData, { sessionId });
  } catch (err) {
    console.warn('[OCR JSON] parseHTSFormData logging failed:', err.message);
  }
  
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
      
      // Auto-calibration DISABLED - Use manual calibration scripts instead
      // To manually calibrate:
      // - Run: node backend/scripts/recalibrate-front-all-fields.js
      // - Run: node backend/scripts/recalibrate-back-all-fields.js
      // - Apply: node backend/scripts/apply-front-calibration.js
      /*
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
      */
      
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
 * Field mapping dictionary for AWS Textract FORMS feature
 * Maps Textract key-value pair keys to HTS form field names
 * This is a comprehensive mapping for all 97 fields in DOH HTS Form 2021
 */
const FORMS_FIELD_MAPPING = {
  // ========== FRONT PAGE: TEST INFORMATION ==========
  'test date': 'testDate',
  'date of test': 'testDate',
  'testing date': 'testDate',
  'date tested': 'testDate',
  'date of testing': 'testDate',
  'test performed on': 'testDate',
  'screening date': 'testDate',
  'hiv test date': 'testDate',
  'testing performed': 'testDate',
  'test dt': 'testDate',
  'date test': 'testDate',
  
  'control number': 'controlNumber',
  'control no': 'controlNumber',
  'control #': 'controlNumber',
  'serial number': 'controlNumber',
  'ctrl no': 'controlNumber',
  'ctrl number': 'controlNumber',
  'control num': 'controlNumber',
  
  // ========== FRONT PAGE: PERSONAL INFORMATION (Q1-Q11) ==========
  'full name': 'fullName',
  'name': 'fullName',
  'client name': 'fullName',
  'patient name': 'fullName',
  'full name of client': 'fullName',
  'patient full name': 'fullName',
  'complete name': 'fullName',
  'name of patient': 'fullName',
  'client full name': 'fullName',
  'nm': 'fullName',
  'patient nm': 'fullName',
  'name of client': 'fullName',
  
  'last name': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  'last nm': 'lastName',
  'family nm': 'lastName',
  'lastname': 'lastName',
  
  'first name': 'firstName',
  'given name': 'firstName',
  'first nm': 'firstName',
  'given nm': 'firstName',
  'firstname': 'firstName',
  
  'middle name': 'middleName',
  'middle initial': 'middleName',
  'middle nm': 'middleName',
  'mi': 'middleName',
  'm.i.': 'middleName',
  'middlename': 'middleName',
  
  'birthdate': 'birthDate',
  'date of birth': 'birthDate',
  'birth date': 'birthDate',
  'dob': 'birthDate',
  
  'age': 'age',
  'age in years': 'age',
  'patient age': 'age',
  'current age': 'age',
  'years old': 'age',
  'client age': 'age',
  'age (years)': 'age',
  
  'sex': 'sex',
  'gender': 'sex',
  'sex assigned at birth': 'sex',
  'biological sex': 'sex',
  'sex at birth': 'sex',
  
  'civil status': 'civilStatus',
  'marital status': 'civilStatus',
  'status': 'civilStatus',
  'civil stat': 'civilStatus',
  'marital stat': 'civilStatus',
  
  'philhealth number': 'philHealthNumber',
  'philhealth no': 'philHealthNumber',
  'philhealth id': 'philHealthNumber',
  'phic number': 'philHealthNumber',
  'philhealth id number': 'philHealthNumber',
  'philhealth member id': 'philHealthNumber',
  'phic id': 'philHealthNumber',
  'phil health id': 'philHealthNumber',
  'philhealth num': 'philHealthNumber',
  'phic no': 'philHealthNumber',
  
  'address': 'address',
  'complete address': 'address',
  'current address': 'address',
  'residential address': 'address',
  'home address': 'address',
  'residence': 'address',
  'place of residence': 'address',
  'current residence': 'address',
  'present address': 'address',
  'addr': 'address',
  
  'contact number': 'contactNumber',
  'mobile number': 'contactNumber',
  'phone number': 'contactNumber',
  'telephone number': 'contactNumber',
  'mobile no': 'contactNumber',
  'cell phone': 'contactNumber',
  'contact no': 'contactNumber',
  'phone no': 'contactNumber',
  'cellphone number': 'contactNumber',
  'tel no': 'contactNumber',
  'cp no': 'contactNumber',
  'mobile num': 'contactNumber',
  'cellphone': 'contactNumber',
  
  'email address': 'emailAddress',
  'email': 'emailAddress',
  'e-mail': 'emailAddress',
  'electronic mail': 'emailAddress',
  'email add': 'emailAddress',
  'e mail': 'emailAddress',
  
  // Facility contact info (back page only)
  'facility email': 'facilityEmailAddress',
  'facility email address': 'facilityEmailAddress',
  'facility contact number': 'facilityContactNumber',
  'facility contact': 'facilityContactNumber',
  'facility phone': 'facilityContactNumber',
  'facility address': 'facilityAddress',
  'complete mailing address': 'facilityAddress',
  'mailing address': 'facilityAddress',
  
  // Sex and Gender Identity (Q7, Q8)
  'male': 'sexMale',
  'female': 'sexFemale',
  'man': 'genderIdentityMan',
  'woman': 'genderIdentityWoman',
  'transgender woman': 'genderIdentityTransWoman',
  'transgender man': 'genderIdentityTransMan',
  
  // ========== FRONT PAGE: TESTING INFORMATION (Q12-Q18) ==========
  'previously tested': 'previouslyTested',
  'tested before': 'previouslyTested',
  'prior testing': 'previouslyTested',
  'previous test': 'previouslyTested',
  
  'previous test result': 'previousTestResult',
  'last test result': 'previousTestResult',
  'prior result': 'previousTestResult',
  
  'previous test date': 'previousTestDate',
  'date of previous test': 'previousTestDate',
  'last test date': 'previousTestDate',
  
  'testing reason': 'testingReason',
  'reason for testing': 'testingReason',
  'purpose of test': 'testingReason',
  
  'hts code': 'htsCode',
  'hts entry point': 'htsCode',
  'entry point code': 'htsCode',
  
  'screening type': 'screeningType',
  'type of screening': 'screeningType',
  
  'client category': 'clientCategory',
  'category': 'clientCategory',
  
  'partner tested': 'partnerTested',
  'partner also tested': 'partnerTested',
  
  // ========== BACK PAGE: HIV TEST RESULTS (Q19-Q21) ==========
  'screening test result': 'screeningTestResult',
  'screening result': 'screeningTestResult',
  'initial test result': 'screeningTestResult',
  
  'confirmatory test result': 'confirmatoryTestResult',
  'confirmatory result': 'confirmatoryTestResult',
  'final test result': 'confirmatoryTestResult',
  
  'final diagnosis': 'finalDiagnosis',
  'diagnosis': 'finalDiagnosis',
  'final result': 'finalDiagnosis',
  
  // ========== BACK PAGE: RISK ASSESSMENT (Q22) ==========
  'multiple partners': 'multiplePartners',
  'more than one partner': 'multiplePartners',
  
  'std symptoms': 'stdSymptoms',
  'sti symptoms': 'stdSymptoms',
  'symptoms': 'stdSymptoms',
  
  'shared needles': 'sharedNeedles',
  'needle sharing': 'sharedNeedles',
  'injection drug use': 'sharedNeedles',
  
  'blood transfusion': 'bloodTransfusion',
  'received blood': 'bloodTransfusion',
  
  'sex work': 'sexWork',
  'commercial sex': 'sexWork',
  
  'msm': 'msm',
  'men who have sex with men': 'msm',
  
  'transgender': 'transgender',
  'trans': 'transgender',
  
  'sex with plhiv': 'sexWithPLHIV',
  'partner with hiv': 'sexWithPLHIV',
  'plhiv partner': 'sexWithPLHIV',
  
  'no risk': 'noRisk',
  'no identified risk': 'noRisk',
  
  // ========== BACK PAGE: REFERRAL & POST-TEST (Q23-Q24) ==========
  'referred to': 'referredTo',
  'referral': 'referredTo',
  'referred for': 'referredTo',
  
  'treatment facility': 'treatmentFacility',
  'treatment center': 'treatmentFacility',
  'referral facility': 'treatmentFacility',
  
  'post test counseling': 'postTestCounseling',
  'counseling provided': 'postTestCounseling',
  
  'art linkage': 'artLinkage',
  'linked to art': 'artLinkage',
  'antiretroviral therapy': 'artLinkage',
  
  'prevention services': 'preventionServices',
  'prevention': 'preventionServices',
  
  'other services': 'otherServices',
  'additional services': 'otherServices',
  
  // ========== BACK PAGE: INVENTORY (Q25) ==========
  'test kit brand': 'testKitBrand',
  'kit brand': 'testKitBrand',
  'brand': 'testKitBrand',
  
  'test kit lot number': 'testKitLotNumber',
  'lot number': 'testKitLotNumber',
  'batch number': 'testKitLotNumber',
  
  'test kit expiration': 'testKitExpiration',
  'expiration date': 'testKitExpiration',
  'expiry date': 'testKitExpiration',
  
  // ========== BACK PAGE: HTS PROVIDER (Q26-Q27) ==========
  'testing facility': 'testingFacility',
  'facility name': 'testingFacility',
  'health facility': 'testingFacility',
  'name of testing facility': 'testingFacility',
  'testing center': 'testingFacility',
  'facility': 'testingFacility',
  'health center': 'testingFacility',
  'testing site': 'testingFacility',
  
  'counselor name': 'counselorName',
  'counselor': 'counselorName',
  'tested by': 'counselorName',
  'hts provider': 'counselorName',
  'hts counselor': 'counselorName',
  'test counselor': 'counselorName',
  'provider name': 'counselorName',
  'counsellor name': 'counselorName',
  
  'counselor signature': 'counselorSignature',
  'signature': 'counselorSignature',
  
  // ========== EXACT CSV KEY MAPPINGS (From HTS-FORM CSV Files) ==========
  // These are exact patterns observed in the actual CSV files
  
  // Name components (patient)
  'suffix (jr. sr, iii. etc)': 'suffix',
  'suffix': 'suffix',
  'jr. sr. iii. etc': 'suffix',
  
  // PhilSys ID
  'philsys number': 'philSysNumber',
  'philsys no': 'philSysNumber',
  'philsys id': 'philSysNumber',
  'philsys registry number (prn)': 'philSysNumber',
  
  // Nationality and Birth
  'filipino': 'nationality',
  'nationality': 'nationality',
  'birth order': 'birthOrder',
  
  // Location fields
  'province': 'province',
  'city/municipality': 'cityMunicipality',
  'city municipality': 'cityMunicipality',
  'barangay': 'barangay',
  
  // Province of birth
  'province of birth': 'provinceOfBirth',
  'city of birth': 'cityOfBirth',
  'city/municipality of birth': 'cityOfBirth',
  
  // Parental codes
  'first 2 letters of mother\'s first name': 'parentalCodeMother',
  'mother first name': 'parentalCodeMother',
  'first 2 letters of father\'s first name': 'parentalCodeFather',
  'father first name': 'parentalCodeFather',
  
  // Education
  'highest educational attainment': 'educationalAttainment',
  'educational attainment': 'educationalAttainment',
  
  // Testing reason categories
  'suspected exposure to hiv': 'suspectedExposure',
  'i had unprotected sex with an hiv-positive partner or plhiv': 'unprotectedWithPLHIV',
  'i shared needles': 'sharedNeedlesResponse',
  'my partner had sex with others': 'partnerSexWithOthers',
  'i was diagnosed with sti': 'diagnosedWithSTI',
  'i was a victim of rape or sexual abuse': 'victimOfRape',
  'other reasons': 'otherReason',
  
  // Testing facility (back page) - must not map to fullName!
  'name of testing facility/organization': 'testingFacility',
  'name of testing facility organization': 'testingFacility',
  'testing facility organization': 'testingFacility',
  
  // Provider information (back page) - must not map to fullName!
  'name & signature of service provider': 'counselorName',
  'name signature of service provider': 'counselorName',
  'service provider name': 'counselorName',
  'service provider': 'counselorName',
  
  // HTS provider selection (back page)
  'which hts provider are you': 'htsProviderType',
  'hts provider type': 'htsProviderType',
  'type of hts provider': 'htsProviderType',
  
  // Registration numbers
  'registration number': 'registrationNumber',
  'reg no': 'registrationNumber',
  'registration no': 'registrationNumber'
};

/**
 * Advanced key normalization for better field matching
 * Handles OCR artifacts, punctuation, and text variations
 * @param {string} rawKey - Original key from OCR
 * @returns {string} Normalized key for matching
 */
function normalizeOCRKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  
  // Check cache first for performance
  if (keyNormalizationCache.has(rawKey)) {
    return keyNormalizationCache.get(rawKey);
  }
  
  let normalized = rawKey;
  
  // Step 1: Basic cleanup
  normalized = normalized.toLowerCase().trim();
  
  // Step 2: Remove common OCR artifacts and punctuation
  normalized = normalized
    .replace(/[^\w\s]/g, ' ')           // Replace punctuation with spaces
    .replace(/\s+/g, ' ')              // Collapse multiple spaces
    .replace(/\b(of|the|and|or|in|on|at|to|for|with|by|no|number)\b/g, ' ') // Remove common stop words
    .replace(/\bnumber\b/g, '')        // Remove "number" word
    .trim();
  
  // Step 3: Handle common OCR character substitutions
  const ocrFixMap = {
    '0': 'o',    // Zero to O
    '1': 'l',    // One to L  
    '5': 's',    // Five to S
    '8': 'b',    // Eight to B
    'rn': 'm',   // rn to m
    'cl': 'd',   // cl to d
    'ii': 'n',   // ii to n
  };
  
  // Apply OCR fixes
  Object.entries(ocrFixMap).forEach(([wrong, correct]) => {
    const regex = new RegExp(wrong, 'gi');
    normalized = normalized.replace(regex, correct);
  });
  
  // Step 4: Final cleanup
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Cache the result (limit cache size to prevent memory leaks)
  if (keyNormalizationCache.size > 1000) {
    const firstKey = keyNormalizationCache.keys().next().value;
    keyNormalizationCache.delete(firstKey);
  }
  keyNormalizationCache.set(rawKey, normalized);
  
  return normalized;
}

/**
 * Get or create fuzzy matcher for field names
 * @returns {FuzzySet} Fuzzy matcher instance
 */
function getFuzzyMatcher() {
  if (!fieldNameFuzzyMatcher) {
    const fieldKeys = Object.keys(FORMS_FIELD_MAPPING);
    fieldNameFuzzyMatcher = FuzzySet(fieldKeys);
    console.log(`🔍 Initialized fuzzy matcher with ${fieldKeys.length} field patterns`);
  }
  return fieldNameFuzzyMatcher;
}

/**
 * Find fuzzy match for field name
 * @param {string} normalizedKey - Normalized key to match
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {Object|null} Match result or null
 */
function findFuzzyFieldMatch(normalizedKey, threshold = 0.7) {
  try {
    const fuzzyMatcher = getFuzzyMatcher();
    const matches = fuzzyMatcher.get(normalizedKey);
    
    if (matches && matches.length > 0) {
      const [score, matchedKey] = matches[0];
      if (score >= threshold) {
        return {
          fieldName: FORMS_FIELD_MAPPING[matchedKey],
          normalizedKey: matchedKey,
          confidence: score,
          matchType: 'fuzzy'
        };
      }
    }
  } catch (error) {
    console.error('Fuzzy matching error:', error);
  }
  
  return null;
}

/**
 * Try multiple mapping strategies in order of preference
 * @param {Object} kvPair - Key-value pair from Textract
 * @param {Object} context - Context information
 * @returns {Object} Mapping result
 */
function tryMultipleMappingStrategies(kvPair, context) {
  const rawKey = kvPair.key;
  const strategies = [
    'exact_match',
    'normalized_match', 
    'fuzzy_match',
    'context_aware',
    'numbered_question',
    'partial_match'
  ];
  
  for (const strategy of strategies) {
    try {
      const result = applyMappingStrategy(kvPair, context, strategy);
      if (result.fieldName) {
        return { ...result, strategy };
      }
    } catch (error) {
      console.error(`Mapping strategy ${strategy} failed for key "${rawKey}":`, error);
    }
  }
  
  return { 
    fieldName: null, 
    normalizedKey: normalizeOCRKey(rawKey),
    strategy: 'none' 
  };
}

/**
 * Apply specific mapping strategy
 * @param {Object} kvPair - Key-value pair from Textract
 * @param {Object} context - Context information
 * @param {string} strategy - Strategy name
 * @returns {Object} Mapping result
 */
function applyMappingStrategy(kvPair, context, strategy) {
  const rawKey = kvPair.key;
  const normalizedKey = normalizeOCRKey(rawKey);
  const pageType = context.pageType;
  
  switch (strategy) {
    case 'exact_match':
      if (FORMS_FIELD_MAPPING[rawKey.toLowerCase().trim()]) {
        return { fieldName: FORMS_FIELD_MAPPING[rawKey.toLowerCase().trim()], normalizedKey: rawKey };
      }
      break;
      
    case 'normalized_match':
      let fieldName = FORMS_FIELD_MAPPING[normalizedKey];
      
      // Context-aware mapping: distinguish patient vs facility contact info
      if (fieldName === 'emailAddress' && pageType === 'back') {
        fieldName = 'facilityEmailAddress';
      } else if (fieldName === 'contactNumber' && pageType === 'back') {
        fieldName = 'facilityContactNumber';
      } else if (fieldName === 'address' && pageType === 'back') {
        fieldName = 'facilityAddress';
      }
      
      if (fieldName) {
        return { fieldName, normalizedKey };
      }
      break;
      
    case 'fuzzy_match':
      const fuzzyMatch = findFuzzyFieldMatch(normalizedKey, 0.7);
      if (fuzzyMatch) {
        // Context-aware mapping: distinguish patient vs facility contact info
        let fieldName = fuzzyMatch.fieldName;
        if (fieldName === 'emailAddress' && pageType === 'back') {
          fieldName = 'facilityEmailAddress';
        } else if (fieldName === 'contactNumber' && pageType === 'back') {
          fieldName = 'facilityContactNumber';
        } else if (fieldName === 'address' && pageType === 'back') {
          fieldName = 'facilityAddress';
        }
        return { ...fuzzyMatch, fieldName };
      }
      break;
      
    case 'context_aware':
      return tryContextAwareMapping(kvPair, context);
      
    case 'numbered_question':
      return tryNumberedQuestionMapping(kvPair, context);
      
    case 'partial_match':
      return tryPartialMatching(normalizedKey);
  }
  
  return { fieldName: null, normalizedKey };
}

/**
 * Try context-aware mapping based on surrounding fields
 * @param {Object} kvPair - Key-value pair
 * @param {Object} context - Context information
 * @returns {Object} Mapping result
 */
function tryContextAwareMapping(kvPair, context) {
  const normalizedKey = normalizeOCRKey(kvPair.key);
  
  // Context patterns for different form sections
  const contextMappings = {
    'personal': ['name', 'age', 'sex', 'address', 'contact'],
    'testing': ['test', 'date', 'result', 'facility', 'counselor'],
    'risk': ['risk', 'partner', 'needle', 'blood', 'sex'],
    'health': ['philhealth', 'id', 'number', 'phic']
  };
  
  // Analyze context to determine section
  let contextSection = null;
  if (context.previousKey || context.nextKey) {
    const contextText = `${context.previousKey || ''} ${context.nextKey || ''}`.toLowerCase();
    
    for (const [section, keywords] of Object.entries(contextMappings)) {
      if (keywords.some(keyword => contextText.includes(keyword))) {
        contextSection = section;
        break;
      }
    }
  }
  
  // Apply context-specific mapping logic
  if (contextSection === 'personal' && normalizedKey.includes('nm')) {
    if (normalizedKey.includes('first') || normalizedKey.includes('given')) {
      return { fieldName: 'firstName', normalizedKey };
    } else if (normalizedKey.includes('last') || normalizedKey.includes('family')) {
      return { fieldName: 'lastName', normalizedKey };
    } else {
      return { fieldName: 'fullName', normalizedKey };
    }
  }
  
  return { fieldName: null, normalizedKey };
}

/**
 * Try numbered question mapping (Q1, Q2, etc.)
 * @param {Object} kvPair - Key-value pair
 * @param {Object} context - Context information
 * @returns {Object} Mapping result
 */
function tryNumberedQuestionMapping(kvPair, context) {
  const normalizedKey = normalizeOCRKey(kvPair.key);
  
  // Map numbered questions to risk assessment fields
  const numberedQuestions = {
    'q1': 'riskSexMaleStatus',
    'q2': 'riskSexFemaleStatus',
    'q3': 'riskMultiplePartners',
    'q4': 'riskSTDSymptoms',
    'q5': 'riskSharedNeedles',
    'q6': 'riskBloodTransfusion',
    'question 1': 'riskSexMaleStatus',
    'question 2': 'riskSexFemaleStatus',
    '1.': 'riskSexMaleStatus',
    '2.': 'riskSexFemaleStatus'
  };
  
  for (const [pattern, fieldName] of Object.entries(numberedQuestions)) {
    if (normalizedKey.includes(pattern)) {
      return { fieldName, normalizedKey };
    }
  }
  
  return { fieldName: null, normalizedKey };
}

/**
 * Try partial matching for field names
 * @param {string} normalizedKey - Normalized key
 * @returns {Object} Mapping result
 */
function tryPartialMatching(normalizedKey) {
  // IMPORTANT: Don't map generic "name" to fullName - too many false positives
  // Examples: "Name of Testing Facility" should NOT map to fullName
  // Only map if it's clearly a patient name field
  
  // Partial matching patterns (most specific first)
  const partialMatches = {
    'philhealth': 'philHealthNumber',
    'phic': 'philHealthNumber',
    'facility': 'testingFacility',
    'counselor': 'counselorName',
    'provider': 'counselorName',
    'phone': 'contactNumber',
    'mobile': 'contactNumber',
    'email': 'emailAddress',
    'age': 'age'
    // NOTE: Removed generic 'name', 'contact', 'date', 'test', 'sex', 'address' - too ambiguous
  };
  
  // Don't use partial match for address - it matches too many facility-related fields
  
  for (const [pattern, fieldName] of Object.entries(partialMatches)) {
    if (normalizedKey.includes(pattern)) {
      return { fieldName, normalizedKey };
    }
  }
  
  return { fieldName: null, normalizedKey };
}

/**
 * Track unmapped keys in database for analysis
 * @param {Array} unmappedKeys - Array of unmapped key objects
 * @param {string} pageType - Page type (front/back)
 * @param {string} sessionId - Session identifier
 */
async function trackUnmappedKeys(unmappedKeys, pageType, sessionId) {
  if (!unmappedKeys.length) return;
  
  try {
    // Check if pool is available (may not be initialized in test environments)
    let pool;
    try {
      pool = getPool();
    } catch (poolError) {
      // Silently skip database tracking if pool not initialized
      return;
    }
    
    for (const unmappedKey of unmappedKeys) {
      // Check if key already exists
      const [existing] = await pool.execute(
        'SELECT id, frequency_count FROM ocr_unmapped_keys WHERE normalized_key = ? AND page_type = ?',
        [unmappedKey.normalizedKey, pageType]
      );
      
      if (existing.length > 0) {
        // Update frequency count
        await pool.execute(
          'UPDATE ocr_unmapped_keys SET frequency_count = frequency_count + 1, last_seen = NOW() WHERE id = ?',
          [existing[0].id]
        );
      } else {
        // Insert new unmapped key
        await pool.execute(`
          INSERT INTO ocr_unmapped_keys 
          (original_key, normalized_key, extracted_value, confidence_score, page_type, context_info) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            unmappedKey.originalKey,
            unmappedKey.normalizedKey, 
            unmappedKey.value,
            unmappedKey.confidence,
            pageType,
            JSON.stringify(unmappedKey.context || {})
          ]
        );
      }
    }
    
    console.log(`📊 Tracked ${unmappedKeys.length} unmapped keys for session ${sessionId}`);
  } catch (error) {
    console.error('Error tracking unmapped keys:', error);
    // Don't fail OCR processing for tracking issues
  }
}

/**
 * Log OCR processing statistics
 * @param {string} sessionId - Session identifier
 * @param {number} totalFields - Total fields processed
 * @param {number} mappedFields - Successfully mapped fields
 * @param {number} unmappedFields - Unmapped fields
 * @param {number} confidence - Overall confidence
 * @param {string} pageType - Page type
 */
async function logOCRProcessingStats(sessionId, totalFields, mappedFields, unmappedFields, confidence, pageType) {
  try {
    // Check if pool is available (may not be initialized in test environments)
    let pool;
    try {
      pool = getPool();
    } catch (poolError) {
      // Silently skip database logging if pool not initialized
      return;
    }
    
    await pool.execute(`
      INSERT INTO ocr_processing_logs 
      (session_id, total_fields, mapped_fields, unmapped_fields, overall_confidence, extraction_method, page_type)
      VALUES (?, ?, ?, ?, ?, 'forms+layout', ?)`,
      [sessionId, totalFields, mappedFields, unmappedFields, confidence, pageType]
    );
  } catch (error) {
    console.error('Error logging OCR stats:', error);
  }
}

/**
 * Build composite fields from individual components
 * Handles: fullName (from firstName + middleName + lastName + suffix)
 *          testDate (from Month + Day + Year sequence)
 *          birthDate (from Month + Day + Year sequence)
 * @param {Object} mappedFields - Mapped fields object
 * @param {Array} frontKVPairs - Front page key-value pairs (original order)
 * @param {Array} backKVPairs - Back page key-value pairs (original order)
 */
function buildCompositeFields(mappedFields, frontKVPairs, backKVPairs) {
  // ========== Build fullName from components ==========
  if (mappedFields.firstName || mappedFields.middleName || mappedFields.lastName) {
    const nameParts = [
      mappedFields.firstName?.value,
      mappedFields.middleName?.value,
      mappedFields.lastName?.value,
      mappedFields.suffix?.value
    ].filter(part => part && part.trim() !== '');
    
    if (nameParts.length > 0) {
      const fullName = nameParts.join(' ').trim();
      mappedFields.fullName = {
        value: fullName,
        confidence: Math.round(
          [mappedFields.firstName, mappedFields.middleName, mappedFields.lastName, mappedFields.suffix]
            .filter(f => f)
            .reduce((sum, f) => sum + f.confidence, 0) / nameParts.length
        ),
        rawKey: 'composite',
        normalizedKey: 'full name',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+layout'
      };
      console.log(`  ✓ Built fullName: "${fullName}" (composite from ${nameParts.length} parts)`);
    }
  }
  
  // ========== Build sex from Male/Female SELECTED values ==========
  if (mappedFields.sexMale || mappedFields.sexFemale) {
    let sexValue = null;
    let sexConf = 0;
    
    if (mappedFields.sexMale?.value === 'SELECTED' || mappedFields.sexMale?.value === '/') {
      sexValue = 'Male';
      sexConf = mappedFields.sexMale.confidence;
    } else if (mappedFields.sexFemale?.value === 'SELECTED' || mappedFields.sexFemale?.value === '/') {
      sexValue = 'Female';
      sexConf = mappedFields.sexFemale.confidence;
    }
    
    if (sexValue) {
      mappedFields.sex = {
        value: sexValue,
        confidence: Math.round(sexConf),
        rawKey: 'composite',
        normalizedKey: 'sex',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+layout'
      };
      console.log(`  ✓ Built sex: "${sexValue}" (from checkbox selection)`);
    }
  }
  
  // ========== Build genderIdentity from Man/Woman/Trans SELECTED values ==========
  if (mappedFields.genderIdentityMan || mappedFields.genderIdentityWoman || 
      mappedFields.genderIdentityTransWoman || mappedFields.genderIdentityTransMan) {
    let genderValue = null;
    let genderConf = 0;
    
    if (mappedFields.genderIdentityTransWoman?.value === 'SELECTED' || mappedFields.genderIdentityTransWoman?.value === '/') {
      genderValue = 'Transgender Woman';
      genderConf = mappedFields.genderIdentityTransWoman.confidence;
    } else if (mappedFields.genderIdentityTransMan?.value === 'SELECTED' || mappedFields.genderIdentityTransMan?.value === '/') {
      genderValue = 'Transgender Man';
      genderConf = mappedFields.genderIdentityTransMan.confidence;
    } else if (mappedFields.genderIdentityMan?.value === 'SELECTED' || mappedFields.genderIdentityMan?.value === '/') {
      genderValue = 'Man';
      genderConf = mappedFields.genderIdentityMan.confidence;
    } else if (mappedFields.genderIdentityWoman?.value === 'SELECTED' || mappedFields.genderIdentityWoman?.value === '/') {
      genderValue = 'Woman';
      genderConf = mappedFields.genderIdentityWoman.confidence;
    }
    
    if (genderValue) {
      mappedFields.genderIdentity = {
        value: genderValue,
        confidence: Math.round(genderConf),
        rawKey: 'composite',
        normalizedKey: 'gender identity',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+layout'
      };
      console.log(`  ✓ Built genderIdentity: "${genderValue}" (from checkbox selection)`);
    }
  }
  
  // ========== Build testDate and birthDate from Month/Day/Year sequences ==========
  // Strategy: Look for consecutive Month/Day/Year fields in the CSV row order
  // First set of Month/Day/Year = testDate (rows 9-11 in sample)
  // Second set of Month/Day/Year = birthDate (rows 25-27 in sample)
  
  const monthDayYearSets = findMonthDayYearSequences(frontKVPairs);
  
  if (monthDayYearSets.length >= 1) {
    // First set = testDate
    const testDateSet = monthDayYearSets[0];
    const testDateStr = `${testDateSet.month}-${testDateSet.day}-${testDateSet.year}`;
    mappedFields.testDate = {
      value: testDateStr,
      confidence: Math.round((testDateSet.monthConf + testDateSet.dayConf + testDateSet.yearConf) / 3),
      rawKey: 'composite',
      normalizedKey: 'test date',
      mappingStrategy: 'composite',
      page: 'front',
      extractionMethod: 'forms+layout'
    };
    console.log(`  ✓ Built testDate: "${testDateStr}" (composite from Month/Day/Year sequence)`);
  }
  
  if (monthDayYearSets.length >= 2) {
    // Second set = birthDate
    const birthDateSet = monthDayYearSets[1];
    const birthDateStr = `${birthDateSet.month}-${birthDateSet.day}-${birthDateSet.year}`;
    mappedFields.birthDate = {
      value: birthDateStr,
      confidence: Math.round((birthDateSet.monthConf + birthDateSet.dayConf + birthDateSet.yearConf) / 3),
      rawKey: 'composite',
      normalizedKey: 'birth date',
      mappingStrategy: 'composite',
      page: 'front',
      extractionMethod: 'forms+layout'
    };
    console.log(`  ✓ Built birthDate: "${birthDateStr}" (composite from Month/Day/Year sequence)`);
  }
}

/**
 * Find sequences of Month/Day/Year fields in order
 * Requires fields to be within close proximity (window of 5 positions max)
 * @param {Array} kvPairs - Key-value pairs in original extraction order
 * @returns {Array<Object>} Array of {month, day, year, monthConf, dayConf, yearConf} objects
 */
function findMonthDayYearSequences(kvPairs) {
  const sequences = [];
  
  // Strategy: Find all Month fields, then look for Day within next 5 positions, then Year within next 5 after Day
  for (let i = 0; i < kvPairs.length; i++) {
    const kv = kvPairs[i];
    const keyLower = kv.key.toLowerCase().trim();
    
    // Check if this is a Month field
    if (keyLower === 'month' || keyLower.includes('month:')) {
      const monthValue = kv.value;
      const monthConf = kv.confidence || 85;
      
      // Look for Day within next 5 positions
      let dayValue = null;
      let dayConf = 0;
      let dayIndex = -1;
      
      for (let j = i + 1; j <= i + 5 && j < kvPairs.length; j++) {
        const dayKv = kvPairs[j];
        const dayKeyLower = dayKv.key.toLowerCase().trim();
        
        if (dayKeyLower === 'day' || dayKeyLower.includes('day:')) {
          dayValue = dayKv.value;
          dayConf = dayKv.confidence || 85;
          dayIndex = j;
          break;
        }
      }
      
      // If found Day, look for Year within next 5 positions after Day
      if (dayValue && dayIndex > 0) {
        for (let k = dayIndex + 1; k <= dayIndex + 5 && k < kvPairs.length; k++) {
          const yearKv = kvPairs[k];
          const yearKeyLower = yearKv.key.toLowerCase().trim();
          
          if (yearKeyLower === 'year' || yearKeyLower.includes('year:')) {
            const yearValue = yearKv.value;
            const yearConf = yearKv.confidence || 85;
            
            // Found complete sequence!
            sequences.push({
              month: monthValue,
              day: dayValue,
              year: yearValue,
              monthConf,
              dayConf,
              yearConf,
              startIndex: i,
              endIndex: k
            });
            
            console.log(`    📅 Found Month/Day/Year sequence at positions ${i}-${k}: ${monthValue}/${dayValue}/${yearValue}`);
            break;
          }
        }
      }
    }
  }
  
  return sequences;
}

/**
 * Enhanced Map Textract FORMS key-value pairs to HTS field structure
 * @param {Array} keyValuePairs - Textract key-value blocks
 * @param {string} pageType - 'front' or 'back'
 * @param {string} sessionId - Session identifier for tracking
 * @returns {Object} Mapped HTS fields with confidence scores and enhanced analytics
 */
function mapTextractKeysToHTSFields(keyValuePairs, pageType = 'unknown', sessionId = null) {
  console.log(`🗺️  Enhanced mapping of ${keyValuePairs.length} key-value pairs from ${pageType} page...`);
  
  const mappedFields = {};
  const unmappedKeys = [];
  const processingStartTime = Date.now();
  
  for (let i = 0; i < keyValuePairs.length; i++) {
    const kvPair = keyValuePairs[i];
    
    if (!kvPair.key || !kvPair.value) {
      continue;
    }
    
    // Build context from surrounding fields
    const context = {
      previousKey: i > 0 ? keyValuePairs[i-1]?.key : null,
      nextKey: i < keyValuePairs.length - 1 ? keyValuePairs[i+1]?.key : null,
      pageType,
      position: i
    };
    
    // Try multiple mapping strategies
    const mappingResult = tryMultipleMappingStrategies(kvPair, context);
    
    if (mappingResult.fieldName) {
      mappedFields[mappingResult.fieldName] = {
        value: kvPair.value,
        confidence: kvPair.confidence,
        rawKey: kvPair.key,
        normalizedKey: mappingResult.normalizedKey,
        mappingStrategy: mappingResult.strategy,
        page: pageType,
        extractionMethod: 'forms+layout'
      };
      
      console.log(`  ✓ "${kvPair.key}" → ${mappingResult.fieldName}: "${kvPair.value}" (${kvPair.confidence}%) [${mappingResult.strategy}]`);
    } else {
      unmappedKeys.push({
        originalKey: kvPair.key,
        normalizedKey: mappingResult.normalizedKey,
        value: kvPair.value,
        confidence: kvPair.confidence,
        context
      });
    }
  }
  
  const processingTime = Date.now() - processingStartTime;
  const mappedCount = Object.keys(mappedFields).length;
  const unmappedCount = unmappedKeys.length;
  const totalCount = keyValuePairs.filter(kv => kv.key && kv.value).length;
  const mappingRate = totalCount > 0 ? (mappedCount / totalCount * 100) : 0;
  
  // Calculate confidence statistics
  const confidenceScores = Object.values(mappedFields).map(field => field.confidence);
  const avgConfidence = confidenceScores.length > 0 
    ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length 
    : 0;
  
  const highConfidence = confidenceScores.filter(conf => conf >= 90).length;
  const mediumConfidence = confidenceScores.filter(conf => conf >= 70 && conf < 90).length;
  const lowConfidence = confidenceScores.filter(conf => conf < 70).length;
  
  console.log(`📊 Mapping Results: ${mappedCount}/${totalCount} fields mapped (${mappingRate.toFixed(1)}%) in ${processingTime}ms`);
  
  // Track unmapped keys asynchronously (don't block processing)
  if (sessionId && unmappedKeys.length > 0) {
    setImmediate(() => {
      trackUnmappedKeys(unmappedKeys, pageType, sessionId)
        .catch(error => console.error('Background unmapped key tracking failed:', error));
    });
  }
  
  // Log processing statistics asynchronously
  if (sessionId) {
    setImmediate(() => {
      logOCRProcessingStats(sessionId, totalCount, mappedCount, unmappedCount, avgConfidence, pageType)
        .catch(error => console.error('Background stats logging failed:', error));
    });
  }
  
  // Log unmapped keys for immediate debugging
  if (unmappedKeys.length > 0) {
    console.log(`⚠️  ${unmappedKeys.length} unmapped keys found:`, 
      unmappedKeys.slice(0, 5).map(uk => uk.originalKey).join(', '));
  }

  // Debug log mapping JSON (masked/truncated/dumped depending on env)
  try {
    const debugPayload = {
      sessionId,
      pageType,
      stats: {
        totalCount,
        mappedCount,
        unmappedCount,
        mappingRate: parseFloat(mappingRate.toFixed(1)),
        processingTimeMs: processingTime,
        confidence: {
          overall: parseFloat(avgConfidence.toFixed(1)),
          high: highConfidence,
          medium: mediumConfidence,
          low: lowConfidence
        }
      },
      mappedFields,
      unmappedKeys: unmappedKeys
    };
    logExtractedJSON('mapTextractKeysToHTSFields', debugPayload, { sessionId });
  } catch (err) {
    console.warn('[OCR JSON] mapTextractKeysToHTSFields logging failed:', err.message);
  }
  
  return {
    fields: mappedFields,
    stats: {
      totalFields: totalCount,
      mapped: mappedCount,
      unmapped: unmappedCount,
      mappingRate: parseFloat(mappingRate.toFixed(1)),
      processingTimeMs: processingTime,
      confidence: {
        overall: parseFloat(avgConfidence.toFixed(1)),
        high: highConfidence,        // >= 90%
        medium: mediumConfidence,    // 70-89%
        low: lowConfidence          // < 70%
      }
    },
    unmappedKeys: unmappedKeys.map(uk => uk.originalKey), // Keep compatibility
    unmappedKeysDetailed: unmappedKeys, // Detailed version for analytics
    extractionMethod: 'forms+layout'
  };
}

/**
 * Analyze HTS form using AWS Textract FORMS + LAYOUT features
 * This is the NEW approach - no QUERIES, no coordinate-based extraction
 * Combines FORMS (key-value pairs) + LAYOUT (document structure) for better accuracy
 * @param {Buffer} frontImageBuffer - Front page image
 * @param {Buffer} backImageBuffer - Back page image
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extracted data with field-level confidence
 */
async function analyzeHTSFormWithForms(frontImageBuffer, backImageBuffer, options = {}) {
  const { preprocessImages = true, useLayout = true, useCachedData = USE_CACHED_TEXTRACT } = options;
  
  // Generate session ID for tracking and analytics
  const sessionId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const features = useLayout ? 'FORMS + LAYOUT' : 'FORMS only';
  const dataSource = useCachedData ? 'CACHED' : 'AWS LIVE';
  console.log(`📤 [FORMS OCR] Starting HTS form extraction with ${features} from ${dataSource}... (Session: ${sessionId})`);
  
  try {
    let frontResult, backResult, frontKVPairs, backKVPairs;
    
    if (useCachedData) {
      // ========== USE CACHED TEXTRACT RESULTS ==========
      console.log('📁 Loading cached Textract results from HTS-FORM folders...');
      
      // Load cached Textract responses
      frontResult = loadCachedTextractResults('front');
      backResult = loadCachedTextractResults('back');
      
      console.log(`✅ Cached data loaded`);
      console.log(`   - Front blocks: ${frontResult.Blocks?.length || 0}`);
      console.log(`   - Back blocks: ${backResult.Blocks?.length || 0}`);
      
      // Extract key-value pairs from cached blocks
      frontKVPairs = extractKeyValuePairs(frontResult.Blocks || []);
      backKVPairs = extractKeyValuePairs(backResult.Blocks || []);
      
      // Optionally load from CSV for faster processing (CSV is pre-parsed)
      if (frontKVPairs.length === 0) {
        console.log('⚠️  No KV pairs from blocks, loading from CSV...');
        frontKVPairs = loadKeyValuesFromCSV('front');
        backKVPairs = loadKeyValuesFromCSV('back');
      }
    } else {
      // ========== USE LIVE AWS TEXTRACT API ==========
      // Step 1: Preprocess images if enabled
      if (preprocessImages) {
        console.log('🖼️  Preprocessing images for optimal OCR...');
        
        try {
          const [frontProcessed, backProcessed] = await Promise.all([
            imagePreprocessor.process(frontImageBuffer, { mode: 'auto' }),
            imagePreprocessor.process(backImageBuffer, { mode: 'auto' })
          ]);

          console.log(`✅ Front: ${frontProcessed.applied.join(', ')}`);
          console.log(`✅ Back: ${backProcessed.applied.join(', ')}`);

          frontImageBuffer = frontProcessed.buffer;
          backImageBuffer = backProcessed.buffer;
        } catch (preprocessError) {
          console.warn('⚠️  Preprocessing failed, using original images:', preprocessError.message);
        }
      }

      // Step 2: Analyze both pages with FORMS + LAYOUT features
      const featureTypes = useLayout ? ['FORMS', 'LAYOUT'] : ['FORMS'];
      console.log(`🔍 Running AWS Textract analysis with features: ${featureTypes.join(', ')}...`);
      
      const [frontResultLive, backResultLive] = await Promise.all([
        textractClient.send(new AnalyzeDocumentCommand({
          Document: { Bytes: frontImageBuffer },
          FeatureTypes: featureTypes
        })),
        textractClient.send(new AnalyzeDocumentCommand({
          Document: { Bytes: backImageBuffer },
          FeatureTypes: featureTypes
        }))
      ]);
      
      frontResult = frontResultLive;
      backResult = backResultLive;

      console.log(`✅ Textract analysis complete`);
      console.log(`   - Front blocks: ${frontResult.Blocks.length}`);
      console.log(`   - Back blocks: ${backResult.Blocks.length}`);

      // Step 3: Extract key-value pairs from both pages
      frontKVPairs = extractKeyValuePairs(frontResult.Blocks);
      backKVPairs = extractKeyValuePairs(backResult.Blocks);
    }
    
    console.log(`📊 Key-value pairs found:`);
    console.log(`   - Front page: ${frontKVPairs.length} pairs`);
    console.log(`   - Back page: ${backKVPairs.length} pairs`);

    // Step 4: Map Textract keys to HTS field names with enhanced tracking
    const frontMapping = mapTextractKeysToHTSFields(frontKVPairs, 'front', sessionId);
    const backMapping = mapTextractKeysToHTSFields(backKVPairs, 'back', sessionId);

    // Step 5: Merge fields from both pages
    const allFields = {
      ...frontMapping.fields,
      ...backMapping.fields
    };

    console.log(`✅ Field mapping complete:`);
    console.log(`   - Front mapped: ${frontMapping.stats.mapped} fields`);
    console.log(`   - Back mapped: ${backMapping.stats.mapped} fields`);
    console.log(`   - Total mapped: ${Object.keys(allFields).length} fields`);
    console.log(`   - Total unmapped: ${frontMapping.stats.unmapped + backMapping.stats.unmapped} keys`);

    // Step 5.5: Build composite fields from individual components
    console.log('🔧 Building composite fields (fullName, testDate, birthDate)...');
    buildCompositeFields(allFields, frontKVPairs, backKVPairs);

    // Step 6: Convert to simplified field structure for validation
    const fieldsForValidation = {};
    for (const [fieldName, fieldData] of Object.entries(allFields)) {
      fieldsForValidation[fieldName] = fieldData.value;
    }

    // Step 7: Apply validation rules
    console.log('🔍 Applying validation rules...');
    const validations = validateAndCorrectFields(fieldsForValidation);
    const correctedData = applyValidationCorrections(fieldsForValidation, validations);
    const validationSummary = getValidationSummary(validations);

    console.log(`✅ Validation complete: ${validationSummary.corrected} auto-corrections`);

    // Step 8: Calculate overall confidence
    const confidenceValues = Object.values(allFields).map(f => f.confidence);
    const overallConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : 0;

    // Step 9: Calculate stats
    const highConfidence = confidenceValues.filter(c => c >= 85).length;
    const mediumConfidence = confidenceValues.filter(c => c >= 70 && c < 85).length;
    const lowConfidence = confidenceValues.filter(c => c < 70).length;
    const resultObject = {
      fields: correctedData,
      confidence: overallConfidence,
      stats: {
        totalFields: Object.keys(allFields).length,
        highConfidence,
        mediumConfidence,
        lowConfidence,
        requiresReview: lowConfidence,
        extractionMethods: {
          forms: Object.keys(allFields).length,
          query: 0,
          coordinate: 0,
          failed: 97 - Object.keys(allFields).length // Expected 97 total fields
        }
      },
      validationSummary,
      validations,
      extractionMethod: 'forms-only',
      templateId: 'doh-hts-2021-v2',
      unmappedKeys: {
        front: frontMapping.unmappedKeys,
        back: backMapping.unmappedKeys
      }
    };

    // Debug log overall analyzeHTSFormWithForms JSON
    try {
      const debugPayload = {
        sessionId,
        stats: resultObject.stats,
        fields: allFields,
        unmappedKeys: resultObject.unmappedKeys
      };
      logExtractedJSON('analyzeHTSFormWithForms', debugPayload, { sessionId });
    } catch (err) {
      console.warn('[OCR JSON] analyzeHTSFormWithForms logging failed:', err.message);
    }

    return resultObject;
  } catch (error) {
    console.error('❌ [FORMS OCR] Extraction failed:', error);
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
  analyzeHTSFormWithForms, // NEW: FORMS-only approach
  mapTextractKeysToHTSFields, // NEW: Field mapping for FORMS
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
  // QUERY_ALIAS_MAP removed - deprecated with FORMS+LAYOUT migration
};

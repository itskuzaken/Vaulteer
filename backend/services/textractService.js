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
 * Extract text lines from Textract blocks
 */


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
        confidence: Math.min(keyBlock.Confidence, value?.Confidence || 0),
        keyBlock: keyBlock,      // Store original key block for region extraction
        valueBlock: value        // Store original value block for region extraction
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
 * Extract checkboxes with SELECTION_STATUS from Textract blocks
 * @param {Array} blocks - Textract blocks from AnalyzeDocument
 * @returns {Array} Array of checkbox objects with { id, selectionStatus, confidence, geometry, nearbyText }
 */
function extractCheckboxes(blocks) {
  const checkboxes = [];
  const blockMap = {};
  
  // Build block map for relationship lookup
  blocks.forEach(block => {
    blockMap[block.Id] = block;
  });
  
  // Find all SELECTION_ELEMENT blocks (checkboxes)
  blocks.forEach(block => {
    if (block.BlockType === 'SELECTION_ELEMENT') {
      const checkbox = {
        id: block.Id,
        selectionStatus: block.SelectionStatus, // SELECTED or NOT_SELECTED
        confidence: block.Confidence || 0,
        geometry: block.Geometry,
        page: block.Page || 1,
        nearbyText: []
      };
      
      // Find nearby text for context (within 50px)
      const checkboxX = (checkbox.geometry.BoundingBox.Left + checkbox.geometry.BoundingBox.Width / 2);
      const checkboxY = (checkbox.geometry.BoundingBox.Top + checkbox.geometry.BoundingBox.Height / 2);
      
      blocks.forEach(textBlock => {
        if (textBlock.BlockType === 'LINE' && textBlock.Page === checkbox.page) {
          const textX = (textBlock.Geometry.BoundingBox.Left + textBlock.Geometry.BoundingBox.Width / 2);
          const textY = (textBlock.Geometry.BoundingBox.Top + textBlock.Geometry.BoundingBox.Height / 2);
          
          // Calculate distance (normalized to page width)
          const distance = Math.sqrt(Math.pow(textX - checkboxX, 2) + Math.pow(textY - checkboxY, 2));
          
          if (distance < 0.15) { // Within 15% of page width
            checkbox.nearbyText.push({
              text: textBlock.Text,
              distance,
              confidence: textBlock.Confidence || 0
            });
          }
        }
      });
      
      // Sort nearby text by distance
      checkbox.nearbyText.sort((a, b) => a.distance - b.distance);
      
      checkboxes.push(checkbox);
    }
  });
  
  console.log(`  ✓ Found ${checkboxes.length} checkboxes (${checkboxes.filter(c => c.selectionStatus === 'SELECTED').length} selected)`);
  return checkboxes;
}

/**
 * Map checkboxes to field names based on nearby text context
 * @param {Array} checkboxes - Checkboxes from extractCheckboxes()
 * @param {string} page - 'front' or 'back'
 * @returns {Object} Mapped checkbox fields
 */
function mapCheckboxesToFields(checkboxes, page) {
  const mappedCheckboxes = {};
  
  // Field patterns for checkbox matching
  const checkboxPatterns = {
    // Sex
    'sexMale': /\b(male|m)\b/i,
    'sexFemale': /\b(female|f)\b/i,
    
    // Gender Identity
    'genderIdentityMan': /\bman\b/i,
    'genderIdentityWoman': /\bwoman\b/i,
    'genderIdentityTransWoman': /\btrans(gender)?\s*woman\b/i,
    'genderIdentityTransMan': /\btrans(gender)?\s*man\b/i,
    
    // Civil Status
    'civilStatusSingle': /\bsingle\b/i,
    'civilStatusMarried': /\bmarried\b/i,
    'civilStatusSeparated': /\bseparated\b/i,
    'civilStatusWidowed': /\bwidowed?\b/i,
    'civilStatusDivorced': /\bdivorced\b/i,
    
    // Educational Attainment
    'educationNoGrade': /\bno\s+grade\s+completed\b/i,
    'educationElementary': /\belementary\b/i,
    'educationHighSchool': /\bhigh\s*school\b/i,
    'educationCollege': /\bcollege\b/i,
    'educationVocational': /\bvocational\b/i,
    'educationPostGraduate': /\bpost\s*graduate\b/i,
    
    // Yes/No fields
    'currentlyInSchoolYes': /\bcurrently.*school.*yes\b/i,
    'currentlyInSchoolNo': /\bcurrently.*school.*no\b/i,
    'currentlyWorkingYes': /\bcurrently.*work.*yes\b/i,
    'currentlyWorkingNo': /\bcurrently.*work.*no\b/i,
    'livingWithPartnerYes': /\bliving.*partner.*yes\b/i,
    'livingWithPartnerNo': /\bliving.*partner.*no\b/i,
    'isPregnantYes': /\bpregnant.*yes\b/i,
    'isPregnantNo': /\bpregnant.*no\b/i,
    
    // Risk Assessment (8 types)
    'riskSexMaleNo': /\bsex.*male.*no\b/i,
    'riskSexMaleYes': /\bsex.*male.*yes\b/i,
    'riskSexFemaleNo': /\bsex.*female.*no\b/i,
    'riskSexFemaleYes': /\bsex.*female.*yes\b/i,
    'riskPaidForSexNo': /\bpaid.*sex.*no\b/i,
    'riskPaidForSexYes': /\bpaid.*sex.*yes\b/i,
    'riskReceivedPaymentNo': /\breceived.*payment.*no\b/i,
    'riskReceivedPaymentYes': /\breceived.*payment.*yes\b/i,
    'riskSexUnderDrugsNo': /\b(sex.*drug|drug.*sex).*no\b/i,
    'riskSexUnderDrugsYes': /\b(sex.*drug|drug.*sex).*yes\b/i,
    'riskSharedNeedlesNo': /\b(shared.*needle|needle.*shared).*no\b/i,
    'riskSharedNeedlesYes': /\b(shared.*needle|needle.*shared).*yes\b/i,
    'riskBloodTransfusionNo': /\bblood.*transfusion.*no\b/i,
    'riskBloodTransfusionYes': /\bblood.*transfusion.*yes\b/i,
    'riskOccupationalExposureNo': /\boccupational.*exposure.*no\b/i,
    'riskOccupationalExposureYes': /\boccupational.*exposure.*yes\b/i,
    
    // Mother HIV Status
    'motherHIVNo': /\bmother.*hiv.*no\b/i,
    'motherHIVYes': /\bmother.*hiv.*yes\b/i,
    'motherHIVDoNotKnow': /\bmother.*hiv.*(don't|do not)\s*know\b/i,
    
    // Client Type
    'clientTypeInpatient': /\binpatient\b/i,
    'clientTypeOutpatient': /\boutpatient\b/i,
    'clientTypePDL': /\bpdl\b/i,
    'clientTypeOutreach': /\boutreach\b/i,
    
    // Mode of Reach
    'modeOfReachClinic': /\bclinic\b/i,
    'modeOfReachOnline': /\bonline\b/i,
    'modeOfReachIndex': /\bindex\b/i,
    'modeOfReachNetworkTesting': /\bnetwork.*test\b/i,
    'modeOfReachOutreach': /\boutreach\b/i,
    
    // Testing Modality
    'testingModalityFacilityBased': /\bfacility.*based\b/i,
    'testingModalityNonLaboratory': /\bnon.*laboratory\b/i,
    'testingModalityCommunityBased': /\bcommunity.*based\b/i,
    'testingModalitySelfTesting': /\bself.*test\b/i
  };
  
  // Match each checkbox to a field based on nearby text
  checkboxes.forEach((checkbox, idx) => {
    const contextText = checkbox.nearbyText.map(t => t.text).join(' ');
    
    if (OCR_DEBUG && idx < 5) {
      console.log(`  [DEBUG] Checkbox ${idx + 1}/${checkboxes.length}: status=${checkbox.selectionStatus}, nearbyText="${contextText.substring(0, 80)}..."`);
    }
    
    for (const [fieldName, pattern] of Object.entries(checkboxPatterns)) {
      if (pattern.test(contextText)) {
        mappedCheckboxes[fieldName] = {
          value: checkbox.selectionStatus, // 'SELECTED' or 'NOT_SELECTED'
          confidence: checkbox.confidence,
          rawKey: fieldName,
          normalizedKey: fieldName.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
          mappingStrategy: 'checkbox',
          page,
          extractionMethod: 'forms+selection',
          context: checkbox.nearbyText.slice(0, 3).map(t => t.text) // Top 3 nearest text
        };
        
        if (OCR_DEBUG) {
          console.log(`  ✓ Checkbox matched: ${fieldName} = ${checkbox.selectionStatus} (${contextText.substring(0, 50)}...)`);
        }
        break; // Stop after first match
      }
    }
  });
  
  return mappedCheckboxes;
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
  const { useQueries = false, extractionMode = 'forms+layout', preprocessImages = true } = options;
  
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
  // ========== FRONT PAGE: INFORMED CONSENT ==========
  'verbal consent': 'verbalConsent',
  'verbal consent given': 'verbalConsent',
  'consent verbal': 'verbalConsent',
  'verbal': 'verbalConsent',
  'verbal consent obtained': 'verbalConsent',
  'verbal approval': 'verbalConsent',
  
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
  'registration no': 'registrationNumber',
  
  // ========== ADDITIONAL FORM LABEL MAPPINGS ==========
  // These are standalone field labels that appear in the form
  
  // Consent section
  'name and signature': 'nameAndSignature',
  'name & signature': 'nameAndSignature',
  'client name and signature': 'nameAndSignature',
  
  // Date component labels (commonly found near date fields)
  'month': 'month',
  'day': 'day',
  'year': 'year',
  
  // Birth order label
  'birth order (i.e. among mother\'s children)': 'birthOrder',
  'i.e. among mothers children': 'birthOrder',
  'among mothers children': 'birthOrder',
  
  // Civil status options
  'single': 'civilStatusSingle',
  'married': 'civilStatusMarried',
  'separated': 'civilStatusSeparated',
  'widowed': 'civilStatusWidowed',
  'divorced': 'civilStatusDivorced',
  
  // Testing refusal
  'refused hiv testing': 'testingRefused',
  'refused testing': 'testingRefused',
  'refused': 'testingRefused',
  'reason for refusal': 'refusalReason',
  'reason for refusal:': 'refusalReason',
  
  // Clinical symptoms
  'describe s/sx': 'symptoms',
  'describe s/sx:': 'symptoms',
  'describe symptoms': 'symptoms',
  'symptoms': 'symptoms',
  
  // WHO staging
  'world health organization (who) staging': 'whoStaging',
  'world health organization (who) staging:': 'whoStaging',
  'who staging': 'whoStaging',
  'who staging:': 'whoStaging',
  
  // HTS form reference (often appears as header/footer text)
  '(hts': null, // Ignore - likely form code/reference
  'hts form': null, // Ignore - form identifier
  
  // Yes/No response options (common checkbox labels)
  'yes.': 'yes',
  'yes': 'yes',
  'no.': 'no',
  'no': 'no',
  
  // Occupation other
  'others: teacher': 'occupation',
  'others:': 'occupationOther',
  'teacher': 'occupation',
  
  // Date of most recent exposure (condomless sex)
  'date of most recent condomless anal or neo/vaginal sex (mm/yyyy)': 'dateMostRecentRisk',
  'date of most recent condomless sex': 'dateMostRecentRisk',
  'date of most recent condomless': 'dateMostRecentRisk'
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
 * Extract region (bounding box) from Textract block
 * @param {Object} block - Textract block with Geometry.BoundingBox
 * @returns {Object|null} Region object with x, y, width, height, page or null if no geometry
 */
function extractRegionFromBlock(block) {
  if (!block?.Geometry?.BoundingBox) {
    return null;
  }
  
  const bbox = block.Geometry.BoundingBox;
  return {
    x: bbox.Left,
    y: bbox.Top,
    width: bbox.Width,
    height: bbox.Height,
    page: block.Page || 1 // Default to page 1 if not specified
  };
}

/**
 * Calculate aggregate bounding box encompassing all component regions
 * @param {Array<Object>} regions - Array of region objects with x, y, width, height
 * @returns {Object|null} Encompassing region or null if no valid regions
 */
function calculateBoundingBox(regions) {
  const validRegions = regions.filter(r => r && typeof r.x === 'number');
  
  if (validRegions.length === 0) {
    return null;
  }
  
  // Single region - return as is
  if (validRegions.length === 1) {
    return { ...validRegions[0] };
  }
  
  // Calculate encompassing box
  const left = Math.min(...validRegions.map(r => r.x));
  const top = Math.min(...validRegions.map(r => r.y));
  const right = Math.max(...validRegions.map(r => r.x + r.width));
  const bottom = Math.max(...validRegions.map(r => r.y + r.height));
  
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    page: validRegions[0].page // Use first region's page
  };
}

/**
 * Build composite fields from individual components
 * Enhanced to support accurate HTS form structure with nested fields
 * Handles: fullName (from firstName + middleName + lastName + suffix)
 *          testDate (from Month + Day + Year sequence)
 *          birthDate (from Month + Day + Year sequence)
 *          sex (from male/female checkboxes)
 *          genderIdentity (from man/woman/other checkboxes)
 *          civilStatus (from checkbox group)
 *          addresses (from city/province pairs)
 *          risk fields (from no/yes conditional checkboxes)
 * @param {Object} mappedFields - Mapped fields object
 * @param {Array} frontKVPairs - Front page key-value pairs (original order)
 * @param {Array} backKVPairs - Back page key-value pairs (original order)
 */
function buildCompositeFields(mappedFields, frontKVPairs, backKVPairs) {
  console.log('🔧 [Composite] Building composite and nested field structures...');
  
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
      const avgConfidence = Math.round(
        [mappedFields.firstName, mappedFields.middleName, mappedFields.lastName, mappedFields.suffix]
          .filter(f => f)
          .reduce((sum, f) => sum + f.confidence, 0) / nameParts.length
      );
      
      // Extract regions from component fields
      const componentRegions = [
        mappedFields.firstName?.valueBlock,
        mappedFields.middleName?.valueBlock,
        mappedFields.lastName?.valueBlock,
        mappedFields.suffix?.valueBlock
      ].filter(block => block).map(block => extractRegionFromBlock(block)).filter(region => region);
      
      // Calculate encompassing bounding box for fullName
      const fullNameRegion = calculateBoundingBox(componentRegions);
      
      mappedFields.fullName = {
        value: fullName,
        confidence: avgConfidence,
        rawKey: 'composite',
        normalizedKey: 'full name',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+layout',
        region: fullNameRegion,  // Aggregate bounding box
        components: {
          firstName: {
            value: mappedFields.firstName?.value,
            region: extractRegionFromBlock(mappedFields.firstName?.valueBlock)
          },
          middleName: {
            value: mappedFields.middleName?.value,
            region: extractRegionFromBlock(mappedFields.middleName?.valueBlock)
          },
          lastName: {
            value: mappedFields.lastName?.value,
            region: extractRegionFromBlock(mappedFields.lastName?.valueBlock)
          },
          suffix: {
            value: mappedFields.suffix?.value,
            region: extractRegionFromBlock(mappedFields.suffix?.valueBlock)
          }
        }
      };
      console.log(`  ✓ Built fullName: "${fullName}" (composite from ${nameParts.length} parts, ${avgConfidence}% confidence) ${fullNameRegion ? `[region: ${fullNameRegion.x.toFixed(3)},${fullNameRegion.y.toFixed(3)} ${fullNameRegion.width.toFixed(3)}×${fullNameRegion.height.toFixed(3)}]` : '[no region]'}`);
    }
  }
  
  // ========== Build sex from Male/Female SELECTED values ==========
  // Enhanced: Now uses actual SELECTION_STATUS from Textract instead of string matching
  if (mappedFields.sexMale || mappedFields.sexFemale) {
    const selected = [];
    const components = {};
    
    // Check using actual SelectionStatus from Textract SELECTION_ELEMENT
    if (mappedFields.sexMale?.value === 'SELECTED') {
      selected.push('Male');
      components.male = true;
    }
    if (mappedFields.sexFemale?.value === 'SELECTED') {
      selected.push('Female');
      components.female = true;
    }
    
    if (selected.length > 0) {
      mappedFields.sex = {
        value: selected[0], // Primary selection
        confidence: Math.round((mappedFields.sexMale?.confidence || 0 + mappedFields.sexFemale?.confidence || 0) / 2),
        rawKey: 'composite',
        normalizedKey: 'sex',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+selection',
        components: components
      };
      console.log(`  ✓ Built sex: "${selected.join(', ')}" (checkbox SelectionStatus)`);
    }
  }
  
  // ========== Build genderIdentity from Man/Woman/Trans/Other checkboxes ==========
  // Enhanced: Now uses actual SELECTION_STATUS from Textract instead of string matching
  if (mappedFields.genderIdentityMan || mappedFields.genderIdentityWoman || 
      mappedFields.genderIdentityTransWoman || mappedFields.genderIdentityTransMan ||
      mappedFields.otherGenderIdentity) {
    const selected = [];
    const components = {};
    let totalConfidence = 0;
    let count = 0;
    
    // Check using actual SelectionStatus from Textract SELECTION_ELEMENT
    if (mappedFields.genderIdentityMan?.value === 'SELECTED') {
      selected.push('Man');
      components.man = true;
      totalConfidence += mappedFields.genderIdentityMan.confidence;
      count++;
    }
    if (mappedFields.genderIdentityWoman?.value === 'SELECTED') {
      selected.push('Woman');
      components.woman = true;
      totalConfidence += mappedFields.genderIdentityWoman.confidence;
      count++;
    }
    if (mappedFields.genderIdentityTransWoman?.value === 'SELECTED') {
      selected.push('Transgender Woman');
      components.transWoman = true;
      totalConfidence += mappedFields.genderIdentityTransWoman.confidence;
      count++;
    }
    if (mappedFields.genderIdentityTransMan?.value === 'SELECTED') {
      selected.push('Transgender Man');
      components.transMan = true;
      totalConfidence += mappedFields.genderIdentityTransMan.confidence;
      count++;
    }
    if (mappedFields.otherGenderIdentity?.value && 
        mappedFields.otherGenderIdentity.value !== 'SELECTED' && 
        mappedFields.otherGenderIdentity.value !== 'NOT_SELECTED') {
      // Text field for "Other" option
      components.otherGenderIdentity = mappedFields.otherGenderIdentity.value;
      selected.push(mappedFields.otherGenderIdentity.value);
      totalConfidence += mappedFields.otherGenderIdentity.confidence;
      count++;
    }
    
    if (selected.length > 0) {
      mappedFields.genderIdentity = {
        value: selected[0],
        confidence: count > 0 ? Math.round(totalConfidence / count) : 0,
        rawKey: 'composite',
        normalizedKey: 'gender identity',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+selection',
        components: components
      };
      console.log(`  ✓ Built genderIdentity: "${selected.join(', ')}" (checkbox SelectionStatus)`);
    }
  }
  
  // ========== Build civilStatus from checkbox group ==========
  // Enhanced: Now uses actual SELECTION_STATUS from Textract instead of string matching
  if (mappedFields.civilStatusSingle || mappedFields.civilStatusMarried || 
      mappedFields.civilStatusSeparated || mappedFields.civilStatusWidowed ||
      mappedFields.civilStatusDivorced) {
    const selected = [];
    const components = {};
    let totalConfidence = 0;
    let count = 0;
    
    const statusMap = {
      civilStatusSingle: 'Single',
      civilStatusMarried: 'Married',
      civilStatusSeparated: 'Separated',
      civilStatusWidowed: 'Widowed',
      civilStatusDivorced: 'Divorced'
    };
    
    // Check using actual SelectionStatus from Textract SELECTION_ELEMENT
    for (const [fieldKey, statusLabel] of Object.entries(statusMap)) {
      if (mappedFields[fieldKey]?.value === 'SELECTED') {
        selected.push(statusLabel);
        components[fieldKey.replace('civilStatus', '').toLowerCase()] = true;
        totalConfidence += mappedFields[fieldKey].confidence;
        count++;
      }
    }
    
    if (selected.length > 0) {
      mappedFields.civilStatus = {
        value: selected[0],
        confidence: count > 0 ? Math.round(totalConfidence / count) : 0,
        rawKey: 'composite',
        normalizedKey: 'civil status',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+selection',
        components: components
      };
      console.log(`  ✓ Built civilStatus: "${selected.join(', ')}" (checkbox SelectionStatus)`);
    }
  }
  
  // ========== Build address composites (currentResidence, permanentResidence, placeOfBirth) ==========
  const addressFields = [
    { base: 'currentResidence', cityKey: 'currentResidenceCity', provinceKey: 'currentResidenceProvince' },
    { base: 'permanentResidence', cityKey: 'permanentResidenceCity', provinceKey: 'permanentResidenceProvince' },
    { base: 'placeOfBirth', cityKey: 'placeOfBirthCity', provinceKey: 'placeOfBirthProvince' }
  ];
  
  for (const { base, cityKey, provinceKey } of addressFields) {
    if (mappedFields[cityKey] || mappedFields[provinceKey]) {
      const city = mappedFields[cityKey]?.value || '';
      const province = mappedFields[provinceKey]?.value || '';
      const parts = [city, province].filter(p => p && p.trim() !== '');
      
      if (parts.length > 0) {
        const fullAddress = parts.join(', ');
        const avgConfidence = Math.round(
          [mappedFields[cityKey], mappedFields[provinceKey]]
            .filter(f => f)
            .reduce((sum, f) => sum + f.confidence, 0) / parts.length
        );
        
        mappedFields[base] = {
          value: fullAddress,
          confidence: avgConfidence,
          rawKey: 'composite',
          normalizedKey: base.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
          mappingStrategy: 'composite',
          page: 'front',
          extractionMethod: 'forms+layout',
          components: {
            city: city,
            province: province
          }
        };
        console.log(`  ✓ Built ${base}: "${fullAddress}" (composite from city/province)`);
      }
    }
  }
  
  // ========== Build testDate and birthDate from Month/Day/Year sequences ==========
  const monthDayYearSets = findMonthDayYearSequences(frontKVPairs);
  
  if (monthDayYearSets.length >= 1) {
    for (const dateSet of monthDayYearSets) {
      const year = parseInt(dateSet.year);
      const dateStr = `${dateSet.month}-${dateSet.day}-${dateSet.year}`;
      const avgConf = Math.round((dateSet.monthConf + dateSet.dayConf + dateSet.yearConf) / 3);
      
      const dateField = {
        value: dateStr,
        confidence: avgConf,
        rawKey: 'composite',
        mappingStrategy: 'composite',
        page: 'front',
        extractionMethod: 'forms+layout',
        components: {
          month: dateSet.month,
          day: dateSet.day,
          year: dateSet.year
        }
      };
      
      if (year < 2010) {
        mappedFields.birthDate = { ...dateField, normalizedKey: 'birth date' };
        console.log(`  ✓ Built birthDate: "${dateStr}" (composite from Month/Day/Year)`);
      } else if (year >= 2020) {
        mappedFields.testDate = { ...dateField, normalizedKey: 'test date' };
        console.log(`  ✓ Built testDate: "${dateStr}" (composite from Month/Day/Year)`);
      }
    }
  }
  
  // ========== Build risk assessment conditional fields (no/yes branches) ==========
  const riskFields = [
    { base: 'riskSexMale', statusKey: 'riskSexMaleStatus', totalKey: 'riskSexMaleTotal', date1Key: 'riskSexMaleDate1', date2Key: 'riskSexMaleDate2' },
    { base: 'riskSexFemale', statusKey: 'riskSexFemaleStatus', totalKey: 'riskSexFemaleTotal', date1Key: 'riskSexFemaleDate1', date2Key: 'riskSexFemaleDate2' },
    { base: 'riskPaidForSex', statusKey: 'riskPaidForSexStatus', dateKey: 'riskPaidForSexDate' },
    { base: 'riskReceivedPayment', statusKey: 'riskReceivedPaymentStatus', dateKey: 'riskReceivedPaymentDate' },
    { base: 'riskSexUnderDrugs', statusKey: 'riskSexUnderDrugsStatus', dateKey: 'riskSexUnderDrugsDate' },
    { base: 'riskSharedNeedles', statusKey: 'riskSharedNeedlesStatus', dateKey: 'riskSharedNeedlesDate' },
    { base: 'riskBloodTransfusion', statusKey: 'riskBloodTransfusionStatus', dateKey: 'riskBloodTransfusionDate' },
    { base: 'riskOccupationalExposure', statusKey: 'riskOccupationalExposureStatus', dateKey: 'riskOccupationalExposureDate' }
  ];
  
  for (const riskField of riskFields) {
    const statusField = mappedFields[riskField.statusKey];
    if (statusField) {
      const components = {
        no: statusField.value === 'No' || statusField.value === 'NO',
        yes: statusField.value === 'Yes' || statusField.value === 'YES'
      };
      
      // Add conditional fields if yes is selected
      if (components.yes) {
        if (riskField.totalKey && mappedFields[riskField.totalKey]) {
          components.total = mappedFields[riskField.totalKey].value;
        }
        if (riskField.date1Key && mappedFields[riskField.date1Key]) {
          components.date1 = mappedFields[riskField.date1Key].value;
        }
        if (riskField.date2Key && mappedFields[riskField.date2Key]) {
          components.date2 = mappedFields[riskField.date2Key].value;
        }
        if (riskField.dateKey && mappedFields[riskField.dateKey]) {
          components.dateMostRecentRisk = mappedFields[riskField.dateKey].value;
        }
      }
      
      mappedFields[riskField.base] = {
        value: statusField.value,
        confidence: statusField.confidence,
        rawKey: 'composite',
        normalizedKey: riskField.base.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
        mappingStrategy: 'composite',
        page: 'back',
        extractionMethod: 'forms+layout',
        components: components
      };
      console.log(`  ✓ Built ${riskField.base}: "${statusField.value}" (conditional field)`);
    }
  }
  
  console.log('✅ [Composite] Composite field building complete');
}

/**
 * Find sequences of Month/Day/Year fields (handles any order within proximity window)
 * Collects all Month/Day/Year fields and groups them by proximity
 * @param {Array} kvPairs - Key-value pairs in original extraction order
 * @returns {Array<Object>} Array of {month, day, year, monthConf, dayConf, yearConf} objects
 */
function findMonthDayYearSequences(kvPairs) {
  const sequences = [];
  
  // First, collect all Month/Day/Year fields with their positions
  const monthFields = [];
  const dayFields = [];
  const yearFields = [];
  
  for (let i = 0; i < kvPairs.length; i++) {
    const kv = kvPairs[i];
    const keyLower = kv.key.toLowerCase().trim();
    
    if (keyLower === 'month' || keyLower.includes('month:')) {
      monthFields.push({ value: kv.value, confidence: kv.confidence || 85, index: i });
    } else if (keyLower === 'day' || keyLower.includes('day:')) {
      dayFields.push({ value: kv.value, confidence: kv.confidence || 85, index: i });
    } else if (keyLower === 'year' || keyLower.includes('year:')) {
      yearFields.push({ value: kv.value, confidence: kv.confidence || 85, index: i });
    }
  }
  
  console.log(`  🔍 Date field search: ${monthFields.length} Month, ${dayFields.length} Day, ${yearFields.length} Year fields found`);
  if (monthFields.length > 0) console.log(`    Months: ${monthFields.map(f => `${f.value}@${f.index}`).join(', ')}`);
  if (dayFields.length > 0) console.log(`    Days: ${dayFields.map(f => `${f.value}@${f.index}`).join(', ')}`);
  if (yearFields.length > 0) console.log(`    Years: ${yearFields.map(f => `${f.value}@${f.index}`).join(', ')}`);
  
  // Strategy: Pair up Month+Day first, then use semantic meaning to assign Years
  // Birth years are typically older (1900-2010), test years are recent (2020+)
  const PROXIMITY_WINDOW = 30;
  const usedDays = new Set();
  const monthDayPairs = [];
  
  // Step 1: Pair each Month with its closest Day
  for (const month of monthFields) {
    let closestDay = null;
    let minDayDistance = Infinity;
    
    for (const day of dayFields) {
      if (usedDays.has(day.index)) continue;
      
      const distance = Math.abs(day.index - month.index);
      if (distance <= PROXIMITY_WINDOW && distance < minDayDistance) {
        closestDay = day;
        minDayDistance = distance;
      }
    }
    
    if (closestDay) {
      usedDays.add(closestDay.index);
      monthDayPairs.push({ month, day: closestDay });
      console.log(`    🔗 Paired Month=${month.value}@${month.index} with Day=${closestDay.value}@${closestDay.index}`);
    }
  }
  
  // Step 2: Assign years based on semantic meaning
  // Sort years by value (older years first)
  const sortedYears = [...yearFields].sort((a, b) => parseInt(a.value) - parseInt(b.value));
  
  // Sort month-day pairs by position (earlier in form first)
  monthDayPairs.sort((a, b) => Math.min(a.month.index, a.day.index) - Math.min(b.month.index, b.day.index));
  
  // Heuristic: If we have 2 pairs and 2+ years
  // - Older year (birth year) goes with first pair if it's old enough (< 2010)
  // - Recent year (test year) goes with second pair if it's recent (>= 2020)
  if (monthDayPairs.length >= 2 && sortedYears.length >= 2) {
    const olderYear = sortedYears[0]; // Should be birth year
    const newerYear = sortedYears[sortedYears.length - 1]; // Should be test year
    
    const olderYearValue = parseInt(olderYear.value);
    const newerYearValue = parseInt(newerYear.value);
    
    // Check if years fit the expected pattern (birth < 2010, test >= 2020)
    if (olderYearValue < 2010 && newerYearValue >= 2020) {
      // First pair (birth date) = older year
      const birthPair = monthDayPairs[0];
      sequences.push({
        month: birthPair.month.value,
        day: birthPair.day.value,
        year: olderYear.value,
        monthConf: birthPair.month.confidence,
        dayConf: birthPair.day.confidence,
        yearConf: olderYear.confidence,
        startIndex: Math.min(birthPair.month.index, birthPair.day.index, olderYear.index),
        endIndex: Math.max(birthPair.month.index, birthPair.day.index, olderYear.index)
      });
      console.log(`    📅 Found BIRTH DATE sequence: ${birthPair.month.value}/${birthPair.day.value}/${olderYear.value} (semantic matching)`);
      
      // Second pair (test date) = newer year
      const testPair = monthDayPairs[1];
      sequences.push({
        month: testPair.month.value,
        day: testPair.day.value,
        year: newerYear.value,
        monthConf: testPair.month.confidence,
        dayConf: testPair.day.confidence,
        yearConf: newerYear.confidence,
        startIndex: Math.min(testPair.month.index, testPair.day.index, newerYear.index),
        endIndex: Math.max(testPair.month.index, testPair.day.index, newerYear.index)
      });
      console.log(`    📅 Found TEST DATE sequence: ${testPair.month.value}/${testPair.day.value}/${newerYear.value} (semantic matching)`);
      
      // Sort by start position (birth date typically comes first in form)
      sequences.sort((a, b) => a.startIndex - b.startIndex);
      return sequences;
    }
  }
  
  // Fallback: Use proximity-based matching if semantic matching fails
  const usedYears = new Set();
  
  for (const pair of monthDayPairs) {
    const { month, day } = pair;
    
    // Find Year closest to the midpoint between Month and Day
    const midpoint = (month.index + day.index) / 2;
    let closestYear = null;
    let minYearDistance = Infinity;
    
    for (const year of yearFields) {
      if (usedYears.has(year.index)) continue;
      
      // Calculate distance from year to the Month-Day pair midpoint
      const distance = Math.abs(year.index - midpoint);
      
      // Also check that Year is within the span or reasonably close to it
      const minPos = Math.min(month.index, day.index);
      const maxPos = Math.max(month.index, day.index);
      const isWithinSpan = year.index >= minPos - 10 && year.index <= maxPos + 10;
      
      if (isWithinSpan && distance < minYearDistance) {
        closestYear = year;
        minYearDistance = distance;
      }
    }
    
    // If we found Year, create a sequence
    if (closestYear) {
      usedYears.add(closestYear.index);
      
      const minIndex = Math.min(month.index, day.index, closestYear.index);
      const maxIndex = Math.max(month.index, day.index, closestYear.index);
      
      sequences.push({
        month: month.value,
        day: day.value,
        year: closestYear.value,
        monthConf: month.confidence,
        dayConf: day.confidence,
        yearConf: closestYear.confidence,
        startIndex: minIndex,
        endIndex: maxIndex
      });
      
      console.log(`    📅 Found Month/Day/Year sequence: ${month.value}/${day.value}/${closestYear.value} (positions ${month.index}/${day.index}/${closestYear.index})`);
    }
  }
  
  // Sort sequences by start position to maintain order (first = test date, second = birth date)
  sequences.sort((a, b) => a.startIndex - b.startIndex);
  
  return sequences;
}

/**
 * Build conditional parent-child field relationships based on checkbox state
 * Handles risk assessment fields where parent checkbox determines nested field assembly
 * @param {Object} allFields - Merged field mappings from all sources
 * @param {Array} frontKVPairs - Front page key-value pairs with geometry
 * @param {Array} backKVPairs - Back page key-value pairs with geometry
 * @returns {Object} Updated allFields with nested conditional structures
 */
function buildConditionalFields(allFields, frontKVPairs = [], backKVPairs = []) {
  console.log('🔀 Building conditional parent-child field relationships...');
  
  // Define parent-child mapping rules for risk assessment fields
  const conditionalMappings = [
    {
      parent: 'riskSexMale',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15, // 15% page width
      requiredFields: ['total'] // Required when parent is SELECTED
    },
    {
      parent: 'riskSexFemale',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskPaidForSex',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskReceivedPayment',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskSexUnderDrugs',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskSharedNeedles',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskBloodTransfusion',
      pageType: 'back',
      nested: {
        yes: ['date'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['date']
    },
    {
      parent: 'riskOccupationalExposure',
      pageType: 'back',
      nested: {
        yes: ['date'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['date']
    }
  ];

  const kvPairs = [...frontKVPairs, ...backKVPairs];
  let conditionalFieldsBuilt = 0;

  for (const mapping of conditionalMappings) {
    const { parent, pageType, nested, proximityRadius, requiredFields } = mapping;
    const parentField = allFields[parent];

    // Skip if parent field doesn't exist or is NOT_SELECTED
    if (!parentField || parentField.value !== 'SELECTED') {
      console.log(`  ⏭️  Skipping ${parent} (value: ${parentField?.value || 'missing'})`);
      continue;
    }

    console.log(`  🔍 Processing ${parent} (SELECTED)`);

    // Get parent field geometry for proximity detection
    const parentGeometry = parentField.geometry;
    if (!parentGeometry || !parentGeometry.BoundingBox) {
      console.log(`  ⚠️  No geometry for ${parent}, skipping proximity detection`);
      continue;
    }

    const parentBox = parentGeometry.BoundingBox;
    const components = { yes: {}, no: {} };

    // Find nested fields using proximity detection
    for (const childFieldName of nested.yes) {
      // Look for child fields in nearby KV pairs
      const nearbyFields = kvPairs.filter(kv => {
        if (!kv.Key || !kv.Key.Geometry || !kv.Key.Geometry.BoundingBox) return false;
        
        const kvBox = kv.Key.Geometry.BoundingBox;
        
        // Calculate horizontal and vertical distance
        const horizontalDist = Math.abs(kvBox.Left - parentBox.Left);
        const verticalDist = Math.abs(kvBox.Top - parentBox.Top);
        
        // Check if within proximity radius
        return horizontalDist < proximityRadius && verticalDist < proximityRadius;
      });

      // Try to match child field by pattern
      let childValue = null;
      let childConfidence = 0;
      let childSource = 'proximity';

      for (const kv of nearbyFields) {
        const keyText = kv.Key.Text.toLowerCase();
        const valueText = kv.Value?.Text || '';

        // Pattern matching for different child field types
        if (childFieldName === 'total') {
          // Look for numeric values near "total" or "number" keywords
          if ((keyText.includes('total') || keyText.includes('number') || keyText.includes('partner')) && /^\d+$/.test(valueText)) {
            childValue = parseInt(valueText, 10);
            childConfidence = kv.Key.Confidence;
            childSource = 'pattern:total';
            break;
          }
        } else if (childFieldName === 'firstDate' || childFieldName === 'lastDate') {
          // Look for date patterns near "first" or "last" keywords
          const isFirstDate = childFieldName === 'firstDate' && (keyText.includes('first') || keyText.includes('earliest'));
          const isLastDate = childFieldName === 'lastDate' && (keyText.includes('last') || keyText.includes('recent') || keyText.includes('latest'));
          
          if ((isFirstDate || isLastDate) && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(valueText)) {
            childValue = valueText;
            childConfidence = kv.Key.Confidence;
            childSource = `pattern:${childFieldName}`;
            break;
          }
        } else if (childFieldName === 'date') {
          // Look for generic date fields
          if ((keyText.includes('date') || keyText.includes('when')) && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(valueText)) {
            childValue = valueText;
            childConfidence = kv.Key.Confidence;
            childSource = 'pattern:date';
            break;
          }
        }
      }

      // Store found child field with region
      if (childValue !== null) {
        // Extract region from the key-value pair geometry
        let childRegion = null;
        for (const kv of nearbyFields) {
          const keyText = kv.Key.Text.toLowerCase();
          const valueText = kv.Value?.Text || '';
          
          // Check if this is the KV pair we matched
          if ((childFieldName === 'total' && valueText === String(childValue)) ||
              (childFieldName.includes('Date') && valueText === childValue) ||
              (childFieldName === 'date' && valueText === childValue)) {
            // Extract region from value block
            if (kv.Value?.Geometry?.BoundingBox) {
              const bbox = kv.Value.Geometry.BoundingBox;
              childRegion = {
                x: bbox.Left,
                y: bbox.Top,
                width: bbox.Width,
                height: bbox.Height,
                page: kv.Value.Page || mapping.pageType === 'front' ? 1 : 2
              };
            }
            break;
          }
        }
        
        components.yes[childFieldName] = {
          value: childValue,
          confidence: childConfidence,
          extractionMethod: 'conditional',
          source: childSource,
          region: childRegion  // Store bounding box coordinates
        };
        console.log(`    ✅ Found ${childFieldName}: ${childValue} (confidence: ${childConfidence.toFixed(1)}%) ${childRegion ? `[region: ${childRegion.x.toFixed(3)},${childRegion.y.toFixed(3)} ${childRegion.width.toFixed(3)}×${childRegion.height.toFixed(3)}]` : '[no region]'}`);
      } else {
        console.log(`    ⚠️  Child field ${childFieldName} not found in proximity`);
      }
    }

    // Validate required fields
    const missingRequired = requiredFields.filter(field => !components.yes[field]);
    if (missingRequired.length > 0) {
      console.log(`    ⚠️  Missing required fields for ${parent}: ${missingRequired.join(', ')}`);
    }

    // Build nested structure with parent and child regions
    if (Object.keys(components.yes).length > 0) {
      // Extract parent region
      let parentRegion = null;
      if (parentGeometry?.BoundingBox) {
        const bbox = parentGeometry.BoundingBox;
        parentRegion = {
          x: bbox.Left,
          y: bbox.Top,
          width: bbox.Width,
          height: bbox.Height,
          page: mapping.pageType === 'front' ? 1 : 2
        };
      }
      
      allFields[parent] = {
        ...parentField,
        components,
        extractionMethod: 'conditional',
        hasNestedFields: true,
        nestedFieldCount: Object.keys(components.yes).length,
        missingRequiredFields: missingRequired,
        region: parentRegion  // Store parent field bounding box
      };
      conditionalFieldsBuilt++;
      console.log(`    ✅ Built conditional field ${parent} with ${Object.keys(components.yes).length} nested fields ${parentRegion ? `[region: ${parentRegion.x.toFixed(3)},${parentRegion.y.toFixed(3)} ${parentRegion.width.toFixed(3)}×${parentRegion.height.toFixed(3)}]` : '[no region]'}`);
    }
  }

  console.log(`✅ Built ${conditionalFieldsBuilt} conditional field relationships`);
  return allFields;
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
        extractionMethod: 'forms+layout',
        valueBlock: kvPair.valueBlock  // Store original Textract block for region extraction
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
  
  console.log(`📊 [Mapping] ${mappedCount}/${totalCount} fields (${mappingRate.toFixed(1)}%) | ${processingTime}ms | ⚡${highConfidence}H ${mediumConfidence}M ${lowConfidence}L`);
  
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
  
  // Log unmapped keys for debugging (limit to 3)
  if (unmappedKeys.length > 0) {
    const preview = unmappedKeys.slice(0, 3).map(uk => uk.originalKey).join(', ');
    const more = unmappedKeys.length > 3 ? ` +${unmappedKeys.length - 3} more` : '';
    console.log(`⚠️  [Unmapped] ${unmappedKeys.length} keys: ${preview}${more}`);
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
 * Organize extracted fields into structured sections based on HTS form layout
 * @param {Object} allFields - All mapped fields with metadata
 * @param {Object} correctedData - Validated and corrected field values
 * @returns {Object} Structured data organized by form sections
 */
function organizeFieldsIntoSections(allFields, correctedData) {
  // Define field-to-section mappings based on DOH HTS Form 2021 official structure
  // Updated with accurate nested composite field structure for checkboxes and multi-part fields
  // This structure mirrors the actual form layout with proper hierarchy
  const sectionMapping = {
    // ===== FRONT PAGE SECTIONS (3) =====
    'INFORMED CONSENT': [
      'nameAndSignature',
      'contactNumber',
      'emailAddress',
      'verbalConsent'
    ],
    'DEMOGRAPHIC DATA': [
      'testDate', // Composite: month, day, year
      'philHealthNumber',
      'philSysNumber',
      'fullName', // Composite: firstName, middleName, lastName, suffix
      'parentalCodeMother',
      'parentalCodeFather',
      'birthOrder',
      'birthDate', // Composite: month, day, year
      'age',
      'ageMonths',
      'sex', // Composite: male, female checkboxes
      'genderIdentity', // Composite: man, woman, otherGenderIdentity
      'currentResidence', // Composite: city, province
      'permanentResidence', // Composite: city, province
      'placeOfBirth', // Composite: city, province
      'nationality', // Composite: nationalityFilipino, nationalityOther
      'civilStatus', // Composite: single, married, separated, widowed, divorced
      'livingWithPartner', // Composite: yes, no checkboxes
      'numberOfChildren',
      'isPregnant' // Composite: yes, no checkboxes
    ],
    'EDUCATION & OCCUPATION': [
      'educationalAttainment', // Composite: noGradeCompleted, elementary, highSchool, college, vocational, postGraduate
      'currentlyInSchool', // Composite: yes, no checkboxes
      'currentlyWorking', // Composite: yes (currentOccupation), no (previousOccupation)
      'workedOverseasPassedFiveYears' // Composite: yes (yearOfReturn, whereWereYouBased), no
    ],
    
    // ===== BACK PAGE SECTIONS (7) =====
    'HISTORY OF EXPOSURE / RISK ASSESSMENT': [
      'motherHIV', // Composite: doNotKnow, no, yes checkboxes
      'riskSexMale', // Composite: no, yes (with total, date1, date2)
      'riskSexFemale', // Composite: no, yes (with total, date1, date2)
      'riskPaidForSex', // Composite: no, yes (with dateMostRecentRisk)
      'riskReceivedPayment', // Composite: no, yes (with dateMostRecentRisk)
      'riskSexUnderDrugs', // Composite: no, yes (with dateMostRecentRisk)
      'riskSharedNeedles', // Composite: no, yes (with dateMostRecentRisk)
      'riskBloodTransfusion', // Composite: no, yes (with dateMostRecentRisk)
      'riskOccupationalExposure' // Composite: no, yes (with dateMostRecentRisk)
    ],
    'REASONS FOR HIV TESTING': [
      'reasonForTesting' // Composite: multiple checkboxes (hivExposure, recomendedBy, etc.)
    ],
    'PREVIOUS HIV TEST': [
      'previouslyTested', // Composite: yes (with date, provider, city, result), no
      'previousTestDate',
      'previousTestProvider',
      'previousTestCity',
      'previousTestResult' // Composite: reactive, nonReactive, indeterminate
    ],
    'MEDICAL HISTORY & CLINICAL PICTURE': [
      'medicalHistory', // Composite: TB, STI, PEP, PrEP, HepatitisB, HepatitisC
      'clinicalPicture', // Composite: asymptomatic, symptomatic (with symptoms)
      'symptoms',
      'whoStaging',
      'noPhysicianStage'
    ],
    'TESTING DETAILS': [
      'clientType', // Composite: inpatient, outpatient, PDL, outreach, specify
      'modeOfReach', // Composite: clinic, online, index, networkTesting, outreach
      'testingDetails', // Composite: testingAccepted/testingRefused with modalities
      'testingAccepted', // Composite: facilityBasedFTB, nonLaboratoryFTB, communityBased, selfTesting
      'linkageToTesting', // Composite: referToART, referForConfirmatory, adviseReTesting, etc.
      'otherServiceProvided', // Composite: hiv101, iecMaterials, riskReductionPlanning, etc.
      'testKitBrand',
      'testKitUsed',
      'testKitLotNumber',
      'testKitExpiration'
    ],
    'HTS PROVIDER DETAILS': [
      'testingFacility',
      'facilityAddress',
      'facilityContactNumber',
      'facilityEmail',
      'primaryHTSProvider', // Composite: hivCounselor, medicalTechnologist, cbsMotivator, othersSpecify
      'counselorName',
      'counselorRole',
      'formCompletionDate'
    ],
    'OTHERS': [
      'condomUse', // Composite: always, sometimes, never
      'typeOfSex' // Composite: oralSex, analInserter, analReceiver, vaginalSex
    ]
  };
  
  const structured = {
    front: {
      sections: {}
    },
    back: {
      sections: {}
    }
  };
  
  // Organize fields by section
  for (const [sectionName, fieldNames] of Object.entries(sectionMapping)) {
    const sectionFields = {};
    let hasData = false;
    
    for (const fieldName of fieldNames) {
      if (correctedData[fieldName] !== undefined) {
        sectionFields[fieldName] = {
          value: correctedData[fieldName],
          ...(allFields[fieldName] && {
            confidence: allFields[fieldName].confidence,
            rawKey: allFields[fieldName].rawKey,
            mappingStrategy: allFields[fieldName].mappingStrategy
          })
        };
        hasData = true;
      }
    }
    
    // Only include sections that have data
    if (hasData) {
      // Determine if this is front or back page section based on official DOH HTS Form 2021 structure
      const isFrontSection = [
        'INFORMED CONSENT',
        'DEMOGRAPHIC DATA',
        'EDUCATION & OCCUPATION'
      ].includes(sectionName);
      
      const pageKey = isFrontSection ? 'front' : 'back';
      structured[pageKey].sections[sectionName] = {
        fields: sectionFields,
        totalFields: Object.keys(sectionFields).length,
        avgConfidence: Math.round(
          Object.values(sectionFields).reduce((sum, f) => sum + (f.confidence || 0), 0) / 
          Object.keys(sectionFields).length
        ),
        hasData: true
      };
    }
  }
  
  // Add summary statistics
  structured.summary = {
    frontSections: Object.keys(structured.front.sections).length,
    backSections: Object.keys(structured.back.sections).length,
    totalSections: Object.keys(structured.front.sections).length + Object.keys(structured.back.sections).length,
    frontFieldCount: Object.values(structured.front.sections).reduce((sum, s) => sum + s.totalFields, 0),
    backFieldCount: Object.values(structured.back.sections).reduce((sum, s) => sum + s.totalFields, 0),
    totalFieldCount: Object.values(structured.front.sections).reduce((sum, s) => sum + s.totalFields, 0) +
                     Object.values(structured.back.sections).reduce((sum, s) => sum + s.totalFields, 0)
  };
  
  console.log(`✅ Organized into ${structured.summary.totalSections} sections (${structured.summary.frontSections} front, ${structured.summary.backSections} back)`);
  
  // Debug: Log the structure being returned
  console.log('📋 [DEBUG] structuredData structure:', {
    hasFront: !!structured.front,
    hasBack: !!structured.back,
    hasSummary: !!structured.summary,
    topLevelKeys: Object.keys(structured),
    frontKeys: Object.keys(structured.front),
    backKeys: Object.keys(structured.back),
    frontSections: Object.keys(structured.front.sections),
    backSections: Object.keys(structured.back.sections)
  });
  
  return structured;
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
  const { preprocessImages = false, useLayout = true, useCachedData = USE_CACHED_TEXTRACT } = options;
  
  // Generate session ID for tracking and analytics
  const sessionId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const features = useLayout ? 'FORMS + LAYOUT' : 'FORMS only';
  const dataSource = useCachedData ? 'CACHED' : 'AWS LIVE';
  console.log(`📤 [FORMS OCR] Starting HTS form extraction with ${features} from ${dataSource}... (Session: ${sessionId})`);
  
  try {
    let frontResult, backResult, frontKVPairs, backKVPairs;
    let frontCheckboxFields = {}, backCheckboxFields = {};
    
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
      
      // Extract checkbox selections from cached blocks
      console.log('☑️  Extracting checkbox selections from cached data...');
      const frontCheckboxes = extractCheckboxes(frontResult.Blocks || []);
      const backCheckboxes = extractCheckboxes(backResult.Blocks || []);
      
      frontCheckboxFields = mapCheckboxesToFields(frontCheckboxes, 'front');
      backCheckboxFields = mapCheckboxesToFields(backCheckboxes, 'back');
      
      console.log(`   - Front page: ${Object.keys(frontCheckboxFields).length} checkbox fields mapped`);
      console.log(`   - Back page: ${Object.keys(backCheckboxFields).length} checkbox fields mapped`);
      
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

      // Step 2: Analyze both pages with FORMS + LAYOUT + SELECTION_ELEMENT features
      const featureTypes = useLayout ? ['FORMS', 'LAYOUT', 'SELECTION_ELEMENT'] : ['FORMS', 'SELECTION_ELEMENT'];
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
      
      // Step 3.5: Extract checkbox selections from both pages
      console.log('☑️  Extracting checkbox selections with SELECTION_STATUS...');
      const frontCheckboxes = extractCheckboxes(frontResult.Blocks);
      const backCheckboxes = extractCheckboxes(backResult.Blocks);
      
      // Map checkboxes to field names
      const frontCheckboxFields = mapCheckboxesToFields(frontCheckboxes, 'front');
      const backCheckboxFields = mapCheckboxesToFields(backCheckboxes, 'back');
      
      console.log(`   - Front page: ${Object.keys(frontCheckboxFields).length} checkbox fields mapped`);
      console.log(`   - Back page: ${Object.keys(backCheckboxFields).length} checkbox fields mapped`);
    }
    
    console.log(`📊 Key-value pairs found:`);
    console.log(`   - Front page: ${frontKVPairs.length} pairs`);
    console.log(`   - Back page: ${backKVPairs.length} pairs`);

    // Step 4: Map Textract keys to HTS field names with enhanced tracking
    const frontMapping = mapTextractKeysToHTSFields(frontKVPairs, 'front', sessionId);
    const backMapping = mapTextractKeysToHTSFields(backKVPairs, 'back', sessionId);

    // Step 5: Merge fields from both pages (including checkbox fields)
    const allFields = {
      ...frontMapping.fields,
      ...backMapping.fields,
      ...frontCheckboxFields,
      ...backCheckboxFields
    };

    console.log(`✅ Field mapping complete:`);
    console.log(`   - Front mapped: ${frontMapping.stats.mapped} fields`);
    console.log(`   - Back mapped: ${backMapping.stats.mapped} fields`);
    console.log(`   - Front checkboxes: ${Object.keys(frontCheckboxFields).length} fields`);
    console.log(`   - Back checkboxes: ${Object.keys(backCheckboxFields).length} fields`);
    console.log(`   - Total mapped: ${Object.keys(allFields).length} fields`);
    console.log(`   - Total unmapped: ${frontMapping.stats.unmapped + backMapping.stats.unmapped} keys`);

    // Step 5.5: Build composite fields from individual components
    console.log('🔧 Building composite fields (fullName, testDate, birthDate)...');
    buildCompositeFields(allFields, frontKVPairs, backKVPairs);

    // Step 5.6: Build conditional parent-child field relationships
    console.log('🔀 Building conditional field relationships (risk assessment)...');
    buildConditionalFields(allFields, frontKVPairs, backKVPairs);

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
    
    // Step 10: Organize fields into structured sections
    console.log('📂 Organizing fields into structured sections...');
    const structuredData = organizeFieldsIntoSections(allFields, correctedData);
    
    // Step 11: Extract field components and checkbox states for storage
    const fieldComponents = {};
    const checkboxStates = {};
    
    for (const [fieldName, fieldData] of Object.entries(allFields)) {
      // Extract composite/conditional field components
      if (fieldData.components) {
        fieldComponents[fieldName] = {
          type: fieldData.extractionMethod || 'unknown',
          components: fieldData.components,
          hasNestedFields: fieldData.hasNestedFields || false,
          nestedFieldCount: fieldData.nestedFieldCount || 0,
          missingRequiredFields: fieldData.missingRequiredFields || []
        };
      }
      
      // Extract checkbox selection states
      if (fieldData.selectionStatus) {
        checkboxStates[fieldName] = {
          status: fieldData.selectionStatus,
          value: fieldData.value,
          confidence: fieldData.confidence,
          geometry: fieldData.geometry
        };
      }
    }
    
    console.log(`✅ Extracted ${Object.keys(fieldComponents).length} composite/conditional fields`);
    console.log(`✅ Extracted ${Object.keys(checkboxStates).length} checkbox states`);
    
    // Extract all field regions for coordinate preservation
    const fieldRegions = {};
    for (const [fieldName, fieldData] of Object.entries(allFields)) {
      // Store regions for all fields (base, composite, conditional)
      if (fieldData.region) {
        fieldRegions[fieldName] = {
          region: fieldData.region
        };
        
        // Store component regions if they exist
        if (fieldData.components) {
          fieldRegions[fieldName].components = fieldData.components;
        }
      }
    }
    console.log(`✅ Extracted ${Object.keys(fieldRegions).length} field regions (coordinates)`);
    
    const resultObject = {
      fields: correctedData,
      structuredData, // New structured format
      fieldComponents, // Composite/conditional field metadata
      checkboxStates, // Checkbox selection states
      fieldRegions, // Bounding box coordinates for all fields
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
        },
        compositeFields: Object.keys(fieldComponents).length,
        checkboxFields: Object.keys(checkboxStates).length
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

// ============================================================================
// MODULE EXPORTS - NESTED STRUCTURE ONLY
// ============================================================================
// As of December 2025, only analyzeHTSFormWithForms (nested structure) is supported.
// All flat structure functions (analyzeHTSForm, parseHTSFormData, individual
// extraction functions, QUERIES API functions) are deprecated and will be removed.
// ============================================================================

module.exports = {
  // Core OCR function - NESTED STRUCTURE ONLY
  analyzeHTSFormWithForms,
  
  // Supporting functions for nested structure
  mapTextractKeysToHTSFields,
  extractTextLines,
  extractKeyValuePairs,
  processEncryptedHTSForm,
  
  // Low-level Textract API wrapper (used by analyzeHTSFormWithForms)
  analyzeDocument
};


const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { textractClient } = require('../config/aws');
const { decryptFormImages } = require('../utils/imageDecryption');
const { getPool } = require('../db/pool');

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
 * Extract full name from DOH HTS Form 2021
 * Question 4: First Name / Middle Name / Last Name / Suffix
 */
function extractFullName(blocks, kvPairs) {
  // Look for "Name (Full name)" label in key-value pairs
  const nameFields = kvPairs.filter(kv => 
    /name|first\s+name|last\s+name|middle\s+name/i.test(kv.key)
  );
  
  const name = {
    firstName: null,
    middleName: null,
    lastName: null,
    suffix: null,
    fullName: null
  };
  
  nameFields.forEach(field => {
    const key = field.key.toLowerCase();
    if (key.includes('first')) {
      name.firstName = field.value;
    } else if (key.includes('middle')) {
      name.middleName = field.value;
    } else if (key.includes('last')) {
      name.lastName = field.value;
    }
  });
  
  // Construct full name if components found
  if (name.firstName || name.lastName) {
    name.fullName = [name.firstName, name.middleName, name.lastName]
      .filter(Boolean)
      .join(' ');
  }
  
  return name;
}

/**
 * Extract PhilHealth number from DOH HTS Form 2021
 * Question 2: PhilHealth Number (12 digits)
 */
function extractPhilHealthNumber(blocks, kvPairs) {
  // Look for PhilHealth number pattern
  const philHealthPair = kvPairs.find(kv => 
    /philhealth/i.test(kv.key)
  );
  
  if (philHealthPair && philHealthPair.value) {
    // Extract 12-digit number
    const numberMatch = philHealthPair.value.match(/\d{12}/);
    return numberMatch ? numberMatch[0] : null;
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
 * Optimized for DOH HTS Form 2021 template
 */
function parseHTSFormData(frontResult, backResult) {
  const frontBlocks = frontResult.Blocks || [];
  const backBlocks = backResult.Blocks || [];
  
  const frontLines = extractTextLines(frontBlocks);
  const backLines = extractTextLines(backBlocks);
  const frontKVPairs = extractKeyValuePairs(frontBlocks);
  const backKVPairs = extractKeyValuePairs(backBlocks);
  
  // Extract all blocks for comprehensive search
  const allBlocks = [...frontBlocks, ...backBlocks];
  const allKVPairs = [...frontKVPairs, ...backKVPairs];
  
  // Extract name from back page (DEMOGRAPHIC DATA)
  const nameData = extractFullName(backBlocks, backKVPairs);
  
  // Extract dates
  const testDate = extractTestDate(backBlocks);
  const birthDate = extractTestDate(backBlocks); // May need refinement to distinguish
  
  const extractedData = {
    // Template information
    templateId: 'doh-hts-2021',
    templateName: 'DOH Personal Information Sheet (HTS Form 2021)',
    
    // Priority 1: Essential fields
    testResult: extractTestResult(frontBlocks) || extractTestResult(backBlocks),
    
    // Priority 2: Identity verification
    testDate: testDate,
    fullName: nameData.fullName,
    firstName: nameData.firstName,
    middleName: nameData.middleName,
    lastName: nameData.lastName,
    birthDate: birthDate,
    
    // Priority 3: Additional validation
    philHealthNumber: extractPhilHealthNumber(backBlocks, backKVPairs),
    testingFacility: extractTestingFacility(frontBlocks),
    controlNumber: extractControlNumber(frontBlocks) || extractControlNumber(backBlocks),
    
    // Raw text for reference
    frontText: frontLines.map(l => l.text).join('\n'),
    backText: backLines.map(l => l.text).join('\n'),
    
    // Key-value pairs for debugging
    frontKeyValuePairs: frontKVPairs,
    backKeyValuePairs: backKVPairs,
    
    // Confidence scores
    frontConfidence: calculateAverageConfidence(frontBlocks),
    backConfidence: calculateAverageConfidence(backBlocks)
  };
  
  return extractedData;
}

/**
 * Analyze HTS form images and return extracted data
 * Called by /api/hts-forms/analyze-ocr endpoint BEFORE encryption
 * This is the OCR-first workflow function
 */
async function analyzeHTSForm(frontImageBuffer, backImageBuffer) {
  console.log('📤 Sending raw images to AWS Textract...');
  
  try {
    // Send to Textract (parallel processing)
    const [frontResult, backResult] = await Promise.all([
      analyzeDocument(frontImageBuffer, ['FORMS']),
      analyzeDocument(backImageBuffer, ['FORMS'])
    ]);
    
    console.log('✅ Textract completed. Parsing results...');
    
    // Parse extracted data
    const extractedData = parseHTSFormData(frontResult, backResult);
    
    // Calculate confidence
    const frontConfidence = calculateAverageConfidence(frontResult.Blocks || []);
    const backConfidence = calculateAverageConfidence(backResult.Blocks || []);
    const avgConfidence = (frontConfidence + backConfidence) / 2;
    
    console.log(`✅ Extraction complete. Confidence: ${avgConfidence.toFixed(2)}%`);
    
    return {
      ...extractedData,
      confidence: avgConfidence,
      frontConfidence,
      backConfidence
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
  analyzeHTSForm,
  extractTextLines,
  extractKeyValuePairs,
  extractTestResult,
  extractTestDate,
  extractFullName,
  extractPhilHealthNumber,
  extractTestingFacility,
  extractControlNumber,
  calculateAverageConfidence,
  parseHTSFormData,
  processEncryptedHTSForm
};

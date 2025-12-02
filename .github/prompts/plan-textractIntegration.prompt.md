# AWS Textract OCR Integration Plan

## Overview
Integrate AWS Textract OCR to automatically extract text from encrypted HTS (HIV Testing Services) form images, verify test results, and display extracted data in the admin interface.

## Current State
- ✅ Client-side AES-GCM 256-bit encryption implemented
- ✅ Admin can decrypt and view images client-side
- ✅ Camera capture with retake functionality working
- ✅ Database schema refactored (pending migration execution)
- ✅ HTS form template acquired (DOH "PERSONAL INFORMATION SHEET (HTS FORM 2021)")
- ⏳ Database migration not yet executed on AWS RDS
- ⏳ No OCR processing implemented

## Goals
1. Automatically extract text from front and back HTS form images using AWS Textract
2. Parse extracted text to identify key fields (control number, test date, patient name, test result, etc.)
3. Verify user-provided test result matches extracted test result
4. Store extracted data with confidence scores
5. Display OCR analysis in admin UI with mismatch warnings
6. Process OCR asynchronously (non-blocking) using background jobs

## Form Template Analysis

### HTS Form Structure (DOH "PERSONAL INFORMATION SHEET (HTS FORM 2021)")

**Front Page - Page 1:**
- Header: "HIV TESTING" with "HTS" label
- Section: HISTORY OF RISK ASSESSMENT
  - Checkboxes: Condom Use (Always/Sometimes/Never)
  - Type of Sex: Oral/Anal Insertive/Anal Receptive/Vaginal
  - Sexual activity history with dates
  - Risk behavior questions (paid sex, drug use, needles, blood transfusion)
- Section: REASONS FOR HIV TESTING
  - Multiple checkboxes (employment, insurance, medical, etc.)
- Section: PREVIOUS HIV TEST
  - Previous test information with result (Reactive/Non-reactive/Indeterminate)
  - City/Municipality field
- Section: MEDICAL HISTORY & CLINICAL PICTURE
  - Current TB patient, Hepatitis B, STIs, PEP, PrEP
  - Clinical picture (Asymptomatic/Symptomatic)
  - WHO Clinical Immunologic Staging
- Section: TESTING DETAILS
  - Client type (Inpatient/Walk-in/PDL/Mobile HTS)
  - Mode of reach (Clinical/Online/Index/Social network)
  - HIV testing modality (FBT/Non-lab FBT/Community-based/Self-testing)
  - Linkage (Refer for DRRT/Refer for Confirmatory/Advise re-testing)
- Section: INVENTORY INFORMATION
  - Brand of test kit used, Batch number, Lot number, Expiration date
- Section: HTS PROVIDER DETAILS
  - Name of Testing Facility/Organization: **"LoveYourself Inc. (Bagan!)"**
  - Complete Mailing Address: **"NEDF Building 6th Lapu-Lapu St. cor. Brgy. 7, Bacolod City, Negros Occidental"**
  - Contact Numbers: **"034 700 2034"**
  - Email address: **"info@baganilph.org"**
  - Primary HTS provider checkboxes (HIV Counselor/Medical Technologist/CBS Motivator/Others)
  - Name & Signature of service provider

**Back Page - Page 2:**
- Header: "HIV TESTING" with checkbox options (PI/PF/SY/W/C)
- Section: ABOUT THE TEST (informational text about HIV testing)
- Section: INFORMED CONSENT
  - Verbal Consent checkbox with name and signature
  - Contact Number and Email address fields
- Section: PERSONAL INFORMATION SHEET (HTS FORM)
  - DEMOGRAPHIC DATA
    1. Test Date (DD/MM/YYYY format)
    2. PhilHealth Number with checkbox "Not enrolled in PhilHealth"
    3. PhilSys Number with checkbox "No PhilSys Number"
    4. Name (Full name) - First Name/Middle Name/Last Name/Suffix
    5. First 2 letters of mother's FIRST name / First 2 letters of father's FIRST name / Birth order
    6. Birth date (DD/MM/YYYY) / Age / Age in months
    7. Sex (Male/Female) / Gender identity (Men/Woman/Others)
    8. Current Place of Residence: City/Municipality/Province
    9. Permanent Residence: City/Municipality/Province
    10. Place of Birth: City/Municipality/Province
    11. Nationality: Filipino / Other
    12. Civil Status: Single/Married/Separated/Widowed/Divorced
    13. Living with partner: No/Yes / Number of children
    14. Are you pregnant?: No/Yes
  - EDUCATION & OCCUPATION
    15. Highest Education Attainment: No grade completed/Pre-school/Elementary/Highschool/Vocational/College/Post-Graduate
    16. Currently in school: No/Yes
    17. Are you currently working?: Yes (current occupation) / No (previous occupation)
    18. Did you reside or work overseas/abroad in past 5 years?
       - Work overseas/abroad: No/Yes with year of return
       - Where were you based / On what / Land
       - What country did you last work in?

### Critical Fields for OCR Extraction

**Priority 1 (Essential for verification):**
1. **Test Result** - Extract from "PREVIOUS HIV TEST" section or actual test result if marked
   - Pattern: `Reactive`, `Non-reactive`, `Indeterminate`, `POSITIVE`, `NEGATIVE`
   - Location: Question 19 on front page

**Priority 2 (Identity verification):**
2. **Test Date** - From DEMOGRAPHIC DATA section (Question 1)
   - Pattern: `DD/MM/YYYY` format
3. **Full Name** - From Question 4
   - Pattern: First Name / Middle Name / Last Name / Suffix
4. **Birth Date** - From Question 6
   - Pattern: `DD/MM/YYYY` format

**Priority 3 (Additional validation):**
5. **PhilHealth Number** - Question 2 (if enrolled)
6. **PhilSys Number** - Question 3 (if available)
7. **Testing Facility** - HTS Provider Details section
   - Expected: "LoveYourself Inc. (Bagan!)"
8. **Contact Number** - From Informed Consent or Testing Facility
9. **Test Kit Information** - Brand, Batch number, Lot number, Expiration date

**Priority 4 (Statistical/Analysis):**
10. **Sex/Gender Identity** - Question 7
11. **Age** - Question 6
12. **Previous HIV Test** - Question 19 (Yes/No and result if tested)
13. **Risk Factors** - Section 17-18 (sexual activity, drug use, etc.)

## Implementation Steps

### Step 0: Store Form Template for Reference

**0.1 Create Template Storage Directory**
```bash
mkdir -p backend/assets/form-templates/hts
```

**0.2 Save Template Images**
Save the uploaded HTS form images to:
- `backend/assets/form-templates/hts/doh-hts-2021-front.jpg`
- `backend/assets/form-templates/hts/doh-hts-2021-back.jpg`

**0.3 Create Template Metadata**
Create `backend/assets/form-templates/hts/template-metadata.json`:
```json
{
  "templateId": "doh-hts-2021",
  "name": "DOH Personal Information Sheet (HTS Form 2021)",
  "version": "2021",
  "organization": "Department of Health (DOH) Philippines",
  "pages": 2,
  "fields": {
    "testResult": {
      "location": "front",
      "section": "PREVIOUS HIV TEST",
      "question": 19,
      "type": "checkbox",
      "options": ["Reactive", "Non-reactive", "Indeterminate"],
      "priority": 1
    },
    "testDate": {
      "location": "back",
      "section": "DEMOGRAPHIC DATA",
      "question": 1,
      "type": "date",
      "format": "DD/MM/YYYY",
      "priority": 2
    },
    "fullName": {
      "location": "back",
      "section": "DEMOGRAPHIC DATA",
      "question": 4,
      "type": "text",
      "components": ["firstName", "middleName", "lastName", "suffix"],
      "priority": 2
    },
    "birthDate": {
      "location": "back",
      "section": "DEMOGRAPHIC DATA",
      "question": 6,
      "type": "date",
      "format": "DD/MM/YYYY",
      "priority": 2
    },
    "philHealthNumber": {
      "location": "back",
      "section": "DEMOGRAPHIC DATA",
      "question": 2,
      "type": "text",
      "optional": true,
      "priority": 3
    },
    "testingFacility": {
      "location": "front",
      "section": "HTS PROVIDER DETAILS",
      "type": "text",
      "expectedValue": "LoveYourself Inc. (Bagan!)",
      "priority": 3
    }
  },
  "extractionNotes": [
    "Front page contains test result and testing facility details",
    "Back page contains personal demographic information",
    "Form uses checkboxes and handwritten/printed text",
    "Multiple date fields use DD/MM/YYYY format",
    "Test result may be on front page (question 19) or marked elsewhere"
  ]
}
```

### Step 1: AWS Textract Setup

**1.1 Install Dependencies**
```bash
cd backend
npm install @aws-sdk/client-textract bull
```

**1.2 Create AWS IAM User**
- Go to AWS IAM Console
- Create new user: `vaulteer-textract-service`
- Attach policy with permissions:
  - `textract:DetectDocumentText`
  - `textract:AnalyzeDocument`
- Save Access Key ID and Secret Access Key

**1.3 Configure Environment Variables**
Add to `backend/.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-southeast-1
```

**1.4 Create AWS Configuration**
Create `backend/config/aws.js`:
```javascript
const { TextractClient } = require('@aws-sdk/client-textract');

const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = { textractClient };
```

### Step 2: TextractService Layer

**2.1 Create Server-Side Decryption Utility**
Create `backend/utils/imageDecryption.js`:
```javascript
const crypto = require('crypto');

/**
 * Convert base64 string to Buffer
 */
function base64ToBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

/**
 * Import encryption key from base64 string
 */
async function importKey(base64Key) {
  const keyBuffer = base64ToBuffer(base64Key);
  
  // Node.js crypto uses raw key format
  return keyBuffer;
}

/**
 * Decrypt image using AES-GCM
 */
async function decryptImage(encryptedBase64, ivBase64, keyBase64) {
  try {
    const key = await importKey(keyBase64);
    const iv = base64ToBuffer(ivBase64);
    const encryptedData = base64ToBuffer(encryptedBase64);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    // Extract auth tag (last 16 bytes)
    const authTag = encryptedData.slice(-16);
    const ciphertext = encryptedData.slice(0, -16);
    
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    return decrypted.toString('base64');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt both front and back images
 */
async function decryptFormImages(formData) {
  const frontImage = await decryptImage(
    formData.front_image_url,
    formData.front_image_iv,
    formData.encryption_key
  );
  
  const backImage = await decryptImage(
    formData.back_image_url,
    formData.back_image_iv,
    formData.encryption_key
  );
  
  return { frontImage, backImage };
}

module.exports = {
  decryptImage,
  decryptFormImages
};
```

**2.2 Create Textract Service**
Create `backend/services/textractService.js`:
```javascript
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
      if (block.EntityTypes.includes('KEY')) {
        keyMap[block.Id] = block;
      } else if (block.EntityTypes.includes('VALUE')) {
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
 * Process encrypted HTS form with Textract OCR
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
  extractTextLines,
  extractKeyValuePairs,
  extractTestResult,
  extractTestDate,
  extractFullName,
  extractPhilHealthNumber,
  extractTestingFacility,
  extractControlNumber,
  parseHTSFormData,
  processEncryptedHTSForm
};
```

### Step 3: Database Schema Updates

**3.1 Create Migration for Textract Fields**
Create `backend/migrations/20251202_add_textract_fields.sql`:
```sql
-- Add columns for OCR/Textract data
ALTER TABLE hts_forms 
ADD COLUMN extracted_data JSON NULL COMMENT 'Parsed data from AWS Textract OCR';

ALTER TABLE hts_forms 
ADD COLUMN extraction_confidence DECIMAL(5,2) NULL COMMENT 'Average confidence score (0-100)';

ALTER TABLE hts_forms 
ADD COLUMN extracted_at TIMESTAMP NULL COMMENT 'When OCR extraction completed';

ALTER TABLE hts_forms 
ADD COLUMN ocr_status ENUM('pending', 'processing', 'completed', 'failed') 
DEFAULT 'pending' COMMENT 'Status of OCR processing';

-- Add index for filtering by OCR status
CREATE INDEX idx_ocr_status ON hts_forms(ocr_status);
```

**3.2 Execute Migrations**
```bash
# First, execute the main hts_forms table migration
mysql -h your-rds-endpoint -u admin -p vaulteer_db < backend/migrations/20251202_create_hts_forms.sql

# Then, add Textract fields
mysql -h your-rds-endpoint -u admin -p vaulteer_db < backend/migrations/20251202_add_textract_fields.sql
```

### Step 4: Background Job Queue

**4.1 Create Textract Queue**
Create `backend/jobs/textractQueue.js`:
```javascript
const Bull = require('bull');
const { processEncryptedHTSForm } = require('../services/textractService');

// Create queue
const textractQueue = new Bull('textract-ocr', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Process jobs
textractQueue.process(async (job) => {
  const { formId } = job.data;
  
  console.log(`Processing OCR for form ${formId}...`);
  
  try {
    const result = await processEncryptedHTSForm(formId);
    return result;
  } catch (error) {
    console.error(`OCR job failed for form ${formId}:`, error);
    throw error;
  }
});

// Event listeners
textractQueue.on('completed', (job, result) => {
  console.log(`OCR completed for form ${result.formId} with confidence ${result.confidence}%`);
});

textractQueue.on('failed', (job, err) => {
  console.error(`OCR job ${job.id} failed:`, err.message);
});

/**
 * Add OCR job to queue
 */
async function enqueueOCRJob(formId) {
  const job = await textractQueue.add(
    { formId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );
  
  return job;
}

module.exports = {
  textractQueue,
  enqueueOCRJob
};
```

**4.2 Initialize Queue in Server**
Update `backend/server.js`:
```javascript
// Add at top
const { textractQueue } = require('./jobs/textractQueue');

// Add before server.listen()
console.log('Textract OCR queue initialized');
```

**4.3 Update Controller to Enqueue Job**
Update `backend/controllers/htsFormsController.js`:
```javascript
// Add at top
const { enqueueOCRJob } = require('../jobs/textractQueue');

// In submitForm function, after successful creation:
const result = await htsFormsRepository.createSubmission({
  controlNumber,
  userId: req.currentUserId,
  frontImageUrl: frontImage,
  backImageUrl: backImage,
  frontImageIV,
  backImageIV,
  encryptionKey,
  testResult
});

// Enqueue OCR job (non-blocking)
try {
  await enqueueOCRJob(result.formId);
  console.log(`OCR job queued for form ${result.formId}`);
} catch (error) {
  console.error('Failed to enqueue OCR job:', error);
  // Don't fail the submission if OCR queue fails
}

res.status(201).json({
  message: 'HTS form submitted successfully',
  controlNumber,
  formId: result.formId,
  ocrQueued: true
});
```

### Step 5: Update Repository

**5.1 Add Method to Fetch Form with Extracted Data**
Update `backend/repositories/htsFormsRepository.js`:
```javascript
async getSubmissionById(formId) {
  const pool = await getPool();
  
  const [rows] = await pool.query(
    `SELECT 
      hf.*,
      u.name as username,
      u.email,
      reviewer.name as reviewer_name
    FROM hts_forms hf
    LEFT JOIN users u ON hf.user_id = u.user_id
    LEFT JOIN users reviewer ON hf.reviewed_by = reviewer.user_id
    WHERE hf.form_id = ?`,
    [formId]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const submission = rows[0];
  
  // Parse extracted_data JSON
  if (submission.extracted_data) {
    try {
      submission.extracted_data = JSON.parse(submission.extracted_data);
    } catch (error) {
      console.error('Failed to parse extracted_data:', error);
      submission.extracted_data = null;
    }
  }
  
  return submission;
}
```

### Step 6: Admin UI Updates

**6.1 Update AdminFormReview Component**
Update `frontend/src/components/navigation/Form/AdminFormReview.js`:

Add state for extracted data:
```javascript
const [selectedSubmission, setSelectedSubmission] = useState(null);
const [extractedData, setExtractedData] = useState(null);
```

Add function to check for mismatches:
```javascript
const checkTestResultMismatch = (submission) => {
  if (!submission.extracted_data || !submission.extracted_data.testResult) {
    return false;
  }
  
  return submission.test_result !== submission.extracted_data.testResult;
};
```

Update handleViewSubmission:
```javascript
const handleViewSubmission = async (submission) => {
  // Decrypt images
  const decrypted = await decryptSubmissionImages(submission);
  
  setSelectedSubmission({ ...submission, ...decrypted });
  setExtractedData(submission.extracted_data);
};
```

Add OCR Analysis section in modal:
```javascript
{/* OCR Analysis Section */}
{extractedData && (
  <div className="mt-6 border-t pt-4">
    <h3 className="text-lg font-semibold mb-3">📄 OCR Analysis</h3>
    
    {/* Confidence Score */}
    <div className="mb-4">
      <span className="font-medium">Overall Confidence: </span>
      <span className={`font-bold ${
        selectedSubmission.extraction_confidence >= 95 ? 'text-green-600' :
        selectedSubmission.extraction_confidence >= 80 ? 'text-yellow-600' :
        'text-red-600'
      }`}>
        {selectedSubmission.extraction_confidence}%
      </span>
    </div>
    
    {/* Test Result Mismatch Warning */}
    {checkTestResultMismatch(selectedSubmission) && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-red-700">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold">Test Result Mismatch Detected</p>
            <p className="text-sm">
              User submitted: <strong>{selectedSubmission.test_result}</strong><br/>
              OCR extracted: <strong>{extractedData.testResult}</strong>
            </p>
            <p className="text-sm mt-1 italic">Please review manually and verify the correct result.</p>
          </div>
        </div>
      </div>
    )}
    
    {/* Extracted Fields */}
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <span className="text-sm text-gray-600">Control Number (OCR):</span>
        <p className="font-medium">{extractedData.controlNumber || 'Not detected'}</p>
      </div>
      <div>
        <span className="text-sm text-gray-600">Test Result (OCR):</span>
        <p className={`font-medium ${
          extractedData.testResult === 'reactive' ? 'text-red-600' : 'text-green-600'
        }`}>
          {extractedData.testResult === 'reactive' ? '⚠️ Reactive' : '✓ Non-Reactive'}
        </p>
      </div>
    </div>
    
    {/* Confidence Breakdown */}
    <div className="mb-4">
      <p className="text-sm text-gray-600 mb-2">Confidence Breakdown:</p>
      <div className="flex gap-4">
        <div>
          <span className="text-sm">Front Image: </span>
          <span className="font-medium">{extractedData.frontConfidence?.toFixed(2)}%</span>
        </div>
        <div>
          <span className="text-sm">Back Image: </span>
          <span className="font-medium">{extractedData.backConfidence?.toFixed(2)}%</span>
        </div>
      </div>
    </div>
    
    {/* Raw Text (Collapsible) */}
    <details className="mb-4">
      <summary className="cursor-pointer font-medium text-sm text-gray-700 hover:text-gray-900">
        View Raw Extracted Text
      </summary>
      <div className="mt-2 space-y-2">
        <div>
          <p className="text-sm font-medium text-gray-600">Front Image Text:</p>
          <pre className="text-xs bg-gray-50 p-2 rounded border overflow-auto max-h-40">
            {extractedData.frontText || 'No text extracted'}
          </pre>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Back Image Text:</p>
          <pre className="text-xs bg-gray-50 p-2 rounded border overflow-auto max-h-40">
            {extractedData.backText || 'No text extracted'}
          </pre>
        </div>
      </div>
    </details>
    
    {/* OCR Status */}
    <div className="text-sm text-gray-600">
      <span>OCR Status: </span>
      <span className={`font-medium ${
        selectedSubmission.ocr_status === 'completed' ? 'text-green-600' :
        selectedSubmission.ocr_status === 'processing' ? 'text-yellow-600' :
        selectedSubmission.ocr_status === 'failed' ? 'text-red-600' :
        'text-gray-600'
      }`}>
        {selectedSubmission.ocr_status}
      </span>
      {selectedSubmission.extracted_at && (
        <span className="ml-2 text-gray-500">
          (Extracted: {new Date(selectedSubmission.extracted_at).toLocaleString()})
        </span>
      )}
    </div>
  </div>
)}

{/* Show message if OCR not completed */}
{selectedSubmission?.ocr_status === 'pending' && (
  <div className="mt-6 border-t pt-4">
    <p className="text-gray-600 text-sm">
      ⏳ OCR analysis is pending. Results will appear here once processing is complete.
    </p>
  </div>
)}

{selectedSubmission?.ocr_status === 'processing' && (
  <div className="mt-6 border-t pt-4">
    <p className="text-gray-600 text-sm">
      🔄 OCR analysis is currently processing. Please refresh in a moment.
    </p>
  </div>
)}

{selectedSubmission?.ocr_status === 'failed' && (
  <div className="mt-6 border-t pt-4">
    <p className="text-red-600 text-sm">
      ❌ OCR analysis failed. Manual review required.
    </p>
  </div>
)}
```

Add OCR status badge to submission cards:
```javascript
{/* OCR Status Badge */}
{submission.ocr_status === 'completed' && (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
    📄 OCR Complete
  </span>
)}

{submission.ocr_status === 'processing' && (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
    🔄 Processing
  </span>
)}

{checkTestResultMismatch(submission) && (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
    ⚠️ Mismatch
  </span>
)}
```

### Step 7: Environment Setup

**7.1 Install Redis** (required for Bull queue)
```bash
# For local development (Windows)
# Download Redis from: https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis:alpine

# For production (AWS ElastiCache)
# Create Redis cluster in AWS Console
```

**7.2 Update .env**
Add Redis configuration:
```env
REDIS_HOST=localhost
REDIS_PORT=6379

# For production
# REDIS_HOST=your-elasticache-endpoint.amazonaws.com
# REDIS_PORT=6379
```

### Step 8: Testing

**8.1 Test Camera Capture**
1. Deploy frontend to HTTPS environment
2. Test on mobile and desktop browsers
3. Verify camera access permission flow
4. Test retake functionality
5. Verify image quality is sufficient for OCR
6. Test with actual DOH HTS Form 2021 (both blank and filled)

**8.2 Test Encryption/Decryption**
1. Submit test form with sample HTS images
2. Verify images are encrypted in database (check hts_forms table)
3. Verify admin can decrypt and view images
4. Check encryption_key, front_image_iv, back_image_iv are stored

**8.3 Test OCR Processing**
1. Submit form with clear DOH HTS Form 2021 images (filled sample)
2. Check OCR job is queued (Bull dashboard or logs)
3. Verify Textract API is called successfully
4. Check extracted_data is populated in database
5. Verify admin UI shows extracted data with confidence scores
6. Validate extraction of priority fields:
   - ✅ Test Result (Reactive/Non-reactive)
   - ✅ Test Date (DD/MM/YYYY format)
   - ✅ Full Name (First/Middle/Last)
   - ✅ Birth Date
   - ✅ PhilHealth Number (if available)
   - ✅ Testing Facility (LoveYourself Inc.)

**8.4 Test Mismatch Detection**
1. Submit form with "non-reactive" selected
2. Use image that clearly shows "REACTIVE" result
3. Verify mismatch warning appears in admin UI
4. Confirm admin can review and correct if needed

**8.5 Test Error Handling**
1. Submit form with poor quality images (blurry, dark)
2. Verify OCR fails gracefully with retry attempts
3. Check ocr_status is set to 'failed' after retries exhausted
4. Verify admin UI shows "Manual review required" message

## Further Considerations

### 1. Cost Optimization
**AWS Textract Pricing:**
- AnalyzeDocument with FORMS: $0.065 per page
- Each HTS form submission = 2 images = ~$0.13 per submission

**Options:**
- **Option A**: Process all submissions automatically (current plan)
- **Option B**: Process only on-demand when admin clicks "Extract Text" button
- **Option C**: Batch process during off-peak hours to reduce costs

**Recommendation:** Start with Option A (auto-process all), monitor costs, switch to Option B if needed.

### 2. Confidence Threshold
**Low Confidence Handling:**
- If extraction_confidence < 80%, flag for manual review
- Add "Needs Review" status badge in admin UI
- Consider manual re-submission if OCR confidence too low

### 3. Multiple Form Templates
**Current Implementation:** DOH HTS Form 2021 (LoveYourself Inc. - Bagan!)

**Future Support for Multiple Templates:**
- Current extraction logic optimized for DOH HTS Form 2021
- Template metadata stored in `backend/assets/form-templates/hts/template-metadata.json`
- If different clinics use different templates:
  - Add new template metadata files
  - Implement template detection logic (check for facility name, form headers)
  - Route to appropriate extraction functions based on detected template
  - Allow admin to manually specify template if auto-detection fails

**Template Detection Strategy:**
```javascript
function detectFormTemplate(frontBlocks) {
  const allText = extractTextLines(frontBlocks).map(l => l.text).join(' ');
  
  if (/PERSONAL\s+INFORMATION\s+SHEET.*HTS\s+FORM\s+2021/i.test(allText)) {
    return 'doh-hts-2021';
  }
  
  if (/LoveYourself\s+Inc/i.test(allText)) {
    return 'doh-hts-2021'; // LoveYourself uses DOH form
  }
  
  // Add more template patterns as needed
  return 'unknown';
}
```

### 4. Performance Monitoring
**Metrics to Track:**
- OCR processing time (target: <30 seconds)
- OCR success rate (target: >95%)
- Average confidence score (target: >90%)
- Mismatch detection rate (how often user input ≠ OCR result)

### 5. Data Privacy
**Considerations:**
- Encrypted images are decrypted server-side for Textract processing
- AWS Textract stores data temporarily (deleted after processing)
- Consider enabling AWS CloudTrail to audit Textract API calls
- Review AWS Data Processing Agreement for HIPAA compliance

## Next Steps

1. **Store form template reference** (save uploaded images to `backend/assets/form-templates/hts/`)
2. **Execute database migrations** (create hts_forms table, add Textract fields)
3. **Set up AWS IAM user** with Textract permissions
4. **Install dependencies** (AWS SDK, Bull queue, Redis)
5. **Implement server-side decryption** utility
6. **Implement TextractService** with OCR processing logic (optimized for DOH HTS Form 2021)
7. **Set up Bull queue** for background job processing
8. **Update controller** to enqueue OCR jobs after submission
9. **Update admin UI** to display extracted data with DOH form-specific fields
10. **Test with filled DOH HTS Form 2021 samples** to validate extraction accuracy
11. **Deploy to staging** and test over HTTPS with mobile devices
12. **Conduct field testing** with actual LoveYourself Inc. forms

## Success Criteria

- ✅ Camera capture works on HTTPS with mobile and desktop
- ✅ Images are encrypted before submission
- ✅ OCR processes automatically after submission (non-blocking)
- ✅ Admin can view decrypted images and extracted OCR data
- ✅ DOH HTS Form 2021 template recognized and processed correctly
- ✅ Essential fields extracted accurately (test result, name, dates, PhilHealth number)
- ✅ Testing facility verified (LoveYourself Inc. Bagan!)
- ✅ Mismatch warnings appear when user input ≠ OCR result
- ✅ Confidence scores displayed for each field
- ✅ OCR completes within 30 seconds
- ✅ System handles OCR failures gracefully with retry logic
- ✅ Cost per submission stays under $0.20
- ✅ Extraction accuracy >90% for handwritten/printed forms
- ✅ Template metadata stored for future reference and template expansion

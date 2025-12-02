# AWS Textract OCR Integration + S3 Storage with Encryption Plan (OCR-First Workflow)

## Overview
Integrate AWS Textract OCR with AWS S3 storage where **OCR processing happens BEFORE encryption**. User captures images → frontend sends to backend for OCR → Textract extracts text → results shown to user for review → user confirms → frontend encrypts images → submits encrypted images + OCR data to backend → stores in S3 with SSE-S3. This workflow improves UX (immediate OCR feedback) and reduces backend processing (no decryption needed for OCR).

## Current State
- ✅ Client-side AES-GCM 256-bit encryption implemented
- ✅ Admin can decrypt and view images client-side
- ✅ Camera capture with retake functionality working
- ✅ Database schema refactored (pending migration execution)
- ✅ HTS form template acquired (DOH "PERSONAL INFORMATION SHEET (HTS FORM 2021)")
- ✅ Camera permission UX improved with request spinner and Try Again button
- ⏳ Database migration not yet executed on AWS RDS
- ⏳ No OCR processing implemented
- ⏳ No S3 storage configured

## Goals
1. **OCR-First Workflow**: Process OCR on raw images BEFORE encryption for better UX
2. Extract text from captured images using AWS Textract immediately after capture
3. Parse extracted text to identify key fields (test date, patient name, test result, etc.)
4. Display OCR results to user for review and confirmation before submission
5. Verify user-provided test result matches extracted test result
6. Encrypt images only after user confirms OCR results
7. Store encrypted images in AWS S3 with SSE-S3 (server-side encryption only, no client encryption needed for OCR)
8. Store S3 URLs + pre-extracted OCR data in MySQL (no backend decryption needed)
9. Display OCR analysis in admin UI with mismatch warnings
10. Reduce storage costs: S3 ($0.023/GB/month) vs MySQL ($0.10/GB/month) = 4.3x cheaper

## Form Template Analysis

### HTS Form Structure (DOH "PERSONAL INFORMATION SHEET (HTS FORM 2021)")

**Front Page - Page 1:**
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
       
**Back Page - Page 2:**
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
  - Name of Testing Facility/Organization: **"LoveYourself Inc. (Bagani)"**
  - Complete Mailing Address: **"NEDF Building 6th Lapu-Lapu St. cor. Brgy. 7, Bacolod City, Negros Occidental"**
  - Contact Numbers: **"034 700 2034"**
  - Email address: **"info@baganilph.org"**
  - Primary HTS provider checkboxes (HIV Counselor/Medical Technologist/CBS Motivator/Others)
  - Name & Signature of service provider

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

### Step 1: AWS Setup (Textract + S3)

**1.1 Install Dependencies**
```bash
cd backend
npm install @aws-sdk/client-textract @aws-sdk/client-s3 @aws-sdk/s3-request-presigner bull
```

**1.2 Create AWS IAM User**
- Go to AWS IAM Console
- Create new user: `vaulteer-textract-s3-service`
- Attach policy with permissions:
  - `textract:DetectDocumentText`
  - `textract:AnalyzeDocument`
  - `s3:PutObject` (for uploads)
  - `s3:GetObject` (for downloads)
  - `s3:DeleteObject` (for cleanup)
- Resource ARN: `arn:aws:s3:::vaulteer-hts-forms/hts-forms/*`
- Save Access Key ID and Secret Access Key

**1.3 Configure S3 Bucket**
Create S3 bucket in AWS Console or CLI:
```bash
aws s3 mb s3://vaulteer-hts-forms --region ap-southeast-2

# Enable SSE-S3 encryption
aws s3api put-bucket-encryption \
  --bucket vaulteer-hts-forms \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket vaulteer-hts-forms \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket vaulteer-hts-forms \
  --versioning-configuration Status=Enabled
```

**1.4 Configure Environment Variables**
Add to `backend/.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-southeast-1
S3_BUCKET_REGION=ap-southeast-2
S3_HTS_FORMS_BUCKET=vaulteer-hts-forms
```

**Note:** Textract in ap-southeast-1 (Singapore), S3 in ap-southeast-2 (Sydney, same as RDS) for data residency.

**1.5 Create AWS Configuration**
Create `backend/config/aws.js`:
```javascript
const { TextractClient } = require('@aws-sdk/client-textract');
const { S3Client } = require('@aws-sdk/client-s3');

const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3Client = new S3Client({
  region: process.env.S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = { textractClient, s3Client };
```

### Step 2: OCR Service Layer (Processes Raw Images Before Encryption)

**2.1 Create OCR Analysis Endpoint**
Create `backend/routes/htsFormsRoutes.js` endpoint for pre-submission OCR:
```javascript
// POST /api/hts-forms/analyze-ocr (processes raw images before encryption)
router.post('/analyze-ocr', auth, upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const frontImageBuffer = req.files.frontImage[0].buffer;
  const backImageBuffer = req.files.backImage[0].buffer;
  
  console.log('📋 Analyzing images with Textract (pre-encryption)...');
  
  // Send raw images to Textract
  const extractedData = await textractService.analyzeHTSForm(
    frontImageBuffer, 
    backImageBuffer
  );
  
  res.json({
    success: true,
    extractedData,
    confidence: extractedData.confidence,
    message: 'OCR analysis complete. Please review before submitting.'
  });
}));
```

**2.2 Create S3 Service**
Create `backend/services/s3Service.js`:
```javascript
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/aws');
const crypto = require('crypto');

const BUCKET_NAME = process.env.S3_HTS_FORMS_BUCKET;

/**
 * Upload encrypted image to S3 with SSE-S3
 * @param {Buffer} imageBuffer - Client-encrypted image buffer
 * @param {string} formId - Form ID for organizing uploads
 * @param {string} imageSide - 'front' or 'back'
 * @returns {Promise<string>} - S3 object key
 */
async function uploadEncryptedImage(imageBuffer, formId, imageSide) {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const key = `hts-forms/${formId}/${imageSide}-${timestamp}-${randomSuffix}.enc`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: 'application/octet-stream',
    ServerSideEncryption: 'AES256', // SSE-S3 (server-side encryption)
    Metadata: {
      'form-id': formId,
      'image-side': imageSide,
      'encrypted': 'true'
    }
  });

  await s3Client.send(command);
  console.log(`✅ Uploaded encrypted ${imageSide} image to S3: ${key}`);

  return key;
}

/**
 * Get pre-signed download URL (1 hour expiry)
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPresignedDownloadUrl(s3Key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

/**
 * Download encrypted image from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Buffer>} - Image buffer
 */
async function downloadImage(s3Key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  const response = await s3Client.send(command);
  const stream = response.Body;
  
  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Delete image from S3
 * @param {string} s3Key - S3 object key
 */
async function deleteImage(s3Key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  await s3Client.send(command);
  console.log(`🗑️ Deleted image from S3: ${s3Key}`);
}

module.exports = {
  uploadEncryptedImage,
  getPresignedDownloadUrl,
  downloadImage,
  deleteImage
};
```

### Step 3: TextractService Layer (No Decryption Needed)

**3.1 Create Server-Side Decryption Utility** (Only for Admin Image Viewing)
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

**3.2 Create Textract Service (Processes Raw Images Before Encryption)**
Create `backend/services/textractService.js`:
```javascript
const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { textractClient } = require('../config/aws');

/**
 * Call AWS Textract AnalyzeDocument API (on raw images, no decryption needed)
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
 * Analyze HTS form images and return extracted data
 * Called by /api/hts-forms/analyze-ocr endpoint BEFORE encryption
 */
async function analyzeHTSForm(frontImageBuffer, backImageBuffer) {
  console.log('📤 Sending raw images to AWS Textract...');
  
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
  parseHTSFormData
};
```

### Step 4: Database Schema Updates

**4.1 Update HTS Forms Table Schema for S3 + Pre-Extracted OCR Data**
Create `backend/migrations/20251203_update_hts_forms_s3_ocr.sql`:
```sql
-- Replace base64 TEXT columns with S3 keys
ALTER TABLE hts_forms 
DROP COLUMN front_image_url,
DROP COLUMN back_image_url;

ALTER TABLE hts_forms 
ADD COLUMN front_image_s3_key VARCHAR(500) NOT NULL COMMENT 'S3 object key for encrypted front image',
ADD COLUMN back_image_s3_key VARCHAR(500) NOT NULL COMMENT 'S3 object key for encrypted back image';

-- Add columns for pre-extracted OCR/Textract data (already processed before submission)
ALTER TABLE hts_forms 
ADD COLUMN extracted_data JSON NOT NULL COMMENT 'Pre-extracted data from AWS Textract OCR (sent from frontend)',
ADD COLUMN extraction_confidence DECIMAL(5,2) NOT NULL COMMENT 'Average confidence score (0-100)',
ADD COLUMN ocr_completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When OCR was completed (before submission)';

-- Add indexes
CREATE INDEX idx_extraction_confidence ON hts_forms(extraction_confidence);
CREATE INDEX idx_front_image_s3_key ON hts_forms(front_image_s3_key);
CREATE INDEX idx_back_image_s3_key ON hts_forms(back_image_s3_key);
```

**Note:** No `ocr_status` enum needed since OCR is completed before submission. Frontend sends already-extracted data.

**4.2 Execute Migrations**
```bash
# Execute the updated hts_forms schema migration
mysql -h your-rds-endpoint -u admin -p vaulteer_db < backend/migrations/20251203_update_hts_forms_s3_ocr.sql
```

### Step 5: Controller Updates (No Background Queue Needed)

**5.1 Update HTS Forms Controller to Accept Pre-Extracted OCR Data**
Update `backend/controllers/htsFormsController.js`:
```javascript
const s3Service = require('../services/s3Service');
const htsFormsRepository = require('../repositories/htsFormsRepository');

// POST /api/hts-forms/submit (receives encrypted images + already-extracted OCR data)
async function submitForm(req, res) {
  const { 
    frontImageBase64, 
    backImageBase64, 
    frontImageIV, 
    backImageIV, 
    encryptionKey, 
    testResult,
    extractedData, // OCR data from frontend (already processed)
    extractionConfidence 
  } = req.body;
  
  // Validate OCR data is present
  if (!extractedData || !extractionConfidence) {
    return res.status(400).json({ 
      error: 'Missing OCR data. Please analyze images first.' 
    });
  }
  
  // Generate control number and form ID
  const controlNumber = generateControlNumber();
  const formId = generateFormId();
  
  try {
    console.log(`📤 Uploading encrypted images to S3 for form ${formId}...`);
    
    // Convert base64 to Buffer
    const frontBuffer = Buffer.from(frontImageBase64, 'base64');
    const backBuffer = Buffer.from(backImageBase64, 'base64');
    
    // Upload encrypted images to S3 (parallel)
    const [frontS3Key, backS3Key] = await Promise.all([
      s3Service.uploadEncryptedImage(frontBuffer, formId, 'front'),
      s3Service.uploadEncryptedImage(backBuffer, formId, 'back')
    ]);
    
    console.log(`✅ Images uploaded to S3: ${frontS3Key}, ${backS3Key}`);
    
    // Store in database with S3 keys + pre-extracted OCR data
    const result = await htsFormsRepository.createSubmission({
      formId,
      controlNumber,
      userId: req.currentUserId,
      frontImageS3Key: frontS3Key,
      backImageS3Key: backS3Key,
      frontImageIV,
      backImageIV,
      encryptionKey,
      testResult,
      extractedData, // Already processed OCR data from frontend
      extractionConfidence
    });
    
    console.log(`✅ Form ${formId} submitted with control number: ${controlNumber}`);
    
    res.status(201).json({
      success: true,
      message: 'HTS form submitted successfully',
      controlNumber,
      formId: result.formId
    });
    
  } catch (error) {
    console.error('Submission failed:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
}
```

### Step 6: Update Repository

**6.1 Update Repository for S3 Keys + Pre-Extracted OCR Data**
Update `backend/repositories/htsFormsRepository.js`:
```javascript
async createSubmission(data) {
  const pool = await getPool();
  
  const [result] = await pool.query(
    `INSERT INTO hts_forms (
      form_id,
      control_number,
      user_id,
      front_image_s3_key,
      back_image_s3_key,
      front_image_iv,
      back_image_iv,
      encryption_key,
      test_result,
      extracted_data,
      extraction_confidence,
      ocr_completed_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.formId,
      data.controlNumber,
      data.userId,
      data.frontImageS3Key,
      data.backImageS3Key,
      data.frontImageIV,
      data.backImageIV,
      data.encryptionKey,
      data.testResult,
      JSON.stringify(data.extractedData), // Pre-extracted OCR data
      data.extractionConfidence
    ]
  );
  
  return { formId: data.formId, insertId: result.insertId };
}
```

**6.2 Add Method to Fetch Form with Extracted Data**
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

### Step 7: Frontend Updates (OCR-First Workflow)

**7.1 Update HTSFormManagement for OCR Before Encryption**
Update `frontend/src/components/navigation/Form/HTSFormManagement.js`:
```javascript
// Add state
const [capturedImages, setCapturedImages] = useState({ front: null, back: null });
const [extractedData, setExtractedData] = useState(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [showOCRReview, setShowOCRReview] = useState(false);

// NEW: Analyze captured images with OCR BEFORE encryption
const handleAnalyzeImages = async () => {
  if (!capturedImages.front || !capturedImages.back) {
    alert('Please capture both front and back images');
    return;
  }
  
  setIsAnalyzing(true);
  
  try {
    const token = await getAccessToken();
    
    // Create FormData with raw images (NOT encrypted yet)
    const formData = new FormData();
    formData.append('frontImage', capturedImages.front);
    formData.append('backImage', capturedImages.back);
    
    console.log('📤 Sending images for OCR analysis...');
    
    const response = await fetch('/api/hts-forms/analyze-ocr', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ OCR analysis complete:', result.extractedData);
      setExtractedData(result.extractedData);
      setShowOCRReview(true); // Show review modal
    } else {
      alert('OCR analysis failed. Please try again.');
    }
  } catch (error) {
    console.error('❌ OCR analysis error:', error);
    alert('Failed to analyze images. Please check your connection.');
  } finally {
    setIsAnalyzing(false);
  }
};

// Update handleSubmit to encrypt AFTER user confirms OCR
const handleSubmit = async () => {
  if (!extractedData) {
    alert('Please analyze images first');
    return;
  }
  
  console.log('🔐 Encrypting images before submission...');
  
  // NOW encrypt the images (after OCR confirmation)
  const { encryptedFront, encryptedBack, frontIV, backIV, key } = 
    await encryptFormImages(capturedImages.front, capturedImages.back);
  
  const token = await getAccessToken();
  
  const payload = {
    frontImageBase64: encryptedFront,
    backImageBase64: encryptedBack,
    frontImageIV: frontIV,
    backImageIV: backIV,
    encryptionKey: key,
    testResult: selectedTestResult,
    extractedData, // Send pre-extracted OCR data
    extractionConfidence: extractedData.confidence
  };
  
  const response = await fetch('/api/hts-forms/submit', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert(`✅ Form submitted! Control Number: ${result.controlNumber}`);
    // Reset form
    setCapturedImages({ front: null, back: null });
    setExtractedData(null);
    setShowOCRReview(false);
  }
};

// OCR review modal
{showOCRReview && (
  <div className="ocr-review-modal">
    <h3>📄 OCR Extraction Results</h3>
    <p>Please review the extracted information before submitting:</p>
    <div className="extracted-fields">
      <div className="field">
        <strong>Test Result:</strong> 
        <span className={extractedData.testResult === selectedTestResult ? 'match' : 'mismatch'}>
          {extractedData.testResult}
        </span>
        {extractedData.testResult !== selectedTestResult && (
          <span className="warning">⚠️ Mismatch with your input!</span>
        )}
      </div>
      <div className="field">
        <strong>Full Name:</strong> {extractedData.fullName}
      </div>
      <div className="field">
        <strong>Test Date:</strong> {extractedData.testDate}
      </div>
      <div className="field">
        <strong>Testing Facility:</strong> {extractedData.testingFacility}
      </div>
      <div className="field">
        <strong>Confidence Score:</strong> {extractedData.confidence.toFixed(2)}%
      </div>
    </div>
    <div className="actions">
      <button onClick={() => handleSubmit()} className="btn-primary">
        ✅ Looks Good - Submit Form
      </button>
      <button onClick={() => setShowOCRReview(false)} className="btn-secondary">
        ❌ Re-capture Images
      </button>
    </div>
  </div>
)}

// Add "Analyze Images" button before submit
<button 
  onClick={handleAnalyzeImages} 
  disabled={!capturedImages.front || !capturedImages.back || isAnalyzing}
  className="btn-analyze"
>
  {isAnalyzing ? '🔍 Analyzing...' : '📋 Analyze Images with OCR'}
</button>
```

**Note:** Workflow is now: Capture → Analyze (OCR) → Review → Confirm → Encrypt → Submit

### Step 8: Admin UI Updates

**8.1 Update AdminFormReview Component for S3 Images**
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

### Step 9: Environment Setup

**9.1 Install Multer** (required for file upload in OCR endpoint)
```bash
cd backend
npm install multer
```

**9.2 Update .env**
Verify AWS and S3 configs added in Step 1 (no Redis needed):
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-southeast-1
S3_BUCKET_REGION=ap-southeast-2
S3_HTS_FORMS_BUCKET=vaulteer-hts-forms
```

### Step 10: Testing

**10.1 Test OCR Analysis Endpoint (Before Encryption)**
1. Capture test HTS form images (front + back)
2. Click "Analyze Images with OCR" button
3. Verify /api/hts-forms/analyze-ocr endpoint called with FormData
4. Verify raw images sent to Textract (no encryption needed)
5. Check extracted_data returned with confidence score
6. Verify OCR review modal displays extracted fields
7. Test mismatch warning when user input ≠ extracted test result

**10.2 Test S3 Upload**
1. Submit test form with sample HTS images
2. Verify images uploaded to S3 bucket `vaulteer-hts-forms/hts-forms/{formId}/`
3. Check SSE-S3 encryption enabled on uploaded objects
4. Verify S3 keys stored in database (front_image_s3_key, back_image_s3_key)
5. Test S3 download via pre-signed URLs (1-hour expiry)

**10.3 Test Camera Capture**
1. Deploy frontend to HTTPS environment
2. Test on mobile and desktop browsers
3. Verify camera access permission flow
4. Test retake functionality
5. Verify image quality is sufficient for OCR
6. Test with actual DOH HTS Form 2021 (both blank and filled)

**10.4 Test Encryption After OCR Confirmation**
1. Click "Looks Good - Submit Form" after reviewing OCR results
2. Verify client-side encryption happens AFTER user confirmation (check browser console)
3. Verify encrypted blobs uploaded to S3 with SSE-S3
4. Verify pre-extracted OCR data sent in submission payload
5. Check database contains S3 keys + extracted_data JSON
6. Verify admin can decrypt and view images (via S3 pre-signed URLs)

**10.5 Test Complete Workflow**
1. Capture DOH HTS Form 2021 images (filled sample)
2. Click "Analyze Images with OCR" → verify Textract processing (~10-15 seconds)
3. Review extracted fields in modal:
   - ✅ Test Result (Reactive/Non-reactive)
   - ✅ Test Date (DD/MM/YYYY format)
   - ✅ Full Name (First/Middle/Last)
   - ✅ Birth Date
   - ✅ PhilHealth Number (if available)
   - ✅ Testing Facility (LoveYourself Inc. Bagani)
4. Verify confidence score displayed (target: >90%)
5. Click "Looks Good - Submit Form" → verify encryption + S3 upload
6. Verify admin UI displays extracted data immediately (no polling needed)

**10.6 Test Mismatch Detection**
1. Submit form with "non-reactive" selected
2. Use image that clearly shows "REACTIVE" result
3. Verify mismatch warning appears in admin UI
4. Confirm admin can review and correct if needed

**10.7 Test Error Handling**
1. Submit form with poor quality images (blurry, dark)
2. Verify OCR fails gracefully with retry attempts
3. Check ocr_status is set to 'failed' after retries exhausted
4. Verify admin UI shows "Manual review required" message

## Further Considerations

### 1. Cost Optimization

**S3 Storage Pricing:**
- S3 Standard: $0.023/GB/month (first 50TB)
- MySQL RDS: ~$0.10/GB/month (gp2 storage)
- **Savings:** 4.3x cheaper ($0.077/GB/month saved)
- Per 1000 forms (~2GB encrypted images): Save $0.15/month

**AWS Textract Pricing:**
- AnalyzeDocument with FORMS: $0.065 per page
- Each HTS form submission = 2 images = ~$0.13 per submission
- 1000 forms/month = $130/month OCR cost

**Total Cost Analysis (1000 forms/month):**
- Old approach (MySQL base64): $0.20 storage + $130 OCR = $130.20/month
- New approach (S3 SSE-S3): $0.046 storage + $130 OCR = $130.05/month
- **Monthly savings:** $0.15 (storage only, OCR same)

**OCR Processing Strategy:**
- **Current Plan**: OCR-first workflow (process before encryption)
  - User pays OCR cost upfront ($0.13 per submission)
  - Immediate feedback (10-15 seconds)
  - No background processing needed
  - Better UX: user reviews extracted data before submitting
- **Alternative**: Post-submission OCR (background processing)
  - Faster submission (~2 seconds)
  - Requires Bull/Redis infrastructure
  - No immediate feedback to user

**Recommendation:** 
1. Use **OCR-first workflow** for better UX and data quality
2. Use S3 for storage (4.3x cheaper than MySQL)
3. Monitor OCR costs: $130/month for 1000 forms
4. Consider caching Textract results to avoid re-processing on retakes

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

1. **Install dependencies** (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/client-textract`, `multer`)
2. **Create S3 bucket** `vaulteer-hts-forms` in ap-southeast-2 with SSE-S3, versioning, block public access
3. **Set up AWS IAM user** with S3 + Textract permissions
4. **Configure environment variables** (AWS credentials, S3 bucket name)
5. **Create OCR analysis endpoint** (`POST /api/hts-forms/analyze-ocr`) with multer for file uploads
6. **Create TextractService** with `analyzeHTSForm()` function (processes raw images)
7. **Create S3 service** (`backend/services/s3Service.js`) with upload/download/delete functions
8. **Update AWS config** (`backend/config/aws.js`) to include S3Client
9. **Implement server-side decryption** utility (for admin image viewing only)
10. **Execute database migration** to add S3 key columns and pre-extracted OCR fields
11. **Update controller** to accept pre-extracted OCR data and upload encrypted images to S3
12. **Update repository** to store S3 keys + extracted_data JSON
13. **Update frontend** to add "Analyze Images with OCR" button (before encryption)
14. **Add OCR review modal** in frontend to display extracted fields and mismatch warnings
15. **Update handleSubmit** to encrypt images AFTER user confirms OCR results
16. **Update admin UI** to fetch images from S3 via pre-signed URLs and display OCR data
17. **Test complete workflow** over HTTPS with filled DOH HTS Form 2021 samples
18. **Deploy to staging** and conduct field testing with LoveYourself Inc. forms

## Success Criteria

- ✅ **OCR-First Workflow**: OCR processes raw images BEFORE encryption for better UX
- ✅ **Immediate Feedback**: User sees OCR results within 10-15 seconds after capture
- ✅ **User Review**: Modal displays extracted fields for confirmation before submission
- ✅ **S3 Storage**: Encrypted images stored in S3 with SSE-S3 after OCR confirmation
- ✅ **Database Optimization**: MySQL stores S3 URLs + pre-extracted OCR data (not base64 blobs)
- ✅ **Cost Reduction**: S3 storage 4.3x cheaper than MySQL ($0.023/GB vs $0.10/GB)
- ✅ **Camera Capture**: Works on HTTPS with mobile and desktop
- ✅ **Client Encryption**: Images encrypted AFTER user confirms OCR results
- ✅ **S3 Upload**: Parallel upload of encrypted front/back images with unique keys
- ✅ **No Background Jobs**: No Bull/Redis needed (OCR completes before submission)
- ✅ **Textract Integration**: DOH HTS Form 2021 template recognized and processed
- ✅ **Field Extraction**: Test result, full name, dates, PhilHealth number extracted accurately (>90%)
- ✅ **Facility Verification**: Testing facility identified (LoveYourself Inc. Bagani)
- ✅ **Mismatch Detection**: Real-time warnings when user input ≠ OCR result
- ✅ **Confidence Scores**: Displayed in review modal for transparency
- ✅ **Admin UI**: Images fetched from S3 via pre-signed URLs, pre-extracted data displayed immediately
- ✅ **Performance**: OCR completes within 15 seconds, submission within 3 seconds
- ✅ **Error Handling**: Graceful OCR failures with "Re-capture" option
- ✅ **Cost Target**: Total cost per submission ~$0.13 ($0.046 S3 + $0.13 OCR, no Redis/Bull)
- ✅ **Security**: Encryption maintained (client AES-GCM + S3 SSE-S3), OCR on raw images before encryption
- ✅ **Data Quality**: User validates OCR accuracy before submitting
- ✅ **Scalability**: S3 supports unlimited storage growth
- ✅ **Template Metadata**: Stored for future template expansion

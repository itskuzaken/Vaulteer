/**
 * Complete Front Page Recalibration - ALL FIELDS
 * Combines QUERIES and FORMS APIs for maximum detection
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');

// Configuration
const templateMetadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const frontImagePath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-front.jpg');

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
 * Generate queries for text fields
 */
function generateQueryBatches() {
  const batch1 = [
    { Alias: 'testDate', Text: 'What is the HIV test date at the top in MM/DD/YYYY format?' },
    { Alias: 'philHealthNumber', Text: 'What is the PhilHealth Number?' },
    { Alias: 'philSysNumber', Text: 'What is the PhilSys Number?' },
    { Alias: 'firstName', Text: 'What is the first name?' },
    { Alias: 'middleName', Text: 'What is the middle name?' },
    { Alias: 'lastName', Text: 'What is the last name?' },
    { Alias: 'suffix', Text: 'What is the name suffix?' },
    { Alias: 'parentalCodeMother', Text: 'What are the first 2 letters of mother\'s first name?' },
    { Alias: 'parentalCodeFather', Text: 'What are the first 2 letters of father\'s first name?' },
    { Alias: 'birthOrder', Text: 'What is the birth order number?' },
    { Alias: 'birthDate', Text: 'What is the birth date in MM/DD/YYYY format?' },
    { Alias: 'age', Text: 'What is the age in years?' },
    { Alias: 'ageMonths', Text: 'What is the age in months?' },
    { Alias: 'numberOfChildren', Text: 'How many children does the person have?' },
    { Alias: 'currentOccupation', Text: 'What is the current occupation or type of work?' }
  ];
  
  const batch2 = [
    { Alias: 'currentResidenceCity', Text: 'What is the city or municipality of current residence?' },
    { Alias: 'currentResidenceProvince', Text: 'What is the province of current residence?' },
    { Alias: 'permanentResidenceCity', Text: 'What is the city or municipality of permanent residence?' },
    { Alias: 'permanentResidenceProvince', Text: 'What is the province of permanent residence?' },
    { Alias: 'placeOfBirthCity', Text: 'What is the city or municipality of birth?' },
    { Alias: 'placeOfBirthProvince', Text: 'What is the province of birth?' },
    { Alias: 'nationalityOther', Text: 'If not Filipino, what is the specified nationality?' },
    { Alias: 'previousOccupation', Text: 'What was the occupation before unemployed?' },
    { Alias: 'workedOverseasYear', Text: 'What year did the person work overseas?' },
    { Alias: 'currentlyWorking', Text: 'Is the person currently working? Answer Yes or No.' }
  ];
  
  return { batch1, batch2 };
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
 * Match field to detection results
 */
function findBestMatch(fieldName, fieldConfig, queryResults, kvPairs, checkboxes, allBlocks) {
  // Special handling for nationalityOther: Find text after "Other, please specify:" checkbox
  if (fieldName === 'nationalityOther') {
    const otherCheckbox = checkboxes.find(cb => 
      cb.label.toLowerCase().includes('other') && 
      cb.label.toLowerCase().includes('specify')
    );
    
    if (otherCheckbox && allBlocks) {
      const textBlocks = allBlocks.filter(b => b.BlockType === 'WORD' && b.Text);
      const cbX = otherCheckbox.bbox.Left;
      const cbY = otherCheckbox.bbox.Top;
      const cbRight = cbX + otherCheckbox.bbox.Width;
      
      // Find text to the right of "Other, please specify:" label (on same line)
      const specifyText = textBlocks
        .filter(txt => {
          const txtX = txt.Geometry.BoundingBox.Left;
          const txtY = txt.Geometry.BoundingBox.Top;
          const verticalDist = Math.abs(txtY - cbY);
          // Look for text far right (after the label), on same line
          return txtX > (cbRight + 0.15) && txtX < (cbRight + 0.25) && verticalDist < 0.01;
        })
        .sort((a, b) => a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left);
      
      if (specifyText.length > 0) {
        // Take only the first word (the actual nationality)
        const firstText = specifyText[0];
        return {
          text: firstText.Text,
          confidence: (firstText.Confidence || 0) / 100,
          bbox: firstText.Geometry.BoundingBox,
          method: 'text-after-checkbox'
        };
      }
    }
  }
  
  // Priority 1: Query results
  let queryAlias = fieldName;
  if (fieldName === 'parentalCode') queryAlias = 'parentalCodeMother';
  if (fieldName === 'workedOverseas') queryAlias = 'workedOverseasYear';
  
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
    // If field has options (like Male/Female), match by label and position
    if (fieldConfig.options && fieldConfig.options.length > 0) {
      // Try to match by label text
      for (const option of fieldConfig.options) {
        const optionValue = option.value.toLowerCase();
        const matchingCheckbox = checkboxes.find(cb => {
          const label = cb.label.toLowerCase();
          // Check if the label contains the option value
          return label.includes(optionValue) || 
                 // Check for common variations
                 (optionValue === 'female' && (label.includes('woman') || label.includes('girl'))) ||
                 (optionValue === 'male' && (label.includes('man') || label.includes('boy'))) ||
                 (optionValue === 'filipino' && label.includes('filipino')) ||
                 (optionValue === 'other' && (label.includes('other') || label.includes('specify')));
        });
        
        if (matchingCheckbox) {
          return {
            text: option.value, // Return the actual value (Male/Female, etc)
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
  
  // Priority 4: For mixed fields (nationality with checkbox + text)
  if (fieldConfig.type === 'mixed' && fieldConfig.checkboxes) {
    for (const checkboxOption of fieldConfig.checkboxes) {
      const optionValue = checkboxOption.value.toLowerCase();
      const matchingCheckbox = checkboxes.find(cb => {
        const label = cb.label.toLowerCase();
        return label.includes(optionValue) || 
               (optionValue === 'filipino' && label.includes('filipino')) ||
               (optionValue === 'other' && (label.includes('other') || label.includes('specify')));
      });
      
      if (matchingCheckbox) {
        return {
          text: checkboxOption.value,
          confidence: matchingCheckbox.confidence,
          bbox: matchingCheckbox.bbox,
          method: 'checkbox'
        };
      }
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

    console.log('📤 Loading and processing front page image...');
    const frontImageBufferRaw = fs.readFileSync(frontImagePath);
    const frontImageBuffer = await prepareImageForTextract(frontImageBufferRaw);
    console.log('✅ Image prepared');
    console.log();

    console.log('🚀 Running Textract - Multiple APIs for maximum detection...');
    console.log('='.repeat(70));
    
    // Run QUERIES in batches
    const { batch1, batch2 } = generateQueryBatches();
    console.log(`📊 QUERIES Batch 1: ${batch1.length} queries...`);
    const queryResult1 = await analyzeWithQueries(frontImageBuffer, batch1);
    console.log(`✅ Batch 1: ${queryResult1.Blocks?.length || 0} blocks`);
    
    console.log(`📊 QUERIES Batch 2: ${batch2.length} queries...`);
    const queryResult2 = await analyzeWithQueries(frontImageBuffer, batch2);
    console.log(`✅ Batch 2: ${queryResult2.Blocks?.length || 0} blocks`);
    
    // Run FORMS
    console.log(`📊 FORMS + TABLES analysis...`);
    const formsResult = await analyzeWithForms(frontImageBuffer);
    console.log(`✅ FORMS: ${formsResult.Blocks?.length || 0} blocks`);
    console.log();

    console.log('🔬 Extracting all detection results...');
    const queryResults1 = extractQueryResults(queryResult1.Blocks || []);
    const queryResults2 = extractQueryResults(queryResult2.Blocks || []);
    const queryResults = { ...queryResults1, ...queryResults2 };
    
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

    console.log('🔄 Matching ALL FRONT PAGE fields...');
    console.log('='.repeat(70));
    
    // Combine all blocks for special text detection
    const allBlocks = [
      ...(queryResult1.Blocks || []),
      ...(queryResult2.Blocks || []),
      ...(formsResult.Blocks || [])
    ];
    
    const suggestions = [];
    const frontFields = templateMetadata.ocrMapping.front.fields;
    let detectedCount = 0;
    
    for (const [fieldName, fieldConfig] of Object.entries(frontFields)) {
      const match = findBestMatch(fieldName, fieldConfig, queryResults, kvPairs, checkboxes, allBlocks);
      
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
    console.log('📊 COMPLETE FRONT PAGE CALIBRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total fields in template: ${Object.keys(frontFields).length}`);
    console.log(`Fields detected: ${detectedCount}`);
    console.log(`Fields missing: ${Object.keys(frontFields).length - detectedCount}`);
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
    const outputPath = path.join(__dirname, '../logs', `front-all-fields-calibration-${Date.now()}.json`);
    const calibrationData = { front: suggestions };
    fs.writeFileSync(outputPath, JSON.stringify(calibrationData, null, 2));
    console.log(`💾 Calibration saved: ${outputPath}`);
    console.log();
    
    console.log('✅ Complete front page calibration finished!');
    console.log('Next: Run apply-comprehensive-calibration.js to apply updates');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

runCompleteCalibration();

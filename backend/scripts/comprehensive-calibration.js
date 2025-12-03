/**
 * Comprehensive OCR Calibration using FORMS feature
 * 
 * This script calibrates ALL fields by:
 * 1. Using Textract FORMS feature to detect all form fields
 * 2. Matching detected fields to template fields by label proximity
 * 3. Generating coordinate suggestions for all fields, not just query-matched ones
 */

// Load environment variables FIRST before any AWS imports
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const fs = require('fs');
const path = require('path');
const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { textractClient } = require('../config/aws');

// Template paths
const templatesDir = path.join(__dirname, '../assets/hts-templetes');
const frontImagePath = path.join(templatesDir, 'filled-hts-form-front.jpg');
const backImagePath = path.join(templatesDir, 'filled-hts-form-back.jpg');
const templateMetadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');

console.log('='.repeat(70));
console.log('COMPREHENSIVE HTS FORM CALIBRATION');
console.log('='.repeat(70));
console.log();

/**
 * Resize image if needed for Textract limits
 */
async function prepareImageForTextract(imageBuffer) {
  const sharp = require('sharp');
  const metadata = await sharp(imageBuffer).metadata();
  
  const maxDimension = 4000;
  
  if (metadata.width > maxDimension || metadata.height > maxDimension) {
    const resized = await sharp(imageBuffer)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    return resized;
  }
  
  return imageBuffer;
}

/**
 * Analyze document with FORMS and TABLES features
 */
async function analyzeDocumentFull(imageBuffer) {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['FORMS', 'TABLES']
  });

  const response = await textractClient.send(command);
  return response;
}

/**
 * Extract key-value pairs from Textract FORMS
 */
function extractKeyValuePairs(blocks) {
  const kvPairs = [];
  const keyBlocks = blocks.filter(b => b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes?.includes('KEY'));
  
  for (const keyBlock of keyBlocks) {
    // Find associated value
    const valueRelation = keyBlock.Relationships?.find(r => r.Type === 'VALUE');
    if (!valueRelation) continue;
    
    const valueBlock = blocks.find(b => b.Id === valueRelation.Ids[0]);
    if (!valueBlock) continue;
    
    // Extract key text
    const keyTextRelation = keyBlock.Relationships?.find(r => r.Type === 'CHILD');
    let keyText = '';
    if (keyTextRelation) {
      const keyTextBlocks = keyTextRelation.Ids.map(id => blocks.find(b => b.Id === id)).filter(Boolean);
      keyText = keyTextBlocks.map(b => b.Text).join(' ');
    }
    
    // Extract value text
    const valueTextRelation = valueBlock.Relationships?.find(r => r.Type === 'CHILD');
    let valueText = '';
    if (valueTextRelation) {
      const valueTextBlocks = valueTextRelation.Ids.map(id => blocks.find(b => b.Id === id)).filter(Boolean);
      valueText = valueTextBlocks.map(b => b.Text).join(' ');
    }
    
    if (keyText || valueText) {
      kvPairs.push({
        key: keyText.trim(),
        value: valueText.trim(),
        keyBBox: keyBlock.Geometry?.BoundingBox,
        valueBBox: valueBlock.Geometry?.BoundingBox,
        confidence: Math.min(keyBlock.Confidence || 0, valueBlock.Confidence || 0)
      });
    }
  }
  
  return kvPairs;
}

/**
 * Find best matching KV pair for a template field
 */
function findMatchingKVPair(fieldConfig, kvPairs, fieldName) {
  const label = fieldConfig.label?.toLowerCase() || '';
  const nearbyLabel = fieldConfig.nearbyLabel?.text?.toLowerCase() || '';
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const kvPair of kvPairs) {
    const kvKey = kvPair.key.toLowerCase();
    const kvValue = kvPair.value.toLowerCase();
    
    // Calculate similarity score
    let score = 0;
    
    // Special handling for date fields - look for date patterns in value
    if (fieldName === 'testDate' || fieldName === 'birthDate') {
      const hasDatePattern = /\d{1,2}[\s\/-]\d{1,2}[\s\/-]\d{2,4}/.test(kvValue) || 
                            /\d{4}[\s\/-]\d{1,2}[\s\/-]\d{1,2}/.test(kvValue);
      if (hasDatePattern) {
        // Check if key mentions date, test, birth, month, day, year
        if (kvKey.includes('date') || kvKey.includes('test') || kvKey.includes('birth') ||
            kvKey.includes('month') || kvKey.includes('day') || kvKey.includes('year')) {
          score = 80;
          if (fieldName === 'testDate' && kvKey.includes('test')) score = 95;
          if (fieldName === 'birthDate' && (kvKey.includes('birth') || kvKey.includes('birthday'))) score = 95;
        }
      }
    }
    
    // Exact match
    if (kvKey === label || kvKey === nearbyLabel) {
      score = Math.max(score, 100);
    }
    // Contains match
    else if (kvKey.includes(label) || label.includes(kvKey)) {
      score = Math.max(score, 70);
    }
    else if (nearbyLabel && (kvKey.includes(nearbyLabel) || nearbyLabel.includes(kvKey))) {
      score = Math.max(score, 60);
    }
    // Partial word match
    else if (score < 60) {
      const labelWords = label.split(/\s+/);
      const kvWords = kvKey.split(/\s+/);
      const matchingWords = labelWords.filter(w => kvWords.some(kw => kw.includes(w) || w.includes(kw)));
      if (matchingWords.length > 0) {
        score = Math.max(score, (matchingWords.length / labelWords.length) * 50);
      }
    }
    
    if (score > bestScore && kvPair.value) {
      bestScore = score;
      bestMatch = kvPair;
    }
  }
  
  return bestScore > 30 ? bestMatch : null;
}

/**
 * Main comprehensive calibration
 */
async function runComprehensiveCalibration() {
  try {
    console.log('📤 Loading template metadata...');
    const templateMetadata = JSON.parse(fs.readFileSync(templateMetadataPath, 'utf8'));
    console.log(`✅ Template: ${templateMetadata.name}`);
    console.log();

    console.log('📤 Loading and processing images...');
    const frontImageBufferRaw = fs.readFileSync(frontImagePath);
    const backImageBufferRaw = fs.readFileSync(backImagePath);
    
    const frontImageBuffer = await prepareImageForTextract(frontImageBufferRaw);
    const backImageBuffer = await prepareImageForTextract(backImageBufferRaw);
    console.log('✅ Images prepared');
    console.log();

    console.log('🚀 Running Textract FORMS analysis (FRONT PAGE ONLY)...');
    console.log('-'.repeat(70));
    
    const frontResult = await analyzeDocumentFull(frontImageBuffer);
    
    console.log(`✅ Front: ${frontResult.Blocks?.length || 0} blocks`);
    console.log();

    console.log('📊 Extracting key-value pairs...');
    const frontKVPairs = extractKeyValuePairs(frontResult.Blocks || []);
    
    console.log(`✅ Front: ${frontKVPairs.length} key-value pairs found`);
    console.log();

    // Show sample KV pairs
    console.log('📋 Sample Key-Value Pairs (Front):');
    frontKVPairs.slice(0, 10).forEach((kv, i) => {
      const valuePreview = kv.value.length > 30 ? kv.value.substring(0, 30) + '...' : kv.value;
      console.log(`  ${i + 1}. "${kv.key}" → "${valuePreview}" (${kv.confidence.toFixed(0)}%)`);
    });
    console.log();

    console.log('🔬 Matching ALL FRONT PAGE fields to detected fields...');
    console.log('-'.repeat(70));
    
    const suggestions = { front: [] };
    
    // Process front page
    const frontFields = templateMetadata.ocrMapping.front.fields;
    for (const [fieldName, fieldConfig] of Object.entries(frontFields)) {
      const match = findMatchingKVPair(fieldConfig, frontKVPairs, fieldName);
      
      if (match && match.valueBBox) {
        const oldRegion = fieldConfig.region || {};
        const newRegion = {
          x: parseFloat(match.valueBBox.Left.toFixed(3)),
          y: parseFloat(match.valueBBox.Top.toFixed(3)),
          width: parseFloat(match.valueBBox.Width.toFixed(3)),
          height: parseFloat(match.valueBBox.Height.toFixed(3))
        };
        
        // Calculate distance from old coordinates
        const distanceX = Math.abs((oldRegion.x || 0) - newRegion.x);
        const distanceY = Math.abs((oldRegion.y || 0) - newRegion.y);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        suggestions.front.push({
          fieldName,
          label: fieldConfig.label,
          matched: match.key,
          value: match.value,
          confidence: match.confidence,
          oldRegion,
          newRegion,
          distance: totalDistance.toFixed(3)
        });
        
        console.log(`✓ ${fieldConfig.label}`);
        console.log(`  Matched: "${match.key}" → "${match.value.substring(0, 30)}"`);
        console.log(`  Distance: ${totalDistance.toFixed(3)} | Confidence: ${match.confidence.toFixed(0)}%`);
      }
    }
    
    console.log();
    console.log('='.repeat(70));
    console.log('📊 CALIBRATION SUMMARY (FRONT PAGE ONLY)');
    console.log('='.repeat(70));
    console.log(`Front page: ${suggestions.front.length}/${Object.keys(frontFields).length} fields matched`);
    console.log();

    // Generate report
    const reportPath = path.join(__dirname, '../logs', `comprehensive-calibration-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(suggestions, null, 2), 'utf8');
    console.log(`✅ Calibration data saved: ${reportPath}`);
    console.log();

    console.log('📝 To apply calibration:');
    console.log(`  node backend/scripts/apply-comprehensive-calibration.js "${reportPath}"`);
    console.log();
    console.log('⚠️  NOTE: This will recalibrate ALL front page fields');
    console.log();
    console.log('='.repeat(70));

  } catch (error) {
    console.error();
    console.error('❌ Calibration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
runComprehensiveCalibration();

/**
 * Complete Front Page Recalibration Script
 * Uses Textract QUERIES API to systematically detect all front page fields
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

  // Resize if needed (max 4000px)
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
 * Generate comprehensive queries for ALL front page fields (in batches of 15)
 */
function generateFrontPageQueries() {
  // Batch 1: Test Date + Personal Info (15 queries max)
  const batch1 = [
    { Alias: 'testDate', Text: 'What is the HIV test date shown at the top of the form in MM/DD/YYYY format?' },
    { Alias: 'philHealthNumber', Text: 'What is the PhilHealth Identification Number shown on the form?' },
    { Alias: 'philSysNumber', Text: 'What is the PhilSys Number (Philippine Identification System Number)?' },
    { Alias: 'firstName', Text: 'What is the patient first name in the NAME section?' },
    { Alias: 'middleName', Text: 'What is the patient middle name?' },
    { Alias: 'lastName', Text: 'What is the patient last name?' },
    { Alias: 'suffix', Text: 'What is the name suffix (Jr, Sr, III, etc) if any?' },
    { Alias: 'parentalCodeMother', Text: 'What are the first 2 letters of mother\'s FIRST name?' },
    { Alias: 'parentalCodeFather', Text: 'What are the first 2 letters of father\'s FIRST name?' },
    { Alias: 'birthOrder', Text: 'What is the birth order number among mother\'s children?' },
    { Alias: 'birthDate', Text: 'What is the birth date shown in MM/DD/YYYY format?' },
    { Alias: 'age', Text: 'What is the patient age in years?' },
    { Alias: 'ageMonths', Text: 'What is the age in months for children less than 1 year old?' },
    { Alias: 'currentResidenceProvince', Text: 'What is the province of current residence?' },
    { Alias: 'numberOfChildren', Text: 'What is the number of children?' }
  ];
  
  // Batch 2: Demographic locations + Occupation (15 queries max)
  const batch2 = [
    { Alias: 'currentResidenceCity', Text: 'What is the city or municipality of current residence?' },
    { Alias: 'permanentResidenceCity', Text: 'What is the city or municipality of permanent residence?' },
    { Alias: 'permanentResidenceProvince', Text: 'What is the province of permanent residence?' },
    { Alias: 'placeOfBirthCity', Text: 'What is the city or municipality of birth?' },
    { Alias: 'placeOfBirthProvince', Text: 'What is the province of birth?' },
    { Alias: 'nationalityOther', Text: 'If nationality is not Filipino, what is the specified nationality?' },
    { Alias: 'currentOccupation', Text: 'What is the current occupation or work?' },
    { Alias: 'previousOccupation', Text: 'What was the occupation before current work if unemployed?' },
    { Alias: 'workedOverseas', Text: 'In what year did the person work overseas or abroad?' }
  ];
  
  return { batch1, batch2 };
}

/**
 * Analyze document with QUERIES
 */
async function analyzeDocumentWithQueries(imageBuffer, queries) {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['QUERIES'],
    QueriesConfig: {
      Queries: queries
    }
  });

  const response = await textractClient.send(command);
  return response;
}

/**
 * Extract query results
 */
function extractFromQueryResults(blocks) {
  const results = {};
  
  const queryBlocks = blocks.filter(b => b.BlockType === 'QUERY');
  const queryResultBlocks = blocks.filter(b => b.BlockType === 'QUERY_RESULT');
  
  for (const query of queryBlocks) {
    const alias = query.Query?.Alias;
    if (!alias) continue;
    
    // Find associated result
    const resultRelation = query.Relationships?.find(r => r.Type === 'ANSWER');
    if (!resultRelation || !resultRelation.Ids || resultRelation.Ids.length === 0) continue;
    
    const resultId = resultRelation.Ids[0];
    const resultBlock = queryResultBlocks.find(b => b.Id === resultId);
    
    if (resultBlock && resultBlock.Text) {
      results[alias] = {
        text: resultBlock.Text,
        confidence: resultBlock.Confidence || 0,
        bbox: resultBlock.Geometry?.BoundingBox
      };
    }
  }
  
  return results;
}

/**
 * Main recalibration
 */
async function runCompleteRecalibration() {
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

    console.log('🚀 Generating comprehensive queries for ALL FRONT PAGE fields...');
    const { batch1, batch2 } = generateFrontPageQueries();
    console.log(`✅ Generated ${batch1.length + batch2.length} queries in 2 batches`);
    console.log();

    console.log('📊 Running Textract QUERIES analysis - BATCH 1 (Priority fields + Demographics)...');
    console.log('-'.repeat(70));
    
    const result1 = await analyzeDocumentWithQueries(frontImageBuffer, batch1);
    console.log(`✅ Batch 1: ${result1.Blocks?.length || 0} blocks`);
    
    console.log('📊 Running Textract QUERIES analysis - BATCH 2 (Locations + Occupation)...');
    console.log('-'.repeat(70));
    
    const result2 = await analyzeDocumentWithQueries(frontImageBuffer, batch2);
    console.log(`✅ Batch 2: ${result2.Blocks?.length || 0} blocks`);
    console.log();

    console.log('🔬 Extracting query results from both batches...');
    const queryResults1 = extractFromQueryResults(result1.Blocks || []);
    const queryResults2 = extractFromQueryResults(result2.Blocks || []);
    const queryResults = { ...queryResults1, ...queryResults2 };
    console.log(`✅ Extracted ${Object.keys(queryResults).length} field results total`);
    console.log();

    console.log('📋 Query Results:');
    console.log('-'.repeat(70));
    for (const [alias, data] of Object.entries(queryResults)) {
      const valuePreview = data.text.length > 50 ? data.text.substring(0, 50) + '...' : data.text;
      console.log(`  ${alias}: "${valuePreview}" (${data.confidence.toFixed(1)}%)`);
    }
    console.log();

    console.log('🔄 Matching with template fields and calculating distances...');
    console.log('-'.repeat(70));
    
    const suggestions = [];
    const frontFields = templateMetadata.ocrMapping.front.fields;
    
    for (const [fieldName, fieldConfig] of Object.entries(frontFields)) {
      // Map field names (handle special cases)
      let queryAlias = fieldName;
      if (fieldName === 'parentalCode') queryAlias = 'parentalCodeMother';
      
      const queryResult = queryResults[queryAlias];
      
      if (queryResult && queryResult.bbox) {
        const oldRegion = fieldConfig.region || {};
        const newRegion = {
          x: parseFloat(queryResult.bbox.Left.toFixed(3)),
          y: parseFloat(queryResult.bbox.Top.toFixed(3)),
          width: parseFloat(queryResult.bbox.Width.toFixed(3)),
          height: parseFloat(queryResult.bbox.Height.toFixed(3))
        };
        
        // Calculate distance
        const distanceX = Math.abs((oldRegion.x || 0) - newRegion.x);
        const distanceY = Math.abs((oldRegion.y || 0) - newRegion.y);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        suggestions.push({
          fieldName,
          label: fieldConfig.label,
          queryAlias,
          value: queryResult.text,
          confidence: queryResult.confidence,
          oldRegion,
          newRegion,
          distance: totalDistance.toFixed(3)
        });
        
        const status = totalDistance > 0.05 ? '⚠️' : '✓';
        console.log(`${status} ${fieldConfig.label}`);
        console.log(`   Field: ${fieldName} | Query: ${queryAlias}`);
        console.log(`   Value: "${queryResult.text.substring(0, 40)}"`);
        console.log(`   Distance: ${totalDistance.toFixed(3)} | Confidence: ${queryResult.confidence.toFixed(1)}%`);
      } else {
        console.log(`❌ ${fieldConfig.label} (${fieldName}) - NOT DETECTED`);
      }
    }
    
    console.log();
    console.log('='.repeat(70));
    console.log('📊 CALIBRATION SUMMARY - FRONT PAGE COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total fields in template: ${Object.keys(frontFields).length}`);
    console.log(`Fields detected: ${suggestions.length}`);
    console.log(`Fields missing: ${Object.keys(frontFields).length - suggestions.length}`);
    console.log();
    
    const wellCalibrated = suggestions.filter(s => parseFloat(s.distance) < 0.05).length;
    const needsUpdate = suggestions.filter(s => parseFloat(s.distance) >= 0.05).length;
    console.log(`✓ Well calibrated: ${wellCalibrated}`);
    console.log(`⚠️ Needs update: ${needsUpdate}`);
    console.log();

    // Save calibration data
    const outputPath = path.join(__dirname, '../logs', `front-complete-calibration-${Date.now()}.json`);
    const calibrationData = { front: suggestions };
    fs.writeFileSync(outputPath, JSON.stringify(calibrationData, null, 2));
    console.log(`💾 Calibration data saved: ${outputPath}`);
    console.log();
    
    console.log('✅ Front page recalibration complete!');
    console.log('Next step: Run apply-comprehensive-calibration.js to apply changes');
    
  } catch (error) {
    console.error('❌ Error during recalibration:', error);
    throw error;
  }
}

// Run
runCompleteRecalibration();

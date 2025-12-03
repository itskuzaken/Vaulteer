/**
 * Test OCR Calibration with HTS Template Images
 * 
 * This script:
 * 1. Loads the filled HTS form templates
 * 2. Runs Textract with Queries API
 * 3. Generates calibration report with coordinate mismatches
 * 4. Shows suggestions for template metadata updates
 */

// Load environment variables FIRST before any AWS imports
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const fs = require('fs');
const path = require('path');
const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { textractClient } = require('../config/aws');
const OCRRegionCalibrator = require('../utils/calibrateOCRRegions');

// Template paths
const templatesDir = path.join(__dirname, '../assets/hts-templetes');
const frontImagePath = path.join(templatesDir, 'filled-hts-form-front.jpg');
const backImagePath = path.join(templatesDir, 'filled-hts-form-back.jpg');

console.log('='.repeat(70));
console.log('HTS TEMPLATE CALIBRATION TEST');
console.log('='.repeat(70));
console.log();

// Check if template images exist
if (!fs.existsSync(frontImagePath)) {
  console.error('❌ Front template not found:', frontImagePath);
  process.exit(1);
}

if (!fs.existsSync(backImagePath)) {
  console.error('❌ Back template not found:', backImagePath);
  process.exit(1);
}

console.log('✅ Template images found');
console.log(`   Front: ${frontImagePath}`);
console.log(`   Back:  ${backImagePath}`);
console.log();

/**
 * Generate HTS form queries for a specific page
 */
function generateHTSFormQueries(page) {
  const queries = {
    front: [
      { text: "What is the HIV test date at the top of the form?", alias: "test_date" },
      { text: "What is the PhilHealth Identification Number?", alias: "phil_health_number" },
      { text: "What is the PhilSys Number?", alias: "philsys_number" },
      { text: "What is the first name?", alias: "first_name" },
      { text: "What is the middle name?", alias: "middle_name" },
      { text: "What is the last name?", alias: "last_name" },
      { text: "What is the suffix?", alias: "suffix" },
      { text: "What is the parental code - mother's first name first 2 letters?", alias: "parental_code_mother" },
      { text: "What is the parental code - father's first name first 2 letters?", alias: "parental_code_father" },
      { text: "What is the birth order?", alias: "birth_order" },
      { text: "What is the birth date?", alias: "birth_date" },
      { text: "What is the age?", alias: "age" },
      { text: "What is the age in months?", alias: "age_months" },
      { text: "What is the sex assigned at birth?", alias: "sex" },
      { text: "What is the nationality?", alias: "nationality" }
    ],
    back: [
      { text: "What is the date of most recent condomless anal or vaginal sex?", alias: "recent_sex_date" },
      { text: "What are the reasons for HIV testing?", alias: "reasons_testing" },
      { text: "When was the previous HIV test?", alias: "previous_test_date" },
      { text: "What was the result of previous HIV test?", alias: "previous_test_result" },
      { text: "What is the clinical picture?", alias: "clinical_picture" },
      { text: "Describe signs and symptoms", alias: "signs_symptoms" },
      { text: "What is the HIV testing modality?", alias: "testing_modality" },
      { text: "What is the brand of test kit used?", alias: "test_kit_brand" },
      { text: "What is the lot number?", alias: "lot_number" },
      { text: "What is the expiration date of test kit?", alias: "expiration_date" },
      { text: "What is the name of testing facility?", alias: "testing_facility" },
      { text: "What is the complete mailing address?", alias: "mailing_address" },
      { text: "What are the contact numbers?", alias: "contact_numbers" },
      { text: "What is the email address?", alias: "email_address" },
      { text: "What is the name of service provider?", alias: "service_provider_name" }
    ]
  };

  return queries[page] || [];
}

/**
 * Run Textract Queries API
 */
async function analyzeDocumentWithQueries(imageBuffer, queries) {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['QUERIES'],
    QueriesConfig: {
      Queries: queries.map(q => ({ Text: q.text, Alias: q.alias }))
    }
  });

  console.log(`🔍 Running Textract with ${queries.length} queries...`);
  const response = await textractClient.send(command);
  console.log(`✅ Textract complete: ${response.Blocks?.length || 0} blocks returned`);
  
  return response;
}

/**
 * Extract query results from Textract blocks
 */
function extractFromQueryResults(blocks) {
  const queryResults = {};
  const queries = blocks.filter(b => b.BlockType === 'QUERY');
  const queryAnswers = blocks.filter(b => b.BlockType === 'QUERY_RESULT');

  for (const query of queries) {
    if (!query.Query?.Alias) continue;

    const answer = queryAnswers.find(a => 
      query.Relationships?.some(r => 
        r.Type === 'ANSWER' && r.Ids?.includes(a.Id)
      )
    );

    if (answer && answer.Text) {
      queryResults[query.Query.Alias] = {
        text: answer.Text,
        confidence: answer.Confidence || 0,
        boundingBox: answer.Geometry?.BoundingBox,
        queryText: query.Query.Text
      };
    }
  }

  return queryResults;
}

/**
 * Resize image if needed for Textract limits
 */
async function prepareImageForTextract(imageBuffer) {
  const sharp = require('sharp');
  const metadata = await sharp(imageBuffer).metadata();
  
  // Textract limits: 10MB file size, 5000x5000 pixels max
  const maxDimension = 4000;
  
  if (metadata.width > maxDimension || metadata.height > maxDimension) {
    console.log(`   Resizing from ${metadata.width}x${metadata.height}...`);
    
    const resized = await sharp(imageBuffer)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    const resizedMeta = await sharp(resized).metadata();
    console.log(`   Resized to ${resizedMeta.width}x${resizedMeta.height} (${resized.length} bytes)`);
    
    return resized;
  }
  
  return imageBuffer;
}

/**
 * Main calibration test
 */
async function runCalibrationTest() {
  try {
    console.log('📤 Loading template images...');
    const frontImageBufferRaw = fs.readFileSync(frontImagePath);
    const backImageBufferRaw = fs.readFileSync(backImagePath);
    
    const sharp = require('sharp');
    const frontMeta = await sharp(frontImageBufferRaw).metadata();
    const backMeta = await sharp(backImageBufferRaw).metadata();
    
    console.log(`✅ Front image: ${frontMeta.width}x${frontMeta.height} (${frontMeta.format})`);
    console.log(`✅ Back image: ${backMeta.width}x${backMeta.height} (${backMeta.format})`);
    
    // Resize if needed
    console.log('🔧 Preparing images for Textract...');
    const frontImageBuffer = await prepareImageForTextract(frontImageBufferRaw);
    const backImageBuffer = await prepareImageForTextract(backImageBufferRaw);
    console.log();

    // Generate queries
    console.log('📋 Generating Textract queries...');
    const frontQueries = generateHTSFormQueries('front');
    const backQueries = generateHTSFormQueries('back');
    console.log(`   Front: ${frontQueries.length} queries`);
    console.log(`   Back: ${backQueries.length} queries`);
    console.log();

    // Run Textract
    console.log('🚀 Running Textract Queries API...');
    console.log('-'.repeat(70));
    
    const [frontTextractResult, backTextractResult] = await Promise.all([
      analyzeDocumentWithQueries(frontImageBuffer, frontQueries),
      analyzeDocumentWithQueries(backImageBuffer, backQueries)
    ]);
    
    console.log();

    // Extract query results
    console.log('📊 Extracting query results...');
    const queryResults = {
      front: extractFromQueryResults(frontTextractResult.Blocks || []),
      back: extractFromQueryResults(backTextractResult.Blocks || [])
    };

    console.log(`✅ Front queries matched: ${Object.keys(queryResults.front).length}/${frontQueries.length}`);
    console.log(`✅ Back queries matched: ${Object.keys(queryResults.back).length}/${backQueries.length}`);
    console.log();

    // Show matched queries
    console.log('🎯 Query Match Results:');
    console.log('-'.repeat(70));
    
    console.log('FRONT PAGE:');
    for (const [alias, result] of Object.entries(queryResults.front)) {
      const preview = result.text.length > 40 ? result.text.substring(0, 40) + '...' : result.text;
      console.log(`  ✓ ${alias}: "${preview}" (${result.confidence.toFixed(0)}%)`);
    }
    
    console.log('\nBACK PAGE:');
    for (const [alias, result] of Object.entries(queryResults.back)) {
      const preview = result.text.length > 40 ? result.text.substring(0, 40) + '...' : result.text;
      console.log(`  ✓ ${alias}: "${preview}" (${result.confidence.toFixed(0)}%)`);
    }
    console.log();

    // Run calibration analysis
    console.log('🔬 Analyzing coordinate mismatches...');
    console.log('-'.repeat(70));
    
    const calibrator = new OCRRegionCalibrator();
    const textractResults = { front: frontTextractResult, back: backTextractResult };
    const calibrationAnalysis = calibrator.analyzeFieldPositions(queryResults, textractResults);

    // Display analysis
    console.log(`Front Page Analysis:`);
    console.log(`  Total fields: ${calibrationAnalysis.front.totalFields}`);
    console.log(`  Query matched: ${calibrationAnalysis.front.queryMatched}`);
    console.log(`  Coordinate mismatches: ${calibrationAnalysis.front.coordinateMismatch.length}`);
    console.log();

    console.log(`Back Page Analysis:`);
    console.log(`  Total fields: ${calibrationAnalysis.back.totalFields}`);
    console.log(`  Query matched: ${calibrationAnalysis.back.queryMatched}`);
    console.log(`  Coordinate mismatches: ${calibrationAnalysis.back.coordinateMismatch.length}`);
    console.log();

    // Show top mismatches
    const allMismatches = [
      ...calibrationAnalysis.front.coordinateMismatch.map(m => ({ ...m, page: 'front' })),
      ...calibrationAnalysis.back.coordinateMismatch.map(m => ({ ...m, page: 'back' }))
    ].sort((a, b) => parseFloat(b.distance.total) - parseFloat(a.distance.total));

    if (allMismatches.length > 0) {
      console.log('🎯 Top Coordinate Mismatches (distance > 5%):');
      console.log('-'.repeat(70));
      
      allMismatches.slice(0, 10).forEach((mismatch, i) => {
        console.log(`${i + 1}. ${mismatch.label} (${mismatch.page})`);
        console.log(`   Distance: ${mismatch.distance.total} (x: ${mismatch.distance.x}, y: ${mismatch.distance.y})`);
        console.log(`   Expected: (${mismatch.expected.x}, ${mismatch.expected.y})`);
        console.log(`   Actual:   (${mismatch.actual.x}, ${mismatch.actual.y})`);
        console.log(`   Query: "${mismatch.query}"`);
        console.log();
      });
    } else {
      console.log('✅ No significant coordinate mismatches found!');
      console.log('   All query-matched fields are within 5% of expected positions.');
      console.log();
    }

    // Save calibration report
    const reportPath = path.join(__dirname, '../logs', `hts-template-calibration-${Date.now()}.md`);
    calibrator.saveReport(calibrationAnalysis, reportPath);

    console.log('='.repeat(70));
    console.log('📊 CALIBRATION REPORT GENERATED');
    console.log('='.repeat(70));
    console.log(`Report saved to: ${reportPath}`);
    console.log();

    if (allMismatches.length > 0) {
      console.log('📝 Next Steps:');
      console.log('  1. Review the calibration report');
      console.log('  2. Apply suggested updates:');
      console.log(`     node backend/scripts/apply-calibration.js "${reportPath}"`);
      console.log('  3. Restart backend and test with real forms');
    } else {
      console.log('✅ Template coordinates are well-calibrated!');
      console.log('   No adjustments needed.');
    }
    
    console.log();
    console.log('='.repeat(70));

  } catch (error) {
    console.error();
    console.error('❌ Calibration test failed:', error.message);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runCalibrationTest();

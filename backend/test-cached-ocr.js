/**
 * Test OCR extraction using CACHED Textract results
 * This loads pre-extracted data from HTS-FORM-FRONT and HTS-FORM-BACK folders
 */

const { analyzeHTSFormWithForms } = require('./services/textractService');

console.log('🧪 Testing OCR with CACHED Textract Data...\n');
console.log('📁 Data source: backend/assets/HTS-FORM/HTS-FORM-FRONT and HTS-FORM-BACK');
console.log('🔧 Mode: Cached (no AWS API calls)\n');

async function testCachedOCR() {
  try {
    // Call with null buffers since we're using cached data
    // The useCachedData option will trigger loading from folders
    const result = await analyzeHTSFormWithForms(null, null, {
      useCachedData: true,
      preprocessImages: false,
      useLayout: true
    });

    console.log('\n✅ OCR EXTRACTION COMPLETE\n');
    console.log('=' .repeat(60));
    console.log('📊 OVERALL STATISTICS');
    console.log('=' .repeat(60));
    console.log(`Total Fields Extracted: ${result.stats.totalFields}`);
    console.log(`Extraction Method: ${result.extractionMethod}`);
    console.log(`Template ID: ${result.templateId}`);
    console.log(`Overall Confidence: ${result.confidence.toFixed(2)}%`);
    console.log();

    console.log('📈 CONFIDENCE BREAKDOWN:');
    console.log(`  ✅ High confidence (≥85%): ${result.stats.highConfidence} fields`);
    console.log(`  ⚠️  Medium confidence (70-85%): ${result.stats.mediumConfidence} fields`);
    console.log(`  ❌ Low confidence (<70%): ${result.stats.lowConfidence} fields`);
    console.log(`  🔍 Requires review: ${result.stats.requiresReview} fields`);
    console.log();

    console.log('🗺️  UNMAPPED KEYS:');
    console.log(`  Front page: ${result.unmappedKeys.front?.length || 0} keys`);
    console.log(`  Back page: ${result.unmappedKeys.back?.length || 0} keys`);
    
    if (result.unmappedKeys.front?.length > 0) {
      console.log(`\n  Front unmapped: ${result.unmappedKeys.front.slice(0, 10).join(', ')}`);
      if (result.unmappedKeys.front.length > 10) {
        console.log(`  ... and ${result.unmappedKeys.front.length - 10} more`);
      }
    }
    
    if (result.unmappedKeys.back?.length > 0) {
      console.log(`\n  Back unmapped: ${result.unmappedKeys.back.slice(0, 10).join(', ')}`);
      if (result.unmappedKeys.back.length > 10) {
        console.log(`  ... and ${result.unmappedKeys.back.length - 10} more`);
      }
    }
    console.log();

    console.log('=' .repeat(60));
    console.log('📋 ALL EXTRACTED FIELDS');
    console.log('=' .repeat(60));
    
    const fieldEntries = Object.entries(result.fields);
    fieldEntries.forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : value;
      console.log(`  ${key}: ${JSON.stringify(displayValue)}`);
    });
    
    console.log(`\nTotal: ${Object.keys(result.fields).length} fields extracted`);
    console.log();

    if (result.validationSummary) {
      console.log('=' .repeat(60));
      console.log('✔️  VALIDATION SUMMARY');
      console.log('=' .repeat(60));
      console.log(`Auto-corrections applied: ${result.validationSummary.corrected || 0}`);
      console.log(`Validation pass rate: ${result.validationSummary.validPercentage || 0}%`);
      console.log();
    }

    console.log('✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testCachedOCR();

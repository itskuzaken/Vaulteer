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

    // Display structured data by sections
    if (result.structuredData) {
      console.log('=' .repeat(60));
      console.log('📂 STRUCTURED DATA BY SECTIONS');
      console.log('=' .repeat(60));
      
      console.log('\n🔹 FRONT PAGE SECTIONS:');
      for (const [sectionName, sectionData] of Object.entries(result.structuredData.front)) {
        console.log(`\n  ${sectionName} (${sectionData.totalFields} fields, ${sectionData.avgConfidence}% confidence)`);
        for (const [fieldName, fieldData] of Object.entries(sectionData.fields)) {
          const displayValue = typeof fieldData.value === 'string' && fieldData.value.length > 40 
            ? fieldData.value.substring(0, 40) + '...' 
            : fieldData.value;
          console.log(`    • ${fieldName}: ${JSON.stringify(displayValue)} (${fieldData.confidence || 'N/A'}%)`);
        }
      }
      
      console.log('\n\n🔹 BACK PAGE SECTIONS:');
      for (const [sectionName, sectionData] of Object.entries(result.structuredData.back)) {
        console.log(`\n  ${sectionName} (${sectionData.totalFields} fields, ${sectionData.avgConfidence}% confidence)`);
        for (const [fieldName, fieldData] of Object.entries(sectionData.fields)) {
          const displayValue = typeof fieldData.value === 'string' && fieldData.value.length > 40 
            ? fieldData.value.substring(0, 40) + '...' 
            : fieldData.value;
          console.log(`    • ${fieldName}: ${JSON.stringify(displayValue)} (${fieldData.confidence || 'N/A'}%)`);
        }
      }
      
      console.log('\n\n📊 STRUCTURE SUMMARY:');
      console.log(`  Front sections: ${result.structuredData.summary.frontSections}`);
      console.log(`  Back sections: ${result.structuredData.summary.backSections}`);
      console.log(`  Total sections: ${result.structuredData.summary.totalSections}`);
      console.log(`  Front fields: ${result.structuredData.summary.frontFieldCount}`);
      console.log(`  Back fields: ${result.structuredData.summary.backFieldCount}`);
      console.log(`  Total fields: ${result.structuredData.summary.totalFieldCount}`);
      console.log();
    }

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

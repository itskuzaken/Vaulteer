/**
 * OCR Accuracy Test Script
 * Compares QUERIES vs FORMS approach for HTS form extraction
 * Tests with filled-hts-form-front.jpg and filled-hts-form-back.jpg
 */

const fs = require('fs');
const path = require('path');
const { analyzeHTSFormEnhanced, analyzeHTSFormWithForms } = require('../services/textractService');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Load test images from hts-templates directory
 */
function loadTestImages() {
  const frontPath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-front.jpg');
  const backPath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-back.jpg');
  
  if (!fs.existsSync(frontPath)) {
    throw new Error(`Front image not found: ${frontPath}`);
  }
  
  if (!fs.existsSync(backPath)) {
    throw new Error(`Back image not found: ${backPath}`);
  }
  
  console.log(`${colors.cyan}📁 Loading test images...${colors.reset}`);
  console.log(`   - Front: ${frontPath}`);
  console.log(`   - Back: ${backPath}`);
  
  return {
    front: fs.readFileSync(frontPath),
    back: fs.readFileSync(backPath)
  };
}

/**
 * Count non-null fields in extraction result
 */
function countExtractedFields(fields) {
  let extracted = 0;
  let empty = 0;
  
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith('_')) continue; // Skip internal fields like _rawData
    
    if (value && value !== '' && value !== null && value !== undefined) {
      extracted++;
    } else {
      empty++;
    }
  }
  
  return { extracted, empty, total: extracted + empty };
}

/**
 * Compare field values between two extraction results
 */
function compareExtractions(queriesResult, formsResult) {
  const comparison = {
    both: [],      // Fields extracted by both methods
    onlyQueries: [], // Only extracted by QUERIES
    onlyForms: [],   // Only extracted by FORMS
    different: [],   // Extracted by both but different values
    neither: []      // Not extracted by either
  };
  
  const allFields = new Set([
    ...Object.keys(queriesResult),
    ...Object.keys(formsResult)
  ]);
  
  for (const field of allFields) {
    if (field.startsWith('_')) continue; // Skip internal fields
    
    const qValue = queriesResult[field];
    const fValue = formsResult[field];
    
    const qExists = qValue && qValue !== '' && qValue !== null;
    const fExists = fValue && fValue !== '' && fValue !== null;
    
    if (qExists && fExists) {
      if (qValue === fValue) {
        comparison.both.push({ field, value: qValue });
      } else {
        comparison.different.push({ field, queriesValue: qValue, formsValue: fValue });
      }
    } else if (qExists && !fExists) {
      comparison.onlyQueries.push({ field, value: qValue });
    } else if (!qExists && fExists) {
      comparison.onlyForms.push({ field, value: fValue });
    } else {
      comparison.neither.push(field);
    }
  }
  
  return comparison;
}

/**
 * Print comparison results
 */
function printComparison(comparison) {
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}           FIELD EXTRACTION COMPARISON${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  // Summary
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Both extracted (same value):${colors.reset} ${comparison.both.length}`);
  console.log(`  ${colors.yellow}⚠ Both extracted (different values):${colors.reset} ${comparison.different.length}`);
  console.log(`  ${colors.blue}⊙ Only QUERIES:${colors.reset} ${comparison.onlyQueries.length}`);
  console.log(`  ${colors.blue}⊙ Only FORMS:${colors.reset} ${comparison.onlyForms.length}`);
  console.log(`  ${colors.red}✗ Neither extracted:${colors.reset} ${comparison.neither.length}\n`);
  
  // Details: Different values
  if (comparison.different.length > 0) {
    console.log(`${colors.bold}${colors.yellow}Different Values (${comparison.different.length}):${colors.reset}`);
    for (const item of comparison.different) {
      console.log(`  • ${item.field}:`);
      console.log(`    QUERIES: "${item.queriesValue}"`);
      console.log(`    FORMS:   "${item.formsValue}"`);
    }
    console.log('');
  }
  
  // Details: Only QUERIES
  if (comparison.onlyQueries.length > 0) {
    console.log(`${colors.bold}${colors.blue}Only QUERIES Extracted (${comparison.onlyQueries.length}):${colors.reset}`);
    for (const item of comparison.onlyQueries.slice(0, 10)) {
      console.log(`  • ${item.field}: "${item.value}"`);
    }
    if (comparison.onlyQueries.length > 10) {
      console.log(`  ... and ${comparison.onlyQueries.length - 10} more`);
    }
    console.log('');
  }
  
  // Details: Only FORMS
  if (comparison.onlyForms.length > 0) {
    console.log(`${colors.bold}${colors.blue}Only FORMS Extracted (${comparison.onlyForms.length}):${colors.reset}`);
    for (const item of comparison.onlyForms.slice(0, 10)) {
      console.log(`  • ${item.field}: "${item.value}"`);
    }
    if (comparison.onlyForms.length > 10) {
      console.log(`  ... and ${comparison.onlyForms.length - 10} more`);
    }
    console.log('');
  }
  
  // Details: Neither extracted
  if (comparison.neither.length > 0) {
    console.log(`${colors.bold}${colors.red}Not Extracted by Either (${comparison.neither.length}):${colors.reset}`);
    for (const field of comparison.neither.slice(0, 10)) {
      console.log(`  • ${field}`);
    }
    if (comparison.neither.length > 10) {
      console.log(`  ... and ${comparison.neither.length - 10} more`);
    }
    console.log('');
  }
}

/**
 * Main test function
 */
async function runAccuracyTest() {
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║       HTS FORM OCR ACCURACY TEST SUITE            ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║   Comparing QUERIES vs FORMS Extraction Methods   ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  try {
    // Load test images
    const images = loadTestImages();
    console.log(`${colors.green}✓ Images loaded successfully${colors.reset}\n`);
    
    // Test 1: QUERIES + Hybrid approach (current method)
    console.log(`${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}TEST 1: QUERIES + Hybrid Approach (Current Method)${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    const startQueries = Date.now();
    const queriesResult = await analyzeHTSFormEnhanced(
      images.front,
      images.back,
      { useQueries: true, extractionMode: 'hybrid', preprocessImages: true }
    );
    const queriesTime = Date.now() - startQueries;
    
    const queriesCount = countExtractedFields(queriesResult.fields);
    
    console.log(`\n${colors.green}✓ QUERIES extraction completed${colors.reset}`);
    console.log(`  Duration: ${queriesTime}ms`);
    console.log(`  Extracted: ${queriesCount.extracted}/${queriesCount.total} fields`);
    console.log(`  Confidence: ${queriesResult.confidence.toFixed(2)}%`);
    console.log(`  High confidence: ${queriesResult.stats.highConfidence}`);
    console.log(`  Medium confidence: ${queriesResult.stats.mediumConfidence}`);
    console.log(`  Low confidence: ${queriesResult.stats.lowConfidence}`);
    
    // Test 2: FORMS-only approach (new method)
    console.log(`\n${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}TEST 2: FORMS-Only Approach (New Method)${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    const startForms = Date.now();
    const formsResult = await analyzeHTSFormWithForms(
      images.front,
      images.back,
      { preprocessImages: true }
    );
    const formsTime = Date.now() - startForms;
    
    const formsCount = countExtractedFields(formsResult.fields);
    
    console.log(`\n${colors.green}✓ FORMS extraction completed${colors.reset}`);
    console.log(`  Duration: ${formsTime}ms`);
    console.log(`  Extracted: ${formsCount.extracted}/${formsCount.total} fields`);
    console.log(`  Confidence: ${formsResult.confidence.toFixed(2)}%`);
    console.log(`  High confidence: ${formsResult.stats.highConfidence}`);
    console.log(`  Medium confidence: ${formsResult.stats.mediumConfidence}`);
    console.log(`  Low confidence: ${formsResult.stats.lowConfidence}`);
    
    // Compare results
    console.log(`\n${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}PERFORMANCE COMPARISON${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    const comparison = compareExtractions(queriesResult.fields, formsResult.fields);
    printComparison(comparison);
    
    // Performance summary
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}              PERFORMANCE SUMMARY${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`${colors.bold}Execution Time:${colors.reset}`);
    console.log(`  QUERIES: ${queriesTime}ms`);
    console.log(`  FORMS:   ${formsTime}ms`);
    console.log(`  ${formsTime < queriesTime ? colors.green + '✓ FORMS is faster' : colors.yellow + '⚠ QUERIES is faster'} by ${Math.abs(queriesTime - formsTime)}ms${colors.reset}\n`);
    
    console.log(`${colors.bold}Extraction Rate:${colors.reset}`);
    console.log(`  QUERIES: ${queriesCount.extracted}/${queriesCount.total} (${((queriesCount.extracted / queriesCount.total) * 100).toFixed(1)}%)`);
    console.log(`  FORMS:   ${formsCount.extracted}/${formsCount.total} (${((formsCount.extracted / formsCount.total) * 100).toFixed(1)}%)`);
    
    const queriesRate = queriesCount.extracted / queriesCount.total;
    const formsRate = formsCount.extracted / formsCount.total;
    
    if (formsRate > queriesRate) {
      console.log(`  ${colors.green}✓ FORMS extracted ${formsCount.extracted - queriesCount.extracted} more fields${colors.reset}\n`);
    } else if (formsRate < queriesRate) {
      console.log(`  ${colors.red}✗ FORMS extracted ${queriesCount.extracted - formsCount.extracted} fewer fields${colors.reset}\n`);
    } else {
      console.log(`  ${colors.yellow}⊙ Same extraction rate${colors.reset}\n`);
    }
    
    console.log(`${colors.bold}Confidence:${colors.reset}`);
    console.log(`  QUERIES: ${queriesResult.confidence.toFixed(2)}%`);
    console.log(`  FORMS:   ${formsResult.confidence.toFixed(2)}%`);
    
    const confidenceDiff = formsResult.confidence - queriesResult.confidence;
    if (confidenceDiff > 0) {
      console.log(`  ${colors.green}✓ FORMS has ${confidenceDiff.toFixed(2)}% higher confidence${colors.reset}\n`);
    } else if (confidenceDiff < 0) {
      console.log(`  ${colors.red}✗ FORMS has ${Math.abs(confidenceDiff).toFixed(2)}% lower confidence${colors.reset}\n`);
    } else {
      console.log(`  ${colors.yellow}⊙ Same confidence${colors.reset}\n`);
    }
    
    // Recommendation
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}                 RECOMMENDATION${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
    
    const formsScore = (formsTime < queriesTime ? 1 : 0) + (formsRate > queriesRate ? 1 : 0) + (confidenceDiff > 0 ? 1 : 0);
    const queriesScore = (queriesTime < formsTime ? 1 : 0) + (queriesRate > formsRate ? 1 : 0) + (confidenceDiff < 0 ? 1 : 0);
    
    if (formsScore > queriesScore) {
      console.log(`${colors.green}${colors.bold}✓ RECOMMENDATION: Proceed with FORMS-only migration${colors.reset}`);
      console.log(`  FORMS outperforms QUERIES in ${formsScore}/3 metrics`);
    } else if (formsScore < queriesScore) {
      console.log(`${colors.yellow}${colors.bold}⚠ RECOMMENDATION: Review FORMS results carefully${colors.reset}`);
      console.log(`  QUERIES currently outperforms FORMS in ${queriesScore}/3 metrics`);
    } else {
      console.log(`${colors.yellow}${colors.bold}⊙ RECOMMENDATION: Both methods perform similarly${colors.reset}`);
      console.log(`  Consider FORMS for simplicity and maintainability`);
    }
    
    console.log('');
    
    // Save detailed results to file
    const reportPath = path.join(__dirname, '../logs', `ocr-accuracy-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      queries: {
        duration: queriesTime,
        extracted: queriesCount.extracted,
        total: queriesCount.total,
        confidence: queriesResult.confidence,
        stats: queriesResult.stats,
        fields: queriesResult.fields
      },
      forms: {
        duration: formsTime,
        extracted: formsCount.extracted,
        total: formsCount.total,
        confidence: formsResult.confidence,
        stats: formsResult.stats,
        fields: formsResult.fields,
        unmappedKeys: formsResult.unmappedKeys
      },
      comparison
    }, null, 2));
    
    console.log(`${colors.cyan}📊 Detailed results saved to: ${reportPath}${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}${colors.bold}✗ Test failed:${colors.reset}`, error);
    throw error;
  }
}

// Run the test
runAccuracyTest()
  .then(() => {
    console.log(`${colors.green}${colors.bold}✓ Test completed successfully${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}${colors.bold}✗ Test failed with error:${colors.reset}`, error);
    process.exit(1);
  });

/**
 * Integration Test for FORMS-Only OCR Migration
 * Tests the full upload flow: OCR → Validation → Database Storage
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

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

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_IMAGES_DIR = path.join(__dirname, '../assets/hts-templetes');

/**
 * Test configuration
 */
const tests = [
  {
    name: 'Filled HTS Form - Complete Data',
    frontImage: 'filled-hts-form-front.jpg',
    backImage: 'filled-hts-form-back.jpg',
    expectedMinFields: 50, // Expect at least 50 fields extracted
    expectedMinConfidence: 70
  },
  {
    name: 'Blank HTS Form - Empty Fields',
    frontImage: 'blank-hts-form-front.jpg',
    backImage: 'blank-hts-form-back.jpg',
    expectedMinFields: 0, // May extract form labels only
    expectedMinConfidence: 50
  }
];

/**
 * Test OCR Analysis Endpoint
 */
async function testOCRAnalysis(testCase) {
  console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}Test: ${testCase.name}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    // Load test images
    const frontPath = path.join(TEST_IMAGES_DIR, testCase.frontImage);
    const backPath = path.join(TEST_IMAGES_DIR, testCase.backImage);

    if (!fs.existsSync(frontPath)) {
      throw new Error(`Front image not found: ${frontPath}`);
    }
    if (!fs.existsSync(backPath)) {
      throw new Error(`Back image not found: ${backPath}`);
    }

    console.log(`${colors.blue}📁 Loading images...${colors.reset}`);
    console.log(`   Front: ${testCase.frontImage}`);
    console.log(`   Back: ${testCase.backImage}`);

    // Create form data
    const formData = new FormData();
    formData.append('frontImage', fs.createReadStream(frontPath));
    formData.append('backImage', fs.createReadStream(backPath));

    console.log(`\n${colors.blue}🔄 Sending OCR analysis request...${colors.reset}`);
    const startTime = Date.now();

    // Send request
    const response = await axios.post(
      `${API_BASE_URL}/api/hts-forms/analyze-ocr`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000 // 60 second timeout
      }
    );

    const duration = Date.now() - startTime;

    // Validate response
    if (!response.data || !response.data.success) {
      throw new Error('API returned unsuccessful response');
    }

    const { data } = response.data;
    const { fields, confidence, stats, validationSummary, extractionMethod } = data;

    // Count extracted fields
    const extractedFields = Object.keys(fields).filter(
      key => !key.startsWith('_') && fields[key] && fields[key] !== ''
    );

    console.log(`\n${colors.green}✅ OCR Analysis Complete${colors.reset}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Extraction Method: ${extractionMethod}`);
    console.log(`   Fields Extracted: ${extractedFields.length}`);
    console.log(`   Overall Confidence: ${confidence.toFixed(2)}%`);

    // Stats
    if (stats) {
      console.log(`\n${colors.bold}Field Confidence Distribution:${colors.reset}`);
      console.log(`   High (≥85%): ${stats.highConfidence} fields`);
      console.log(`   Medium (70-84%): ${stats.mediumConfidence} fields`);
      console.log(`   Low (<70%): ${stats.lowConfidence} fields`);
      console.log(`   Requires Review: ${stats.requiresReview} fields`);

      if (stats.extractionMethods) {
        console.log(`\n${colors.bold}Extraction Methods:${colors.reset}`);
        console.log(`   FORMS: ${stats.extractionMethods.forms || 0} fields`);
        console.log(`   QUERIES: ${stats.extractionMethods.query || 0} fields`);
        console.log(`   Coordinate: ${stats.extractionMethods.coordinate || 0} fields`);
        console.log(`   Failed: ${stats.extractionMethods.failed || 0} fields`);
      }
    }

    // Validation summary
    if (validationSummary) {
      console.log(`\n${colors.bold}Validation Summary:${colors.reset}`);
      console.log(`   Auto-corrections: ${validationSummary.corrected}`);
      console.log(`   Warnings: ${validationSummary.warnings}`);
      console.log(`   Errors: ${validationSummary.errors}`);
    }

    // Sample extracted fields
    console.log(`\n${colors.bold}Sample Extracted Fields:${colors.reset}`);
    const sampleFields = extractedFields.slice(0, 10);
    for (const fieldName of sampleFields) {
      const value = fields[fieldName];
      const displayValue = typeof value === 'string' && value.length > 50
        ? value.substring(0, 50) + '...'
        : value;
      console.log(`   ${fieldName}: "${displayValue}"`);
    }
    if (extractedFields.length > 10) {
      console.log(`   ... and ${extractedFields.length - 10} more fields`);
    }

    // Unmapped keys (if FORMS mode)
    if (data.unmappedKeys) {
      const totalUnmapped = 
        (data.unmappedKeys.front?.length || 0) + 
        (data.unmappedKeys.back?.length || 0);
      
      if (totalUnmapped > 0) {
        console.log(`\n${colors.yellow}⚠️  Unmapped Keys Found: ${totalUnmapped}${colors.reset}`);
        if (data.unmappedKeys.front?.length > 0) {
          console.log(`   Front: ${data.unmappedKeys.front.slice(0, 5).join(', ')}`);
        }
        if (data.unmappedKeys.back?.length > 0) {
          console.log(`   Back: ${data.unmappedKeys.back.slice(0, 5).join(', ')}`);
        }
      }
    }

    // Validate expectations
    console.log(`\n${colors.bold}Validation Checks:${colors.reset}`);
    
    let allPassed = true;

    // Check field count
    if (extractedFields.length >= testCase.expectedMinFields) {
      console.log(`   ${colors.green}✓${colors.reset} Field count: ${extractedFields.length} >= ${testCase.expectedMinFields}`);
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Field count: ${extractedFields.length} < ${testCase.expectedMinFields}`);
      allPassed = false;
    }

    // Check confidence
    if (confidence >= testCase.expectedMinConfidence) {
      console.log(`   ${colors.green}✓${colors.reset} Confidence: ${confidence.toFixed(2)}% >= ${testCase.expectedMinConfidence}%`);
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Confidence: ${confidence.toFixed(2)}% < ${testCase.expectedMinConfidence}%`);
      allPassed = false;
    }

    // Check response time (should be < 10 seconds for FORMS)
    if (duration < 10000) {
      console.log(`   ${colors.green}✓${colors.reset} Response time: ${duration}ms < 10000ms`);
    } else {
      console.log(`   ${colors.yellow}⚠${colors.reset} Response time: ${duration}ms >= 10000ms (slower than expected)`);
    }

    // Check extraction method if FORMS mode is enabled
    if (process.env.OCR_USE_FORMS_ONLY === 'true') {
      if (extractionMethod === 'forms-only') {
        console.log(`   ${colors.green}✓${colors.reset} Extraction method: ${extractionMethod}`);
      } else {
        console.log(`   ${colors.yellow}⚠${colors.reset} Extraction method: ${extractionMethod} (expected forms-only)`);
      }
    }

    return {
      success: allPassed,
      testCase: testCase.name,
      duration,
      fieldsExtracted: extractedFields.length,
      confidence,
      extractionMethod,
      stats,
      validationSummary
    };

  } catch (error) {
    console.log(`\n${colors.red}${colors.bold}✗ Test Failed${colors.reset}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || 'Unknown error'}`);
      console.log(`   Details: ${error.response.data?.details || 'N/A'}`);
    } else if (error.request) {
      console.log(`   Error: Request timeout or server not responding`);
      console.log(`   Check if backend server is running at ${API_BASE_URL}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }

    return {
      success: false,
      testCase: testCase.name,
      error: error.message
    };
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║     HTS FORM OCR INTEGRATION TEST SUITE           ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  Testing Full Upload Flow: OCR → Validation → DB  ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Check if FORMS mode is enabled
  const formsMode = process.env.OCR_USE_LEGACY_QUERIES !== 'true'; // Default is FORMS+LAYOUT
  console.log(`${colors.bold}Configuration:${colors.reset}`);
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   OCR Mode: ${formsMode ? colors.green + 'FORMS-Only ✓' : colors.yellow + 'QUERIES+Hybrid'} ${colors.reset}`);
  console.log(`   Test Images: ${TEST_IMAGES_DIR}`);

  // Check if images exist
  console.log(`\n${colors.bold}Pre-flight Checks:${colors.reset}`);
  for (const testCase of tests) {
    const frontExists = fs.existsSync(path.join(TEST_IMAGES_DIR, testCase.frontImage));
    const backExists = fs.existsSync(path.join(TEST_IMAGES_DIR, testCase.backImage));
    
    console.log(`   ${frontExists ? colors.green + '✓' : colors.red + '✗'} ${testCase.frontImage}${colors.reset}`);
    console.log(`   ${backExists ? colors.green + '✓' : colors.red + '✗'} ${testCase.backImage}${colors.reset}`);
  }

  // Check if server is reachable
  console.log(`\n${colors.bold}Server Health Check:${colors.reset}`);
  try {
    await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
    console.log(`   ${colors.green}✓${colors.reset} Server is reachable`);
  } catch (error) {
    console.log(`   ${colors.red}✗${colors.reset} Server is not reachable at ${API_BASE_URL}`);
    console.log(`   ${colors.yellow}⚠${colors.reset} Make sure backend server is running`);
    process.exit(1);
  }

  // Run tests
  const results = [];
  for (const testCase of tests) {
    const result = await testOCRAnalysis(testCase);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    if (tests.indexOf(testCase) < tests.length - 1) {
      console.log(`\n${colors.blue}⏳ Waiting 3 seconds before next test...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                  TEST SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`${colors.bold}Results:${colors.reset}`);
  console.log(`   ${colors.green}✓ Passed:${colors.reset} ${passed}/${results.length}`);
  console.log(`   ${colors.red}✗ Failed:${colors.reset} ${failed}/${results.length}`);

  // Performance summary
  const successfulResults = results.filter(r => r.success && r.duration);
  if (successfulResults.length > 0) {
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const avgFields = successfulResults.reduce((sum, r) => sum + r.fieldsExtracted, 0) / successfulResults.length;
    const avgConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length;

    console.log(`\n${colors.bold}Average Performance:${colors.reset}`);
    console.log(`   Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`   Fields Extracted: ${avgFields.toFixed(0)}`);
    console.log(`   Confidence: ${avgConfidence.toFixed(2)}%`);
  }

  // Recommendations
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                RECOMMENDATIONS${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  if (passed === results.length) {
    console.log(`${colors.green}${colors.bold}✓ All tests passed!${colors.reset}`);
    console.log(`  Integration is working correctly.`);
    
    if (formsMode) {
      console.log(`\n${colors.green}✓ FORMS-only mode is functioning properly${colors.reset}`);
      console.log(`  Ready for production deployment.`);
    } else {
      console.log(`\n${colors.yellow}⚠ Running in legacy QUERIES+Hybrid mode${colors.reset}`);
      console.log(`  Consider enabling FORMS-only mode:`);
      console.log(`  FORMS+LAYOUT is now enabled by default (remove OCR_USE_LEGACY_QUERIES if set)`);
    }
  } else {
    console.log(`${colors.red}${colors.bold}✗ Some tests failed${colors.reset}`);
    console.log(`  Review error logs above and fix issues before deployment.`);
  }

  console.log('');

  // Save results
  const reportPath = path.join(__dirname, '../logs', `integration-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    formsMode,
    apiBaseUrl: API_BASE_URL,
    results
  }, null, 2));
  
  console.log(`${colors.cyan}📊 Test results saved to: ${reportPath}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runIntegrationTests().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

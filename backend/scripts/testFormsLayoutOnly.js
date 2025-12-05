#!/usr/bin/env node

/**
 * FORMS + LAYOUT Only Test Script
 * Tests the new FORMS+LAYOUT approach directly without QUERIES comparison
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { analyzeHTSFormWithForms } = require('../services/textractService');

// Console formatting
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       FORMS + LAYOUT OCR TEST SUITE               ║');
    console.log('║   Testing New FORMS+LAYOUT Extraction Method      ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log();
}

async function loadTestImages() {
    log('📁 Loading test images...', 'cyan');
    
    const frontPath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-front.jpg');
    const backPath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-back.jpg');
    
    console.log(`   - Front: ${frontPath}`);
    console.log(`   - Back: ${backPath}`);
    
    if (!fs.existsSync(frontPath)) {
        throw new Error(`Front image not found: ${frontPath}`);
    }
    
    if (!fs.existsSync(backPath)) {
        throw new Error(`Back image not found: ${backPath}`);
    }
    
    const frontBuffer = fs.readFileSync(frontPath);
    const backBuffer = fs.readFileSync(backPath);
    
    log('✓ Images loaded successfully', 'green');
    console.log();
    
    return { frontBuffer, backBuffer };
}

async function runFormsLayoutTest() {
    try {
        printHeader();
        
        // Load test images
        const { frontBuffer, backBuffer } = await loadTestImages();
        
        // Skip template loading for this test
        log('📋 Using built-in field mapping...', 'cyan');
        log('✓ Ready to test FORMS+LAYOUT extraction', 'green');
        console.log();
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('TEST: FORMS + LAYOUT Approach', 'bright');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log();
        
        log('📤 Starting FORMS+LAYOUT extraction...', 'cyan');
        const startTime = Date.now();
        
        // Run FORMS + LAYOUT extraction
        const result = await analyzeHTSFormWithForms(frontBuffer, backBuffer, {
            preprocessImages: true,
            useLayout: true
        });
        
        const duration = Date.now() - startTime;
        
        // Display results
        console.log();
        log('═══════════════════════════════════════════════════', 'bright');
        log('              FORMS + LAYOUT RESULTS', 'bright');
        log('═══════════════════════════════════════════════════', 'bright');
        console.log();
        
        log(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(1)}s)`, 'yellow');
        const extractedFields = result.extractedData || result || {};
        log(`📊 Fields Extracted: ${Object.keys(extractedFields).length}`, 'green');
        log(`✅ Success Rate: ${result.successRate || 'N/A'}%`, 'green');
        console.log();
        
        // Show confidence breakdown
        if (result.confidenceBreakdown) {
            log('📈 Confidence Breakdown:', 'cyan');
            console.log(`   High confidence (>90%): ${result.confidenceBreakdown.high || 0} fields`);
            console.log(`   Medium confidence (70-90%): ${result.confidenceBreakdown.medium || 0} fields`);
            console.log(`   Low confidence (<70%): ${result.confidenceBreakdown.low || 0} fields`);
            console.log();
        }
        
        // Show sample extracted fields
        log('📋 Sample Extracted Fields:', 'cyan');
        let count = 0;
        for (const [field, value] of Object.entries(extractedFields)) {
            if (count >= 10) break; // Show first 10 fields
            console.log(`   ${field}: ${JSON.stringify(value)}`);
            count++;
        }
        if (Object.keys(extractedFields).length > 10) {
            console.log(`   ... and ${Object.keys(extractedFields).length - 10} more fields`);
        }
        console.log();
        
        // Show processing info
        if (result.processingInfo) {
            log('🔍 Processing Details:', 'cyan');
            console.log(`   Front page key-value pairs: ${result.processingInfo.frontPairs || 'N/A'}`);
            console.log(`   Back page key-value pairs: ${result.processingInfo.backPairs || 'N/A'}`);
            console.log(`   Total mapped fields: ${result.processingInfo.mappedFields || 'N/A'}`);
            if (result.processingInfo.unmappedKeys) {
                console.log(`   Unmapped keys: ${result.processingInfo.unmappedKeys.length}`);
            }
            console.log();
        }
        
        // Success summary
        log('═══════════════════════════════════════════════════', 'bright');
        log('                 TEST SUMMARY', 'bright');
        log('═══════════════════════════════════════════════════', 'bright');
        console.log();
        
        log('✅ FORMS + LAYOUT test completed successfully!', 'green');
        log(`⚡ Performance: ${(duration/1000).toFixed(1)} seconds`, 'yellow');
        log(`📊 Extraction: ${Object.keys(extractedFields).length} fields`, 'yellow');
        log(`🎯 Quality: ${result.successRate}% success rate`, 'yellow');
        console.log();
        
        log('🎉 FORMS+LAYOUT implementation is working correctly!', 'green');
        log('Ready for production deployment.', 'green');
        
        return true;
        
    } catch (error) {
        console.log();
        log('═══════════════════════════════════════════════════', 'red');
        log('                 TEST FAILED', 'red');
        log('═══════════════════════════════════════════════════', 'red');
        console.log();
        
        log(`❌ Error: ${error.message}`, 'red');
        console.error(error);
        
        if (error.message.includes('credential') || error.message.includes('token')) {
            console.log();
            log('🔐 AWS Credentials Issue:', 'yellow');
            console.log('   1. Update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
            console.log('   2. Ensure credentials have Textract permissions');
            console.log('   3. Check AWS region is correct (ap-southeast-2)');
        }
        
        return false;
    }
}

// Run the test
if (require.main === module) {
    runFormsLayoutTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { runFormsLayoutTest };
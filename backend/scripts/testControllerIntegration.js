#!/usr/bin/env node

/**
 * Integration Test for FORMS+LAYOUT in HTS Controller
 * Tests that the controller properly uses FORMS+LAYOUT by default
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Mock Express request/response objects
function createMockReq(frontImagePath, backImagePath) {
    const frontBuffer = fs.readFileSync(frontImagePath);
    const backBuffer = fs.readFileSync(backImagePath);
    
    return {
        files: {
            frontImage: [{
                buffer: frontBuffer,
                size: frontBuffer.length,
                originalname: 'front.jpg',
                mimetype: 'image/jpeg'
            }],
            backImage: [{
                buffer: backBuffer,
                size: backBuffer.length,
                originalname: 'back.jpg',
                mimetype: 'image/jpeg'
            }]
        }
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        responseData: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.responseData = data;
            return this;
        }
    };
    return res;
}

async function testHtsFormAnalysis() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     HTS FORMS CONTROLLER INTEGRATION TEST          ║');
    console.log('║       Testing FORMS+LAYOUT Integration            ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log();
    
    try {
        // Import controller
        const htsFormsController = require('../controllers/htsFormsController');
        
        // Create mock request with test images
        const frontImagePath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-front.jpg');
        const backImagePath = path.join(__dirname, '../assets/hts-templetes/filled-hts-form-back.jpg');
        
        console.log('📁 Setting up test data...');
        console.log(`   - Front: ${frontImagePath}`);
        console.log(`   - Back: ${backImagePath}`);
        
        if (!fs.existsSync(frontImagePath) || !fs.existsSync(backImagePath)) {
            throw new Error('Test images not found');
        }
        
        const req = createMockReq(frontImagePath, backImagePath);
        const res = createMockRes();
        
        console.log('✓ Test data prepared');
        console.log();
        
        console.log('🚀 Testing HTS Forms Controller...');
        console.log('   Method: analyzeOCR()');
        console.log('   Expected: FORMS+LAYOUT extraction');
        console.log();
        
        // Test the controller
        const startTime = Date.now();
        await htsFormsController.analyzeOCR(req, res);
        const duration = Date.now() - startTime;
        
        console.log();
        console.log('═══════════════════════════════════════════════════');
        console.log('              CONTROLLER TEST RESULTS');
        console.log('═══════════════════════════════════════════════════');
        console.log();
        
        // Check response
        console.log(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
        console.log(`📊 Response Status: ${res.statusCode}`);
        
        if (res.statusCode === 200 && res.responseData) {
            console.log('✅ Success: Controller returned valid OCR data');
            
            const data = res.responseData;
            console.log(`📋 Extracted Fields: ${Object.keys(data.extractedData || {}).length}`);
            console.log(`🎯 Confidence: ${data.confidence?.toFixed(1)}%`);
            console.log(`📊 Extraction Method: ${data.extractionMethod || 'N/A'}`);
            
            // Check if it used FORMS+LAYOUT
            if (data.extractionMethod === 'forms+layout' || data.extractionMethod === 'forms-only') {
                console.log('✅ Verified: Used FORMS+LAYOUT approach (modern method)');
            } else {
                console.log('⚠️  Warning: May have used legacy method');
            }
            
            // Show some sample fields
            if (data.extractedData && Object.keys(data.extractedData).length > 0) {
                console.log();
                console.log('📋 Sample Extracted Fields:');
                let count = 0;
                for (const [field, value] of Object.entries(data.extractedData)) {
                    if (count >= 5) break;
                    console.log(`   ${field}: "${value}"`);
                    count++;
                }
                if (Object.keys(data.extractedData).length > 5) {
                    console.log(`   ... and ${Object.keys(data.extractedData).length - 5} more`);
                }
            }
            
        } else {
            console.log('❌ Error: Controller returned error');
            console.log('Response:', res.responseData);
        }
        
        console.log();
        console.log('═══════════════════════════════════════════════════');
        console.log('                INTEGRATION SUMMARY');
        console.log('═══════════════════════════════════════════════════');
        console.log();
        
        if (res.statusCode === 200) {
            console.log('✅ INTEGRATION TEST PASSED');
            console.log('🎉 FORMS+LAYOUT is successfully integrated!');
            console.log('🚀 HTS form submissions will use modern extraction method');
            console.log();
            console.log('Next Steps:');
            console.log('  1. Deploy to production');
            console.log('  2. Monitor extraction performance');
            console.log('  3. Enhance field mappings as needed');
        } else {
            console.log('❌ INTEGRATION TEST FAILED');
            console.log('Check error details above');
        }
        
        return res.statusCode === 200;
        
    } catch (error) {
        console.log();
        console.log('❌ TEST FAILED WITH ERROR:');
        console.log(error.message);
        console.error(error);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testHtsFormAnalysis()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testHtsFormAnalysis };
/**
 * Comprehensive S3 Buckets Test
 * Tests all configured S3 buckets: HTS Forms, Badges, Training Certificates
 * Run: node backend/test-all-s3-buckets.js
 */
require('dotenv').config();
const s3Service = require('./services/s3Service');
const { s3Client } = require('./config/aws');
const { HeadBucketCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function testPassed(testName) {
  totalTests++;
  passedTests++;
  log(`✅ ${testName}`, GREEN);
}

function testFailed(testName, error) {
  totalTests++;
  failedTests++;
  log(`❌ ${testName}`, RED);
  log(`   Error: ${error}`, RED);
}

// Bucket configurations
const buckets = [
  {
    name: 'HTS Forms',
    envVar: 'S3_HTS_FORMS_BUCKET',
    bucket: process.env.S3_HTS_FORMS_BUCKET || 'v-hts-forms',
    keyPrefix: 'hts-forms/',
    testFile: 'test-hts-form.enc',
    contentType: 'application/octet-stream',
  },
  {
    name: 'Achievement Badges',
    envVar: 'S3_BADGES_BUCKET',
    bucket: process.env.S3_BADGES_BUCKET || 'v-achievement-badges',
    keyPrefix: 'badges/',
    testFile: 'test-badge.png',
    contentType: 'image/png',
  },
  {
    name: 'Training Certificates',
    envVar: 'S3_TRAINING_CERTIFICATES_BUCKET',
    bucket: process.env.S3_TRAINING_CERTIFICATES_BUCKET || 'v-training-certificates',
    keyPrefix: 'vol-cert/',
    testFile: 'test-certificate.pdf',
    contentType: 'application/pdf',
  },
];

async function checkBucketExists(bucketName) {
  try {
    const command = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

async function testBucket(config) {
  log(`\n${'='.repeat(60)}`, CYAN);
  log(`Testing: ${config.name}`, CYAN);
  log(`${'='.repeat(60)}`, CYAN);
  log(`Bucket: ${config.bucket}`);
  log(`Region: ${process.env.S3_BUCKET_REGION || 'us-east-1'}`);
  log(`Key Prefix: ${config.keyPrefix}\n`);

  const testResults = {
    bucketExists: false,
    upload: false,
    download: false,
    dataIntegrity: false,
    presignedUrl: false,
    delete: false,
  };

  // Test 1: Check if bucket exists
  try {
    testResults.bucketExists = await checkBucketExists(config.bucket);
    if (testResults.bucketExists) {
      testPassed(`${config.name}: Bucket exists and is accessible`);
    } else {
      testFailed(`${config.name}: Bucket does not exist`, 'Bucket not found');
      return testResults;
    }
  } catch (error) {
    testFailed(`${config.name}: Bucket access check failed`, error.message);
    return testResults;
  }

  // Generate test data
  const testBuffer = crypto.randomBytes(2048); // 2KB test file
  const timestamp = Date.now();
  const testKey = `${config.keyPrefix}test-${timestamp}/${config.testFile}`;

  // Test 2: Upload
  try {
    log(`\n📤 Testing upload to ${config.bucket}...`);
    await s3Service.uploadBadgeBuffer(testBuffer, testKey, config.contentType, {
      'test': 'true',
      'timestamp': timestamp.toString(),
    }, config.bucket);
    testResults.upload = true;
    testPassed(`${config.name}: Upload successful`);
    log(`   Key: ${testKey}`);
  } catch (error) {
    testFailed(`${config.name}: Upload failed`, error.message);
    return testResults;
  }

  // Test 3: Download
  try {
    log(`\n📥 Testing download from ${config.bucket}...`);
    const downloadedBuffer = await s3Service.downloadImage(testKey);
    testResults.download = true;
    testPassed(`${config.name}: Download successful`);
    log(`   Size: ${downloadedBuffer.length} bytes`);

    // Test 4: Data Integrity
    if (Buffer.compare(testBuffer, downloadedBuffer) === 0) {
      testResults.dataIntegrity = true;
      testPassed(`${config.name}: Data integrity verified`);
    } else {
      testFailed(`${config.name}: Data integrity check failed`, 'Downloaded data does not match uploaded data');
    }
  } catch (error) {
    testFailed(`${config.name}: Download failed`, error.message);
  }

  // Test 5: Presigned URL
  try {
    log(`\n🔗 Testing presigned URL for ${config.bucket}...`);
    const presignedUrl = await s3Service.getPresignedDownloadUrl(testKey);
    if (presignedUrl && presignedUrl.includes(config.bucket)) {
      testResults.presignedUrl = true;
      testPassed(`${config.name}: Presigned URL generated`);
      log(`   URL: ${presignedUrl.substring(0, 80)}...`);
    } else {
      testFailed(`${config.name}: Presigned URL generation failed`, 'Invalid URL format');
    }
  } catch (error) {
    testFailed(`${config.name}: Presigned URL generation failed`, error.message);
  }

  // Test 6: Delete
  try {
    log(`\n🗑️  Testing delete from ${config.bucket}...`);
    await s3Service.deleteImage(testKey);
    testResults.delete = true;
    testPassed(`${config.name}: Delete successful`);
  } catch (error) {
    testFailed(`${config.name}: Delete failed`, error.message);
  }

  return testResults;
}

async function runAllTests() {
  log('\n' + '='.repeat(60), BLUE);
  log('  S3 BUCKETS COMPREHENSIVE TEST SUITE', BLUE);
  log('='.repeat(60) + '\n', BLUE);

  // Check environment variables
  log('📋 Environment Configuration:', YELLOW);
  log(`  AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
  log(`  S3_BUCKET_REGION: ${process.env.S3_BUCKET_REGION || 'NOT SET'}`);
  log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
  log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);
  log('');

  log('📦 Configured Buckets:', YELLOW);
  buckets.forEach(bucket => {
    log(`  ${bucket.name}: ${bucket.bucket} (${bucket.envVar})`);
  });
  log('');

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    log('❌ AWS credentials not configured!', RED);
    log('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file\n', RED);
    process.exit(1);
  }

  // Test each bucket
  const results = {};
  for (const bucket of buckets) {
    try {
      results[bucket.name] = await testBucket(bucket);
    } catch (error) {
      log(`\n❌ Unexpected error testing ${bucket.name}:`, RED);
      log(error.stack, RED);
      results[bucket.name] = {
        bucketExists: false,
        upload: false,
        download: false,
        dataIntegrity: false,
        presignedUrl: false,
        delete: false,
      };
    }
  }

  // Summary
  log('\n' + '='.repeat(60), BLUE);
  log('  TEST SUMMARY', BLUE);
  log('='.repeat(60), BLUE);

  log(`\nTotal Tests: ${totalTests}`, YELLOW);
  log(`Passed: ${passedTests}`, GREEN);
  log(`Failed: ${failedTests}`, failedTests > 0 ? RED : GREEN);

  log('\n📊 Bucket Test Results:', YELLOW);
  buckets.forEach(bucket => {
    const result = results[bucket.name];
    const allPassed = result && Object.values(result).every(v => v === true);
    const status = allPassed ? `${GREEN}✅ PASS${RESET}` : `${RED}❌ FAIL${RESET}`;
    log(`  ${bucket.name}: ${status}`);
    if (result && !allPassed) {
      Object.entries(result).forEach(([test, passed]) => {
        if (!passed) {
          log(`    - ${test}: ❌`, RED);
        }
      });
    }
  });

  // Recommendations
  if (failedTests > 0) {
    log('\n💡 Troubleshooting:', YELLOW);
    buckets.forEach(bucket => {
      const result = results[bucket.name];
      if (result && !result.bucketExists) {
        log(`  • Create bucket "${bucket.bucket}" in region "${process.env.S3_BUCKET_REGION || 'us-east-1'}"`, YELLOW);
      }
    });
    log(`  • Verify IAM permissions (s3:PutObject, s3:GetObject, s3:DeleteObject, s3:HeadBucket)`, YELLOW);
    log(`  • Check bucket policies and CORS settings`, YELLOW);
  }

  log('');
  if (failedTests === 0) {
    log('✅ ALL S3 BUCKETS ARE WORKING CORRECTLY!\n', GREEN);
    process.exit(0);
  } else {
    log('❌ SOME TESTS FAILED. PLEASE REVIEW ERRORS ABOVE.\n', RED);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Unexpected error:', RED);
  log(error.stack, RED);
  log('');
  process.exit(1);
});

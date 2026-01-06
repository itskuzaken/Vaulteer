/**
 * Test script for Valid ID upload functionality
 * Tests S3 upload without database connection
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const s3Service = require('./services/s3Service');

async function testValidIdUpload() {
  console.log('\n=== Testing Valid ID Upload to S3 ===\n');

  try {
    // Create a test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    console.log('✓ Created test image buffer (1x1 PNG, 95 bytes)');

    // Generate S3 key
    const userId = 'test-user-123';
    const timestamp = Date.now();
    const s3Key = `valid-ids/${userId}/${timestamp}-valid-id.png`;

    console.log(`✓ Generated S3 key: ${s3Key}`);

    // Test S3 upload
    console.log('\n📤 Uploading to S3...');
    await s3Service.uploadBadgeBuffer(testImageBuffer, s3Key, 'image/png');

    console.log('✅ SUCCESS: Valid ID uploaded to S3');
    console.log(`   Bucket: ${s3Service.TRAINING_CERTIFICATES_BUCKET || 'v-training-certificates'}`);
    console.log(`   Key: ${s3Key}`);
    console.log(`   Size: ${testImageBuffer.length} bytes`);

    // Test presigned URL generation
    console.log('\n🔗 Generating presigned download URL...');
    const downloadUrl = await s3Service.getPresignedDownloadUrl(s3Key);
    
    console.log('✅ SUCCESS: Presigned URL generated');
    console.log(`   URL: ${downloadUrl.substring(0, 100)}...`);
    console.log(`   Expires in: 3600 seconds (1 hour)`);

    // Test deletion
    console.log('\n🗑️  Deleting test file from S3...');
    await s3Service.deleteImage(s3Key);
    
    console.log('✅ SUCCESS: Valid ID deleted from S3');

    console.log('\n=== All Valid ID S3 Tests Passed ✅ ===\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.code === 'CredentialsError') {
      console.error('\n💡 Fix: Check AWS credentials in .env file:');
      console.error('   - AWS_ACCESS_KEY_ID');
      console.error('   - AWS_SECRET_ACCESS_KEY');
      console.error('   - AWS_REGION');
    } else if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
      console.error('\n💡 Fix: Ensure IAM permissions include:');
      console.error('   - s3:PutObject');
      console.error('   - s3:GetObject');
      console.error('   - s3:DeleteObject');
      console.error(`   For bucket: ${s3Service.TRAINING_CERTIFICATES_BUCKET || 'v-training-certificates'}`);
    } else if (error.name === 'NoSuchBucket') {
      console.error('\n💡 Fix: Create the S3 bucket:');
      console.error(`   Bucket name: ${s3Service.TRAINING_CERTIFICATES_BUCKET || 'v-training-certificates'}`);
    }

    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run test
testValidIdUpload();

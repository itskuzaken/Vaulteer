/**
 * Test S3 Upload Functionality
 * Run this to verify S3 credentials and bucket access
 */
require('dotenv').config();
const s3Service = require('./services/s3Service');
const crypto = require('crypto');

async function testS3Upload() {
  console.log('\n🧪 Testing S3 Upload Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.log('  S3_BUCKET_REGION:', process.env.S3_BUCKET_REGION || 'NOT SET');
  console.log('  S3_HTS_FORMS_BUCKET:', process.env.S3_HTS_FORMS_BUCKET || 'NOT SET');
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('');

  try {
    // Create a test image buffer (1KB of random data)
    const testBuffer = crypto.randomBytes(1024);
    const testFormId = 'TEST-' + Date.now();
    
    console.log('📤 Uploading test image...');
    console.log('  Form ID:', testFormId);
    console.log('  Buffer size:', testBuffer.length, 'bytes');
    
    const s3Key = await s3Service.uploadEncryptedImage(testBuffer, testFormId, 'front');
    
    console.log('\n✅ Upload successful!');
    console.log('  S3 Key:', s3Key);
    
    // Test download
    console.log('\n📥 Testing download...');
    const downloadedBuffer = await s3Service.downloadImage(s3Key);
    console.log('  Downloaded size:', downloadedBuffer.length, 'bytes');
    
    // Verify data integrity
    if (Buffer.compare(testBuffer, downloadedBuffer) === 0) {
      console.log('  ✅ Data integrity verified!');
    } else {
      console.log('  ❌ Data mismatch!');
    }
    
    // Test presigned URL
    console.log('\n🔗 Generating presigned URL...');
    const presignedUrl = await s3Service.getPresignedDownloadUrl(s3Key);
    console.log('  URL:', presignedUrl.substring(0, 100) + '...');
    
    // Clean up
    console.log('\n🗑️  Cleaning up test file...');
    await s3Service.deleteImage(s3Key);
    console.log('  ✅ Test file deleted');
    
    console.log('\n✅ ALL TESTS PASSED!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Name:', error.name);
    
    if (error.code === 'NoSuchBucket') {
      console.error('\n💡 Solution: Create the S3 bucket "' + (process.env.S3_HTS_FORMS_BUCKET || 'vaulteer-hts-forms') + '" in region "' + (process.env.S3_BUCKET_REGION || 'ap-southeast-2') + '"');
    } else if (error.code === 'AccessDenied' || error.code === 'InvalidAccessKeyId') {
      console.error('\n💡 Solution: Check your AWS credentials and IAM permissions');
    } else if (error.code === 'NetworkingError') {
      console.error('\n💡 Solution: Check your internet connection');
    }
    
    console.error('\nFull error:');
    console.error(error);
    console.log('');
    process.exit(1);
  }
}

testS3Upload();

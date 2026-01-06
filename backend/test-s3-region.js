/**
 * Test S3 Client Region Configuration
 * Verifies that the S3 client is configured with the correct region
 */
require('dotenv').config();
const { s3Client } = require('./config/aws');

console.log('\n🔍 S3 Client Configuration Test\n');

console.log('Environment Variables:');
console.log(`  AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
console.log(`  S3_BUCKET_REGION: ${process.env.S3_BUCKET_REGION || 'NOT SET'}`);

console.log('\nConfigured Buckets:');
console.log(`  S3_HTS_FORMS_BUCKET: ${process.env.S3_HTS_FORMS_BUCKET || 'NOT SET'}`);
console.log(`  S3_BADGES_BUCKET: ${process.env.S3_BADGES_BUCKET || 'NOT SET'}`);
console.log(`  S3_TRAINING_CERTIFICATES_BUCKET: ${process.env.S3_TRAINING_CERTIFICATES_BUCKET || 'NOT SET'}`);

console.log('\nS3 Client Configuration:');
console.log(`  Region: ${s3Client.config.region || 'NOT SET'}`);

const expectedRegion = process.env.S3_BUCKET_REGION || 'us-east-1';
const actualRegion = s3Client.config.region;

console.log('\nValidation:');
if (actualRegion === expectedRegion) {
  console.log(`  ✅ S3 client region matches expected region: ${actualRegion}`);
} else {
  console.log(`  ❌ REGION MISMATCH!`);
  console.log(`     Expected: ${expectedRegion}`);
  console.log(`     Actual: ${actualRegion}`);
  console.log(`\n     This will cause "bucket endpoint" errors!`);
  console.log(`     Fix: Ensure S3_BUCKET_REGION is set in .env`);
}

console.log('\n');
process.exit(actualRegion === expectedRegion ? 0 : 1);

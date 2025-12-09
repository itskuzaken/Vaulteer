const { TextractClient } = require('@aws-sdk/client-textract');
const { S3Client } = require('@aws-sdk/client-s3');

const TEXTRACT_MAX_ATTEMPTS = Number(process.env.AWS_TEXTRACT_MAX_ATTEMPTS || 6);
const TEXTRACT_RETRY_MODE = process.env.AWS_TEXTRACT_RETRY_MODE || 'standard';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  maxAttempts: TEXTRACT_MAX_ATTEMPTS,
  retryMode: TEXTRACT_RETRY_MODE
});

const s3Client = new S3Client({
  region: process.env.S3_BUCKET_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = { textractClient, s3Client };

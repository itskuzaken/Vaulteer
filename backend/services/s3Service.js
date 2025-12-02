const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/aws');
const crypto = require('crypto');

const BUCKET_NAME = process.env.S3_HTS_FORMS_BUCKET || 'vaulteer-hts-forms';

/**
 * Upload encrypted image to S3 with SSE-S3
 * @param {Buffer} imageBuffer - Client-encrypted image buffer
 * @param {string} formId - Form ID for organizing uploads
 * @param {string} imageSide - 'front' or 'back'
 * @returns {Promise<string>} - S3 object key
 */
async function uploadEncryptedImage(imageBuffer, formId, imageSide) {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const key = `hts-forms/${formId}/${imageSide}-${timestamp}-${randomSuffix}.enc`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: 'application/octet-stream',
    ServerSideEncryption: 'AES256', // SSE-S3 (server-side encryption)
    Metadata: {
      'form-id': formId,
      'image-side': imageSide,
      'encrypted': 'true'
    }
  });

  await s3Client.send(command);
  console.log(`✅ Uploaded encrypted ${imageSide} image to S3: ${key}`);

  return key;
}

/**
 * Get pre-signed download URL (1 hour expiry)
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPresignedDownloadUrl(s3Key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

/**
 * Download encrypted image from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Buffer>} - Image buffer
 */
async function downloadImage(s3Key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  const response = await s3Client.send(command);
  const stream = response.Body;
  
  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Delete image from S3
 * @param {string} s3Key - S3 object key
 */
async function deleteImage(s3Key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  await s3Client.send(command);
  console.log(`🗑️ Deleted image from S3: ${s3Key}`);
}

module.exports = {
  uploadEncryptedImage,
  getPresignedDownloadUrl,
  downloadImage,
  deleteImage
};

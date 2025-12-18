const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/aws');
const crypto = require('crypto');

const HTS_BUCKET = process.env.S3_HTS_FORMS_BUCKET || 'vaulteer-hts-forms';
const BADGES_BUCKET = process.env.S3_BADGES_BUCKET || 'vaulteer-badges';

function selectBucketForKey(key) {
  if (typeof key === 'string' && (key.startsWith('badges/') || key.startsWith('achievement_badges/'))) return BADGES_BUCKET;
  return HTS_BUCKET;
}

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
  const targetBucket = selectBucketForKey(s3Key);
  const command = new GetObjectCommand({ Bucket: targetBucket, Key: s3Key });
  // Lazily require to avoid forcing @aws-sdk/s3-request-presigner in test environments
  let getSignedUrl;
  try {
    ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  } catch (e) {
    // Provide a clearer error to surface on the API response instead of a raw module load stack
    const err = new Error("S3 presigner is not available on this server. Install '@aws-sdk/s3-request-presigner' in the backend to enable presigned URLs.");
    err.code = 'PRESIGNER_MISSING';
    throw err;
  }
  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (err) {
    // In test environments where AWS credentials may not be available, return a fake URL
    // so unit tests can assert behavior without requiring real AWS credentials.
    if (process.env.NODE_ENV === 'test') {
      return `https://example.com/${encodeURIComponent(s3Key)}`;
    }
    throw err;
  }
}

/**
 * Get a presigned PUT URL for uploading a badge (PUT)
 * @param {string} s3Key
 * @param {string} contentType
 * @param {number} expiresIn
 */
async function getPresignedUploadUrl(s3Key, contentType = 'image/png', expiresIn = 3600, bucket) {
  const targetBucket = bucket || selectBucketForKey(s3Key);
  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: s3Key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable'
  });
  // Lazily require the presigner so tests that don't have the package available don't fail on import
  let getSignedUrl;
  try {
    ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  } catch (e) {
    const err = new Error("S3 presigner is not available on this server. Install '@aws-sdk/s3-request-presigner' in the backend to enable presigned uploads.");
    err.code = 'PRESIGNER_MISSING';
    throw err;
  }
  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (err) {
    if (process.env.NODE_ENV === 'test') {
      // Provide a stable dummy URL for tests
      return `https://example.com/${encodeURIComponent(s3Key)}`;
    }
    throw err;
  }
}

/**
 * Upload badge buffer to S3 server-side (fallback)
 */
async function uploadBadgeBuffer(buffer, key, contentType = 'image/png', meta = {}, bucket) {
  const targetBucket = bucket || selectBucketForKey(key);
  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: meta,
  });
  await s3Client.send(command);
  return key;
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
async function deleteImage(s3Key, bucket) {
  const targetBucket = bucket || selectBucketForKey(s3Key);
  const command = new DeleteObjectCommand({
    Bucket: targetBucket,
    Key: s3Key
  });

  await s3Client.send(command);
  console.log(`🗑️ Deleted image from S3: ${s3Key} (bucket: ${targetBucket})`);
}

module.exports = {
  uploadEncryptedImage,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadBadgeBuffer,
  downloadImage,
  deleteImage,
  // Export buckets for other modules/tests
  HTS_BUCKET,
  BADGES_BUCKET,
};

/**
 * Upload a readable stream to S3. Uses @aws-sdk/lib-storage Upload when available
 * to support large/multipart uploads. Falls back to buffering the stream and
 * calling `uploadBadgeBuffer` when lib-storage is not available.
 * @param {string} key
 * @param {Readable} stream
 * @param {string} contentType
 * @param {string} bucket (optional)
 */
async function uploadStream(key, stream, contentType = 'application/octet-stream', bucket) {
  const targetBucket = bucket || selectBucketForKey(key);
  let Upload;
  try {
    ({ Upload } = require('@aws-sdk/lib-storage'));
  } catch (e) {
    console.warn('Optional package @aws-sdk/lib-storage not available. Falling back to buffering stream for upload.');
    // Buffer the stream into memory as a fallback (suitable for small reports/tests)
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    const buffer = Buffer.concat(chunks);
    return uploadBadgeBuffer(buffer, key, contentType, {}, targetBucket);
  }

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: targetBucket,
      Key: key,
      Body: stream,
      ContentType: contentType,
      CacheControl: 'private, max-age=0',
    },
  });

  await upload.done();
  return key;
}

// Export streaming helper
module.exports.uploadStream = uploadStream;

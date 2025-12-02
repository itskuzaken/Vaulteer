const crypto = require('crypto');

/**
 * Convert base64 string to Buffer
 */
function base64ToBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

/**
 * Import encryption key from base64 string
 */
async function importKey(base64Key) {
  const keyBuffer = base64ToBuffer(base64Key);
  
  // Node.js crypto uses raw key format
  return keyBuffer;
}

/**
 * Decrypt image using AES-GCM
 */
async function decryptImage(encryptedBase64, ivBase64, keyBase64) {
  try {
    const key = await importKey(keyBase64);
    const iv = base64ToBuffer(ivBase64);
    const encryptedData = base64ToBuffer(encryptedBase64);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    // Extract auth tag (last 16 bytes)
    const authTag = encryptedData.slice(-16);
    const ciphertext = encryptedData.slice(0, -16);
    
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    return decrypted.toString('base64');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt both front and back images
 */
async function decryptFormImages(formData) {
  const frontImage = await decryptImage(
    formData.front_image_url,
    formData.front_image_iv,
    formData.encryption_key
  );
  
  const backImage = await decryptImage(
    formData.back_image_url,
    formData.back_image_iv,
    formData.encryption_key
  );
  
  return { frontImage, backImage };
}

module.exports = {
  decryptImage,
  decryptFormImages
};

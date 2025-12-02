/**
 * Image Encryption Utility
 * Uses AES-GCM encryption for securing HTS form images
 */

// Generate a random encryption key
export async function generateEncryptionKey() {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export key to raw format for storage
export async function exportKey(key) {
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(rawKey);
}

// Import key from raw format
export async function importKey(base64Key) {
  const rawKey = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt base64 image data
export async function encryptImage(base64Image, key) {
  // Generate random IV (Initialization Vector)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Convert base64 to ArrayBuffer
  const imageData = base64ToArrayBuffer(base64Image);
  
  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    imageData
  );
  
  // Return encrypted data and IV (both as base64)
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv)
  };
}

// Decrypt image data back to base64
export async function decryptImage(encryptedBase64, ivBase64, key) {
  // Convert base64 back to ArrayBuffer
  const encryptedData = base64ToArrayBuffer(encryptedBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encryptedData
  );
  
  // Convert back to base64
  return arrayBufferToBase64(decryptedData);
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt form submission data
export async function encryptFormImages(frontImage, backImage) {
  // Generate a unique encryption key for this submission
  const key = await generateEncryptionKey();
  
  // Encrypt both images
  const encryptedFront = await encryptImage(frontImage, key);
  const encryptedBack = await encryptImage(backImage, key);
  
  // Export the key for storage
  const exportedKey = await exportKey(key);
  
  return {
    frontImage: encryptedFront.encryptedData,
    frontImageIV: encryptedFront.iv,
    backImage: encryptedBack.encryptedData,
    backImageIV: encryptedBack.iv,
    encryptionKey: exportedKey
  };
}

// Decrypt form submission images
export async function decryptFormImages(encryptedFront, frontIV, encryptedBack, backIV, encryptionKey) {
  // Import the encryption key
  const key = await importKey(encryptionKey);
  
  // Decrypt both images
  const frontImage = await decryptImage(encryptedFront, frontIV, key);
  const backImage = await decryptImage(encryptedBack, backIV, key);
  
  return {
    frontImage,
    backImage
  };
}

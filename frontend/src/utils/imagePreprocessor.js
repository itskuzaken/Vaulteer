/**
 * Image Preprocessor
 * Comprehensive image preprocessing pipeline for optimal OCR accuracy
 * Includes: resizing, deskewing, denoising, contrast enhancement, and binarization
 */

/**
 * Preprocess image for optimal OCR
 * @param {string} imageDataURL - Base64 data URL of the image
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processed image and metadata
 */
export async function preprocessImage(imageDataURL, options = {}) {
  const {
    targetResolution = { width: 1600, height: 2133 }, // A4 @ 300 DPI
    enableDeskew = true,
    enableDenoising = true,
    enableContrast = true,
    enableBinarization = false, // Optional: convert to B&W
    outputFormat = 'jpeg',
    quality = 0.95
  } = options;
  
  console.log('[Preprocessor] Starting image enhancement pipeline...');
  
  // Load image
  const img = await loadImage(imageDataURL);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Step 1: Resize to optimal resolution
  const resized = resizeImage(img, targetResolution);
  canvas.width = resized.width;
  canvas.height = resized.height;
  ctx.drawImage(resized, 0, 0);
  
  // Step 2: Deskew (correct rotation)
  if (enableDeskew) {
    const angle = detectSkewAngle(ctx, canvas.width, canvas.height);
    if (Math.abs(angle) > 0.5) {
      console.log(`[Preprocessor] Deskewing by ${angle.toFixed(2)}°`);
      deskewImage(ctx, canvas, angle);
    }
  }
  
  // Step 3: Denoise
  if (enableDenoising) {
    console.log('[Preprocessor] Applying noise reduction...');
    applyMedianFilter(ctx, canvas.width, canvas.height);
  }
  
  // Step 4: Contrast enhancement
  if (enableContrast) {
    console.log('[Preprocessor] Enhancing contrast...');
    enhanceContrast(ctx, canvas.width, canvas.height);
  }
  
  // Step 5: Optional binarization
  if (enableBinarization) {
    console.log('[Preprocessor] Converting to black & white...');
    applyAdaptiveThreshold(ctx, canvas.width, canvas.height);
  }
  
  // Convert to output format
  const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
  const processedImage = canvas.toDataURL(mimeType, quality);
  
  console.log('[Preprocessor] Enhancement complete');
  
  return {
    processedImage,
    metadata: {
      originalSize: img.width + 'x' + img.height,
      processedSize: canvas.width + 'x' + canvas.height,
      skewAngle: enableDeskew ? detectSkewAngle(ctx, canvas.width, canvas.height) : 0,
      enhancements: {
        deskew: enableDeskew,
        denoise: enableDenoising,
        contrast: enableContrast,
        binarization: enableBinarization
      }
    }
  };
}

/**
 * Resize image to target resolution while maintaining aspect ratio
 */
function resizeImage(img, targetResolution) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Calculate scaling to fit target resolution
  const scaleWidth = targetResolution.width / img.width;
  const scaleHeight = targetResolution.height / img.height;
  const scale = Math.min(scaleWidth, scaleHeight);
  
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  
  // High-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas;
}

/**
 * Detect skew angle using simplified Hough transform
 */
function detectSkewAngle(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Sample horizontal lines and detect predominant angle
  const sampleLines = 20;
  const angles = [];
  
  for (let i = 0; i < sampleLines; i++) {
    const y = Math.floor((height / sampleLines) * i);
    const edgePoints = [];
    
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const nextIdx = (y * width + (x + 1)) * 4;
      
      const gray = data[idx];
      const nextGray = data[nextIdx];
      
      if (Math.abs(gray - nextGray) > 30) {
        edgePoints.push(x);
      }
    }
    
    if (edgePoints.length >= 2) {
      // Calculate angle from edge points
      const angle = Math.atan2(1, edgePoints[edgePoints.length - 1] - edgePoints[0]);
      angles.push(angle * (180 / Math.PI));
    }
  }
  
  // Return median angle
  angles.sort((a, b) => a - b);
  return angles.length > 0 ? angles[Math.floor(angles.length / 2)] : 0;
}

/**
 * Rotate image to correct skew
 */
function deskewImage(ctx, canvas, angle) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Rotate canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle * Math.PI / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.putImageData(imageData, 0, 0);
  ctx.restore();
}

/**
 * Apply median filter to reduce noise
 */
function applyMedianFilter(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const filtered = new Uint8ClampedArray(data);
  
  const radius = 1; // 3x3 kernel
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const neighbors = [];
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          neighbors.push(gray);
        }
      }
      
      neighbors.sort((a, b) => a - b);
      const median = neighbors[Math.floor(neighbors.length / 2)];
      
      const idx = (y * width + x) * 4;
      filtered[idx] = median;
      filtered[idx + 1] = median;
      filtered[idx + 2] = median;
    }
  }
  
  imageData.data.set(filtered);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Enhance contrast using histogram equalization
 */
function enhanceContrast(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Build histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }
  
  // Calculate cumulative distribution function
  const cdf = [];
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += histogram[i];
    cdf[i] = sum;
  }
  
  // Normalize CDF
  const totalPixels = width * height;
  const cdfMin = cdf.find(val => val > 0);
  
  const equalized = cdf.map(val => 
    Math.round(((val - cdfMin) / (totalPixels - cdfMin)) * 255)
  );
  
  // Apply equalization
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const newGray = equalized[gray];
    
    data[i] = newGray;
    data[i + 1] = newGray;
    data[i + 2] = newGray;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply adaptive thresholding for binarization
 */
function applyAdaptiveThreshold(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const windowSize = 15;
  const c = 10; // Constant subtracted from mean
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      // Calculate local mean
      for (let dy = -windowSize; dy <= windowSize; dy++) {
        for (let dx = -windowSize; dx <= windowSize; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const idx = (ny * width + nx) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            sum += gray;
            count++;
          }
        }
      }
      
      const localMean = sum / count;
      const idx = (y * width + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      
      // Threshold
      const binary = gray > (localMean - c) ? 255 : 0;
      
      data[idx] = binary;
      data[idx + 1] = binary;
      data[idx + 2] = binary;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Helper to load image from data URL
 */
function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (event) => {
      reject(new Error('Failed to load image data for preprocessing. Image may be corrupted or invalid.'));
    };
    img.src = dataURL;
  });
}

/**
 * Detect which side of HTS form (front or back) from image
 * Uses text pattern matching to identify form side
 * @param {string} imageDataURL - Base64 data URL of the image
 * @returns {Promise<Object>} Detection result with side and confidence
 */
export async function detectFormSide(imageDataURL) {
  try {
    const img = await loadImage(imageDataURL);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Use smaller size for faster processing
    canvas.width = 800;
    canvas.height = 1067;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Get image data for text analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple text detection based on dark pixels in specific regions
    // Front page markers (top portion of form)
    const frontMarkers = [
      { text: 'PERSONAL INFORMATION SHEET', region: { x: 0.1, y: 0.05, w: 0.8, h: 0.15 } },
      { text: 'PhilHealth Number', region: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 } },
      { text: 'First Name', region: { x: 0.1, y: 0.15, w: 0.5, h: 0.25 } },
      { text: 'INFORMED CONSENT', region: { x: 0.1, y: 0.0, w: 0.8, h: 0.1 } }
    ];
    
    // Back page markers
    const backMarkers = [
      { text: 'HISTORY OF EXPOSURE', region: { x: 0.1, y: 0.05, w: 0.8, h: 0.15 } },
      { text: 'RISK ASSESSMENT', region: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 } },
      { text: 'Sex with Male', region: { x: 0.1, y: 0.1, w: 0.6, h: 0.3 } },
      { text: 'Previous HIV Test', region: { x: 0.1, y: 0.3, w: 0.8, h: 0.5 } }
    ];
    
    // Calculate text density in regions (higher density = more likely to contain text)
    const calculateRegionDensity = (region) => {
      const startX = Math.floor(canvas.width * region.x);
      const startY = Math.floor(canvas.height * region.y);
      const width = Math.floor(canvas.width * region.w);
      const height = Math.floor(canvas.height * region.h);
      
      let darkPixels = 0;
      let totalPixels = 0;
      
      for (let y = startY; y < Math.min(startY + height, canvas.height); y++) {
        for (let x = startX; x < Math.min(startX + width, canvas.width); x++) {
          const idx = (y * canvas.width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (brightness < 200) darkPixels++; // Consider as text
          totalPixels++;
        }
      }
      
      return totalPixels > 0 ? darkPixels / totalPixels : 0;
    };
    
    // Score each side
    let frontScore = 0;
    let backScore = 0;
    
    frontMarkers.forEach(marker => {
      const density = calculateRegionDensity(marker.region);
      if (density > 0.05) frontScore += density; // Text found in expected region
    });
    
    backMarkers.forEach(marker => {
      const density = calculateRegionDensity(marker.region);
      if (density > 0.05) backScore += density;
    });
    
    // Determine side based on scores
    const isFront = frontScore > backScore;
    const confidence = Math.abs(frontScore - backScore) / Math.max(frontScore, backScore, 0.1);
    
    console.log('[Form Detection]', {
      frontScore: frontScore.toFixed(3),
      backScore: backScore.toFixed(3),
      detected: isFront ? 'FRONT' : 'BACK',
      confidence: (confidence * 100).toFixed(1) + '%'
    });
    
    return {
      side: isFront ? 'front' : 'back',
      confidence: Math.min(confidence * 100, 100),
      scores: { front: frontScore, back: backScore }
    };
  } catch (error) {
    console.error('[Form Detection] Error:', error);
    return {
      side: 'unknown',
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Convert data URL to Blob for FormData
 */
export function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Image Quality Validator
 * Validates image quality before OCR processing
 * Returns quality score (0-100) and actionable feedback
 */

/**
 * Validate image quality before OCR processing
 * @param {string} imageDataURL - Base64 data URL of the image
 * @returns {Promise<Object>} Quality validation result
 */
export async function validateImageQuality(imageDataURL) {
  const img = await loadImage(imageDataURL);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Quality checks
  const checks = {
    resolution: checkResolution(img.width, img.height),
    brightness: checkBrightness(imageData),
    contrast: checkContrast(imageData),
    blur: checkBlur(imageData),
    orientation: checkOrientation(imageData)
  };
  
  const score = calculateQualityScore(checks);
  const feedback = generateFeedback(checks);
  
  return {
    score,
    checks,
    feedback,
    recommendation: score < 70 ? 'RECAPTURE' : 'PROCEED'
  };
}

/**
 * Check if image resolution meets minimum requirements
 */
function checkResolution(width, height) {
  // Minimum 1200x1600 for 300 DPI on standard form
  const minPixels = 1200 * 1600;
  const actualPixels = width * height;
  
  return {
    pass: actualPixels >= minPixels,
    score: Math.min(100, (actualPixels / minPixels) * 100),
    width,
    height,
    message: actualPixels < minPixels 
      ? `Low resolution: ${width}x${height}. Recommended: 1200x1600+`
      : 'Resolution OK'
  };
}

/**
 * Check image brightness levels
 */
function checkBrightness(imageData) {
  const data = imageData.data;
  let totalBrightness = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // Calculate perceived brightness
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
  }
  
  const avgBrightness = totalBrightness / (data.length / 4);
  
  // Ideal range: 120-200
  const pass = avgBrightness >= 100 && avgBrightness <= 220;
  const score = pass ? 100 : Math.max(0, 100 - Math.abs(160 - avgBrightness));
  
  let message = 'Lighting OK';
  if (avgBrightness < 100) message = 'Too dark - increase lighting';
  if (avgBrightness > 220) message = 'Too bright - reduce lighting/glare';
  
  return { pass, score, value: avgBrightness, message };
}

/**
 * Check image contrast using standard deviation
 */
function checkContrast(imageData) {
  const data = imageData.data;
  const grayscale = [];
  
  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale.push(gray);
  }
  
  // Calculate standard deviation (measure of contrast)
  const mean = grayscale.reduce((a, b) => a + b) / grayscale.length;
  const variance = grayscale.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / grayscale.length;
  const stdDev = Math.sqrt(variance);
  
  // Good contrast: stdDev > 40
  const pass = stdDev > 30;
  const score = Math.min(100, (stdDev / 60) * 100);
  
  return {
    pass,
    score,
    value: stdDev,
    message: stdDev < 30 ? 'Low contrast - adjust lighting' : 'Contrast OK'
  };
}

/**
 * Check for image blur using Laplacian variance method
 */
function checkBlur(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Simplified Laplacian kernel for blur detection
  let variance = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const center = data[idx];
      
      const top = data[((y - 1) * width + x) * 4];
      const bottom = data[((y + 1) * width + x) * 4];
      const left = data[(y * width + (x - 1)) * 4];
      const right = data[(y * width + (x + 1)) * 4];
      
      const laplacian = Math.abs(4 * center - top - bottom - left - right);
      variance += laplacian;
      count++;
    }
  }
  
  const avgVariance = variance / count;
  
  // Higher variance = sharper image
  // Threshold: > 10 for acceptable sharpness
  const pass = avgVariance > 8;
  const score = Math.min(100, (avgVariance / 15) * 100);
  
  return {
    pass,
    score,
    value: avgVariance,
    message: avgVariance < 8 ? 'Image too blurry - hold camera steady' : 'Sharpness OK'
  };
}

/**
 * Check image orientation (placeholder for future implementation)
 */
function checkOrientation(imageData) {
  // For now, assume orientation is acceptable
  // Future: Implement EXIF orientation checking
  return {
    pass: true,
    score: 100,
    message: 'Orientation OK'
  };
}

/**
 * Calculate overall quality score from individual checks
 */
function calculateQualityScore(checks) {
  const weights = {
    resolution: 0.25,
    brightness: 0.25,
    contrast: 0.20,
    blur: 0.20,
    orientation: 0.10
  };
  
  let totalScore = 0;
  Object.keys(weights).forEach(key => {
    totalScore += checks[key].score * weights[key];
  });
  
  return Math.round(totalScore);
}

/**
 * Generate actionable feedback based on quality checks
 */
function generateFeedback(checks) {
  const issues = [];
  
  Object.values(checks).forEach(check => {
    if (!check.pass) {
      issues.push(check.message);
    }
  });
  
  if (issues.length === 0) {
    return '✅ Image quality is excellent for OCR processing';
  }
  
  return '⚠️ ' + issues.join('. ');
}

/**
 * Helper to load image from data URL
 */
function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

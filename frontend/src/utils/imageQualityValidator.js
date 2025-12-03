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
  
  // Ideal range: 120-200 (stricter thresholds)
  const pass = avgBrightness >= 110 && avgBrightness <= 210;
  const score = pass ? 100 : Math.max(0, 100 - Math.abs(160 - avgBrightness));
  
  let message = 'Lighting OK';
  if (avgBrightness < 110) message = 'Too dark - increase lighting';
  if (avgBrightness > 210) message = 'Too bright - reduce lighting/glare';
  
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
  
  // Good contrast: stdDev > 35 (stricter threshold)
  const pass = stdDev > 35;
  const score = Math.min(100, (stdDev / 60) * 100);
  
  return {
    pass,
    score,
    value: stdDev,
    message: stdDev < 35 ? 'Low contrast - adjust lighting' : 'Contrast OK'
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
  // Threshold: > 10 for acceptable sharpness (stricter)
  const pass = avgVariance > 10;
  const score = Math.min(100, (avgVariance / 15) * 100);
  
  return {
    pass,
    score,
    value: avgVariance,
    message: avgVariance < 10 ? 'Image too blurry - hold camera steady' : 'Sharpness OK'
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

/**
 * Validate quality directly from canvas element
 * @param {HTMLCanvasElement} canvas - Canvas element containing the image
 * @returns {Promise<Object>} Quality validation result
 */
export async function validateQuality(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Quality checks
  const checks = {
    resolution: checkResolution(canvas.width, canvas.height),
    brightness: checkBrightness(imageData),
    contrast: checkContrast(imageData),
    blur: checkBlur(imageData)
  };
  
  const isValid = Object.values(checks).every(check => check.pass);
  const failedChecks = Object.values(checks).filter(check => !check.pass);
  
  return {
    isValid,
    checks,
    brightness: checks.brightness.value,
    contrast: checks.contrast.value,
    blurScore: checks.blur.value,
    message: isValid ? 'Quality OK' : failedChecks[0].message
  };
}

/**
 * Capture multiple frames and select the best quality one
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {number} frameCount - Number of frames to capture (default: 3)
 * @param {number} delayMs - Delay between captures in ms (default: 300)
 * @returns {Promise<{canvas, quality}>} Best frame and its quality metrics
 */
export async function captureMultipleFrames(videoElement, frameCount = 3, delayMs = 300) {
  const frames = [];
  
  for (let i = 0; i < frameCount; i++) {
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    
    const quality = await validateQuality(canvas);
    
    if (quality.isValid) {
      frames.push({ 
        canvas, 
        quality,
        score: calculateFrameQualityScore(quality)
      });
    }
  }
  
  if (frames.length === 0) {
    return null;
  }
  
  // Return frame with highest quality score
  frames.sort((a, b) => b.score - a.score);
  return frames[0];
}

/**
 * Calculate overall quality score for frame selection
 * @param {Object} quality - Quality validation result
 * @returns {number} Quality score (higher is better)
 */
function calculateFrameQualityScore(quality) {
  let score = 100;
  
  // Penalize based on distance from ideal values
  const idealBrightness = 160;
  const brightnessPenalty = Math.abs(quality.brightness - idealBrightness) / 2;
  score -= brightnessPenalty;
  
  // Reward high contrast (ideal ~50)
  const contrastBonus = Math.min(quality.contrast, 50);
  score += contrastBonus / 2;
  
  // Reward sharp images (higher blur score)
  score += Math.min(quality.blurScore, 30);
  
  return score;
}

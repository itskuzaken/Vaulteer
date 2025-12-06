/**
 * Camera Stabilizer Utility
 * Provides motion detection, blur detection, and feedback for optimal image capture
 */

/**
 * Detect motion/shake by comparing consecutive frames
 * @param {ImageData} currentFrame - Current camera frame
 * @param {ImageData} previousFrame - Previous camera frame
 * @returns {Object} Motion metrics
 */
export function detectMotion(currentFrame, previousFrame) {
  if (!previousFrame || !currentFrame) {
    return { isStable: true, motionScore: 0, recommendation: 'Ready to capture' };
  }

  // Calculate frame difference
  const diff = calculateFrameDifference(currentFrame, previousFrame);
  
  // Motion thresholds
  const STABLE_THRESHOLD = 5;    // Low motion = stable
  const UNSTABLE_THRESHOLD = 15; // High motion = too shaky
  
  let isStable = diff < STABLE_THRESHOLD;
  let recommendation = '';
  
  if (diff < STABLE_THRESHOLD) {
    recommendation = '✅ Stable - Ready to capture';
  } else if (diff < UNSTABLE_THRESHOLD) {
    recommendation = '⚠️ Slight movement detected';
  } else {
    recommendation = '❌ Too much movement - Hold steady';
  }
  
  return {
    isStable,
    motionScore: diff,
    recommendation
  };
}

/**
 * Calculate pixel difference between two frames
 * @param {ImageData} frame1 
 * @param {ImageData} frame2 
 * @returns {number} Average pixel difference (0-100)
 */
function calculateFrameDifference(frame1, frame2) {
  if (!frame1 || !frame2 || 
      frame1.data.length !== frame2.data.length) {
    return 0;
  }
  
  let totalDiff = 0;
  const step = 4; // Sample every 4th pixel for performance
  
  for (let i = 0; i < frame1.data.length; i += step * 4) {
    const r1 = frame1.data[i];
    const g1 = frame1.data[i + 1];
    const b1 = frame1.data[i + 2];
    
    const r2 = frame2.data[i];
    const g2 = frame2.data[i + 1];
    const b2 = frame2.data[i + 2];
    
    totalDiff += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
  }
  
  // Normalize to 0-100 scale
  const avgDiff = totalDiff / (frame1.data.length / (step * 4));
  return (avgDiff / 765) * 100; // 765 = max RGB diff (255*3)
}

/**
 * Detect blur using Laplacian variance method
 * @param {ImageData} imageData 
 * @returns {Object} Blur metrics
 */
export function detectBlur(imageData) {
  const { width, height, data } = imageData;
  
  // Convert to grayscale
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    grayscale[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  // Calculate Laplacian variance (edge detection)
  let variance = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      const laplacian = 
        -1 * grayscale[idx - width - 1] + -1 * grayscale[idx - width] + -1 * grayscale[idx - width + 1] +
        -1 * grayscale[idx - 1]         +  8 * grayscale[idx]         + -1 * grayscale[idx + 1] +
        -1 * grayscale[idx + width - 1] + -1 * grayscale[idx + width] + -1 * grayscale[idx + width + 1];
      
      variance += laplacian * laplacian;
      count++;
    }
  }
  
  const blurScore = variance / count;
  
  // Thresholds (these may need tuning based on camera quality)
  const SHARP_THRESHOLD = 100;
  const ACCEPTABLE_THRESHOLD = 50;
  
  let isSharp = blurScore > SHARP_THRESHOLD;
  let recommendation = '';
  
  if (blurScore > SHARP_THRESHOLD) {
    recommendation = '✅ Sharp - Good focus';
  } else if (blurScore > ACCEPTABLE_THRESHOLD) {
    recommendation = '⚠️ Slightly blurry - Try focusing';
  } else {
    recommendation = '❌ Blurry - Check focus & lighting';
  }
  
  return {
    isSharp,
    blurScore: Math.round(blurScore),
    recommendation
  };
}

/**
 * Detect lighting conditions
 * @param {ImageData} imageData 
 * @returns {Object} Lighting metrics
 */
export function detectLighting(imageData) {
  const { data } = imageData;
  
  let brightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  
  brightness = brightness / (data.length / 4);
  
  // Thresholds
  const TOO_DARK = 50;
  const TOO_BRIGHT = 200;
  const OPTIMAL_MIN = 80;
  const OPTIMAL_MAX = 180;
  
  let isOptimal = brightness >= OPTIMAL_MIN && brightness <= OPTIMAL_MAX;
  let recommendation = '';
  
  if (brightness < TOO_DARK) {
    recommendation = '🌙 Too dark - Add more light';
  } else if (brightness > TOO_BRIGHT) {
    recommendation = '☀️ Too bright - Reduce glare';
  } else if (brightness < OPTIMAL_MIN) {
    recommendation = '💡 Slightly dark - More light recommended';
  } else if (brightness > OPTIMAL_MAX) {
    recommendation = '⚡ Slightly bright - Reduce exposure';
  } else {
    recommendation = '✅ Good lighting';
  }
  
  return {
    isOptimal,
    brightness: Math.round(brightness),
    recommendation
  };
}

/**
 * Calculate overall capture quality score
 * @param {Object} motionMetrics 
 * @param {Object} blurMetrics 
 * @param {Object} lightingMetrics 
 * @returns {Object} Quality assessment
 */
export function calculateQualityScore(motionMetrics, blurMetrics, lightingMetrics) {
  const weights = {
    motion: 0.4,
    blur: 0.4,
    lighting: 0.2
  };
  
  // Normalize scores to 0-100
  const motionScore = motionMetrics.isStable ? 100 : Math.max(0, 100 - motionMetrics.motionScore * 5);
  const blurScore = Math.min(100, (blurMetrics.blurScore / 100) * 100);
  const lightingScore = lightingMetrics.isOptimal ? 100 : 
    Math.max(0, 100 - Math.abs(lightingMetrics.brightness - 130) * 2);
  
  const overallScore = 
    motionScore * weights.motion +
    blurScore * weights.blur +
    lightingScore * weights.lighting;
  
  const isReadyToCapture = 
    motionMetrics.isStable && 
    blurMetrics.isSharp && 
    lightingMetrics.isOptimal &&
    overallScore >= 70;
  
  return {
    overallScore: Math.round(overallScore),
    isReadyToCapture,
    components: {
      motion: Math.round(motionScore),
      blur: Math.round(blurScore),
      lighting: Math.round(lightingScore)
    }
  };
}

/**
 * Get frame from video element as ImageData
 * @param {HTMLVideoElement} videoElement 
 * @param {HTMLCanvasElement} canvas 
 * @returns {ImageData|null}
 */
export function captureFrameData(videoElement, canvas) {
  if (!videoElement || !canvas) return null;
  
  const ctx = canvas.getContext('2d');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Stabilization controller class for continuous monitoring
 */
export class CameraStabilizer {
  constructor(videoElement, options = {}) {
    this.videoElement = videoElement;
    this.canvas = document.createElement('canvas');
    this.previousFrame = null;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    this.options = {
      updateInterval: 200, // Check every 200ms
      onUpdate: null,      // Callback for status updates
      ...options
    };
    
    this.currentMetrics = {
      motion: { isStable: false, motionScore: 0, recommendation: '' },
      blur: { isSharp: false, blurScore: 0, recommendation: '' },
      lighting: { isOptimal: false, brightness: 0, recommendation: '' },
      quality: { overallScore: 0, isReadyToCapture: false }
    };
  }
  
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.analyze();
    }, this.options.updateInterval);
  }
  
  stop() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.previousFrame = null;
  }
  
  analyze() {
    if (!this.videoElement || this.videoElement.readyState !== 4) return;
    
    const currentFrame = captureFrameData(this.videoElement, this.canvas);
    if (!currentFrame) return;
    
    // Run all analyses
    const motionMetrics = detectMotion(currentFrame, this.previousFrame);
    const blurMetrics = detectBlur(currentFrame);
    const lightingMetrics = detectLighting(currentFrame);
    const qualityMetrics = calculateQualityScore(motionMetrics, blurMetrics, lightingMetrics);
    
    this.currentMetrics = {
      motion: motionMetrics,
      blur: blurMetrics,
      lighting: lightingMetrics,
      quality: qualityMetrics
    };
    
    // Notify callback
    if (this.options.onUpdate) {
      this.options.onUpdate(this.currentMetrics);
    }
    
    // Store current frame for next comparison
    this.previousFrame = currentFrame;
  }
  
  getMetrics() {
    return this.currentMetrics;
  }
  
  isReadyToCapture() {
    return this.currentMetrics.quality.isReadyToCapture;
  }
}

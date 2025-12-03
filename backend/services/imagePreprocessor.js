/**
 * Enhanced Image Preprocessing Service
 * Improves OCR accuracy through image quality enhancement
 */

const sharp = require('sharp');

class ImagePreprocessor {
  constructor() {
    this.config = {
      // CLAHE (Contrast Limited Adaptive Histogram Equalization)
      claheClipLimit: 2.0,
      claheTileSize: 8,
      
      // Sharpening
      sharpenSigma: 1.5,
      sharpenFlat: 1.0,
      sharpenJagged: 2.0,
      
      // Noise reduction
      medianFilterSize: 3,
      
      // Rotation correction
      maxRotationAngle: 5,
      
      // Quality thresholds
      minBrightness: 40,
      maxBrightness: 240,
      minContrast: 30,
      blurThreshold: 100
    };
  }

  /**
   * Process image for optimal OCR
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} { buffer, metadata, quality, applied }
   */
  async process(imageBuffer, options = {}) {
    const { 
      mode = 'auto', // 'auto', 'fast', 'accurate'
      skipQualityCheck = false 
    } = options;

    try {
      let image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const appliedProcessing = [];

      console.log(`[ImagePreprocessor] Input: { width: ${metadata.width}, height: ${metadata.height}, format: ${metadata.format}, size: ${imageBuffer.length} }`);

      // Step 1: Analyze image quality
      const qualityMetrics = await this.analyzeQuality(imageBuffer);
      console.log(`[ImagePreprocessor] Quality: brightness=${qualityMetrics.brightness.toFixed(1)}, contrast=${qualityMetrics.contrast.toFixed(1)}, blur=${qualityMetrics.blur.toFixed(1)}`);

      if (!skipQualityCheck && !this.meetsMinimumQuality(qualityMetrics)) {
        throw new Error(`Image quality too low: brightness=${qualityMetrics.brightness.toFixed(0)}, contrast=${qualityMetrics.contrast.toFixed(0)}, blur=${qualityMetrics.blur.toFixed(0)}`);
      }

      // Step 2: Auto-rotate if skewed (accurate mode only)
      if (mode === 'accurate' || mode === 'auto') {
        const rotationAngle = await this.detectRotation(imageBuffer);
        if (Math.abs(rotationAngle) > 0.5) {
          image = image.rotate(-rotationAngle, { background: { r: 255, g: 255, b: 255 } });
          appliedProcessing.push(`rotation:${rotationAngle.toFixed(1)}°`);
        }
      }

      // Step 3: Convert to grayscale
      image = image.grayscale();
      appliedProcessing.push('grayscale');

      // Step 4: Enhance contrast (CLAHE-like effect using normalize)
      if (qualityMetrics.contrast < 60 || mode === 'accurate') {
        image = image.normalize();
        appliedProcessing.push('normalize');
      }

      // Step 5: Adjust brightness if needed
      if (qualityMetrics.brightness < this.config.minBrightness) {
        const brightnessAdjust = (this.config.minBrightness - qualityMetrics.brightness) / 100;
        image = image.linear(1 + brightnessAdjust, 0);
        appliedProcessing.push(`brightness:+${(brightnessAdjust * 100).toFixed(0)}%`);
      } else if (qualityMetrics.brightness > this.config.maxBrightness) {
        const brightnessAdjust = (qualityMetrics.brightness - this.config.maxBrightness) / 100;
        image = image.linear(1 - brightnessAdjust, 0);
        appliedProcessing.push(`brightness:-${(brightnessAdjust * 100).toFixed(0)}%`);
      }

      // Step 6: Reduce noise (median filter)
      if (mode === 'accurate') {
        image = image.median(this.config.medianFilterSize);
        appliedProcessing.push('median-filter');
      }

      // Step 7: Sharpen if blurry
      if (qualityMetrics.blur < this.config.blurThreshold || mode === 'accurate') {
        image = image.sharpen({
          sigma: this.config.sharpenSigma,
          flat: this.config.sharpenFlat,
          jagged: this.config.sharpenJagged
        });
        appliedProcessing.push('sharpen');
      }

      // Step 8: Ensure minimum DPI (300 for OCR)
      if (metadata.density && metadata.density < 300) {
        image = image.withMetadata({ density: 300 });
        appliedProcessing.push('dpi:300');
      }

      // Step 9: Convert to high-quality JPEG
      image = image.jpeg({ quality: 95, progressive: false });

      // Process and get output
      const outputBuffer = await image.toBuffer();
      const outputSize = outputBuffer.length;
      const reduction = ((imageBuffer.length - outputSize) / imageBuffer.length * 100).toFixed(1);

      console.log(`[ImagePreprocessor] Output: { size: ${outputSize}, reduction: ${reduction}%, applied: [${appliedProcessing.join(', ')}] }`);

      return {
        buffer: outputBuffer,
        metadata: await sharp(outputBuffer).metadata(),
        quality: qualityMetrics,
        applied: appliedProcessing,
        stats: {
          inputSize: imageBuffer.length,
          outputSize,
          reduction: `${reduction}%`
        }
      };
    } catch (error) {
      console.error('[ImagePreprocessor] Processing error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze image quality metrics
   */
  async analyzeQuality(imageBuffer) {
    const image = sharp(imageBuffer);
    const { channels } = await image.metadata();

    // Get statistics for brightness and contrast
    const stats = await image.stats();
    
    // Calculate brightness (average of channel means)
    const brightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    
    // Calculate contrast (average of channel standard deviations)
    const contrast = stats.channels.reduce((sum, ch) => sum + Math.sqrt(ch.variance), 0) / stats.channels.length;

    // Estimate blur using Laplacian variance
    const blurScore = await this.estimateBlur(imageBuffer);

    return {
      brightness,
      contrast,
      blur: blurScore,
      isColor: channels > 1
    };
  }

  /**
   * Estimate image blur using Laplacian variance
   */
  async estimateBlur(imageBuffer) {
    try {
      // Simple blur detection: apply Laplacian filter and measure variance
      const image = sharp(imageBuffer).grayscale();
      
      // Apply edge detection (approximation of Laplacian)
      const edges = await image
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer();

      // Calculate variance of edge-detected image
      let sum = 0;
      let sumSq = 0;
      for (let i = 0; i < edges.length; i++) {
        sum += edges[i];
        sumSq += edges[i] * edges[i];
      }
      const mean = sum / edges.length;
      const variance = (sumSq / edges.length) - (mean * mean);

      return variance;
    } catch (error) {
      console.warn('[ImagePreprocessor] Blur estimation failed:', error.message);
      return 100; // Assume acceptable if detection fails
    }
  }

  /**
   * Detect rotation angle using Hough transform approximation
   */
  async detectRotation(imageBuffer) {
    try {
      // Simple rotation detection: analyze horizontal line density
      // For production, consider using opencv4nodejs or similar
      
      // For now, return 0 (no rotation) as placeholder
      // TODO: Implement proper Hough transform or use ML-based deskewing
      return 0;
    } catch (error) {
      console.warn('[ImagePreprocessor] Rotation detection failed:', error.message);
      return 0;
    }
  }

  /**
   * Check if image meets minimum quality requirements
   */
  meetsMinimumQuality(metrics) {
    const checks = {
      brightness: metrics.brightness >= this.config.minBrightness && metrics.brightness <= this.config.maxBrightness,
      contrast: metrics.contrast >= this.config.minContrast,
      blur: metrics.blur >= this.config.blurThreshold * 0.5 // Allow lower threshold for rejection
    };

    const passed = Object.values(checks).every(check => check);
    
    if (!passed) {
      console.warn(`[ImagePreprocessor] Quality check failed:`, checks);
    }

    return passed;
  }

  /**
   * Quick quality check without full processing
   */
  async quickQualityCheck(imageBuffer) {
    const quality = await this.analyzeQuality(imageBuffer);
    return {
      passed: this.meetsMinimumQuality(quality),
      metrics: quality,
      suggestions: this.getQualitySuggestions(quality)
    };
  }

  /**
   * Get suggestions for improving image quality
   */
  getQualitySuggestions(metrics) {
    const suggestions = [];

    if (metrics.brightness < this.config.minBrightness) {
      suggestions.push('Image too dark - increase lighting or camera exposure');
    }
    if (metrics.brightness > this.config.maxBrightness) {
      suggestions.push('Image too bright - reduce lighting or camera exposure');
    }
    if (metrics.contrast < this.config.minContrast) {
      suggestions.push('Low contrast - ensure good lighting and avoid shadows');
    }
    if (metrics.blur < this.config.blurThreshold) {
      suggestions.push('Image blurry - hold camera steady and ensure proper focus');
    }

    return suggestions;
  }
}

module.exports = new ImagePreprocessor();

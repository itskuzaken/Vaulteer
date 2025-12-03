const sharp = require('sharp');

/**
 * Checkbox Detector - Pixel Density Analysis
 * Detects checkbox state (checked/unchecked) using pixel density calculation
 */

class CheckboxDetector {
  constructor(options = {}) {
    this.thresholds = {
      checked: options.checkedThreshold || 0.40,      // >40% dark pixels = checked
      unchecked: options.uncheckedThreshold || 0.20,  // <20% dark pixels = unchecked
      darkPixel: options.darkPixelThreshold || 128,   // Pixel value < 128 = dark
      ...options.thresholds
    };
  }

  /**
   * Detect checkbox state from image buffer and coordinates
   * @param {Buffer} imageBuffer - Full image buffer
   * @param {Object} checkboxConfig - Checkbox configuration with coordinates
   * @param {Object} imageDimensions - { width, height } of the image
   * @returns {Promise<Object>} Detection result
   */
  async detectCheckbox(imageBuffer, checkboxConfig, imageDimensions) {
    try {
      // Transform relative coordinates to pixel coordinates
      const pixelBox = this.transformCoordinates(
        checkboxConfig,
        imageDimensions.width,
        imageDimensions.height
      );

      // Extract checkbox region
      const checkboxRegion = await this.extractRegion(imageBuffer, pixelBox);

      // Analyze pixel density
      const analysis = await this.analyzePixelDensity(checkboxRegion);

      // Determine checkbox state
      const state = this.determineState(analysis.density);

      return {
        checked: state.checked,
        confidence: state.confidence,
        pixelDensity: analysis.density,
        darkPixels: analysis.darkPixels,
        totalPixels: analysis.totalPixels,
        requiresReview: state.requiresReview,
        method: 'pixel-density-analysis'
      };
    } catch (error) {
      console.error('[CheckboxDetector] Error detecting checkbox:', error.message);
      return {
        checked: false,
        confidence: 0,
        pixelDensity: 0,
        requiresReview: true,
        error: error.message
      };
    }
  }

  /**
   * Batch detect multiple checkboxes
   * @param {Buffer} imageBuffer - Full image buffer
   * @param {Array} checkboxConfigs - Array of checkbox configurations
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Array>} Array of detection results
   */
  async detectCheckboxes(imageBuffer, checkboxConfigs, imageDimensions) {
    const results = await Promise.all(
      checkboxConfigs.map(config => 
        this.detectCheckbox(imageBuffer, config, imageDimensions)
      )
    );
    return results;
  }

  /**
   * Transform relative coordinates (0-1) to pixel coordinates
   * @param {Object} relativeBox - { x, y, width, height } in 0-1 scale
   * @param {number} imageWidth - Image width in pixels
   * @param {number} imageHeight - Image height in pixels
   * @returns {Object} Pixel coordinates
   */
  transformCoordinates(relativeBox, imageWidth, imageHeight) {
    return {
      left: Math.floor(relativeBox.x * imageWidth),
      top: Math.floor(relativeBox.y * imageHeight),
      width: Math.floor(relativeBox.width * imageWidth),
      height: Math.floor(relativeBox.height * imageHeight)
    };
  }

  /**
   * Extract region from image
   * @param {Buffer} imageBuffer - Full image buffer
   * @param {Object} pixelBox - { left, top, width, height } in pixels
   * @returns {Promise<Buffer>} Extracted region buffer
   */
  async extractRegion(imageBuffer, pixelBox) {
    try {
      // Ensure dimensions are positive
      const width = Math.max(1, pixelBox.width);
      const height = Math.max(1, pixelBox.height);
      const left = Math.max(0, pixelBox.left);
      const top = Math.max(0, pixelBox.top);

      return await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .grayscale() // Convert to grayscale for easier analysis
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to extract region: ${error.message}`);
    }
  }

  /**
   * Analyze pixel density in checkbox region
   * @param {Buffer} regionBuffer - Grayscale checkbox region
   * @returns {Promise<Object>} Analysis result
   */
  async analyzePixelDensity(regionBuffer) {
    try {
      const { data, info } = await sharp(regionBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const totalPixels = info.width * info.height;
      let darkPixels = 0;

      // Count dark pixels (value < threshold)
      for (let i = 0; i < data.length; i += info.channels) {
        const pixelValue = data[i]; // Grayscale, so only one channel
        if (pixelValue < this.thresholds.darkPixel) {
          darkPixels++;
        }
      }

      const density = darkPixels / totalPixels;

      return {
        darkPixels,
        totalPixels,
        density,
        dimensions: { width: info.width, height: info.height }
      };
    } catch (error) {
      throw new Error(`Failed to analyze pixel density: ${error.message}`);
    }
  }

  /**
   * Determine checkbox state based on density
   * @param {number} density - Dark pixel density (0-1)
   * @returns {Object} State determination
   */
  determineState(density) {
    if (density >= this.thresholds.checked) {
      // High density = checked
      return {
        checked: true,
        confidence: Math.min(0.95, 0.7 + (density - this.thresholds.checked)),
        requiresReview: false
      };
    } else if (density <= this.thresholds.unchecked) {
      // Low density = unchecked
      return {
        checked: false,
        confidence: Math.min(0.95, 0.7 + (this.thresholds.unchecked - density)),
        requiresReview: false
      };
    } else {
      // Uncertain = needs manual review
      return {
        checked: density > 0.30, // Best guess
        confidence: 0.5,
        requiresReview: true
      };
    }
  }

  /**
   * Detect checkbox with adaptive thresholding
   * More sophisticated method for challenging cases
   * @param {Buffer} imageBuffer - Full image buffer
   * @param {Object} checkboxConfig - Checkbox configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Detection result
   */
  async detectCheckboxAdaptive(imageBuffer, checkboxConfig, imageDimensions) {
    try {
      const pixelBox = this.transformCoordinates(
        checkboxConfig,
        imageDimensions.width,
        imageDimensions.height
      );

      // Extract and preprocess region
      const processedRegion = await sharp(imageBuffer)
        .extract({
          left: pixelBox.left,
          top: pixelBox.top,
          width: Math.max(1, pixelBox.width),
          height: Math.max(1, pixelBox.height)
        })
        .grayscale()
        .normalise() // Normalize contrast
        .toBuffer();

      // Analyze with Otsu's method (adaptive thresholding)
      const { data, info } = await sharp(processedRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate histogram
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += info.channels) {
        histogram[data[i]]++;
      }

      // Find optimal threshold using Otsu's method
      const threshold = this.otsuThreshold(histogram, data.length / info.channels);

      // Count pixels below threshold
      let darkPixels = 0;
      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i] < threshold) {
          darkPixels++;
        }
      }

      const density = darkPixels / (data.length / info.channels);
      const state = this.determineState(density);

      return {
        checked: state.checked,
        confidence: state.confidence,
        pixelDensity: density,
        darkPixels,
        totalPixels: data.length / info.channels,
        requiresReview: state.requiresReview,
        method: 'adaptive-thresholding',
        threshold
      };
    } catch (error) {
      console.error('[CheckboxDetector] Adaptive detection error:', error.message);
      // Fallback to simple method
      return this.detectCheckbox(imageBuffer, checkboxConfig, imageDimensions);
    }
  }

  /**
   * Otsu's method for automatic threshold calculation
   * @param {Array} histogram - Pixel value histogram
   * @param {number} totalPixels - Total number of pixels
   * @returns {number} Optimal threshold value
   */
  otsuThreshold(histogram, totalPixels) {
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];

      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    return threshold;
  }
}

module.exports = CheckboxDetector;

const sharp = require('sharp');

/**
 * Advanced server-side image preprocessing using Sharp
 * Complements client-side preprocessing for best results
 */
class ImageProcessor {
  /**
   * Process image buffer for optimal OCR
   * @param {Buffer} imageBuffer - Image buffer to process
   * @param {Object} options - Processing options
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async processForOCR(imageBuffer, options = {}) {
    const {
      targetWidth = 1600,
      targetHeight = 2133,
      format = 'jpeg',
      quality = 95,
      enableSharpening = true,
      enableNormalization = true
    } = options;
    
    console.log('[ImageProcessor] Processing image buffer...');
    
    let pipeline = sharp(imageBuffer);
    
    // Get metadata
    const metadata = await pipeline.metadata();
    console.log('[ImageProcessor] Input:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length
    });
    
    // Resize to target resolution
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: 'lanczos3' // High-quality resampling
    });
    
    // Normalize (auto-level)
    if (enableNormalization) {
      pipeline = pipeline.normalize();
    }
    
    // Sharpen edges
    if (enableSharpening) {
      pipeline = pipeline.sharpen({
        sigma: 1.0,
        flat: 1.0,
        jagged: 2.0
      });
    }
    
    // REMOVED: Grayscale conversion breaks AWS Textract SELECTION_ELEMENT feature
    // Keep images in color for FORMS+LAYOUT+SELECTION_ELEMENT to work properly
    // pipeline = pipeline.grayscale();
    
    // Enhance contrast (keep in color space)
    pipeline = pipeline.linear(1.1, -(128 * 1.1) + 128); // Contrast +10% (reduced from +20%)
    
    // Output format
    if (format === 'png') {
      pipeline = pipeline.png({ compressionLevel: 6 });
    } else {
      pipeline = pipeline.jpeg({ 
        quality, 
        mozjpeg: true,
        chromaSubsampling: '4:4:4', // Preserve color detail for SELECTION_ELEMENT
        force: true // Ensure JPEG output even if input is different format
      });
    }
    
    const processedBuffer = await pipeline.toBuffer();
    
    console.log('[ImageProcessor] Output:', {
      size: processedBuffer.length,
      sizeKB: (processedBuffer.length / 1024).toFixed(0) + 'KB',
      reduction: ((1 - processedBuffer.length / imageBuffer.length) * 100).toFixed(1) + '%'
    });
    
    return processedBuffer;
  }
  
  /**
   * Validate image buffer
   * @param {Buffer} imageBuffer - Image buffer to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      const validation = {
        valid: true,
        metadata,
        issues: []
      };
      
      // Check format
      if (!['jpeg', 'jpg', 'png'].includes(metadata.format)) {
        validation.valid = false;
        validation.issues.push(`Unsupported format: ${metadata.format}`);
      }
      
      // Check resolution
      if (metadata.width < 800 || metadata.height < 1000) {
        validation.issues.push('Resolution too low (min 800x1000)');
      }
      
      // Check file size
      if (imageBuffer.length > 10 * 1024 * 1024) {
        validation.issues.push('File too large (max 10MB)');
      }
      
      return validation;
    } catch (error) {
      return {
        valid: false,
        issues: [`Invalid image: ${error.message}`]
      };
    }
  }
}

module.exports = new ImageProcessor();

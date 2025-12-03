/**
 * OCR Configuration
 * Controls extraction mode and behavior for AWS Textract
 */

const ocrConfig = {
  // Extraction mode: 'hybrid', 'queries', or 'coordinate'
  // - hybrid: Try Queries API first, fallback to coordinate-based (RECOMMENDED)
  // - queries: Only use Textract Queries API
  // - coordinate: Only use coordinate-based template extraction
  extractionMode: process.env.OCR_EXTRACTION_MODE || 'hybrid',

  // Enable AWS Textract Queries API
  useQueries: process.env.OCR_USE_QUERIES !== 'false', // Default: true

  // Confidence thresholds
  confidenceThresholds: {
    // Minimum confidence for query results to be accepted (0-100)
    queryMinConfidence: parseInt(process.env.OCR_QUERY_MIN_CONFIDENCE || '75', 10),
    
    // Minimum confidence for coordinate results to be accepted (0-100)
    coordinateMinConfidence: parseInt(process.env.OCR_COORDINATE_MIN_CONFIDENCE || '70', 10),
    
    // Confidence level for requiring manual review (0-100)
    reviewThreshold: parseInt(process.env.OCR_REVIEW_THRESHOLD || '70', 10),
    
    // High confidence threshold for auto-accept (0-100)
    highConfidenceThreshold: parseInt(process.env.OCR_HIGH_CONFIDENCE_THRESHOLD || '90', 10)
  },

  // A/B Testing Configuration
  abTesting: {
    // Enable A/B testing mode (runs both extraction methods and compares)
    enabled: process.env.OCR_AB_TESTING === 'true', // Default: false
    
    // Percentage of requests to test with queries-only mode (0-100)
    queriesOnlyPercent: parseInt(process.env.OCR_AB_QUERIES_PERCENT || '0', 10),
    
    // Percentage of requests to test with coordinate-only mode (0-100)
    coordinateOnlyPercent: parseInt(process.env.OCR_AB_COORDINATE_PERCENT || '0', 10),
    
    // Log detailed comparison metrics
    logMetrics: process.env.OCR_AB_LOG_METRICS === 'true'
  },

  // Feature flags
  features: {
    // Enable enhanced coordinate-based extraction
    enhancedExtraction: process.env.OCR_ENHANCED_EXTRACTION !== 'false', // Default: true
    
    // Enable validation and auto-correction
    validation: process.env.OCR_VALIDATION !== 'false', // Default: true
    
    // Enable cross-field validation
    crossFieldValidation: process.env.OCR_CROSS_FIELD_VALIDATION !== 'false', // Default: true
    
    // Enable checkbox detection
    checkboxDetection: process.env.OCR_CHECKBOX_DETECTION !== 'false' // Default: true
  },

  // AWS Textract configuration
  textract: {
    // Maximum queries per document (AWS limit: 100)
    maxQueriesPerPage: parseInt(process.env.TEXTRACT_MAX_QUERIES || '50', 10),
    
    // Feature types for standard extraction
    featureTypes: (process.env.TEXTRACT_FEATURE_TYPES || 'FORMS,TABLES').split(','),
    
    // Timeout for Textract API calls (milliseconds)
    timeout: parseInt(process.env.TEXTRACT_TIMEOUT || '30000', 10)
  },

  // Performance optimization
  performance: {
    // Enable parallel processing of front and back pages
    parallelProcessing: process.env.OCR_PARALLEL_PROCESSING !== 'false', // Default: true
    
    // Enable image preprocessing
    imagePreprocessing: process.env.OCR_IMAGE_PREPROCESSING !== 'false', // Default: true
    
    // Cache query results (in-memory, per request)
    cacheQueryResults: process.env.OCR_CACHE_QUERY_RESULTS !== 'false' // Default: true
  }
};

/**
 * Get extraction mode based on A/B testing configuration
 * @returns {string} Extraction mode ('hybrid', 'queries', or 'coordinate')
 */
function getExtractionMode() {
  // If A/B testing disabled, return configured mode
  if (!ocrConfig.abTesting.enabled) {
    return ocrConfig.extractionMode;
  }

  // Random A/B test assignment
  const random = Math.random() * 100;
  
  if (random < ocrConfig.abTesting.queriesOnlyPercent) {
    return 'queries';
  } else if (random < (ocrConfig.abTesting.queriesOnlyPercent + ocrConfig.abTesting.coordinateOnlyPercent)) {
    return 'coordinate';
  } else {
    return 'hybrid';
  }
}

/**
 * Get extraction options for Textract service
 * @param {Object} overrides - Override specific options
 * @returns {Object} Extraction options
 */
function getExtractionOptions(overrides = {}) {
  return {
    useEnhanced: ocrConfig.features.enhancedExtraction,
    useQueries: ocrConfig.useQueries && ocrConfig.extractionMode !== 'coordinate',
    extractionMode: getExtractionMode(),
    confidenceThresholds: ocrConfig.confidenceThresholds,
    ...overrides
  };
}

/**
 * Update OCR configuration dynamically
 * @param {Object} updates - Configuration updates
 */
function updateConfig(updates) {
  Object.assign(ocrConfig, updates);
  console.log('[OCR Config] Configuration updated:', updates);
}

/**
 * Get current configuration
 * @returns {Object} Current OCR configuration
 */
function getConfig() {
  return { ...ocrConfig };
}

module.exports = {
  ocrConfig,
  getExtractionMode,
  getExtractionOptions,
  updateConfig,
  getConfig
};

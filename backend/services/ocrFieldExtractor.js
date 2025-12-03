const sharp = require('sharp');
const { AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { textractClient } = require('../config/aws');
const CheckboxDetector = require('../utils/checkboxDetector');
const templateManager = require('./templateManager');
const { QUERY_ALIAS_MAP } = require('./textractService');
const fs = require('fs');
const path = require('path');

/**
 * OCR Field Extractor Service
 * Coordinate-based field extraction for HTS forms using AWS Textract
 * Updated to use singleton TemplateManager for shared calibrated coordinates
 */

class OCRFieldExtractor {
  constructor() {
    this.checkboxDetector = new CheckboxDetector();
    this.templateManager = templateManager;
    this.templateMetadata = null;
    this.loadTemplate();
  }

  /**
   * Load template metadata from TemplateManager
   */
  loadTemplate(formType = 'doh-hts-2021-v2') {
    try {
      // Use shared template manager instance
      this.templateMetadata = this.templateManager.getTemplateReference();
      console.log(`✅ [OCRFieldExtractor] Loaded template: ${this.templateMetadata.name}`);
      console.log(`✅ [OCRFieldExtractor] Template version: ${this.templateManager.version}, calibrations: ${this.templateManager.calibrationCount}`);
      console.log(`✅ [OCRFieldExtractor] Template has ocrMapping: ${!!this.templateMetadata.ocrMapping}`);
      console.log(`✅ [OCRFieldExtractor] Template has front fields: ${!!this.templateMetadata.ocrMapping?.front?.fields}`);
      console.log(`✅ [OCRFieldExtractor] Template has back fields: ${!!this.templateMetadata.ocrMapping?.back?.fields}`);
      console.log(`✅ [OCRFieldExtractor] Front fields count: ${Object.keys(this.templateMetadata.ocrMapping?.front?.fields || {}).length}`);
      console.log(`✅ [OCRFieldExtractor] Back fields count: ${Object.keys(this.templateMetadata.ocrMapping?.back?.fields || {}).length}`);
    } catch (error) {
      console.error('❌ [OCRFieldExtractor] Failed to load template metadata:', error.message);
      throw new Error('Template metadata not available');
    }
  }

  /**
   * Extract all fields from HTS form images
   * @param {Buffer} frontImageBuffer - Front page image
   * @param {Buffer} backImageBuffer - Back page image
   * @param {Object} options - Extraction options
   * @param {Object} options.queryResults - Query results from Textract Queries API
   * @param {string} options.extractionMode - 'hybrid' (default), 'queries', or 'coordinate'
   * @returns {Promise<Object>} Extracted fields with confidence scores
   */
  async extractAllFields(frontImageBuffer, backImageBuffer, options = {}) {
    try {
      const { queryResults = null, extractionMode = 'hybrid' } = options;
      console.log(`[OCRFieldExtractor] Starting field extraction (mode: ${extractionMode})...`);

      // Validate template metadata
      if (!this.templateMetadata) {
        throw new Error('Template metadata not loaded');
      }
      if (!this.templateMetadata.ocrMapping) {
        throw new Error('Template metadata missing ocrMapping');
      }
      if (!this.templateMetadata.ocrMapping.front || !this.templateMetadata.ocrMapping.front.fields) {
        throw new Error('Template metadata missing ocrMapping.front.fields');
      }
      if (!this.templateMetadata.ocrMapping.back || !this.templateMetadata.ocrMapping.back.fields) {
        throw new Error('Template metadata missing ocrMapping.back.fields');
      }

      // Get image dimensions
      const [frontMeta, backMeta] = await Promise.all([
        sharp(frontImageBuffer).metadata(),
        sharp(backImageBuffer).metadata()
      ]);

      console.log(`[OCRFieldExtractor] Image dimensions: front=${frontMeta.width}x${frontMeta.height}, back=${backMeta.width}x${backMeta.height}`);

      // Run Textract analysis on both pages
      const [frontTextract, backTextract] = await Promise.all([
        this.analyzeDocument(frontImageBuffer),
        this.analyzeDocument(backImageBuffer)
      ]);

      // Extract query results if provided
      const frontQueryResults = queryResults?.front || null;
      const backQueryResults = queryResults?.back || null;

      // Extract fields from front page
      const frontFields = await this.extractPageFields(
        frontImageBuffer,
        frontTextract,
        this.templateMetadata.ocrMapping.front.fields,
        { width: frontMeta.width, height: frontMeta.height },
        frontQueryResults,
        extractionMode
      );

      // Extract fields from back page
      const backFields = await this.extractPageFields(
        backImageBuffer,
        backTextract,
        this.templateMetadata.ocrMapping.back.fields,
        { width: backMeta.width, height: backMeta.height },
        backQueryResults,
        extractionMode
      );

      // Combine results
      const allFields = { ...frontFields, ...backFields };

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(allFields);

      // Calculate extraction method stats
      const extractionMethodStats = {
        query: Object.values(allFields).filter(f => f.extractionMethod === 'query').length,
        coordinate: Object.values(allFields).filter(f => f.extractionMethod && f.extractionMethod.includes('coordinate')).length,
        failed: Object.values(allFields).filter(f => f.extractionMethod === 'failed' || f.extractionMethod === 'error').length
      };

      console.log(`[OCRFieldExtractor] Extraction completed: ${Object.keys(allFields).length} fields, ${overallConfidence.toFixed(1)}% confidence`);
      console.log(`[OCRFieldExtractor] Extraction methods: Query=${extractionMethodStats.query}, Coordinate=${extractionMethodStats.coordinate}, Failed=${extractionMethodStats.failed}`);

      return {
        fields: allFields,
        overallConfidence,
        extractionMode,
        stats: {
          totalFields: Object.keys(allFields).length,
          highConfidence: Object.values(allFields).filter(f => f.confidence > 0.90).length,
          mediumConfidence: Object.values(allFields).filter(f => f.confidence >= 0.70 && f.confidence <= 0.90).length,
          lowConfidence: Object.values(allFields).filter(f => f.confidence < 0.70).length,
          requiresReview: Object.values(allFields).filter(f => f.requiresReview).length,
          extractionMethods: extractionMethodStats
        }
      };
    } catch (error) {
      console.error('[OCRFieldExtractor] Extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract fields from a single page
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {Object} fieldConfigs - Field configurations from template
   * @param {Object} imageDimensions - { width, height }
   * @param {Object} queryResults - Query results from Textract Queries API
   * @param {string} extractionMode - 'hybrid', 'queries', or 'coordinate'
   * @returns {Promise<Object>} Extracted fields
   */
  async extractPageFields(imageBuffer, textractResult, fieldConfigs, imageDimensions, queryResults = null, extractionMode = 'hybrid') {
    const extractedFields = {};

    for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
      try {
        const fieldResult = await this.extractField(
          imageBuffer,
          textractResult,
          fieldName,
          fieldConfig,
          imageDimensions,
          queryResults,
          extractionMode
        );

        extractedFields[fieldName] = fieldResult;
      } catch (error) {
        console.error(`[OCRFieldExtractor] Error extracting field ${fieldName}:`, error.message);
        extractedFields[fieldName] = {
          value: null,
          confidence: 0,
          requiresReview: true,
          error: error.message,
          extractionMethod: 'error'
        };
      }
    }

    return extractedFields;
  }

  /**
   * Extract a single field based on its configuration with hybrid strategy
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {string} fieldName - Field name
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @param {Object} queryResults - Query results from Textract Queries API
   * @param {string} extractionMode - 'hybrid', 'queries', or 'coordinate'
   * @returns {Promise<Object>} Extracted field data
   */
  async extractField(imageBuffer, textractResult, fieldName, fieldConfig, imageDimensions, queryResults = null, extractionMode = 'hybrid') {
    // Multi-strategy extraction: Try all strategies and pick the best result
    const results = [];

    // Strategy 1: Query-based extraction (if available)
    if ((extractionMode === 'queries' || extractionMode === 'hybrid') && queryResults && fieldConfig.query) {
      try {
        const queryResult = this.extractFromQuery(queryResults, fieldName, fieldConfig);
        if (queryResult && queryResult.confidence >= 0.70) {
          queryResult.extractionMethod = 'query';
          queryResult.priority = 1;
          results.push(queryResult);
        }
      } catch (error) {
        console.warn(`[OCRFieldExtractor] Query extraction failed for ${fieldName}:`, error.message);
      }
    }

    // Strategy 2: Coordinate-based extraction (if available)
    if ((extractionMode === 'coordinate' || extractionMode === 'hybrid') && fieldConfig.region) {
      try {
        const coordResult = await this.extractByCoordinate(imageBuffer, textractResult, fieldName, fieldConfig, imageDimensions);
        if (coordResult && coordResult.confidence >= 0.50) {
          coordResult.extractionMethod = coordResult.extractionMethod || 'coordinate';
          coordResult.priority = 2;
          results.push(coordResult);
        }
      } catch (error) {
        console.warn(`[OCRFieldExtractor] Coordinate extraction failed for ${fieldName}:`, error.message);
      }
    }

    // Pick the best result (highest confidence)
    if (results.length > 0) {
      results.sort((a, b) => b.confidence - a.confidence);
      const bestResult = results[0];
      
      // Log which method won
      if (results.length > 1) {
        console.log(`[Strategy] ${fieldName}: ${bestResult.extractionMethod} (${(bestResult.confidence * 100).toFixed(1)}%) beat ${results[1].extractionMethod} (${(results[1].confidence * 100).toFixed(1)}%)`);
      }
      
      return bestResult;
    }

    // If all strategies fail, return low-confidence result requiring review
    return {
      value: null,
      confidence: 0,
      requiresReview: true,
      extractionMethod: 'failed',
      label: fieldConfig.label
    };
  }

  /**
   * Extract field value from query results
   * @param {Object} queryResults - Query results map (alias -> result)
   * @param {string} fieldName - Field name
   * @param {Object} fieldConfig - Field configuration
   * @returns {Object|null} Extracted field data or null
   */
  extractFromQuery(queryResults, fieldName, fieldConfig) {
    if (!queryResults) {
      return null;
    }

    // Strategy 1: Use explicit QUERY_ALIAS_MAP for snake_case -> camelCase conversion
    const explicitAliases = Object.keys(QUERY_ALIAS_MAP).filter(alias => QUERY_ALIAS_MAP[alias] === fieldName);
    
    // Strategy 2: Generate possible snake_case aliases from camelCase fieldName (fallback)
    const generatedAliases = [
      fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''), // firstName -> first_name
      fieldName.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2'), // firstName -> first_name
      fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase(), // testDate -> test_date
      fieldName // Try exact match
    ];
    
    // Combine strategies: prioritize explicit map
    const aliases = [...new Set([...explicitAliases, ...generatedAliases])];
    
    let queryResult = null;
    let matchedAlias = null;
    let matchStrategy = null;
    
    for (const alias of aliases) {
      if (queryResults[alias] && queryResults[alias].text) {
        queryResult = queryResults[alias];
        matchedAlias = alias;
        matchStrategy = explicitAliases.includes(alias) ? 'explicit-map' : 'fallback-regex';
        break;
      }
    }
    
    if (!queryResult || !queryResult.text) {
      // Debug: Show available aliases if field not found
      const availableAliases = Object.keys(queryResults).slice(0, 10).join(', ');
      console.log(`[Query] ❌ No result for ${fieldName} (tried: ${aliases.slice(0, 3).join(', ')}...) | Available: ${availableAliases}...`);
      return null;
    }

    // Success log with strategy indicator
    const previewText = queryResult.text.length > 50 ? queryResult.text.substring(0, 50) + '...' : queryResult.text;
    console.log(`[Query] ✅ Matched ${fieldName} -> ${matchedAlias} (${matchStrategy}): "${previewText}" (${queryResult.confidence.toFixed(1)}%)`);

    return {
      value: queryResult.text,
      confidence: queryResult.confidence / 100, // Normalize to 0-1
      requiresReview: queryResult.confidence < 75,
      boundingBox: queryResult.boundingBox,
      queryText: queryResult.queryText,
      label: fieldConfig.label,
      matchedAlias,
      matchStrategy
    };
  }

  /**
   * Extract field by coordinate-based methods
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {string} fieldName - Field name
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Extracted field data
   */
  async extractByCoordinate(imageBuffer, textractResult, fieldName, fieldConfig, imageDimensions) {
    const extractionMethod = fieldConfig.extractionMethod || 'form-field';

    switch (extractionMethod) {
      case 'form-field':
        return this.extractTextField(textractResult, fieldConfig, imageDimensions);

      case 'checkbox-detection':
        return this.extractCheckboxField(imageBuffer, fieldConfig, imageDimensions);

      case 'checkbox-multiple':
        return this.extractMultipleCheckboxes(imageBuffer, fieldConfig, imageDimensions);

      case 'checkbox-with-text':
        return this.extractCheckboxWithText(imageBuffer, textractResult, fieldConfig, imageDimensions);

      case 'checkbox-with-nested-fields':
        return this.extractCheckboxWithNestedFields(imageBuffer, textractResult, fieldConfig, imageDimensions);

      case 'signature-detection':
        return this.extractSignature(imageBuffer, fieldConfig, imageDimensions);

      case 'checkbox-matrix-with-dates':
        return this.extractCheckboxMatrix(imageBuffer, textractResult, fieldConfig, imageDimensions);

      case 'checkbox-multiple-with-text':
        return this.extractMultipleCheckboxesWithText(imageBuffer, textractResult, fieldConfig, imageDimensions);

      default:
        console.warn(`[OCRFieldExtractor] Unknown extraction method: ${extractionMethod}`);
        return this.extractTextField(textractResult, fieldConfig, imageDimensions);
    }
  }

  /**
   * Extract text field from region
   * @param {Object} textractResult - Textract analysis result
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Object} Extracted text with confidence
   */
  extractTextField(textractResult, fieldConfig, imageDimensions) {
    const region = fieldConfig.region;
    
    // Validate region exists
    if (!region || region.x === undefined || region.y === undefined || !region.width || !region.height) {
      console.warn(`[TextField] Field ${fieldConfig.label} missing valid region coordinates:`, JSON.stringify(region));
      return {
        value: null,
        confidence: 0,
        requiresReview: true,
        extractionMethod: 'coordinate-no-region',
        error: 'Missing or invalid region coordinates',
        label: fieldConfig.label
      };
    }
    
    const blocks = textractResult.Blocks || [];
    const lineBlocks = blocks.filter(b => b.BlockType === 'LINE' && b.Geometry);

    console.log(`[TextField] Field: ${fieldConfig.label}, Total blocks: ${blocks.length}, LINE blocks: ${lineBlocks.length}, Region: x=${region.x.toFixed(3)}, y=${region.y.toFixed(3)}, w=${region.width.toFixed(3)}, h=${region.height.toFixed(3)}`);

    // Add tolerance for region matching (2% of image)
    const tolerance = 0.02;

    // Find blocks within the region
    const blocksInRegion = lineBlocks.filter(block => {
      const bbox = block.Geometry.BoundingBox;
      const blockCenterX = bbox.Left + bbox.Width / 2;
      const blockCenterY = bbox.Top + bbox.Height / 2;

      // Region uses normalized coordinates (0-1)
      const regionLeft = region.x;
      const regionRight = region.x + region.width;
      const regionTop = region.y;
      const regionBottom = region.y + region.height;

      // Check if block center is within region (with tolerance)
      const inRegion = (
        blockCenterX >= (regionLeft - tolerance) &&
        blockCenterX <= (regionRight + tolerance) &&
        blockCenterY >= (regionTop - tolerance) &&
        blockCenterY <= (regionBottom + tolerance)
      );

      if (inRegion) {
        console.log(`[TextField Match] "${block.Text}" at (${blockCenterX.toFixed(3)}, ${blockCenterY.toFixed(3)})`);
      }

      return inRegion;
    });

    if (blocksInRegion.length === 0) {
      console.log(`[TextField] No blocks found for ${fieldConfig.label} in region (${region.x.toFixed(3)}, ${region.y.toFixed(3)})`);
      return {
        value: null,
        confidence: 0.20,
        requiresReview: true,
        extractionMethod: 'coordinate-no-blocks',
        label: fieldConfig.label,
        debugInfo: {
          region: region,
          totalLineBlocks: lineBlocks.length,
          tolerance: tolerance
        }
      };
    }

    // Combine text from all blocks in region
    const text = blocksInRegion.map(b => b.Text).join(' ').trim();
    const avgConfidence = blocksInRegion.reduce((sum, b) => sum + (b.Confidence || 0), 0) / blocksInRegion.length;

    // Validate against pattern if provided
    let validationScore = 1.0;
    if (fieldConfig.pattern && text) {
      const regex = new RegExp(fieldConfig.pattern);
      validationScore = regex.test(text) ? 1.0 : 0.5;
    }

    const finalConfidence = (avgConfidence / 100) * validationScore;

    return {
      value: text || null,
      confidence: finalConfidence,
      requiresReview: finalConfidence < 0.70 || !text,
      extractionMethod: 'form-field',
      label: fieldConfig.label,
      type: fieldConfig.type,
      blocksFound: blocksInRegion.length
    };
  }

  /**
   * Extract checkbox field
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Checkbox state
   */
  async extractCheckboxField(imageBuffer, fieldConfig, imageDimensions) {
    const options = fieldConfig.options || [];
    const results = [];

    console.log(`[Checkbox] Field: ${fieldConfig.label}, Options: ${options.length}, Image: ${imageDimensions.width}x${imageDimensions.height}`);

    for (const option of options) {
      console.log(`[Checkbox] Checking option "${option.value}" at region: x=${option.checkbox.x}, y=${option.checkbox.y}, w=${option.checkbox.width}, h=${option.checkbox.height}`);
      
      const detection = await this.checkboxDetector.detectCheckbox(
        imageBuffer,
        option.checkbox,
        imageDimensions
      );

      if (detection.error) {
        console.warn(`[Checkbox] Error for option "${option.value}": ${detection.error}`);
      } else {
        console.log(`[Checkbox] Option "${option.value}": checked=${detection.checked}, confidence=${detection.confidence.toFixed(2)}, density=${detection.pixelDensity.toFixed(3)}`);
      }

      results.push({
        value: option.value,
        checked: detection.checked,
        confidence: detection.confidence,
        pixelDensity: detection.pixelDensity,
        requiresReview: detection.requiresReview
      });
    }

    // Find checked option (highest confidence checked)
    const checkedOptions = results.filter(r => r.checked);
    const selectedOption = checkedOptions.length > 0 
      ? checkedOptions.reduce((max, r) => r.confidence > max.confidence ? r : max)
      : null;

    return {
      value: selectedOption ? selectedOption.value : null,
      confidence: selectedOption ? selectedOption.confidence : 0,
      requiresReview: selectedOption ? selectedOption.requiresReview : true,
      extractionMethod: 'checkbox-detection',
      label: fieldConfig.label,
      allOptions: results
    };
  }

  /**
   * Extract multiple checkboxes (multi-select)
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Multiple checkbox states
   */
  async extractMultipleCheckboxes(imageBuffer, fieldConfig, imageDimensions) {
    const options = fieldConfig.options || [];
    const results = [];

    for (const option of options) {
      const detection = await this.checkboxDetector.detectCheckbox(
        imageBuffer,
        option.checkbox,
        imageDimensions
      );

      if (detection.checked) {
        results.push({
          value: option.value,
          confidence: detection.confidence,
          requiresReview: detection.requiresReview
        });
      }
    }

    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;

    return {
      value: results.map(r => r.value),
      confidence: avgConfidence,
      requiresReview: results.some(r => r.requiresReview) || results.length === 0,
      extractionMethod: 'checkbox-multiple',
      label: fieldConfig.label,
      selectedCount: results.length
    };
  }

  /**
   * Extract checkbox with associated text field
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Checkbox and text data
   */
  async extractCheckboxWithText(imageBuffer, textractResult, fieldConfig, imageDimensions) {
    const checkboxes = fieldConfig.checkboxes || [];
    const results = [];

    for (const checkboxOption of checkboxes) {
      const detection = await this.checkboxDetector.detectCheckbox(
        imageBuffer,
        checkboxOption.checkbox,
        imageDimensions
      );

      let textValue = null;
      let textConfidence = 0;

      // If checkbox is checked and has text field, extract text
      if (detection.checked && checkboxOption.textField) {
        const textResult = this.extractTextField(
          textractResult,
          { region: checkboxOption.textField },
          imageDimensions
        );
        textValue = textResult.value;
        textConfidence = textResult.confidence;
      }

      results.push({
        option: checkboxOption.value,
        checked: detection.checked,
        checkboxConfidence: detection.confidence,
        text: textValue,
        textConfidence: textConfidence,
        requiresReview: detection.requiresReview
      });
    }

    const checkedOption = results.find(r => r.checked);

    return {
      value: checkedOption ? checkedOption.option : null,
      text: checkedOption ? checkedOption.text : null,
      confidence: checkedOption 
        ? (checkedOption.checkboxConfidence + (checkedOption.textConfidence || 0)) / (checkedOption.text ? 2 : 1)
        : 0,
      requiresReview: checkedOption ? checkedOption.requiresReview : true,
      extractionMethod: 'checkbox-with-text',
      label: fieldConfig.label,
      allOptions: results
    };
  }

  /**
   * Extract checkbox with nested sub-fields
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Checkbox and nested field data
   */
  async extractCheckboxWithNestedFields(imageBuffer, textractResult, fieldConfig, imageDimensions) {
    const checkboxes = fieldConfig.checkboxes || [];
    const results = [];

    for (const checkboxOption of checkboxes) {
      const detection = await this.checkboxDetector.detectCheckbox(
        imageBuffer,
        checkboxOption.checkbox,
        imageDimensions
      );

      let subFields = {};

      // If checkbox is checked and has sub-fields, extract them
      if (detection.checked && checkboxOption.subFields) {
        for (const [subFieldName, subFieldConfig] of Object.entries(checkboxOption.subFields)) {
          const subFieldResult = this.extractTextField(
            textractResult,
            { region: subFieldConfig },
            imageDimensions
          );
          subFields[subFieldName] = subFieldResult.value;
        }
      }

      results.push({
        option: checkboxOption.value,
        checked: detection.checked,
        confidence: detection.confidence,
        subFields: subFields,
        requiresReview: detection.requiresReview
      });
    }

    const checkedOption = results.find(r => r.checked);

    return {
      value: checkedOption ? checkedOption.option : null,
      subFields: checkedOption ? checkedOption.subFields : {},
      confidence: checkedOption ? checkedOption.confidence : 0,
      requiresReview: checkedOption ? checkedOption.requiresReview : true,
      extractionMethod: 'checkbox-with-nested-fields',
      label: fieldConfig.label,
      allOptions: results
    };
  }

  /**
   * Extract signature presence
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Signature presence
   */
  async extractSignature(imageBuffer, fieldConfig, imageDimensions) {
    try {
      const pixelBox = this.checkboxDetector.transformCoordinates(
        fieldConfig.region,
        imageDimensions.width,
        imageDimensions.height
      );

      const signatureRegion = await sharp(imageBuffer)
        .extract({
          left: pixelBox.left,
          top: pixelBox.top,
          width: Math.max(1, pixelBox.width),
          height: Math.max(1, pixelBox.height)
        })
        .grayscale()
        .toBuffer();

      // Analyze pixel density (signature = dark marks)
      const { data, info } = await sharp(signatureRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let darkPixels = 0;
      const threshold = 200; // Lighter threshold for signature detection

      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i] < threshold) {
          darkPixels++;
        }
      }

      const density = darkPixels / (data.length / info.channels);
      const hasSignature = density > 0.05; // >5% dark pixels = signature present

      return {
        value: hasSignature,
        confidence: hasSignature ? Math.min(0.90, 0.6 + density) : 0.85,
        requiresReview: density > 0.02 && density < 0.08, // Borderline cases
        extractionMethod: 'signature-detection',
        label: fieldConfig.label,
        pixelDensity: density
      };
    } catch (error) {
      return {
        value: false,
        confidence: 0,
        requiresReview: true,
        error: error.message
      };
    }
  }

  /**
   * Extract checkbox matrix with date fields
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Matrix data
   */
  async extractCheckboxMatrix(imageBuffer, textractResult, fieldConfig, imageDimensions) {
    const sections = fieldConfig.sections || [];
    const results = [];

    for (const section of sections) {
      const sectionResult = {
        label: section.label,
        options: []
      };

      if (section.options) {
        // Section with Yes/No options
        for (const option of section.options) {
          const detection = await this.checkboxDetector.detectCheckbox(
            imageBuffer,
            option.checkbox,
            imageDimensions
          );

          const optionData = {
            value: option.value,
            checked: detection.checked,
            confidence: detection.confidence
          };

          // Extract sub-fields if checked
          if (detection.checked && option.subFields) {
            optionData.subFields = {};
            for (const [key, config] of Object.entries(option.subFields)) {
              const textResult = this.extractTextField(
                textractResult,
                { region: config },
                imageDimensions
              );
              optionData.subFields[key] = textResult.value;
            }
          }

          sectionResult.options.push(optionData);
        }
      } else if (section.checkbox) {
        // Simple checkbox with optional date field
        const detection = await this.checkboxDetector.detectCheckbox(
          imageBuffer,
          section.checkbox,
          imageDimensions
        );

        sectionResult.checked = detection.checked;
        sectionResult.confidence = detection.confidence;

        if (detection.checked && section.dateField) {
          const dateResult = this.extractTextField(
            textractResult,
            { region: section.dateField },
            imageDimensions
          );
          sectionResult.date = dateResult.value;
        }
      }

      results.push(sectionResult);
    }

    return {
      value: results,
      confidence: 0.80, // Matrix confidence is approximate
      requiresReview: false,
      extractionMethod: 'checkbox-matrix-with-dates',
      label: fieldConfig.label
    };
  }

  /**
   * Extract multiple checkboxes with optional text fields
   * @param {Buffer} imageBuffer - Page image buffer
   * @param {Object} textractResult - Textract analysis result
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} imageDimensions - { width, height }
   * @returns {Promise<Object>} Multiple selections with text
   */
  async extractMultipleCheckboxesWithText(imageBuffer, textractResult, fieldConfig, imageDimensions) {
    const options = fieldConfig.options || [];
    const results = [];

    for (const option of options) {
      const detection = await this.checkboxDetector.detectCheckbox(
        imageBuffer,
        option.checkbox,
        imageDimensions
      );

      if (detection.checked) {
        const result = {
          value: option.value,
          confidence: detection.confidence
        };

        // Extract text if available
        if (option.textField) {
          const textResult = this.extractTextField(
            textractResult,
            { region: option.textField },
            imageDimensions
          );
          result.text = textResult.value;
          result.textConfidence = textResult.confidence;
        }

        results.push(result);
      }
    }

    return {
      value: results,
      confidence: results.length > 0 
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0,
      requiresReview: results.length === 0,
      extractionMethod: 'checkbox-multiple-with-text',
      label: fieldConfig.label,
      selectedCount: results.length
    };
  }

  /**
   * Run AWS Textract analysis on document
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} Textract result
   */
  async analyzeDocument(imageBuffer) {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: imageBuffer
        },
        FeatureTypes: ['FORMS', 'TABLES']
      });

      const response = await textractClient.send(command);
      
      // Debug logging
      console.log(`[Textract Response] Blocks: ${response.Blocks?.length || 0}`);
      console.log(`[Textract Response] Pages: ${response.DocumentMetadata?.Pages || 0}`);
      
      if (!response.Blocks || response.Blocks.length === 0) {
        console.error('[Textract Response] ❌ No blocks returned!');
      } else {
        const blockTypes = {};
        response.Blocks.forEach(b => {
          blockTypes[b.BlockType] = (blockTypes[b.BlockType] || 0) + 1;
        });
        console.log(`[Textract Response] Block types: ${JSON.stringify(blockTypes)}`);
        
        // Sample first few LINE blocks
        const lineBlocks = response.Blocks.filter(b => b.BlockType === 'LINE').slice(0, 3);
        lineBlocks.forEach(b => {
          console.log(`[Textract Sample] "${b.Text}" at (${b.Geometry?.BoundingBox?.Left?.toFixed(3)}, ${b.Geometry?.BoundingBox?.Top?.toFixed(3)})`);
        });
      }
      
      return response;
    } catch (error) {
      console.error('[OCRFieldExtractor] Textract error:', error.message);
      throw error;
    }
  }

  /**
   * Calculate overall confidence from all fields
   * @param {Object} fields - Extracted fields
   * @returns {number} Overall confidence percentage
   */
  calculateOverallConfidence(fields) {
    const fieldValues = Object.values(fields);
    if (fieldValues.length === 0) return 0;

    // Weight required fields higher
    const requiredFields = this.templateMetadata?.validationRules?.requiredFields || [];
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [fieldName, fieldData] of Object.entries(fields)) {
      const weight = requiredFields.includes(fieldName) ? 2 : 1;
      totalWeight += weight;
      weightedSum += (fieldData.confidence || 0) * weight;
    }

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }
}

module.exports = new OCRFieldExtractor();

/**
 * Template-based field extraction for DOH HTS Form 2021
 * Uses form template coordinates for precise field location
 */
class TemplateMatcher {
  constructor() {
    this.templates = this.loadTemplates();
  }

  /**
   * Load DOH HTS Form 2021 field coordinate templates
   * Coordinates are relative positions (0-1 range) on the form
   */
  loadTemplates() {
    return {
      'DOH_HTS_2021': {
        front: {
          // Personal Information Section
          philhealthNumber: { x: 0.15, y: 0.12, w: 0.40, h: 0.03 },
          fullName: { x: 0.15, y: 0.18, w: 0.70, h: 0.03 },
          birthDate: { x: 0.15, y: 0.24, w: 0.25, h: 0.03 },
          age: { x: 0.45, y: 0.24, w: 0.10, h: 0.03 },
          sex: { x: 0.60, y: 0.24, w: 0.15, h: 0.03 },
          civilStatus: { x: 0.15, y: 0.30, w: 0.25, h: 0.03 },
          
          // Contact Information
          address: { x: 0.15, y: 0.36, w: 0.70, h: 0.04 },
          contactNumber: { x: 0.15, y: 0.42, w: 0.35, h: 0.03 },
          
          // Medical Information
          testResult: { x: 0.15, y: 0.75, w: 0.30, h: 0.05 },
          testType: { x: 0.15, y: 0.68, w: 0.35, h: 0.03 },
          
          // Additional fields can be added as needed
        },
        back: {
          // Back side fields
          testDate: { x: 0.15, y: 0.10, w: 0.25, h: 0.03 },
          counselorName: { x: 0.15, y: 0.85, w: 0.40, h: 0.03 },
          facilityName: { x: 0.15, y: 0.15, w: 0.50, h: 0.03 },
          
          // Additional back fields can be added
        }
      }
    };
  }

  /**
   * Extract field value using template coordinates
   * @param {Array} blocks - Textract blocks from document
   * @param {Object} template - Template object for specific form side
   * @param {string} fieldName - Name of field to extract
   * @returns {Object|null} Extracted field data or null
   */
  extractFieldByTemplate(blocks, template, fieldName) {
    const fieldCoords = template[fieldName];
    if (!fieldCoords) {
      console.log(`[TemplateMatcher] No template coordinates for field: ${fieldName}`);
      return null;
    }

    // Find blocks within field boundaries
    const matchingBlocks = blocks.filter(block => {
      if (block.BlockType !== 'LINE') return false;

      const bbox = block.Geometry.BoundingBox;

      // Check if block center is within field area
      const blockCenterX = bbox.Left + (bbox.Width / 2);
      const blockCenterY = bbox.Top + (bbox.Height / 2);

      const inXRange = blockCenterX >= fieldCoords.x && 
                       blockCenterX <= (fieldCoords.x + fieldCoords.w);
      const inYRange = blockCenterY >= fieldCoords.y && 
                       blockCenterY <= (fieldCoords.y + fieldCoords.h);

      return inXRange && inYRange;
    });

    if (matchingBlocks.length === 0) {
      console.log(`[TemplateMatcher] No blocks found for field: ${fieldName}`);
      return null;
    }

    // Combine text from matching blocks
    const text = matchingBlocks
      .sort((a, b) => a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top)
      .map(block => block.Text)
      .join(' ');

    const confidence = matchingBlocks.reduce((sum, b) => sum + b.Confidence, 0) / matchingBlocks.length;

    console.log(`[TemplateMatcher] Extracted ${fieldName}: "${text}" (${confidence.toFixed(1)}% confidence)`);

    return {
      text: text.trim(),
      confidence,
      method: 'template',
      blockCount: matchingBlocks.length
    };
  }

  /**
   * Get template for specific form
   * @param {string} formType - Form type identifier
   * @returns {Object|null} Template object or null
   */
  getTemplate(formType = 'DOH_HTS_2021') {
    return this.templates[formType] || null;
  }

  /**
   * Check if template exists for form type
   * @param {string} formType - Form type identifier
   * @returns {boolean} True if template exists
   */
  hasTemplate(formType) {
    return !!this.templates[formType];
  }

  /**
   * Extract multiple fields using template
   * @param {Array} blocks - Textract blocks
   * @param {Object} template - Template for form side
   * @param {Array} fieldNames - Array of field names to extract
   * @returns {Object} Object with extracted field data
   */
  extractMultipleFields(blocks, template, fieldNames) {
    const results = {};
    
    for (const fieldName of fieldNames) {
      const extracted = this.extractFieldByTemplate(blocks, template, fieldName);
      if (extracted) {
        results[fieldName] = extracted;
      }
    }
    
    return results;
  }
}

module.exports = new TemplateMatcher();

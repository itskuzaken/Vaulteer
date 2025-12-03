/**
 * OCR Region Calibration Tool
 * Helps identify and fix misaligned region coordinates by comparing
 * expected field locations with actual Textract block positions
 */

const fs = require('fs');
const path = require('path');

class OCRRegionCalibrator {
  constructor() {
    this.templatePath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
    this.template = null;
    this.loadTemplate();
  }

  loadTemplate() {
    try {
      this.template = JSON.parse(fs.readFileSync(this.templatePath, 'utf8'));
      console.log(`✅ Loaded template: ${this.template.name}`);
    } catch (error) {
      console.error('❌ Failed to load template:', error.message);
      throw error;
    }
  }

  /**
   * Analyze query results to find actual field positions
   * @param {Object} queryResults - Query results from Textract (front/back)
   * @param {Object} textractResults - Full Textract response (front/back)
   * @returns {Object} Calibration report with suggested coordinate adjustments
   */
  analyzeFieldPositions(queryResults, textractResults) {
    const report = {
      front: this.analyzePageFields('front', queryResults.front, textractResults.front),
      back: this.analyzePageFields('back', queryResults.back, textractResults.back)
    };

    return report;
  }

  /**
   * Analyze fields on a single page
   */
  analyzePageFields(pageName, queryResults, textractResult) {
    const fieldConfigs = this.template.ocrMapping[pageName].fields;
    const analysis = {
      totalFields: Object.keys(fieldConfigs).length,
      queryMatched: 0,
      coordinateMismatch: [],
      suggestions: []
    };

    for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
      // Try to find query result for this field
      const queryAlias = this.getQueryAlias(fieldName, queryResults);
      
      if (queryAlias && queryResults[queryAlias]) {
        analysis.queryMatched++;
        
        const queryResult = queryResults[queryAlias];
        const expectedRegion = fieldConfig.region;
        const actualBBox = queryResult.boundingBox;

        // Calculate distance between expected and actual positions
        if (expectedRegion && actualBBox) {
          const expectedCenterX = expectedRegion.x + expectedRegion.width / 2;
          const expectedCenterY = expectedRegion.y + expectedRegion.height / 2;
          const actualCenterX = actualBBox.Left + actualBBox.Width / 2;
          const actualCenterY = actualBBox.Top + actualBBox.Height / 2;

          const distanceX = Math.abs(expectedCenterX - actualCenterX);
          const distanceY = Math.abs(expectedCenterY - actualCenterY);
          const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

          // Flag mismatches > 5% of page
          if (totalDistance > 0.05) {
            analysis.coordinateMismatch.push({
              fieldName,
              label: fieldConfig.label,
              query: queryResult.text?.substring(0, 30),
              confidence: queryResult.confidence,
              expected: {
                x: expectedRegion.x.toFixed(3),
                y: expectedRegion.y.toFixed(3),
                width: expectedRegion.width.toFixed(3),
                height: expectedRegion.height.toFixed(3)
              },
              actual: {
                x: actualBBox.Left.toFixed(3),
                y: actualBBox.Top.toFixed(3),
                width: actualBBox.Width.toFixed(3),
                height: actualBBox.Height.toFixed(3)
              },
              distance: {
                x: distanceX.toFixed(3),
                y: distanceY.toFixed(3),
                total: totalDistance.toFixed(3)
              }
            });

            // Generate suggestion for coordinate update
            analysis.suggestions.push({
              fieldName,
              label: fieldConfig.label,
              suggestedRegion: {
                x: parseFloat(actualBBox.Left.toFixed(3)),
                y: parseFloat(actualBBox.Top.toFixed(3)),
                width: parseFloat(actualBBox.Width.toFixed(3)),
                height: parseFloat(actualBBox.Height.toFixed(3))
              },
              reasoning: `Query matched with ${queryResult.confidence}% confidence at different location`
            });
          }
        }
      }
    }

    return analysis;
  }

  /**
   * Get query alias for field name
   */
  getQueryAlias(fieldName, queryResults) {
    const aliases = [
      fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
      fieldName.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2'),
      fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase(),
      fieldName
    ];

    for (const alias of aliases) {
      if (queryResults && queryResults[alias]) {
        return alias;
      }
    }

    return null;
  }

  /**
   * Generate calibration report in markdown format
   */
  generateReport(analysis) {
    let markdown = '# OCR Region Calibration Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;

    for (const [pageName, pageAnalysis] of Object.entries(analysis)) {
      markdown += `## ${pageName.toUpperCase()} Page\n\n`;
      markdown += `- Total fields: ${pageAnalysis.totalFields}\n`;
      markdown += `- Query matched: ${pageAnalysis.queryMatched}\n`;
      markdown += `- Coordinate mismatches: ${pageAnalysis.coordinateMismatch.length}\n\n`;

      if (pageAnalysis.coordinateMismatch.length > 0) {
        markdown += '### Coordinate Mismatches\n\n';
        markdown += '| Field | Label | Distance | Expected (x,y) | Actual (x,y) | Query Value |\n';
        markdown += '|-------|-------|----------|----------------|--------------|-------------|\n';

        for (const mismatch of pageAnalysis.coordinateMismatch) {
          markdown += `| ${mismatch.fieldName} | ${mismatch.label} | ${mismatch.distance.total} | `;
          markdown += `(${mismatch.expected.x}, ${mismatch.expected.y}) | `;
          markdown += `(${mismatch.actual.x}, ${mismatch.actual.y}) | `;
          markdown += `${mismatch.query || 'N/A'} |\n`;
        }

        markdown += '\n';
      }

      if (pageAnalysis.suggestions.length > 0) {
        markdown += '### Suggested Coordinate Updates\n\n';
        markdown += '```json\n';
        
        const suggestedUpdates = {};
        for (const suggestion of pageAnalysis.suggestions) {
          suggestedUpdates[suggestion.fieldName] = {
            label: suggestion.label,
            region: suggestion.suggestedRegion,
            reasoning: suggestion.reasoning
          };
        }

        markdown += JSON.stringify(suggestedUpdates, null, 2);
        markdown += '\n```\n\n';
      }
    }

    return markdown;
  }

  /**
   * Save calibration report to file
   */
  saveReport(analysis, outputPath) {
    const report = this.generateReport(analysis);
    fs.writeFileSync(outputPath, report, 'utf8');
    console.log(`✅ Calibration report saved to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Apply calibration automatically based on query results
   * Updates template metadata with improved coordinates
   * @param {Object} queryResults - Query results from Textract
   * @param {number} confidenceThreshold - Minimum confidence to apply (default: 85%)
   * @returns {Object} Update statistics
   */
  autoCalibrate(queryResults, confidenceThreshold = 85) {
    const updates = { front: {}, back: {} };
    const stats = { front: 0, back: 0, skipped: 0 };

    for (const pageName of ['front', 'back']) {
      const pageResults = queryResults[pageName] || {};
      const fieldConfigs = this.template.ocrMapping[pageName].fields;

      for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
        const queryAlias = this.getQueryAlias(fieldName, pageResults);
        
        if (queryAlias && pageResults[queryAlias]) {
          const queryResult = pageResults[queryAlias];
          
          // Only auto-calibrate high-confidence results
          if (queryResult.confidence >= confidenceThreshold && queryResult.boundingBox) {
            const bbox = queryResult.boundingBox;
            const newRegion = {
              x: parseFloat(bbox.Left.toFixed(3)),
              y: parseFloat(bbox.Top.toFixed(3)),
              width: parseFloat(bbox.Width.toFixed(3)),
              height: parseFloat(bbox.Height.toFixed(3))
            };

            // Calculate distance from current region
            const currentRegion = fieldConfig.region || {};
            const distance = this.calculateDistance(currentRegion, newRegion);

            // Only update if distance is significant (> 2%)
            if (distance > 0.02) {
              updates[pageName][fieldName] = newRegion;
              stats[pageName]++;
            }
          } else {
            stats.skipped++;
          }
        }
      }
    }

    return { updates, stats };
  }

  /**
   * Calculate distance between two regions
   */
  calculateDistance(region1, region2) {
    if (!region1.x || !region2.x) return 1; // Max distance if missing

    const centerX1 = region1.x + (region1.width || 0) / 2;
    const centerY1 = region1.y + (region1.height || 0) / 2;
    const centerX2 = region2.x + region2.width / 2;
    const centerY2 = region2.y + region2.height / 2;

    const distanceX = Math.abs(centerX1 - centerX2);
    const distanceY = Math.abs(centerY1 - centerY2);

    return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  }

  /**
   * Apply calibration updates to template (in-memory only, does not save)
   */
  applyUpdates(updates) {
    let totalUpdated = 0;

    for (const [pageName, pageUpdates] of Object.entries(updates)) {
      for (const [fieldName, newRegion] of Object.entries(pageUpdates)) {
        if (this.template.ocrMapping[pageName].fields[fieldName]) {
          this.template.ocrMapping[pageName].fields[fieldName].region = newRegion;
          totalUpdated++;
        }
      }
    }

    console.log(`✅ Applied ${totalUpdated} calibration updates to template (in-memory)`);
    return totalUpdated;
  }

  /**
   * Apply suggested coordinate updates to template metadata
   */
  applyCalibration(suggestions, outputPath = null) {
    const updatedTemplate = JSON.parse(JSON.stringify(this.template)); // Deep clone

    for (const [pageName, pageAnalysis] of Object.entries(suggestions)) {
      if (!pageAnalysis.suggestions) continue;

      for (const suggestion of pageAnalysis.suggestions) {
        const fieldConfig = updatedTemplate.ocrMapping[pageName].fields[suggestion.fieldName];
        
        if (fieldConfig && fieldConfig.region) {
          console.log(`🔧 Updating ${suggestion.fieldName}: (${fieldConfig.region.x.toFixed(3)}, ${fieldConfig.region.y.toFixed(3)}) -> (${suggestion.suggestedRegion.x.toFixed(3)}, ${suggestion.suggestedRegion.y.toFixed(3)})`);
          
          fieldConfig.region = suggestion.suggestedRegion;
        }
      }
    }

    // Save updated template
    const savePath = outputPath || this.templatePath.replace('.json', '-calibrated.json');
    fs.writeFileSync(savePath, JSON.stringify(updatedTemplate, null, 2), 'utf8');
    console.log(`✅ Calibrated template saved to: ${savePath}`);

    return savePath;
  }
}

module.exports = OCRRegionCalibrator;

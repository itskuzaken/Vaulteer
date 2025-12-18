/**
 * Unit tests for buildConditionalFields() function
 * Tests conditional parent-child field relationship building
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock data helpers
function createMockField(fieldName, value, confidence = 85, geometry = null) {
  return {
    value,
    confidence,
    extractionMethod: 'test',
    geometry: geometry || {
      BoundingBox: {
        Left: 0.1,
        Top: 0.1,
        Width: 0.2,
        Height: 0.05
      }
    }
  };
}

function createMockCheckboxField(fieldName, selectionStatus, confidence = 90, left = 0.1, top = 0.1) {
  return {
    value: selectionStatus,
    confidence,
    selectionStatus,
    extractionMethod: 'checkbox',
    geometry: {
      BoundingBox: {
        Left: left,
        Top: top,
        Width: 0.02,
        Height: 0.02
      }
    }
  };
}

function createMockKVPair(keyText, valueText, confidence = 85, left = 0.15, top = 0.12) {
  return {
    Key: {
      Text: keyText,
      Confidence: confidence,
      Geometry: {
        BoundingBox: {
          Left: left,
          Top: top,
          Width: 0.15,
          Height: 0.03
        }
      }
    },
    Value: {
      Text: valueText,
      Confidence: confidence
    }
  };
}

// Import the function to test (you may need to adjust the path)
// For now, we'll simulate it since it's not exported yet
function buildConditionalFields(allFields, frontKVPairs = [], backKVPairs = []) {
  const conditionalMappings = [
    {
      parent: 'riskSexMale',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskSexFemale',
      pageType: 'back',
      nested: {
        yes: ['total', 'firstDate', 'lastDate'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['total']
    },
    {
      parent: 'riskBloodTransfusion',
      pageType: 'back',
      nested: {
        yes: ['date'],
        no: []
      },
      proximityRadius: 0.15,
      requiredFields: ['date']
    }
  ];

  const kvPairs = [...frontKVPairs, ...backKVPairs];

  for (const mapping of conditionalMappings) {
    const { parent, nested, proximityRadius, requiredFields } = mapping;
    const parentField = allFields[parent];

    if (!parentField || parentField.value !== 'SELECTED') {
      continue;
    }

    const parentGeometry = parentField.geometry;
    if (!parentGeometry || !parentGeometry.BoundingBox) {
      continue;
    }

    const parentBox = parentGeometry.BoundingBox;
    const components = { yes: {}, no: {} };

    let foundNearby = false;
    for (const childFieldName of nested.yes) {
      const nearbyFields = kvPairs.filter(kv => {
        if (!kv.Key || !kv.Key.Geometry || !kv.Key.Geometry.BoundingBox) return false;
        
        const kvBox = kv.Key.Geometry.BoundingBox;
        const horizontalDist = Math.abs(kvBox.Left - parentBox.Left);
        const verticalDist = Math.abs(kvBox.Top - parentBox.Top);
        
        return horizontalDist < proximityRadius && verticalDist < proximityRadius;
      });

      if (nearbyFields.length > 0) foundNearby = true;

      let childValue = null;
      let childConfidence = 0;
      let childSource = 'proximity';

      for (const kv of nearbyFields) {
        const keyText = kv.Key.Text.toLowerCase();
        const valueText = kv.Value?.Text || '';

        if (childFieldName === 'total') {
          if ((keyText.includes('total') || keyText.includes('number') || keyText.includes('partner')) && /^\d+$/.test(valueText)) {
            childValue = parseInt(valueText, 10);
            childConfidence = kv.Key.Confidence;
            childSource = 'pattern:total';
            break;
          }
        } else if (childFieldName === 'firstDate' || childFieldName === 'lastDate') {
          const isFirstDate = childFieldName === 'firstDate' && (keyText.includes('first') || keyText.includes('earliest'));
          const isLastDate = childFieldName === 'lastDate' && (keyText.includes('last') || keyText.includes('recent') || keyText.includes('latest'));
          
          if ((isFirstDate || isLastDate) && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(valueText)) {
            childValue = valueText;
            childConfidence = kv.Key.Confidence;
            childSource = `pattern:${childFieldName}`;
            break;
          }
        } else if (childFieldName === 'date') {
          if ((keyText.includes('date') || keyText.includes('when')) && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(valueText)) {
            childValue = valueText;
            childConfidence = kv.Key.Confidence;
            childSource = 'pattern:date';
            break;
          }
        }
      }

      if (childValue !== null) {
        components.yes[childFieldName] = {
          value: childValue,
          confidence: childConfidence,
          extractionMethod: 'conditional',
          source: childSource
        };
      }
    }

    const missingRequired = requiredFields.filter(field => !components.yes[field]);

    // Only attach components if we found nearby candidate fields OR we successfully parsed at least one child
    if (Object.keys(components.yes).length > 0 || foundNearby) {
      allFields[parent] = {
        ...parentField,
        components,
        extractionMethod: 'conditional',
        hasNestedFields: true,
        nestedFieldCount: Object.keys(components.yes).length,
        missingRequiredFields: missingRequired
      };
    }
  }

  return allFields;
}

// Test suites
describe('buildConditionalFields', () => {
  describe('Parent checkbox SELECTED', () => {
    it('should build nested fields when riskSexMale is SELECTED and nearby fields exist', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const backKVPairs = [
        createMockKVPair('Total partners', '3', 88, 0.12, 0.11),
        createMockKVPair('First date', '01/15/2024', 85, 0.14, 0.12),
        createMockKVPair('Most recent date', '12/01/2024', 87, 0.16, 0.13)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale).toBeDefined();
      expect(result.riskSexMale.components).toBeDefined();
      expect(result.riskSexMale.components.yes.total).toEqual({
        value: 3,
        confidence: 88,
        extractionMethod: 'conditional',
        source: 'pattern:total'
      });
      expect(result.riskSexMale.components.yes.firstDate).toEqual({
        value: '01/15/2024',
        confidence: 85,
        extractionMethod: 'conditional',
        source: 'pattern:firstDate'
      });
      expect(result.riskSexMale.components.yes.lastDate).toEqual({
        value: '12/01/2024',
        confidence: 87,
        extractionMethod: 'conditional',
        source: 'pattern:lastDate'
      });
      expect(result.riskSexMale.hasNestedFields).toBe(true);
      expect(result.riskSexMale.nestedFieldCount).toBe(3);
      expect(result.riskSexMale.missingRequiredFields).toEqual([]);
    });

    it('should handle missing required fields', () => {
      const allFields = {
        riskSexFemale: createMockCheckboxField('riskSexFemale', 'SELECTED', 90, 0.1, 0.1)
      };

      const backKVPairs = [
        createMockKVPair('First date', '01/15/2024', 85, 0.12, 0.11)
        // Missing 'total' (required field)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexFemale).toBeDefined();
      expect(result.riskSexFemale.components.yes.total).toBeUndefined();
      expect(result.riskSexFemale.missingRequiredFields).toContain('total');
      expect(result.riskSexFemale.nestedFieldCount).toBe(1); // Only firstDate found
    });

    it('should build date-only nested fields for riskBloodTransfusion', () => {
      const allFields = {
        riskBloodTransfusion: createMockCheckboxField('riskBloodTransfusion', 'SELECTED', 92, 0.1, 0.1)
      };

      const backKVPairs = [
        createMockKVPair('Date of transfusion', '05/20/2023', 88, 0.13, 0.11)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskBloodTransfusion).toBeDefined();
      expect(result.riskBloodTransfusion.components.yes.date).toEqual({
        value: '05/20/2023',
        confidence: 88,
        extractionMethod: 'conditional',
        source: 'pattern:date'
      });
      expect(result.riskBloodTransfusion.nestedFieldCount).toBe(1);
    });
  });

  describe('Parent checkbox NOT_SELECTED', () => {
    it('should not build nested fields when parent is NOT_SELECTED', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'NOT_SELECTED', 90, 0.1, 0.1)
      };

      const backKVPairs = [
        createMockKVPair('Total partners', '3', 88, 0.12, 0.11)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale.components).toBeUndefined();
      expect(result.riskSexMale.hasNestedFields).toBeUndefined();
    });

    it('should skip missing parent fields', () => {
      const allFields = {};

      const backKVPairs = [
        createMockKVPair('Total partners', '3', 88, 0.12, 0.11)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('Proximity detection', () => {
    it('should ignore fields outside proximity radius', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const backKVPairs = [
        // This is too far (horizontal distance > 0.15)
        createMockKVPair('Total partners', '3', 88, 0.5, 0.1),
        // This is within radius
        createMockKVPair('Number of partners', '5', 90, 0.12, 0.11)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale.components.yes.total).toBeDefined();
      expect(result.riskSexMale.components.yes.total.value).toBe(5); // Should pick the nearby one
    });

    it('should require both horizontal and vertical proximity', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const backKVPairs = [
        // Far vertically (vertical distance > 0.15)
        createMockKVPair('Total partners', '3', 88, 0.12, 0.5)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale.components).toBeUndefined(); // No fields found in proximity
    });
  });

  describe('Pattern matching', () => {
    it('should match total field with various keywords', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const testCases = [
        { key: 'Total partners', value: '3' },
        { key: 'Number of partners', value: '5' },
        { key: 'Partner count', value: '2' }
      ];

      for (const testCase of testCases) {
        const backKVPairs = [createMockKVPair(testCase.key, testCase.value, 88, 0.12, 0.11)];
        const result = buildConditionalFields({ ...allFields }, [], backKVPairs);
        
        expect(result.riskSexMale.components.yes.total).toBeDefined();
        expect(result.riskSexMale.components.yes.total.value).toBe(parseInt(testCase.value, 10));
      }
    });

    it('should match date fields with various patterns', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const datePatterns = [
        '01/15/2024',
        '1/5/24',
        '12-31-2023',
        '5-1-2024'
      ];

      for (const datePattern of datePatterns) {
        const backKVPairs = [createMockKVPair('First date', datePattern, 88, 0.12, 0.11)];
        const result = buildConditionalFields({ ...allFields }, [], backKVPairs);
        
        expect(result.riskSexMale.components.yes.firstDate).toBeDefined();
        expect(result.riskSexMale.components.yes.firstDate.value).toBe(datePattern);
      }
    });
  });

  describe('Multiple risk types', () => {
    it('should handle multiple selected risk types independently', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1),
        riskSexFemale: createMockCheckboxField('riskSexFemale', 'SELECTED', 88, 0.1, 0.3)
      };

      const backKVPairs = [
        // Near riskSexMale
        createMockKVPair('Total partners', '3', 88, 0.12, 0.11),
        // Near riskSexFemale
        createMockKVPair('Number of partners', '2', 85, 0.12, 0.31)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale.components.yes.total.value).toBe(3);
      expect(result.riskSexFemale.components.yes.total.value).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty KV pairs', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const result = buildConditionalFields(allFields, [], []);

      expect(result.riskSexMale.components).toBeUndefined();
    });

    it('should handle missing geometry', () => {
      const allFields = {
        riskSexMale: {
          value: 'SELECTED',
          confidence: 90,
          selectionStatus: 'SELECTED',
          // Missing geometry
        }
      };

      const backKVPairs = [
        createMockKVPair('Total partners', '3', 88, 0.12, 0.11)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale.components).toBeUndefined();
    });

    it('should handle invalid numeric values', () => {
      const allFields = {
        riskSexMale: createMockCheckboxField('riskSexMale', 'SELECTED', 90, 0.1, 0.1)
      };

      const backKVPairs = [
        createMockKVPair('Total partners', 'invalid', 88, 0.12, 0.11)
      ];

      const result = buildConditionalFields(allFields, [], backKVPairs);

      expect(result.riskSexMale).toBeDefined();
      expect(result.riskSexMale.components).toBeDefined();
      expect(result.riskSexMale.components.yes.total).toBeUndefined();
      expect(result.riskSexMale.missingRequiredFields).toContain('total');
    });
  });
});

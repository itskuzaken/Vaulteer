# OCR Mapping Implementation Plan

## Overview
Implement coordinate-based OCR field extraction for HTS forms to improve data accuracy from 70-85% to >90% by targeting specific form fields rather than analyzing the entire page.

## Current State
- **Current Approach**: Full-page OCR analysis with AWS Textract
- **Current Accuracy**: 70-85%
- **Pain Points**: 
  - Low accuracy for checkboxes
  - No per-field confidence scoring
  - Difficulty validating extracted data
  - No handling of form variations

## Target State
- **New Approach**: Coordinate-based field extraction with region-specific OCR
- **Target Accuracy**: >90%
- **Improvements**:
  - Precise field-level extraction
  - Per-field confidence scores
  - Checkbox detection algorithm
  - Cross-field validation
  - Form version detection

---

## Phase 1: Foundation (Week 1)

### Step 1: Update Template Metadata
**File**: `backend/assets/form-templates/hts/template-metadata.json`

**Actions**:
- Implement the enhanced template structure with coordinate mappings
- Add bounding boxes for all 56+ fields
- Include checkbox detection regions
- Add conditional field rules
- Define cross-field validation rules

**Deliverables**:
- Complete template-metadata.json with relative coordinates (0-1 scale)
- Documentation of coordinate system
- Validation rules defined

---

### Step 2: Create OCR Field Extractor Service
**File**: `backend/services/ocrFieldExtractor.js` (NEW)

**Functionality**:
```javascript
class OCRFieldExtractor {
  // Load template metadata
  loadTemplate(formType)
  
  // Extract specific field using coordinates
  extractField(image, fieldConfig)
  
  // Process checkbox with pixel density analysis
  extractCheckbox(image, checkboxConfig)
  
  // Extract signature presence
  extractSignature(image, signatureConfig)
  
  // Calculate per-field confidence
  calculateFieldConfidence(result, fieldType)
}
```

**Key Features**:
- Region-of-interest (ROI) extraction using coordinates
- Multiple extraction strategies (text, checkbox, signature)
- Confidence scoring per field
- Error handling for missing regions

---

### Step 3: Enhance Textract Service
**File**: `backend/services/textractService.js`

**Modifications**:
- Add ROI-based analysis method
- Implement coordinate transformation (relative → pixel)
- Add batch processing for multiple fields
- Include field-level confidence in response

**New Methods**:
```javascript
// Analyze specific region instead of full page
async analyzeRegion(imageBuffer, boundingBox)

// Process multiple fields in parallel
async analyzeFields(imageBuffer, fieldConfigs)

// Transform relative coordinates to pixel coordinates
transformCoordinates(relativeBox, imageWidth, imageHeight)
```

---

## Phase 2: Detection & Validation (Week 2)

### Step 4: Implement Checkbox Detector
**File**: `backend/utils/checkboxDetector.js` (NEW)

**Algorithm**:
1. Extract checkbox region using coordinates
2. Convert to grayscale
3. Apply adaptive thresholding
4. Calculate pixel density ratio
5. Determine checked/unchecked state

**Thresholds**:
- Checked: Density > 40%
- Unchecked: Density < 20%
- Uncertain: 20-40% (requires manual review)

**Output**:
```javascript
{
  checked: boolean,
  confidence: number,
  pixelDensity: number,
  requiresReview: boolean
}
```

---

### Step 5: Add Per-Field Confidence Scoring
**File**: `backend/services/ocrFieldExtractor.js`

**Confidence Factors**:
- Textract confidence score (40%)
- Field-specific validation (30%)
- Cross-field consistency (20%)
- Historical accuracy (10%)

**Confidence Levels**:
- High: >90% (auto-accept)
- Medium: 70-90% (flag for review)
- Low: <70% (require manual entry)

**Integration**:
- Add confidence to each field in OCR response
- Track confidence history for continuous improvement

---

### Step 6: Enhance OCR Validation
**File**: `backend/utils/ocrValidation.js`

**New Validations**:
1. **Field-Level Validation**:
   - Format validation per field type
   - Range validation (dates, numbers)
   - Required field checks

2. **Cross-Field Validation**:
   - Date ranges (appointment date > birth date)
   - Conditional fields (if HIV status = "Reactive", counseling date required)
   - Relationship validation (partner info consistency)

3. **Confidence-Based Validation**:
   - Flag low-confidence fields
   - Require manual review for medium confidence
   - Auto-accept high confidence

**Output Enhancement**:
```javascript
{
  isValid: boolean,
  fieldErrors: [
    {
      field: "appointmentDate",
      error: "Invalid date format",
      confidence: 0.65,
      suggestedValue: "2024-12-03",
      requiresReview: true
    }
  ],
  crossFieldErrors: [...],
  overallConfidence: 0.87
}
```

---

## Phase 3: Frontend Integration (Week 3)

### Step 7: Update Frontend Display
**File**: `frontend/src/components/navigation/Form/HTSFormManagement.js`

**UI Enhancements**:
1. **Field-Level Confidence Display**:
   - Green border: High confidence (>90%)
   - Yellow border: Medium confidence (70-90%)
   - Red border: Low confidence (<70%)

2. **Review Mode**:
   - Highlight flagged fields
   - Show extracted value vs. suggested value
   - Allow manual correction with reason tracking

3. **Progress Indicator**:
   - Show number of high/medium/low confidence fields
   - Display overall form confidence
   - Indicate fields requiring review

**Component Structure**:
```jsx
{extractedData.map(field => (
  <FieldDisplay
    key={field.name}
    field={field}
    confidence={field.confidence}
    requiresReview={field.requiresReview}
    onEdit={handleFieldEdit}
  />
))}
```

---

### Step 8: Create Calibration Tool
**File**: `backend/utils/ocrCalibrationTool.js` (NEW)

**Purpose**: Test and adjust coordinate accuracy

**Features**:
1. **Visual Overlay**:
   - Display form image with coordinate boxes overlaid
   - Show extracted text for each region
   - Highlight misaligned regions

2. **Adjustment Interface**:
   - Click-and-drag to adjust coordinates
   - Save adjusted coordinates to template
   - Test extraction with new coordinates

3. **Accuracy Metrics**:
   - Per-field accuracy rate
   - Average confidence score
   - Most problematic fields

**Usage**:
- Admin tool for template maintenance
- Run on sample forms to validate coordinates
- Generate accuracy reports

---

## Phase 4: Optimization & Monitoring (Week 4)

### Step 9: Add Form Version Detection
**File**: `backend/services/formVersionDetector.js` (NEW)

**Detection Methods**:
1. **Anchor Points**: Detect known text or logos
2. **Field Layout**: Compare field positions
3. **Barcode/QR Code**: If present on form
4. **Image Hash**: Compare structural similarity

**Benefits**:
- Support multiple form versions
- Automatic template selection
- Handle format changes gracefully

**Implementation**:
```javascript
async detectFormVersion(imageBuffer) {
  // Try multiple detection methods
  const anchorMatch = await detectByAnchors(imageBuffer);
  const layoutMatch = await detectByLayout(imageBuffer);
  
  // Return best match with confidence
  return {
    version: "DOH_HTS_2021_v1",
    confidence: 0.95,
    method: "anchor_points"
  };
}
```

---

### Step 10: Performance Optimization
**Files**: Multiple

**Optimizations**:

1. **Parallel Processing**:
   - Extract multiple fields simultaneously
   - Process front and back pages in parallel
   - Batch Textract API calls

2. **Caching**:
   - Cache preprocessed images
   - Store template metadata in memory
   - Cache checkbox detection results

3. **Lazy Loading**:
   - Load templates on-demand
   - Defer non-critical validations
   - Progressive field extraction

4. **Monitoring**:
   - Track extraction time per field
   - Monitor confidence score trends
   - Alert on accuracy drops

**Performance Targets**:
- Total extraction time: <5 seconds
- Per-field extraction: <200ms
- API response time: <3 seconds

---

## Implementation Strategy

### Week 1: Foundation
- Days 1-2: Update template-metadata.json
- Days 3-4: Create ocrFieldExtractor.js
- Days 5-7: Enhance textractService.js

### Week 2: Detection & Validation
- Days 1-2: Implement checkboxDetector.js
- Days 3-4: Add per-field confidence scoring
- Days 5-7: Enhance ocrValidation.js

### Week 3: Frontend Integration
- Days 1-4: Update HTSFormManagement.js UI
- Days 5-7: Create ocrCalibrationTool.js

### Week 4: Optimization & Testing
- Days 1-2: Implement formVersionDetector.js
- Days 3-4: Performance optimization
- Days 5-7: End-to-end testing and refinement

---

## Testing Strategy

### Unit Tests
- Test each field extraction independently
- Validate checkbox detection algorithm
- Test confidence scoring logic
- Verify coordinate transformations

### Integration Tests
- Test full form extraction pipeline
- Validate cross-field validation rules
- Test with multiple form versions
- Verify API response format

### User Acceptance Tests
- Test with real HTS forms
- Validate accuracy improvements
- Test review workflow
- Measure user efficiency gains

### Performance Tests
- Load testing with concurrent extractions
- Measure extraction time per field
- Test with various image qualities
- Benchmark API response times

---

## Success Metrics

### Primary Metrics
- **Accuracy**: >90% field-level accuracy
- **Confidence**: >80% high-confidence fields
- **Speed**: <5 seconds total extraction time

### Secondary Metrics
- **User Corrections**: <10% fields require manual correction
- **Review Time**: 50% reduction in form review time
- **Error Rate**: <5% submission errors

### Monitoring
- Track accuracy per field type
- Monitor confidence score distributions
- Measure extraction time trends
- Alert on accuracy degradation

---

## Risk Mitigation

### Technical Risks
- **Risk**: Coordinate misalignment due to form variations
  - **Mitigation**: Form version detection, calibration tool

- **Risk**: Low checkbox detection accuracy
  - **Mitigation**: Multiple detection methods, manual review fallback

- **Risk**: Performance degradation with parallel processing
  - **Mitigation**: Rate limiting, caching, optimization

### Operational Risks
- **Risk**: User confusion with new UI
  - **Mitigation**: Clear confidence indicators, helpful tooltips

- **Risk**: Increased manual review workload initially
  - **Mitigation**: Gradual rollout, continuous calibration

---

## Rollout Plan

### Phase A: Internal Testing (Week 5)
- Deploy to staging environment
- Test with historical forms
- Calibrate coordinates
- Refine confidence thresholds

### Phase B: Pilot (Week 6)
- Enable for small user group
- Collect feedback
- Monitor accuracy metrics
- Adjust based on real-world data

### Phase C: Full Rollout (Week 7)
- Enable for all users
- Monitor performance closely
- Provide user training
- Establish support processes

---

## Maintenance Plan

### Weekly
- Review accuracy metrics
- Identify problematic fields
- Adjust confidence thresholds

### Monthly
- Calibrate coordinates if needed
- Update validation rules
- Performance optimization review

### Quarterly
- Major template updates
- Algorithm improvements
- User feedback integration

---

## Expected Outcomes

### Immediate Benefits
- 90%+ field-level accuracy
- Per-field confidence scoring
- Reduced manual data entry

### Long-Term Benefits
- Faster form processing
- Higher data quality
- Better user experience
- Scalable to other form types

### ROI
- 50% reduction in form review time
- 80% reduction in data entry errors
- Improved user satisfaction
- Foundation for automated processing

---

{
  "templateId": "doh-hts-2021-v2",
  "name": "DOH Personal Information Sheet (HTS Form 2021) - Enhanced OCR Mapping",
  "version": "2021-enhanced",
  "organization": "Department of Health (DOH) Philippines",
  "formTitle": "PERSONAL INFORMATION SHEET",
  "formSubtitle": "HIV TESTING",
  "pages": 2,
  "dimensions": {
    "width": 2480,
    "height": 3508,
    "dpi": 300,
    "format": "A4"
  },
  "structure": {
    "front": {
      "sections": [
        "INFORMED CONSENT",
        "PERSONAL INFORMATION SHEET (HTS FORM)",
        "DEMOGRAPHIC DATA",
        "EDUCATION & OCCUPATION"
      ]
    },
    "back": {
      "sections": [
        "HISTORY OF EXPOSURE / RISK ASSESSMENT",
        "REASONS FOR HIV TESTING",
        "PREVIOUS HIV TEST",
        "MEDICAL HISTORY & CLINICAL PICTURE",
        "TESTING DETAILS",
        "INVENTORY INFORMATION",
        "HTS PROVIDER DETAILS"
      ]
    }
  },
  "ocrMapping": {
    "coordinateSystem": "relative",
    "description": "Coordinates are relative (0-1 scale) for resolution independence",
    "front": {
      "page": 1,
      "fields": {
        "testDate": {
          "region": {
            "x": 0.065,
            "y": 0.13,
            "width": 0.15,
            "height": 0.025
          },
          "boundingBox": {
            "month": { "x": 0.065, "y": 0.13, "width": 0.04, "height": 0.025 },
            "day": { "x": 0.11, "y": 0.13, "width": 0.04, "height": 0.025 },
            "year": { "x": 0.155, "y": 0.13, "width": 0.06, "height": 0.025 }
          },
          "label": "Test Date",
          "type": "date",
          "format": "MM/DD/YYYY",
          "required": true,
          "priority": 1,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.02, "y": 0.13, "text": "Test Date:" }
        },
        "philHealthNumber": {
          "region": {
            "x": 0.145,
            "y": 0.165,
            "width": 0.35,
            "height": 0.025
          },
          "label": "PhilHealth Number",
          "type": "text",
          "pattern": "^\\d{2}-\\d{9}-\\d$",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.02, "y": 0.165, "text": "PhilHealth Number:" },
          "relatedCheckbox": {
            "label": "Not enrolled in PhilHealth",
            "x": 0.52,
            "y": 0.165,
            "width": 0.015,
            "height": 0.015
          }
        },
        "philSysNumber": {
          "region": {
            "x": 0.145,
            "y": 0.195,
            "width": 0.35,
            "height": 0.025
          },
          "label": "PhilSys Number",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.02, "y": 0.195, "text": "PhilSys Number:" },
          "relatedCheckbox": {
            "label": "No PhilSys Number",
            "x": 0.52,
            "y": 0.195,
            "width": 0.015,
            "height": 0.015
          }
        },
        "firstName": {
          "region": {
            "x": 0.05,
            "y": 0.235,
            "width": 0.25,
            "height": 0.03
          },
          "label": "First Name",
          "type": "text",
          "required": true,
          "priority": 1,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 0.225, "text": "First Name" }
        },
        "middleName": {
          "region": {
            "x": 0.32,
            "y": 0.235,
            "width": 0.25,
            "height": 0.03
          },
          "label": "Middle Name",
          "type": "text",
          "required": false,
          "priority": 2,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.32, "y": 0.225, "text": "Middle Name" }
        },
        "lastName": {
          "region": {
            "x": 0.59,
            "y": 0.235,
            "width": 0.28,
            "height": 0.03
          },
          "label": "Last Name",
          "type": "text",
          "required": true,
          "priority": 1,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.59, "y": 0.225, "text": "Last Name" }
        },
        "suffix": {
          "region": {
            "x": 0.89,
            "y": 0.235,
            "width": 0.08,
            "height": 0.03
          },
          "label": "Suffix",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.89, "y": 0.225, "text": "Suffix (Jr, Sr, III, etc)" }
        },
        "parentalCode": {
          "region": {
            "x": 0.28,
            "y": 0.275,
            "width": 0.15,
            "height": 0.025
          },
          "label": "Parental Code",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.02, "y": 0.275, "text": "First 2 letters of mother's FIRST name" }
        },
        "birthDate": {
          "region": {
            "x": 0.12,
            "y": 0.305,
            "width": 0.15,
            "height": 0.025
          },
          "boundingBox": {
            "month": { "x": 0.12, "y": 0.305, "width": 0.04, "height": 0.025 },
            "day": { "x": 0.165, "y": 0.305, "width": 0.04, "height": 0.025 },
            "year": { "x": 0.21, "y": 0.305, "width": 0.06, "height": 0.025 }
          },
          "label": "Birth Date",
          "type": "date",
          "format": "MM/DD/YYYY",
          "required": true,
          "priority": 1,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.02, "y": 0.305, "text": "Birth date:" }
        },
        "age": {
          "region": {
            "x": 0.35,
            "y": 0.305,
            "width": 0.06,
            "height": 0.025
          },
          "label": "Age",
          "type": "number",
          "required": true,
          "priority": 2,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.3, "y": 0.305, "text": "Age:" },
          "validation": {
            "min": 0,
            "max": 120,
            "computed": "birthDate"
          }
        },
        "sex": {
          "region": {
            "x": 0.16,
            "y": 0.335,
            "width": 0.2,
            "height": 0.025
          },
          "label": "Sex (assigned at birth)",
          "type": "checkbox",
          "options": [
            {
              "value": "Male",
              "checkbox": { "x": 0.16, "y": 0.335, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.18, "y": 0.335, "text": "Male" }
            },
            {
              "value": "Female",
              "checkbox": { "x": 0.26, "y": 0.335, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.28, "y": 0.335, "text": "Female" }
            }
          ],
          "required": true,
          "priority": 1,
          "extractionMethod": "checkbox-detection"
        },
        "currentResidenceCity": {
          "region": {
            "x": 0.25,
            "y": 0.365,
            "width": 0.35,
            "height": 0.025
          },
          "label": "Current Residence - City/Municipality",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 0.365, "text": "Current Place of Residence:" }
        },
        "currentResidenceProvince": {
          "region": {
            "x": 0.7,
            "y": 0.365,
            "width": 0.25,
            "height": 0.025
          },
          "label": "Current Residence - Province",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.62, "y": 0.365, "text": "Province:" }
        },
        "permanentResidenceCity": {
          "region": {
            "x": 0.25,
            "y": 0.395,
            "width": 0.35,
            "height": 0.025
          },
          "label": "Permanent Residence - City/Municipality",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 0.395, "text": "Permanent Residence:" }
        },
        "permanentResidenceProvince": {
          "region": {
            "x": 0.7,
            "y": 0.395,
            "width": 0.25,
            "height": 0.025
          },
          "label": "Permanent Residence - Province",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field"
        },
        "placeOfBirthCity": {
          "region": {
            "x": 0.25,
            "y": 0.425,
            "width": 0.35,
            "height": 0.025
          },
          "label": "Place of Birth - City/Municipality",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 0.425, "text": "Place of Birth:" }
        },
        "placeOfBirthProvince": {
          "region": {
            "x": 0.7,
            "y": 0.425,
            "width": 0.25,
            "height": 0.025
          },
          "label": "Place of Birth - Province",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field"
        },
        "nationality": {
          "region": {
            "x": 0.13,
            "y": 0.455,
            "width": 0.3,
            "height": 0.025
          },
          "label": "Nationality",
          "type": "mixed",
          "checkboxes": [
            {
              "value": "Filipino",
              "checkbox": { "x": 0.13, "y": 0.455, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.15, "y": 0.455, "text": "Filipino" }
            },
            {
              "value": "Other",
              "checkbox": { "x": 0.24, "y": 0.455, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.26, "y": 0.455, "text": "Other, please specify:" },
              "textField": { "x": 0.45, "y": 0.455, "width": 0.3, "height": 0.025 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-with-text"
        },
        "civilStatus": {
          "region": {
            "x": 0.12,
            "y": 0.485,
            "width": 0.7,
            "height": 0.025
          },
          "label": "Civil Status",
          "type": "checkbox",
          "options": [
            {
              "value": "Single",
              "checkbox": { "x": 0.2, "y": 0.485, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.22, "y": 0.485, "text": "Single" }
            },
            {
              "value": "Married",
              "checkbox": { "x": 0.3, "y": 0.485, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.32, "y": 0.485, "text": "Married" }
            },
            {
              "value": "Separated",
              "checkbox": { "x": 0.42, "y": 0.485, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.44, "y": 0.485, "text": "Separated" }
            },
            {
              "value": "Widowed",
              "checkbox": { "x": 0.56, "y": 0.485, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.58, "y": 0.485, "text": "Widowed" }
            },
            {
              "value": "Divorced",
              "checkbox": { "x": 0.7, "y": 0.485, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.72, "y": 0.485, "text": "Divorced" }
            }
          ],
          "required": false,
          "priority": 2,
          "extractionMethod": "checkbox-detection"
        },
        "livingWithPartner": {
          "region": {
            "x": 0.32,
            "y": 0.515,
            "width": 0.15,
            "height": 0.025
          },
          "label": "Currently living with a partner",
          "type": "checkbox",
          "options": [
            {
              "value": "No",
              "checkbox": { "x": 0.32, "y": 0.515, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.34, "y": 0.515, "text": "No" }
            },
            {
              "value": "Yes",
              "checkbox": { "x": 0.4, "y": 0.515, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.42, "y": 0.515, "text": "Yes" }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-detection"
        },
        "numberOfChildren": {
          "region": {
            "x": 0.68,
            "y": 0.515,
            "width": 0.08,
            "height": 0.025
          },
          "label": "Number of children",
          "type": "number",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.52, "y": 0.515, "text": "Number of children:" }
        },
        "isPregnant": {
          "region": {
            "x": 0.56,
            "y": 0.545,
            "width": 0.15,
            "height": 0.025
          },
          "label": "Currently pregnant (for female only)",
          "type": "checkbox",
          "options": [
            {
              "value": "No",
              "checkbox": { "x": 0.56, "y": 0.545, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.58, "y": 0.545, "text": "No" }
            },
            {
              "value": "Yes",
              "checkbox": { "x": 0.64, "y": 0.545, "width": 0.015, "height": 0.015 },
              "label": { "x": 0.66, "y": 0.545, "text": "Yes" }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-detection",
          "conditionalOn": { "field": "sex", "value": "Female" }
        },
        "educationalAttainment": {
          "region": {
            "x": 0.26,
            "y": 0.595,
            "width": 0.7,
            "height": 0.04
          },
          "label": "Highest Educational Attainment",
          "type": "checkbox",
          "options": [
            {
              "value": "No schooling",
              "checkbox": { "x": 0.26, "y": 0.595, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Elementary",
              "checkbox": { "x": 0.4, "y": 0.595, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Pre-school",
              "checkbox": { "x": 0.55, "y": 0.595, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Highschool",
              "checkbox": { "x": 0.68, "y": 0.595, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Vocational",
              "checkbox": { "x": 0.82, "y": 0.595, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "College",
              "checkbox": { "x": 0.68, "y": 0.615, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Post-Graduate",
              "checkbox": { "x": 0.82, "y": 0.615, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-detection"
        },
        "currentlyInSchool": {
          "region": {
            "x": 0.32,
            "y": 0.645,
            "width": 0.15,
            "height": 0.025
          },
          "label": "Currently in school",
          "type": "checkbox",
          "options": [
            {
              "value": "No",
              "checkbox": { "x": 0.32, "y": 0.645, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Yes",
              "checkbox": { "x": 0.4, "y": 0.645, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-detection"
        },
        "currentlyWorking": {
          "region": {
            "x": 0.24,
            "y": 0.675,
            "width": 0.5,
            "height": 0.04
          },
          "label": "Currently working",
          "type": "mixed",
          "checkboxes": [
            {
              "value": "No",
              "checkbox": { "x": 0.16, "y": 0.69, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Yes",
              "checkbox": { "x": 0.25, "y": 0.69, "width": 0.015, "height": 0.015 },
              "textField": {
                "label": "Current occupation (main source of income)",
                "x": 0.28,
                "y": 0.69,
                "width": 0.65,
                "height": 0.025
              }
            },
            {
              "value": "Previous",
              "checkbox": { "x": 0.16, "y": 0.715, "width": 0.015, "height": 0.015 },
              "textField": {
                "label": "Previous occupation in the past 12 months",
                "x": 0.28,
                "y": 0.715,
                "width": 0.65,
                "height": 0.025
              }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-with-text"
        },
        "workedOverseas": {
          "region": {
            "x": 0.24,
            "y": 0.755,
            "width": 0.7,
            "height": 0.07
          },
          "label": "Worked overseas/abroad in past 5 years",
          "type": "mixed",
          "checkboxes": [
            {
              "value": "No",
              "checkbox": { "x": 0.52, "y": 0.765, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Yes",
              "checkbox": { "x": 0.6, "y": 0.765, "width": 0.015, "height": 0.015 },
              "subFields": {
                "returnYear": {
                  "label": "Year of return from last contract",
                  "x": 0.7,
                  "y": 0.775,
                  "width": 0.15,
                  "height": 0.025
                },
                "location": {
                  "label": "Where were you based",
                  "checkboxes": [
                    {
                      "value": "On a ship",
                      "checkbox": { "x": 0.28, "y": 0.8, "width": 0.015, "height": 0.015 }
                    },
                    {
                      "value": "Land",
                      "checkbox": { "x": 0.4, "y": 0.8, "width": 0.015, "height": 0.015 }
                    }
                  ]
                },
                "country": {
                  "label": "What country did you last work in",
                  "x": 0.42,
                  "y": 0.815,
                  "width": 0.5,
                  "height": 0.025
                }
              }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-with-nested-fields"
        }
      }
    },
    "back": {
      "page": 2,
      "fields": {
        "riskAssessment": {
          "region": {
            "x": 0.05,
            "y": 0.11,
            "width": 0.9,
            "height": 0.25
          },
          "label": "History of Exposure / Risk Assessment",
          "type": "checkboxMultiple",
          "sections": [
            {
              "label": "Sex with a MALE",
              "options": [
                {
                  "value": "No",
                  "checkbox": { "x": 0.28, "y": 0.145, "width": 0.015, "height": 0.015 }
                },
                {
                  "value": "Yes",
                  "checkbox": { "x": 0.32, "y": 0.145, "width": 0.015, "height": 0.015 },
                  "subFields": {
                    "totalNumber": { "x": 0.38, "y": 0.145, "width": 0.08, "height": 0.025 },
                    "dateRecent": { "x": 0.72, "y": 0.145, "width": 0.2, "height": 0.025 }
                  }
                }
              ]
            },
            {
              "label": "Sex with a FEMALE",
              "options": [
                {
                  "value": "No",
                  "checkbox": { "x": 0.28, "y": 0.17, "width": 0.015, "height": 0.015 }
                },
                {
                  "value": "Yes",
                  "checkbox": { "x": 0.32, "y": 0.17, "width": 0.015, "height": 0.015 },
                  "subFields": {
                    "totalNumber": { "x": 0.38, "y": 0.17, "width": 0.08, "height": 0.025 },
                    "dateRecent": { "x": 0.72, "y": 0.17, "width": 0.2, "height": 0.025 }
                  }
                }
              ]
            },
            {
              "label": "Paid for sex (in cash or kind)",
              "checkbox": { "x": 0.28, "y": 0.23, "width": 0.015, "height": 0.015 },
              "dateField": { "x": 0.72, "y": 0.23, "width": 0.2, "height": 0.025 }
            },
            {
              "label": "Received payment (cash or in kind) in exchange for sex",
              "checkbox": { "x": 0.28, "y": 0.255, "width": 0.015, "height": 0.015 },
              "dateField": { "x": 0.72, "y": 0.255, "width": 0.2, "height": 0.025 }
            },
            {
              "label": "Had sex under the influence of drugs",
              "checkbox": { "x": 0.28, "y": 0.28, "width": 0.015, "height": 0.015 },
              "dateField": { "x": 0.72, "y": 0.28, "width": 0.2, "height": 0.025 }
            },
            {
              "label": "Shared needles in injection of drugs",
              "checkbox": { "x": 0.28, "y": 0.305, "width": 0.015, "height": 0.015 },
              "dateField": { "x": 0.72, "y": 0.305, "width": 0.2, "height": 0.025 }
            },
            {
              "label": "Received blood transfusion",
              "checkbox": { "x": 0.28, "y": 0.33, "width": 0.015, "height": 0.015 },
              "dateField": { "x": 0.72, "y": 0.33, "width": 0.2, "height": 0.025 }
            },
            {
              "label": "Occupational exposure (needlestick/sharps)",
              "checkbox": { "x": 0.28, "y": 0.355, "width": 0.015, "height": 0.015 },
              "dateField": { "x": 0.72, "y": 0.355, "width": 0.2, "height": 0.025 }
            }
          ],
          "required": false,
          "priority": 2,
          "extractionMethod": "checkbox-matrix-with-dates"
        },
        "reasonsForTesting": {
          "region": {
            "x": 0.05,
            "y": 0.395,
            "width": 0.9,
            "height": 0.06
          },
          "label": "Reasons for HIV Testing",
          "type": "checkboxMultiple",
          "options": [
            {
              "value": "Possible exposure to HIV",
              "checkbox": { "x": 0.16, "y": 0.41, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Employment - Overseas/Abroad",
              "checkbox": { "x": 0.4, "y": 0.41, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Requirement for insurance",
              "checkbox": { "x": 0.74, "y": 0.41, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Recommended by physician/nurse/midwife",
              "checkbox": { "x": 0.16, "y": 0.435, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Employment - Local/Philippines",
              "checkbox": { "x": 0.4, "y": 0.435, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Other (please specify)",
              "checkbox": { "x": 0.74, "y": 0.435, "width": 0.015, "height": 0.015 },
              "textField": { "x": 0.82, "y": 0.435, "width": 0.15, "height": 0.02 }
            },
            {
              "value": "Planned a text message/email encouraging me to get an HIV test",
              "checkbox": { "x": 0.16, "y": 0.455, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 2,
          "extractionMethod": "checkbox-multiple-with-text"
        },
        "previouslyTested": {
          "region": {
            "x": 0.05,
            "y": 0.49,
            "width": 0.9,
            "height": 0.055
          },
          "label": "Have you ever been tested for HIV before",
          "type": "mixed",
          "checkboxes": [
            {
              "value": "No",
              "checkbox": { "x": 0.28, "y": 0.505, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Yes",
              "checkbox": { "x": 0.35, "y": 0.505, "width": 0.015, "height": 0.015 },
              "subFields": {
                "testDate": {
                  "label": "If yes, date of most recent test",
                  "x": 0.48,
                  "y": 0.505,
                  "width": 0.15,
                  "height": 0.025
                },
                "facility": {
                  "label": "Which HTS provider (facility or organization)",
                  "x": 0.52,
                  "y": 0.525,
                  "width": 0.4,
                  "height": 0.025
                },
                "city": {
                  "label": "City/Municipality",
                  "x": 0.52,
                  "y": 0.525,
                  "width": 0.2,
                  "height": 0.015
                }
              }
            }
          ],
          "required": false,
          "priority": 2,
          "extractionMethod": "checkbox-with-nested-fields"
        },
        "previousTestResult": {
          "region": {
            "x": 0.2,
            "y": 0.535,
            "width": 0.7,
            "height": 0.025
          },
          "label": "What was the result",
          "type": "checkbox",
          "options": [
            {
              "value": "Reactive",
              "checkbox": { "x": 0.24, "y": 0.535, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Non-reactive",
              "checkbox": { "x": 0.35, "y": 0.535, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Indeterminate",
              "checkbox": { "x": 0.48, "y": 0.535, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Was not able to get result",
              "checkbox": { "x": 0.63, "y": 0.535, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 2,
          "extractionMethod": "checkbox-detection"
        },
        "medicalHistory": {
          "region": {
            "x": 0.05,
            "y": 0.585,
            "width": 0.9,
            "height": 0.05
          },
          "label": "Medical History",
          "type": "checkboxMultiple",
          "options": [
            {
              "value": "Current TB patient",
              "checkbox": { "x": 0.16, "y": 0.6, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Diagnosed with other STIs",
              "checkbox": { "x": 0.38, "y": 0.6, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Taken PEP",
              "checkbox": { "x": 0.64, "y": 0.6, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "With hepatitis B",
              "checkbox": { "x": 0.16, "y": 0.62, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "With hepatitis C",
              "checkbox": { "x": 0.38, "y": 0.62, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Taking PrEP",
              "checkbox": { "x": 0.64, "y": 0.62, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-multiple"
        },
        "clinicalPicture": {
          "region": {
            "x": 0.16,
            "y": 0.655,
            "width": 0.35,
            "height": 0.025
          },
          "label": "Clinical Picture",
          "type": "checkbox",
          "options": [
            {
              "value": "Asymptomatic",
              "checkbox": { "x": 0.24, "y": 0.655, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Symptomatic",
              "checkbox": { "x": 0.38, "y": 0.655, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-detection"
        },
        "symptoms": {
          "region": {
            "x": 0.28,
            "y": 0.675,
            "width": 0.65,
            "height": 0.025
          },
          "label": "Describe Signs/Symptoms",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.16, "y": 0.675, "text": "Describe S/Sx:" }
        },
        "whoStaging": {
          "region": {
            "x": 0.56,
            "y": 0.695,
            "width": 0.38,
            "height": 0.025
          },
          "label": "WHO Staging",
          "type": "mixed",
          "checkboxes": [
            {
              "value": "No physician to do staging",
              "checkbox": { "x": 0.56, "y": 0.695, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-with-text"
        },
        "clientType": {
          "region": {
            "x": 0.16,
            "y": 0.74,
            "width": 0.78,
            "height": 0.025
          },
          "label": "Client type",
          "type": "checkbox",
          "options": [
            {
              "value": "Inpatient",
              "checkbox": { "x": 0.24, "y": 0.74, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Walk-in/outpatient",
              "checkbox": { "x": 0.38, "y": 0.74, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Persons Deprived of Liberty (PDL)",
              "checkbox": { "x": 0.6, "y": 0.74, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Mobile HTS / Outreach in physical venues. Specify venue.",
              "checkbox": { "x": 0.24, "y": 0.76, "width": 0.015, "height": 0.015 },
              "textField": { "x": 0.62, "y": 0.76, "width": 0.3, "height": 0.02 }
            }
          ],
          "required": false,
          "priority": 2,
          "extractionMethod": "checkbox-with-text"
        },
        "modeOfReach": {
          "region": {
            "x": 0.16,
            "y": 0.785,
            "width": 0.78,
            "height": 0.025
          },
          "label": "Mode of reach",
          "type": "checkboxMultiple",
          "options": [
            {
              "value": "Clinical reach",
              "checkbox": { "x": 0.28, "y": 0.79, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Online",
              "checkbox": { "x": 0.42, "y": 0.79, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Index testing",
              "checkbox": { "x": 0.52, "y": 0.79, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Social and sexual network testing",
              "checkbox": { "x": 0.68, "y": 0.79, "width": 0.015, "height": 0.015 }
            },
            {
              "value": "Outreach in physical venues",
              "checkbox": { "x": 0.72, "y": 0.81, "width": 0.015, "height": 0.015 }
            }
          ],
          "required": false,
          "priority": 3,
          "extractionMethod": "checkbox-multiple"
        },
        "testingAccepted": {
          "region": {
            "x": 0.16,
            "y": 0.835,
            "width": 0.78,
            "height": 0.055
          },
          "label": "HIV Testing Status",
          "type": "mixed",
          "checkboxes": [
            {
              "value": "Refused HIV Testing",
              "checkbox": { "x": 0.16, "y": 0.84, "width": 0.015, "height": 0.015 },
              "textField": {
                "label": "Reason for refusal",
                "x": 0.3,
                "y": 0.84,
                "width": 0.6,
                "height": 0.02
              }
            },
            {
              "value": "Accepted HIV Testing",
              "checkbox": { "x": 0.16, "y": 0.86, "width": 0.015, "height": 0.015 },
              "subFields": {
                "modality": {
                  "label": "HIV testing modality",
                  "checkboxes": [
                    {
                      "value": "Facility-based testing (FBT)",
                      "checkbox": { "x": 0.28, "y": 0.865, "width": 0.015, "height": 0.015 }
                    },
                    {
                      "value": "Non-laboratory FBT",
                      "checkbox": { "x": 0.52, "y": 0.865, "width": 0.015, "height": 0.015 }
                    },
                    {
                      "value": "Community-based",
                      "checkbox": { "x": 0.74, "y": 0.865, "width": 0.015, "height": 0.015 }
                    },
                    {
                      "value": "Self-testing",
                      "checkbox": { "x": 0.88, "y": 0.865, "width": 0.015, "height": 0.015 }
                    }
                  ]
                }
              }
            }
          ],
          "required": true,
          "priority": 2,
          "extractionMethod": "checkbox-with-nested-fields"
        },
        "testKitBrand": {
          "region": {
            "x": 0.72,
            "y": 0.91,
            "width": 0.25,
            "height": 0.025
          },
          "label": "Brand of test kit used",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.58, "y": 0.91, "text": "Brand of test kit used:" }
        },
        "testKitLotNumber": {
          "region": {
            "x": 0.72,
            "y": 0.935,
            "width": 0.25,
            "height": 0.025
          },
          "label": "Lot Number",
          "type": "text",
          "required": false,
          "priority": 4,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.58, "y": 0.935, "text": "Test kit lot number:" }
        },
        "testKitExpiration": {
          "region": {
            "x": 0.72,
            "y": 0.96,
            "width": 0.25,
            "height": 0.025
          },
          "label": "Expiration date",
          "type": "date",
          "format": "MM/DD/YYYY",
          "required": false,
          "priority": 4,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.58, "y": 0.96, "text": "Test kit expiry (MM/DD/YYYY):" }
        },
        "testingFacility": {
          "region": {
            "x": 0.4,
            "y": 0.985,
            "width": 0.55,
            "height": 0.015
          },
          "label": "Name of Testing Facility/Organization",
          "type": "text",
          "required": true,
          "priority": 2,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 0.985, "text": "Name of Testing Facility/Organization:" },
          "expectedValues": ["LoveYourself Inc.", "LoveYourself Inc. (Bagani)"]
        },
        "facilityAddress": {
          "region": {
            "x": 0.4,
            "y": 0.998,
            "width": 0.55,
            "height": 0.015
          },
          "label": "Complete Mailing Address",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 0.998, "text": "Complete Mailing Address:" }
        },
        "contactNumber": {
          "region": {
            "x": 0.2,
            "y": 1.01,
            "width": 0.2,
            "height": 0.015
          },
          "label": "Contact Numbers",
          "type": "text",
          "pattern": "^09\\d{9}$",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 1.01, "text": "Contact Numbers:" }
        },
        "emailAddress": {
          "region": {
            "x": 0.58,
            "y": 1.01,
            "width": 0.37,
            "height": 0.015
          },
          "label": "Email address",
          "type": "email",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.45, "y": 1.01, "text": "Email address:" }
        },
        "counselorName": {
          "region": {
            "x": 0.28,
            "y": 1.025,
            "width": 0.35,
            "height": 0.015
          },
          "label": "Name of service provider",
          "type": "text",
          "required": false,
          "priority": 3,
          "extractionMethod": "form-field",
          "nearbyLabel": { "x": 0.05, "y": 1.025, "text": "Primary HTS provider:" }
        },
        "counselorRole": {
          "region": {
            "x": 0.3,
            "y": 1.038,
            "width": 0.6,
            "height": 0.015
          },
          "label": "Role",
          "type": "checkbox",
          "options": [
            {
              "value": "HIV Counselor",
              "checkbox": { "x": 0.28, "y": 1.038, "width": 0.012, "height": 0.012 }
            },
            {
              "value": "Medical Technologist",
              "checkbox": { "x": 0.42, "y": 1.038, "width": 0.012, "height": 0.012 }
            },
            {
              "value": "CBS Motivator",
              "checkbox": { "x": 0.64, "y": 1.038, "width": 0.012, "height": 0.012 }
            },
            {
              "value": "Others",
              "checkbox": { "x": 0.78, "y": 1.038, "width": 0.012, "height": 0.012 }
            }
          ],
          "required": false,
          "priority": 4,
          "extractionMethod": "checkbox-detection"
        },
        "counselorSignature": {
          "region": {
            "x": 0.28,
            "y": 1.051,
            "width": 0.4,
            "height": 0.04
          },
          "label": "Name & Signature of service provider",
          "type": "signature",
          "required": false,
          "priority": 4,
          "extractionMethod": "signature-detection"
        }
      }
    }
  },
  "extractionStrategies": {
    "form-field": {
      "description": "Extract text from defined rectangular region",
      "method": "textract-key-value",
      "fallback": "textract-raw-text"
    },
    "checkbox-detection": {
      "description": "Detect if checkbox is marked (dark pixel analysis)",
      "method": "selection-element",
      "threshold": 0.3,
      "fallback": "pixel-analysis"
    },
    "checkbox-multiple": {
      "description": "Multiple checkboxes can be selected",
      "method": "selection-element-array",
      "allowMultiple": true
    },
    "checkbox-with-text": {
      "description": "Checkbox with associated text field",
      "method": "conditional-extraction",
      "extractTextIf": "checkbox-selected"
    },
    "checkbox-with-nested-fields": {
      "description": "Checkbox that reveals sub-fields when selected",
      "method": "conditional-extraction",
      "extractSubFieldsIf": "checkbox-selected"
    },
    "signature-detection": {
      "description": "Detect presence of signature",
      "method": "signature-analysis",
      "returnPresence": true
    },
    "date-field": {
      "description": "Extract date with format validation",
      "method": "textract-key-value",
      "validation": "date-format",
      "formats": ["MM/DD/YYYY", "DD/MM/YYYY"]
    }
  },
  "validationRules": {
    "requiredFields": [
      "testDate",
      "firstName",
      "lastName",
      "birthDate",
      "sex",
      "testingAccepted",
      "testingFacility"
    ],
    "confidenceThreshold": 0.80,
    "crossFieldValidation": [
      {
        "rule": "ageMatchesBirthDate",
        "fields": ["age", "birthDate"],
        "tolerance": 1
      },
      {
        "rule": "testDateAfterBirthDate",
        "fields": ["testDate", "birthDate"]
      },
      {
        "rule": "previousTestDateBeforeTestDate",
        "fields": ["previousTestDate", "testDate"]
      }
    ]
  },
  "extractionNotes": [
    "OCR mapping uses relative coordinates (0-1 scale) for resolution independence",
    "Coordinates are measured from top-left (0,0) to bottom-right (1,1)",
    "Checkbox detection uses pixel analysis: >30% dark pixels = checked",
    "Form has 27 questions: Q1-16 (front), Q17-27 (back)",
    "Multiple extraction strategies support different field types",
    "Conditional fields only extracted when parent checkbox is selected",
    "Text normalization: CAPITAL LETTERS typical for handwritten entries",
    "Date formats: Primary MM/DD/YYYY, fallback DD/MM/YYYY",
    "Testing facility expected: 'LoveYourself Inc.' or 'LoveYourself Inc. (Bagani)'"
  ],
  "lastUpdated": "2025-12-03",
  "mappingVersion": "2.0-ocr-enhanced"
}

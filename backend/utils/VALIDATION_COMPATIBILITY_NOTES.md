/**
 * OCR Validation Compatibility Notes for FORMS-Only Migration
 * 
 * The existing ocrValidation.js works well with FORMS extraction.
 * This document outlines considerations and recommendations.
 */

## Validation Rules Status

### ✅ Compatible Rules (No Changes Needed)

These validation rules work identically for both QUERIES and FORMS extraction:

1. **Date Validation** (`validateDate`)
   - Validates date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
   - Auto-corrects common OCR errors (O→0, l→1)
   - Works with FORMS output

2. **Phone Number Validation** (`validatePhoneNumber`)
   - Philippine format validation (09XX-XXX-XXXX)
   - Auto-corrects OCR errors
   - Compatible with FORMS

3. **PhilHealth Number Validation** (`validatePhilHealthNumber`)
   - Format: XX-XXXXXXXXX-X
   - Checksum validation
   - Works with FORMS

4. **Control Number Validation** (`validateControlNumber`)
   - Alphanumeric pattern matching
   - No changes needed

5. **Age Validation** (`validateAge`)
   - Range validation (0-120)
   - Consistency check with birthDate
   - Compatible with FORMS

6. **Municipality/City Validation** (`validateMunicipality`)
   - Fuzzy matching against Philippine cities
   - Levenshtein distance calculation
   - Works with FORMS output

7. **Testing Facility Validation** (`validateTestingFacility`)
   - Fuzzy matching against known facilities
   - No changes needed

### ⚠️ Rules to Review

These rules may need adjustment based on FORMS output format:

1. **Sex/Gender Validation** (`validateSex`)
   - **Current:** Expects "M", "F", "Male", "Female"
   - **FORMS Output:** May return full words or abbreviated
   - **Recommendation:** Already handles both, should work fine
   
2. **Civil Status Validation** (`validateCivilStatus`)
   - **Current:** Expects full words (Single, Married, etc.)
   - **FORMS Output:** May return abbreviations (S, M, W, etc.)
   - **Action:** Monitor unmapped keys, add abbreviation mappings if needed

3. **Test Result Validation** (`validateTestResult`)
   - **Current:** Positive, Negative, Pending, Inconclusive
   - **FORMS Output:** May vary in format
   - **Recommendation:** Already flexible, should work

### 🔍 Field Format Differences

Based on mock testing, FORMS may extract slightly different formats:

| Field | QUERIES Output | FORMS Output | Validation Impact |
|-------|---------------|--------------|-------------------|
| civilStatus | "Married" | "M" or "Married" | ✅ Already handles both |
| address | "123 Main St" | "123 Main Street, City" | ✅ No validation on address |
| sex | "M" | "Male" or "M" | ✅ Already handles both |
| previouslyTested | "Yes" | "Yes" or "Y" | ⚠️ May need "Y"/"N" support |
| testResult | "Positive" | "Positive" or "P" | ⚠️ Monitor for abbreviations |

## Recommendations

### Immediate Actions

1. **Keep Current Validation Rules**
   - No changes needed for initial FORMS deployment
   - Validation is format-agnostic for most fields

2. **Monitor Production Logs**
   ```javascript
   // Watch for these in logs:
   console.log(`⚠️ ${unmappedKeys.length} unmapped keys found`);
   console.log(`🔍 Validation: ${validationSummary.errors} errors`);
   ```

3. **Track Validation Error Rates**
   - Compare error rates between QUERIES and FORMS
   - Log validation failures with field names
   - Adjust rules if error rate increases

### Future Enhancements (Phase 3)

1. **Add Abbreviation Support**
   ```javascript
   const CIVIL_STATUS_MAP = {
     'S': 'Single',
     'M': 'Married',
     'W': 'Widowed',
     'D': 'Divorced',
     'Sep': 'Separated'
   };
   ```

2. **Enhanced Yes/No Validation**
   ```javascript
   function normalizeYesNo(value) {
     const normalized = value?.toString().toUpperCase();
     if (['YES', 'Y', '1', 'TRUE'].includes(normalized)) return 'Yes';
     if (['NO', 'N', '0', 'FALSE'].includes(normalized)) return 'No';
     return value;
   }
   ```

3. **Confidence-Based Validation**
   ```javascript
   // If FORMS confidence < 70%, apply stricter validation
   if (field.confidence < 70) {
     requireManualReview = true;
   }
   ```

## Testing Validation with FORMS

Run this test after enabling FORMS mode:

```bash
# Enable FORMS mode
echo "OCR_USE_FORMS_ONLY=true" >> backend/.env

# Submit test form
curl -X POST http://localhost:5000/api/hts-forms/analyze-ocr \
  -F "frontImage=@backend/assets/hts-templetes/filled-hts-form-front.jpg" \
  -F "backImage=@backend/assets/hts-templetes/filled-hts-form-back.jpg"

# Check validation summary in response
# Look for: validationSummary.corrected, validationSummary.errors
```

## Validation Metrics to Monitor

Track these metrics in production:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Validation Error Rate | < 5% | > 10% |
| Auto-Correction Rate | 10-20% | > 30% |
| Manual Review Rate | < 15% | > 25% |
| Field Confidence Avg | > 80% | < 70% |

## Conclusion

✅ **Current validation rules are compatible with FORMS extraction**

No immediate changes needed. Monitor production for field format differences and adjust mappings as needed.

The existing fuzzy matching and auto-correction logic handles format variations well.

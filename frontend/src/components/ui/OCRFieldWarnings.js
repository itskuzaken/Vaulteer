/**
 * OCRFieldWarnings Component
 * Display warnings for low-confidence OCR fields with validation status
 */
import { IoAlertCircle, IoCheckmarkCircle, IoWarning } from 'react-icons/io5';

export default function OCRFieldWarnings({ extractedData }) {
  if (!extractedData) return null;

  const validations = extractedData.validations || {};
  const validationSummary = extractedData.validationSummary || null;

  // Find fields with validation information or low confidence
  const fieldsToReview = Object.entries(extractedData)
    .filter(([key, value]) => {
      // Skip metadata fields
      if (['frontConfidence', 'backConfidence', 'confidence', 'validations', 'validationSummary', '_rawData', 'templateId', 'templateName', 'extractedAt', 'rawConfidence'].includes(key)) {
        return false;
      }
      
      // Include if field was auto-corrected
      if (extractedData[`${key}_wasAutoCorrected`]) {
        return true;
      }
      
      // Include if field has validation info
      if (validations[key]) {
        return true;
      }
      
      // Include if confidence is low
      return value && typeof value === 'object' && value.confidence !== undefined && value.confidence < 80;
    })
    .map(([key, value]) => ({
      key,
      value,
      validation: validations[key],
      wasAutoCorrected: extractedData[`${key}_wasAutoCorrected`],
      originalValue: extractedData[`${key}_originalValue`],
      validationConfidence: extractedData[`${key}_confidence`]
    }));

  if (fieldsToReview.length === 0 && !validationSummary) return null;

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityIcon = (confidence) => {
    if (confidence >= 0.9) return <IoCheckmarkCircle className="inline w-4 h-4" />;
    if (confidence >= 0.7) return <IoWarning className="inline w-4 h-4" />;
    return <IoAlertCircle className="inline w-4 h-4" />;
  };

  return (
    <div className="space-y-4 mb-4">
      {/* Validation Summary */}
      {validationSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <IoCheckmarkCircle className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Validation Summary</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
            <div>Fields Validated: <strong>{validationSummary.total}</strong></div>
            <div>Valid: <strong>{validationSummary.valid}</strong></div>
            <div>Auto-Corrected: <strong>{validationSummary.corrected}</strong></div>
            <div>Avg Confidence: <strong>{validationSummary.avgConfidence}%</strong></div>
          </div>
        </div>
      )}

      {/* Field-by-field review */}
      {fieldsToReview.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <IoAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900">Fields Requiring Review</h4>
              <p className="text-sm text-yellow-800 mt-1 mb-3">
                Please verify the following fields:
              </p>
              
              <div className="space-y-3">
                {fieldsToReview.map((field) => {
                  const displayValue = typeof field.value === 'object' ? field.value.text : field.value;
                  const confidence = field.validationConfidence || 
                                   (typeof field.value === 'object' ? field.value.confidence / 100 : 0);
                  
                  return (
                    <div key={field.key} className="bg-white border border-yellow-200 rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {formatFieldName(field.key)}
                        </span>
                        <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                          {getSeverityIcon(confidence)} {Math.round(confidence * 100)}%
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700">
                        <strong>Value:</strong> {displayValue || 'Not detected'}
                      </div>
                      
                      {field.wasAutoCorrected && (
                        <div className="mt-2 text-sm bg-blue-50 border border-blue-200 p-2 rounded">
                          <p className="text-blue-800">
                            ✨ <strong>Auto-corrected:</strong>{' '}
                            <span className="line-through">{field.originalValue}</span>
                            {' → '}
                            <span className="font-medium">{displayValue}</span>
                          </p>
                        </div>
                      )}
                      
                      {field.validation && !field.validation.isValid && (
                        <div className="mt-2 text-xs text-red-600">
                          ⚠️ Validation failed - please verify this value
                        </div>
                      )}
                      
                      {confidence < 0.7 && (
                        <div className="mt-2 text-xs text-gray-600">
                          💡 Low confidence - please double-check for accuracy
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-xs text-yellow-700 bg-yellow-100 px-3 py-2 rounded">
                💡 <strong>Tip:</strong> Auto-corrected fields have been validated against known patterns. 
                Review all highlighted fields carefully before submitting.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

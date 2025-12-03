/**
 * OCRFieldWarnings Component
 * Display warnings for low-confidence OCR fields
 */
import { IoAlertCircle } from 'react-icons/io5';

export default function OCRFieldWarnings({ extractedData }) {
  if (!extractedData) return null;

  // Find fields with low confidence (< 80%)
  const lowConfidenceFields = Object.entries(extractedData)
    .filter(([key, value]) => {
      // Skip metadata fields
      if (['frontConfidence', 'backConfidence', 'confidence'].includes(key)) {
        return false;
      }
      
      // Check if value has confidence property and it's below threshold
      return value && typeof value === 'object' && value.confidence !== undefined && value.confidence < 80;
    });

  if (lowConfidenceFields.length === 0) return null;

  const formatFieldName = (fieldName) => {
    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <IoAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900">Low Confidence Fields</h4>
          <p className="text-sm text-yellow-800 mt-1">
            The following fields may need manual verification:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
            {lowConfidenceFields.map(([key, value]) => (
              <li key={key}>
                <strong>{formatFieldName(key)}:</strong>{' '}
                {value.text || 'Not detected'}{' '}
                <span className="text-yellow-600">
                  ({value.confidence?.toFixed(0)}% confidence)
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-yellow-700 bg-yellow-100 px-3 py-2 rounded">
            💡 <strong>Tip:</strong> Review these fields carefully and correct any errors before submitting.
          </div>
        </div>
      </div>
    </div>
  );
}

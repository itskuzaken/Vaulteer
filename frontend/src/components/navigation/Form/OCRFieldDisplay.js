/**
 * OCR Field Display Component
 * Displays extracted fields from FORMS+LAYOUT OCR with confidence scores and metadata
 */
import { IoCheckmarkCircle, IoAlertCircle, IoWarning, IoInformationCircle } from 'react-icons/io5';

export default function OCRFieldDisplay({ extractedData }) {
  if (!extractedData) {
    return (
      <div className="text-center py-8">
        <IoInformationCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No OCR data available</p>
      </div>
    );
  }

  // Extract fields from FORMS+LAYOUT response structure
  const fields = extractedData.fields || {};
  const confidence = extractedData.confidence || 0;
  const stats = extractedData.stats || {};
  const extractionMethod = extractedData.extractionMethod || 'unknown';
  const unmappedKeys = extractedData.unmappedKeys || {};

  // Get confidence level styling
  const getConfidenceStyle = (confidence) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Get confidence icon
  const getConfidenceIcon = (confidence) => {
    if (confidence >= 90) return <IoCheckmarkCircle className="w-4 h-4" />;
    if (confidence >= 70) return <IoWarning className="w-4 h-4" />;
    return <IoAlertCircle className="w-4 h-4" />;
  };

  // Format field name for display
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Group fields by category
  const fieldCategories = {
    'Personal Information': ['firstName', 'middleName', 'lastName', 'suffix', 'birthDate', 'age', 'sex'],
    'Contact Information': ['contactNumber', 'emailAddress', 'currentResidenceCity', 'currentResidenceProvince'],
    'Identification': ['philHealthNumber', 'philSysNumber'],
    'Test Information': ['testDate', 'testResult', 'testingFacility', 'counselorName'],
    'Risk Assessment': ['previouslyTested', 'reasonsForTesting', 'clinicalPicture'],
    'Other Fields': [] // Will be populated with remaining fields
  };

  // Categorize extracted fields
  const categorizedFields = {};
  const usedFields = new Set();

  // Populate known categories
  Object.entries(fieldCategories).forEach(([category, categoryFields]) => {
    categorizedFields[category] = [];
    categoryFields.forEach(fieldName => {
      if (fields[fieldName]) {
        categorizedFields[category].push({
          name: fieldName,
          value: fields[fieldName],
          displayName: formatFieldName(fieldName)
        });
        usedFields.add(fieldName);
      }
    });
  });

  // Add remaining fields to "Other Fields"
  Object.keys(fields).forEach(fieldName => {
    if (!usedFields.has(fieldName)) {
      categorizedFields['Other Fields'].push({
        name: fieldName,
        value: fields[fieldName],
        displayName: formatFieldName(fieldName)
      });
    }
  });

  // Remove empty categories
  Object.keys(categorizedFields).forEach(category => {
    if (categorizedFields[category].length === 0) {
      delete categorizedFields[category];
    }
  });

  return (
    <div className="space-y-6">
      {/* Extraction Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            OCR Extraction Summary
          </h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getConfidenceStyle(confidence)}`}>
            {getConfidenceIcon(confidence)}
            <span className="font-semibold">{confidence.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{Object.keys(fields).length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Fields Extracted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.highConfidence || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.mediumConfidence || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Medium Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.lowConfidence || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Low Confidence</div>
          </div>
        </div>

        {/* Extraction method badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Method:</span>
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
            {extractionMethod.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Extracted Fields by Category */}
      {Object.entries(categorizedFields).map(([category, categoryFields]) => (
        <div key={category} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-900 dark:text-white">{category}</h4>
          </div>
          
          <div className="p-4">
            <div className="grid gap-3">
              {categoryFields.map(({ name, value, displayName }) => (
                <div key={name} className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {name}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    {value ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : value}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Not extracted
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Unmapped Keys (Development Info) */}
      {(unmappedKeys.front?.length > 0 || unmappedKeys.back?.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
            <IoWarning className="w-5 h-5" />
            Unmapped Keys Found
          </h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            These keys were detected by OCR but not mapped to form fields. This information helps improve field mapping accuracy.
          </p>
          
          {unmappedKeys.front?.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Front Page ({unmappedKeys.front.length} keys):
              </div>
              <div className="flex flex-wrap gap-1">
                {unmappedKeys.front.slice(0, 10).map((key, index) => (
                  <span key={index} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                    {key}
                  </span>
                ))}
                {unmappedKeys.front.length > 10 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                    +{unmappedKeys.front.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {unmappedKeys.back?.length > 0 && (
            <div>
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Back Page ({unmappedKeys.back.length} keys):
              </div>
              <div className="flex flex-wrap gap-1">
                {unmappedKeys.back.slice(0, 10).map((key, index) => (
                  <span key={index} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                    {key}
                  </span>
                ))}
                {unmappedKeys.back.length > 10 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                    +{unmappedKeys.back.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
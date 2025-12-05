/**
 * OCR Field Display Component
 * Displays extracted fields from FORMS+LAYOUT OCR with confidence scores and metadata
 * Organized by form sections for better UX
 */
import { IoCheckmarkCircle, IoAlertCircle, IoWarning, IoInformationCircle, IoDocumentText } from 'react-icons/io5';

export default function OCRFieldDisplay({ extractedData }) {
  if (!extractedData) {
    return (
      <div className="text-center py-8">
        <IoInformationCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No OCR data available</p>
      </div>
    );
  }

  // Extract data from enhanced FORMS+LAYOUT response structure
  const fields = extractedData.fields || {};
  const structuredData = extractedData.structuredData || null;
  const confidence = extractedData.confidence || extractedData.stats?.confidence?.overall || 0;
  const stats = extractedData.stats || {};
  const extractionMethod = extractedData.extractionMethod || 'forms+layout';
  const unmappedKeys = extractedData.unmappedKeys || extractedData.unmappedKeysDetailed || [];
  
  // Handle both old and new statistics formats
  const confidenceStats = stats.confidence || {
    overall: confidence,
    high: stats.highConfidence || 0,
    medium: stats.mediumConfidence || 0,
    low: stats.lowConfidence || 0
  };
  
  const processingStats = {
    totalFields: stats.totalFields || stats.total || 0,
    mapped: stats.mapped || 0,
    unmapped: stats.unmapped || 0,
    mappingRate: stats.mappingRate || 0,
    processingTimeMs: stats.processingTimeMs || 0
  };
  
  // Check if we have structured data
  const hasStructuredData = structuredData && (structuredData.front || structuredData.back);

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

  // Render a single field with confidence indicator
  const renderField = (fieldName, fieldData) => {
    const displayName = formatFieldName(fieldName);
    const value = fieldData?.value || fieldData;
    const fieldConfidence = fieldData?.confidence || 0;
    
    return (
      <div key={fieldName} className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fieldName}
          </div>
        </div>
        <div className="flex-1 min-w-0 ml-4 flex items-start gap-2">
          {value ? (
            <>
              <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 break-words">
                {typeof value === 'object' ? JSON.stringify(value) : value}
              </div>
              {fieldConfidence > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getConfidenceStyle(fieldConfidence)}`}>
                  {fieldConfidence.toFixed(0)}%
                </span>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-400 dark:text-gray-500 italic">
              Not extracted
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render structured sections (new format)
  const renderStructuredSections = () => {
    if (!hasStructuredData) return null;

    return (
      <div className="space-y-6">
        {/* Front Page Sections */}
        {structuredData.front && Object.keys(structuredData.front.sections || {}).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-blue-600 dark:text-blue-400">
              <IoDocumentText className="w-5 h-5" />
              <span>Front Page</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({Object.keys(structuredData.front.sections).length} sections)
              </span>
            </div>
            
            {Object.entries(structuredData.front.sections).map(([sectionName, section]) => {
              if (!section.hasData) return null;
              
              const sectionConfidence = section.avgConfidence || 0;
              const fieldCount = Object.keys(section.fields || {}).length;
              
              return (
                <div key={sectionName} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{sectionName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceStyle(sectionConfidence)}`}>
                          {sectionConfidence.toFixed(0)}% avg
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid gap-3">
                      {Object.entries(section.fields).map(([fieldName, fieldData]) =>
                        renderField(fieldName, fieldData)
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back Page Sections */}
        {structuredData.back && Object.keys(structuredData.back.sections || {}).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-purple-600 dark:text-purple-400">
              <IoDocumentText className="w-5 h-5" />
              <span>Back Page</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({Object.keys(structuredData.back.sections).length} sections)
              </span>
            </div>
            
            {Object.entries(structuredData.back.sections).map(([sectionName, section]) => {
              if (!section.hasData) return null;
              
              const sectionConfidence = section.avgConfidence || 0;
              const fieldCount = Object.keys(section.fields || {}).length;
              
              return (
                <div key={sectionName} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{sectionName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceStyle(sectionConfidence)}`}>
                          {sectionConfidence.toFixed(0)}% avg
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid gap-3">
                      {Object.entries(section.fields).map(([fieldName, fieldData]) =>
                        renderField(fieldName, fieldData)
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Structure Summary */}
        {structuredData.summary && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Structure Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{structuredData.summary.frontSections || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Front Sections</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{structuredData.summary.backSections || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Back Sections</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{structuredData.summary.totalSections || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Sections</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">{structuredData.summary.totalFields || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Fields</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Group fields by category (fallback for old format without structured data)
  const renderLegacyCategories = () => {
    const fieldCategories = {
      'Personal Information': ['firstName', 'middleName', 'lastName', 'suffix', 'birthDate', 'age', 'sex', 'fullName'],
      'Contact Information': ['contactNumber', 'emailAddress', 'currentResidenceCity', 'currentResidenceProvince', 'province', 'cityMunicipality'],
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
        {Object.entries(categorizedFields).map(([category, categoryFields]) => (
          <div key={category} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white">{category}</h4>
            </div>
            
            <div className="p-4">
              <div className="grid gap-3">
                {categoryFields.map(({ name, value, displayName }) =>
                  renderField(name, value)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

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
            <div className="text-2xl font-bold text-blue-600">{processingStats.mapped}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Fields Mapped</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {processingStats.mappingRate.toFixed(1)}% rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{confidenceStats.high || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Confidence</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">≥90%</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{confidenceStats.medium || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Medium Confidence</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">70-89%</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{confidenceStats.low || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Low Confidence</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">&lt;70%</div>
          </div>
        </div>
        
        {/* Enhanced Processing Metrics */}
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <div className="flex flex-wrap gap-4 text-sm text-blue-700 dark:text-blue-300">
            <span>Method: {extractionMethod.toUpperCase()}</span>
            {processingStats.processingTimeMs > 0 && (
              <span>Processing: {processingStats.processingTimeMs}ms</span>
            )}
            {processingStats.totalFields > 0 && (
              <span>Total Processed: {processingStats.totalFields}</span>
            )}
            {processingStats.unmapped > 0 && (
              <span>Unmapped: {processingStats.unmapped}</span>
            )}
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

      {/* Extracted Fields - Structured or Legacy Format */}
      {hasStructuredData ? renderStructuredSections() : renderLegacyCategories()}

      {/* Enhanced Unmapped Keys Section */}
      {((Array.isArray(unmappedKeys) && unmappedKeys.length > 0) || 
        (unmappedKeys.front?.length > 0 || unmappedKeys.back?.length > 0)) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
            <IoWarning className="w-5 h-5" />
            Unmapped Keys Found
            {Array.isArray(unmappedKeys) && (
              <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                {unmappedKeys.length}
              </span>
            )}
          </h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            These keys were detected by OCR but couldn&apos;t be mapped to known form fields. This data helps improve field mapping accuracy.
          </p>
          
          {/* Handle new array format (single session) */}
          {Array.isArray(unmappedKeys) && unmappedKeys.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Current Session ({unmappedKeys.length} unmapped):
              </div>
              <div className="flex flex-wrap gap-1">
                {unmappedKeys.slice(0, 15).map((key, index) => (
                  <span key={index} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                    {typeof key === 'string' ? key : key.originalKey || key}
                  </span>
                ))}
                {unmappedKeys.length > 15 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                    +{unmappedKeys.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Handle old object format (front/back pages) */}
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
          
          {/* Improvement tips */}
          <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-700">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              💡 <strong>Tip:</strong> These unmapped keys help our system learn and improve field recognition over time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
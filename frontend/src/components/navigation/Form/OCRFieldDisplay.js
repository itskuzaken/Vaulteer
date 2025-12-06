/**
 * OCR Field Display Component
 * Displays extracted fields from FORMS+LAYOUT OCR with confidence scores and metadata
 * Organized by form sections for better UX
 */
import { IoCheckmarkCircle, IoAlertCircle, IoWarning, IoInformationCircle, IoDocumentText } from 'react-icons/io5';

export default function OCRFieldDisplay({ extractedData }) {
  // Debug logging
  console.log('[OCRFieldDisplay] Component rendered with data:', {
    hasData: !!extractedData,
    hasFields: !!extractedData?.fields,
    hasStructuredData: !!extractedData?.structuredData,
    fieldCount: Object.keys(extractedData?.fields || {}).length,
    structuredDataKeys: extractedData?.structuredData ? Object.keys(extractedData.structuredData) : []
  });

  if (!extractedData) {
    console.log('[OCRFieldDisplay] No extractedData provided - showing empty state');
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
  
  // Debug: Check structuredData structure
  console.log('[OCRFieldDisplay] structuredData structure:', {
    hasStructuredData: !!structuredData,
    hasFront: !!structuredData?.front,
    hasBack: !!structuredData?.back,
    hasSummary: !!structuredData?.summary,
    topLevelKeys: structuredData ? Object.keys(structuredData) : [],
    frontKeys: structuredData?.front ? Object.keys(structuredData.front) : [],
    backKeys: structuredData?.back ? Object.keys(structuredData.back) : []
  });
  
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
  // Handle two formats: 
  // 1. New format with front/back pages: { front: { sections: {...} }, back: { sections: {...} } }
  // 2. Direct section format: { "SECTION NAME": { fields: {...}, avgConfidence: ... } }
  const hasStructuredData = structuredData && (
    structuredData.front || 
    structuredData.back || 
    Object.keys(structuredData).some(key => 
      structuredData[key]?.fields && typeof structuredData[key]?.avgConfidence === 'number'
    )
  );

  console.log('[OCRFieldDisplay] Data structure analysis:', {
    hasStructuredData,
    confidence,
    processingStats,
    unmappedKeysCount: Array.isArray(unmappedKeys) ? unmappedKeys.length : 'not array',
    fieldsCount: Object.keys(fields).length
  });

  console.log('[OCRFieldDisplay] About to render, hasStructuredData:', hasStructuredData);

  try {
    console.log('[OCRFieldDisplay] Rendering component...');

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

  // Render structured sections (handles multiple formats)
  const renderStructuredSections = () => {
    if (!structuredData) {
      console.log('[OCRFieldDisplay] No structured data available');
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <IoInformationCircle className="w-16 h-16 mx-auto mb-4" />
          <p>No structured data available</p>
        </div>
      );
    }

    // Format 1: Direct section format { "SECTION NAME": { fields: {...}, avgConfidence: ... } }
    if (!structuredData.front && !structuredData.back) {
      // Calculate summary stats for direct format
      const sections = Object.entries(structuredData).filter(([key, value]) => 
        value?.fields && typeof value?.avgConfidence === 'number'
      );
      
      const totalSections = sections.length;
      const totalFields = sections.reduce((sum, [, section]) => 
        sum + Object.keys(section.fields || {}).length, 0
      );
      
      return (
        <div className="space-y-4">
          {sections.map(([sectionName, section]) => {
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
          
          {/* Summary for direct format */}
          {totalSections > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Extraction Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{totalSections}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Sections</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">{totalFields}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Fields</div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Format 2: Front/Back page format { front: { sections: {...} }, back: { sections: {...} } }
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

      {/* Extracted Fields - Structured Format */}
      {renderStructuredSections()}

      {/* Enhanced Unmapped Keys Section */}
      {((Array.isArray(unmappedKeys) && unmappedKeys.length > 0) || 
        (unmappedKeys.front?.length > 0 || unmappedKeys.back?.length > 0)) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-5 shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <IoWarning className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              <div>
                <h4 className="font-bold text-yellow-900 dark:text-yellow-100 text-lg">
                  Unmapped Keys Detected
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  OCR detected these fields but couldn&apos;t match them to the form template
                </p>
              </div>
            </div>
            {Array.isArray(unmappedKeys) && (
              <span className="px-3 py-1.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 text-sm font-bold rounded-full">
                {unmappedKeys.length} total
              </span>
            )}
          </div>
          
          {/* Handle new array format (single session) with detailed info */}
          {Array.isArray(unmappedKeys) && unmappedKeys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                  Detected Keys ({unmappedKeys.length})
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  Click to expand details
                </div>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unmappedKeys.slice(0, 20).map((key, index) => {
                  const isDetailed = typeof key === 'object' && key !== null;
                  const keyName = isDetailed ? (key.originalKey || key.normalizedKey) : key;
                  const confidence = isDetailed ? key.confidence : null;
                  const value = isDetailed ? key.value : null;
                  
                  return (
                    <details key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700 overflow-hidden">
                      <summary className="px-3 py-2 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-mono text-yellow-800 dark:text-yellow-200 font-semibold">
                            {keyName}
                          </span>
                          {confidence && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              confidence >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              confidence >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {confidence}% confidence
                            </span>
                          )}
                        </div>
                        <IoInformationCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </summary>
                      
                      <div className="px-3 py-3 bg-gray-50 dark:bg-gray-900 border-t border-yellow-200 dark:border-yellow-700 space-y-2">
                        {isDetailed && (
                          <>
                            {key.originalKey && key.normalizedKey && key.originalKey !== key.normalizedKey && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Normalized:</span>
                                <span className="ml-2 text-sm font-mono text-gray-700 dark:text-gray-300">{key.normalizedKey}</span>
                              </div>
                            )}
                            {value && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Detected Value:</span>
                                <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                  {value}
                                </div>
                              </div>
                            )}
                            {key.context && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Context:</span>
                                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                  {key.context}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            💡 This field may need to be added to the form template or the key name might be misspelled
                          </p>
                        </div>
                      </div>
                    </details>
                  );
                })}
                
                {unmappedKeys.length > 20 && (
                  <div className="text-center py-2 px-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                    <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                      +{unmappedKeys.length - 20} more unmapped keys not shown
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Handle old object format (front/back pages) */}
          {unmappedKeys.front?.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">Front Page</span>
                <span>{unmappedKeys.front.length} keys</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unmappedKeys.front.slice(0, 10).map((key, index) => (
                  <span key={index} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-xs rounded-md font-mono">
                    {key}
                  </span>
                ))}
                {unmappedKeys.front.length > 10 && (
                  <span className="px-2.5 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 text-xs rounded-md font-semibold">
                    +{unmappedKeys.front.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {unmappedKeys.back?.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">Back Page</span>
                <span>{unmappedKeys.back.length} keys</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unmappedKeys.back.slice(0, 10).map((key, index) => (
                  <span key={index} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-xs rounded-md font-mono">
                    {key}
                  </span>
                ))}
                {unmappedKeys.back.length > 10 && (
                  <span className="px-2.5 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 text-xs rounded-md font-semibold">
                    +{unmappedKeys.back.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Action items and improvement tips */}
          <div className="mt-4 pt-4 border-t border-yellow-300 dark:border-yellow-700 space-y-2">
            {/* How You Can Help Section */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-green-300 dark:border-green-700 shadow-sm">
              <h5 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <IoCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                How You Can Help Improve Accuracy
              </h5>
              
              <div className="space-y-3">
                {/* Action 1: Review & Correct */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">1</span>
                    </div>
                    <div className="flex-1">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        📋 Review & Correct in Edit Mode
                      </h6>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Click &quot;Edit Fields&quot; to manually map these values to the correct form fields. Your corrections help train the system.
                      </p>
                      <div className="flex gap-2">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium">
                          ✓ Immediate fix
                        </span>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded font-medium">
                          ✓ Improves system
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action 2: Image Quality */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">2</span>
                    </div>
                    <div className="flex-1">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        📸 Improve Capture Quality
                      </h6>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Better image quality = fewer unmapped keys. Follow these tips:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• ✓ Good lighting - avoid shadows and glare</li>
                        <li>• ✓ Flat surface - no wrinkles or folds</li>
                        <li>• ✓ Clear focus - wait for camera to stabilize</li>
                        <li>• ✓ Straight angle - minimize perspective distortion</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action 3: Form Condition */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">3</span>
                    </div>
                    <div className="flex-1">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        📝 Use Standard Forms
                      </h6>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Ensure you&apos;re using the official DOH HTS Form 2021:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• ✓ Latest official version from DOH</li>
                        <li>• ✓ Clean, unmodified template</li>
                        <li>• ✓ No custom fields or annotations</li>
                        <li>• ✓ Printed clearly (not photocopied multiple times)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action 4: Report Patterns */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">4</span>
                    </div>
                    <div className="flex-1">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        🔔 Report Recurring Issues
                      </h6>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        If you see the same unmapped keys repeatedly, contact your admin:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• ⚠️ Same field consistently unmapped (may need template update)</li>
                        <li>• ⚠️ Regional field name variations</li>
                        <li>• ⚠️ Handwriting patterns causing issues</li>
                        <li>• ⚠️ Local form modifications</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Tips Summary */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-300 dark:border-blue-700">
                <div className="flex items-start gap-2">
                  <IoInformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong className="text-blue-700 dark:text-blue-300">Quick Tip:</strong> The system learns from your corrections. 
                    Each time you manually map an unmapped field, it improves future extractions for similar cases.
                    Your edits contribute to better accuracy for everyone! 🚀
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <IoCheckmarkCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                What This Means
              </h5>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <li>• OCR successfully detected these text fields on the form</li>
                <li>• These fields don&apos;t match any known template field names</li>
                <li>• The data is preserved and tracked for future improvements</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <IoAlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Possible Causes
              </h5>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Field names on the physical form differ from the template</li>
                <li>• Handwritten annotations or additional notes on the form</li>
                <li>• OCR misread similar-looking text (e.g., &quot;Address&quot; vs &quot;Addross&quot;)</li>
                <li>• Form version mismatch or custom fields added locally</li>
              </ul>
            </div>
            
            <div className="text-xs text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
              <strong>💡 System Learning:</strong> This data helps improve the OCR system&apos;s accuracy over time by identifying common variations and patterns.
            </div>
          </div>
        </div>
      )}
    </div>
  );
  } catch (error) {
    console.error('[OCRFieldDisplay] Render error:', error);
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error displaying OCR data: {error.message}</p>
      </div>
    );
  }
}
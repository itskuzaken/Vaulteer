/**
 * OCR Field Display Component
 * Displays extracted fields from FORMS+LAYOUT OCR with confidence scores and metadata
 * Organized by form sections for better UX
 * 
 * COMPOSITE FIELD SUPPORT (Phase 2 Implementation):
 * This component displays composite fields with hierarchical nested components.
 * 
 * Composite fields are identified by the presence of a "components" property:
 * {
 *   value: "assembled value",
 *   confidence: 95.5,
 *   components: {
 *     firstName: "John",
 *     middleName: "A",
 *     lastName: "Doe"
 *   },
 *   mappingStrategy: "composite_fullName"
 * }
 * 
 * Visual Indicators:
 * - "Composite" badge on fields with nested components
 * - Indented component display with purple border and dot markers
 * - Individual confidence scores for each component (if available)
 * - Mapping strategy shown at bottom of component tree
 * 
 * Supported Composite Types (from backend textractService.js):
 * 1. fullName (firstName, middleName, lastName, suffix)
 * 2. testDate/birthDate (month, day, year)
 * 3. sex (male, female checkboxes)
 * 4. genderIdentity (man, woman, transWoman, transMan, other multi-select)
 * 5. civilStatus (single, married, widowed, separated, liveIn checkboxes)
 * 6. addresses (city, province → "City, Province")
 * 7. riskFields (no/yes → total, date1, date2, dateMostRecentRisk)
 */
import React, { useState, useEffect } from 'react';
import { IoCheckmarkCircle, IoAlertCircle, IoWarning, IoInformationCircle, IoDocumentText } from 'react-icons/io5';
import { loadTemplateMetadata, buildFieldMetadata } from '../../../utils/templateMetadataLoader';

export default function OCRFieldDisplay({ extractedData, variant = 'standalone', className = '' }) {
  const isEmbedded = variant === 'embedded';
  // State for metadata-driven field labels
  const [fieldMetadata, setFieldMetadata] = useState({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Load field metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const metadata = await loadTemplateMetadata();
        if (metadata) {
          const fields = buildFieldMetadata(metadata);
          setFieldMetadata(fields);
        }
      } catch (error) {
        console.error('Failed to load field metadata:', error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };
    loadMetadata();
  }, []);

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

  // Format field name for display - uses metadata labels if available, falls back to camelCase
  const formatFieldName = (fieldName) => {
    // Try to get label from metadata first
    if (fieldMetadata[fieldName]?.label) {
      return fieldMetadata[fieldName].label;
    }
    
    // Fallback to camelCase conversion if metadata not loaded or field not found
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Date helpers - format date values for display purposes
  const isLikelyDateField = (fieldName) => /date/i.test(fieldName);

  const formatDateDisplay = (value) => {
    if (value == null) return value;
    const str = String(value).trim();
    const mmddyyyy = /^\d{1,2}\/\d{1,2}\/\d{4}$/; // MM/DD/YYYY
    const mmyyyy = /^\d{1,2}\/\d{4}$/; // MM/YYYY
    const iso = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
    if (mmddyyyy.test(str) || mmyyyy.test(str)) return str;
    if (iso.test(str)) {
      const [y, mo, d] = str.split('-');
      return `${mo}/${d}/${y}`;
    }
    // fallback - if it's a date-like timestamp
    const asDate = new Date(str);
    if (!Number.isNaN(asDate.getTime())) {
      // prefer MM/DD/YYYY
      const mm = String(asDate.getMonth() + 1).padStart(2, '0');
      const dd = String(asDate.getDate()).padStart(2, '0');
      const yyyy = asDate.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }
    return str;
  };

  const getCompositeDate = (components = {}) => {
    const month = components.month || components.mm;
    const day = components.day || components.dd;
    const year = components.year || components.yyyy;
    if (!month || !year) return null;
    const paddedMonth = month.toString().padStart(2, '0');
    const paddedDay = day ? day.toString().padStart(2, '0') : null;
    if (paddedDay) return `${paddedMonth}/${paddedDay}/${year}`;
    return `${paddedMonth}/${year}`;
  };

  const getDisplayValue = (fieldName, fieldData) => {
    if (fieldData == null) return '';
    const rawValue = fieldData?.value ?? fieldData;
    if (typeof rawValue === 'string' || typeof rawValue === 'number') return rawValue;
    if (fieldData?.components && typeof fieldData.components === 'object') {
      const compositeDate = getCompositeDate(fieldData.components);
      if (compositeDate) return compositeDate;
      // Fallback: show object components when no recognizable composite value
      return JSON.stringify(fieldData.components);
    }
    return typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
  };

  // Render a single field with confidence indicator and nested components
  const renderField = (fieldName, fieldData) => {
    const displayName = formatFieldName(fieldName);
    const value = getDisplayValue(fieldName, fieldData);
    const fieldConfidence = fieldData?.confidence || 0;
    const hasComponents = fieldData?.components && typeof fieldData.components === 'object';
    const checkIndicator = fieldData?.checkIndicator;
    
    return (
      <div key={fieldName} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        {/* Main Field Display */}
        <div className="flex items-start justify-between py-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {displayName}
              </div>
              {hasComponents && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium">
                  Composite
                </span>
              )}
              {checkIndicator && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium" title={checkIndicator}>
                  ✓ Checkbox
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {fieldName}
            </div>
            {checkIndicator && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 italic">
                {checkIndicator}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 ml-4">
              <div className="flex items-start gap-2">
              {value ? (
                <>
                  <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 break-words">
                    {isLikelyDateField(fieldName) ? formatDateDisplay(value) : String(value)}
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
            {/* Region coordinates display (if available) */}
            {fieldData?.region && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                📍 ({fieldData.region.x.toFixed(3)}, {fieldData.region.y.toFixed(3)}) {fieldData.region.width.toFixed(3)}×{fieldData.region.height.toFixed(3)} | Page {fieldData.region.page}
              </div>
            )}
          </div>
        </div>
        
        {/* Nested Components Display (if composite field) */}
        {hasComponents && (
          <div className="ml-6 mb-2 pb-2 border-l-2 border-purple-200 dark:border-purple-800 pl-4 space-y-1">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
              Components:
            </div>
            {Object.entries(fieldData.components).map(([componentKey, componentValue]) => {
              // Handle nested component values with confidence
              const isNestedObject = typeof componentValue === 'object' && componentValue !== null && !Array.isArray(componentValue);
              const nestedValue = isNestedObject ? (componentValue.value ?? componentValue) : componentValue;
              const nestedConfidence = isNestedObject ? componentValue.confidence : null;
              
              return (
                <div key={componentKey} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-600"></span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {formatFieldName(componentKey)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300">
                      {typeof nestedValue === 'object'
                        ? JSON.stringify(nestedValue)
                        : (nestedValue || <span className="italic text-gray-400">empty</span>)}
                    </span>
                    {nestedConfidence !== null && nestedConfidence !== undefined && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${getConfidenceStyle(nestedConfidence)}`}>
                        {nestedConfidence.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Show mapping strategy if available */}
            {fieldData.mappingStrategy && (
              <div className="text-xs text-gray-500 dark:text-gray-500 italic mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                Strategy: {fieldData.mappingStrategy}
              </div>
            )}
          </div>
        )}
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
    <div className={`space-y-6 ${className}`}>
      {/* Extraction Summary */}
      <div className={`${isEmbedded ? 'bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800'} rounded-lg p-6`}>
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
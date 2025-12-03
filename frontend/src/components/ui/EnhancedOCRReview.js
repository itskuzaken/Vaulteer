import React from 'react';

/**
 * Enhanced OCR Field Display Component
 * Displays extracted field with confidence-based styling
 */
const EnhancedOCRFieldDisplay = ({ field, value, label, onEdit }) => {
  // Get confidence level
  const confidence = value?.confidence || 0;
  const fieldValue = value?.value !== undefined ? value.value : value;
  const requiresReview = value?.requiresReview || false;
  
  // Determine confidence level styling
  let confidenceColor = '';
  let confidenceText = '';
  let borderColor = '';
  
  if (confidence >= 0.90) {
    confidenceColor = 'text-green-600';
    confidenceText = 'High';
    borderColor = 'border-green-500';
  } else if (confidence >= 0.70) {
    confidenceColor = 'text-yellow-600';
    confidenceText = 'Medium';
    borderColor = 'border-yellow-500';
  } else {
    confidenceColor = 'text-red-600';
    confidenceText = 'Low';
    borderColor = 'border-red-500';
  }
  
  return (
    <div className={`relative p-3 border-2 rounded-lg ${borderColor} bg-white`}>
      {/* Confidence Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className={`text-xs font-semibold ${confidenceColor}`}>
          {confidenceText} ({(confidence * 100).toFixed(0)}%)
        </span>
        {requiresReview && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
            Review
          </span>
        )}
      </div>
      
      {/* Field Label */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      {/* Field Value */}
      <div className="text-base font-semibold text-gray-900 mb-2">
        {fieldValue || <span className="text-gray-400 italic">Not detected</span>}
      </div>
      
      {/* Edit Button */}
      {onEdit && (
        <button
          onClick={() => onEdit(field, fieldValue)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Edit
        </button>
      )}
      
      {/* Additional Info */}
      {value?.extractionMethod && (
        <div className="text-xs text-gray-500 mt-2">
          Method: {value.extractionMethod}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced OCR Review Component
 * Displays all extracted fields with confidence indicators
 */
const EnhancedOCRReview = ({ extractedData, onEdit, onAccept, onReanalyze }) => {
  if (!extractedData) return null;
  
  const fields = extractedData.fields || extractedData;
  const stats = extractedData.stats || {};
  const confidence = extractedData.confidence || 0;
  const validationSummary = extractedData.validationSummary || {};
  
  // Group fields by page
  const frontPageFields = [
    { key: 'testDate', label: 'Test Date' },
    { key: 'philHealthNumber', label: 'PhilHealth Number' },
    { key: 'philSysNumber', label: 'PhilSys Number' },
    { key: 'firstName', label: 'First Name' },
    { key: 'middleName', label: 'Middle Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'suffix', label: 'Suffix' },
    { key: 'birthDate', label: 'Birth Date' },
    { key: 'age', label: 'Age' },
    { key: 'sex', label: 'Sex' },
    { key: 'civilStatus', label: 'Civil Status' },
    { key: 'contactNumber', label: 'Contact Number' },
    { key: 'educationalAttainment', label: 'Educational Attainment' }
  ];
  
  const backPageFields = [
    { key: 'previouslyTested', label: 'Previously Tested' },
    { key: 'previousTestDate', label: 'Previous Test Date' },
    { key: 'previousTestResult', label: 'Previous Test Result' },
    { key: 'testingFacility', label: 'Testing Facility' },
    { key: 'counselorName', label: 'Counselor Name' }
  ];
  
  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Enhanced OCR Analysis Results
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {(confidence).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Overall Confidence</div>
          </div>
          
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {stats.highConfidence || 0}
            </div>
            <div className="text-sm text-gray-600">High Confidence</div>
          </div>
          
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.mediumConfidence || 0}
            </div>
            <div className="text-sm text-gray-600">Medium Confidence</div>
          </div>
          
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-2xl font-bold text-red-600">
              {stats.lowConfidence || 0}
            </div>
            <div className="text-sm text-gray-600">Low Confidence</div>
          </div>
        </div>
        
        {validationSummary.crossFieldErrors?.total > 0 && (
          <div className="mt-4 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-700">
            <p className="font-semibold">
              ⚠️ {validationSummary.crossFieldErrors.critical} critical and {validationSummary.crossFieldErrors.major} major cross-field validation errors detected
            </p>
            <p className="text-sm mt-1">Please review flagged fields carefully</p>
          </div>
        )}
        
        {stats.requiresReview > 0 && (
          <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <p className="font-semibold">
              📋 {stats.requiresReview} fields require manual review
            </p>
            <p className="text-sm mt-1">Fields with medium or low confidence are flagged for verification</p>
          </div>
        )}
      </div>
      
      {/* Front Page Fields */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-md font-bold text-gray-800 mb-4 border-b pb-2">
          📄 Front Page (Personal Information)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frontPageFields.map(({ key, label }) => (
            fields[key] && (
              <EnhancedOCRFieldDisplay
                key={key}
                field={key}
                value={fields[key]}
                label={label}
                onEdit={onEdit}
              />
            )
          ))}
        </div>
      </div>
      
      {/* Back Page Fields */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-md font-bold text-gray-800 mb-4 border-b pb-2">
          📄 Back Page (Testing Details)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backPageFields.map(({ key, label }) => (
            fields[key] && (
              <EnhancedOCRFieldDisplay
                key={key}
                field={key}
                value={fields[key]}
                label={label}
                onEdit={onEdit}
              />
            )
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={onReanalyze}
          className="px-6 py-2 border-2 border-blue-500 text-blue-700 rounded-lg hover:bg-blue-50 transition"
        >
          🔄 Re-analyze
        </button>
        <button
          onClick={onAccept}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
        >
          ✓ Accept & Continue
        </button>
      </div>
      
      {/* Extraction Method Info */}
      <div className="text-center text-sm text-gray-500">
        Extraction Method: {extractedData.extractionMethod || 'Standard'} | 
        Template: {extractedData.templateId || 'N/A'}
      </div>
    </div>
  );
};

export default EnhancedOCRReview;
export { EnhancedOCRFieldDisplay };

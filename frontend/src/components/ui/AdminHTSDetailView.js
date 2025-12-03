import React from 'react';

/**
 * Admin HTS Form Detail View Component
 * Displays all extracted fields from template-metadata.json with metadata
 * Shows confidence scores, detection methods, and field-by-field details
 */

// Field labels mapping from template metadata
const TEMPLATE_FIELD_LABELS = {
  // Front page fields
  testDate: 'Test Date',
  philHealthNumber: 'PhilHealth Number',
  philSysNumber: 'PhilSys Number',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  suffix: 'Suffix',
  birthDate: 'Birth Date',
  age: 'Age',
  sex: 'Sex',
  civilStatus: 'Civil Status',
  contactNumber: 'Contact Number',
  email: 'Email',
  region: 'Region',
  province: 'Province',
  cityMunicipality: 'City/Municipality',
  barangay: 'Barangay',
  houseNumberStreet: 'House Number/Street',
  landmark: 'Landmark',
  educationalAttainment: 'Educational Attainment',
  occupation: 'Occupation',
  monthlyIncome: 'Monthly Income',
  pwdId: 'PWD ID',
  indigenousPerson: 'Indigenous Person',
  
  // Back page fields
  motherHIV: 'Mother with HIV',
  riskAssessment: 'Risk Assessment',
  reasonsForTesting: 'Reasons for Testing',
  previouslyTested: 'Previously Tested',
  previousTestDate: 'Previous Test Date',
  previousTestResult: 'Previous Test Result',
  medicalHistory: 'Medical History',
  clinicalPicture: 'Clinical Picture',
  symptoms: 'Symptoms',
  whoStaging: 'WHO Staging',
  clientType: 'Client Type',
  venue: 'Venue',
  modeOfReach: 'Mode of Reach',
  testingAccepted: 'Testing Accepted',
  kitName: 'Test Kit Name',
  kitLotNumber: 'Kit Lot Number',
  testingFacility: 'Testing Facility',
  facilityAddress: 'Facility Address',
  emailAddress: 'Email Address',
  serviceProvider: 'Service Provider',
  otherServices: 'Other Services Provided'
};

// Group fields by section
const FRONT_PAGE_SECTIONS = {
  'Personal Information': [
    'testDate', 'philHealthNumber', 'philSysNumber', 
    'firstName', 'middleName', 'lastName', 'suffix'
  ],
  'Demographic Data': [
    'birthDate', 'age', 'sex', 'civilStatus'
  ],
  'Contact Information': [
    'contactNumber', 'email', 'region', 'province', 
    'cityMunicipality', 'barangay', 'houseNumberStreet', 'landmark'
  ],
  'Education & Occupation': [
    'educationalAttainment', 'occupation', 'monthlyIncome', 
    'pwdId', 'indigenousPerson'
  ]
};

const BACK_PAGE_SECTIONS = {
  'Risk Assessment': [
    'motherHIV', 'riskAssessment'
  ],
  'Testing Information': [
    'reasonsForTesting', 'previouslyTested', 'previousTestDate', 'previousTestResult'
  ],
  'Medical History': [
    'medicalHistory', 'clinicalPicture', 'symptoms', 'whoStaging'
  ],
  'Client Details': [
    'clientType', 'venue', 'modeOfReach', 'testingAccepted'
  ],
  'Test Kit Information': [
    'kitName', 'kitLotNumber'
  ],
  'Facility & Provider': [
    'testingFacility', 'facilityAddress', 'contactNumber', 'emailAddress', 'serviceProvider'
  ],
  'Additional Services': [
    'otherServices'
  ]
};

/**
 * Field Display Component with Metadata
 */
const AdminFieldDisplay = ({ field, value, label }) => {
  const confidence = value?.confidence || 0;
  const fieldValue = value?.value !== undefined ? value.value : value;
  const extractionMethod = value?.extractionMethod || 'unknown';
  const requiresReview = value?.requiresReview || false;
  const edited = value?.edited || false;
  
  // Determine confidence level styling
  let confidenceColor = '';
  let confidenceText = '';
  let confidenceBg = '';
  let borderColor = '';
  
  if (confidence >= 0.90) {
    confidenceColor = 'text-green-700';
    confidenceText = 'High Confidence';
    confidenceBg = 'bg-green-100';
    borderColor = 'border-green-400';
  } else if (confidence >= 0.70) {
    confidenceColor = 'text-yellow-700';
    confidenceText = 'Medium Confidence';
    confidenceBg = 'bg-yellow-100';
    borderColor = 'border-yellow-400';
  } else {
    confidenceColor = 'text-red-700';
    confidenceText = 'Low Confidence';
    confidenceBg = 'bg-red-100';
    borderColor = 'border-red-400';
  }
  
  // Render field value
  const renderValue = () => {
    if (!fieldValue) {
      return <span className="text-gray-400 italic">Not detected</span>;
    }
    
    if (Array.isArray(fieldValue)) {
      return (
        <div className="flex flex-wrap gap-2">
          {fieldValue.map((item, index) => {
            // Handle objects like {label, options}
            const displayValue = typeof item === 'object' && item !== null 
              ? (item.label || item.value || JSON.stringify(item))
              : item;
            return (
              <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                {displayValue}
              </span>
            );
          })}
        </div>
      );
    }
    
    // Handle object values like {label, options}
    let displayValue = fieldValue;
    if (typeof fieldValue === 'object' && fieldValue !== null) {
      displayValue = fieldValue.label || fieldValue.value || JSON.stringify(fieldValue);
    }
    
    return <span className="text-gray-900 font-semibold">{displayValue}</span>;
  };
  
  return (
    <div className={`relative p-4 border-2 rounded-lg ${borderColor} bg-white shadow-sm`}>
      {/* Field Label */}
      <div className="flex justify-between items-start mb-2">
        <label className="text-sm font-bold text-gray-700">
          {label}
        </label>
        
        {/* Badges */}
        <div className="flex gap-2 flex-wrap justify-end">
          {edited && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">
              ✏️ Edited
            </span>
          )}
          {requiresReview && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-semibold">
              ⚠️ Review
            </span>
          )}
        </div>
      </div>
      
      {/* Field Value */}
      <div className="mb-3 text-base">
        {renderValue()}
      </div>
      
      {/* Metadata Bar */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        {/* Confidence Indicator */}
        <div className={`flex items-center gap-2 ${confidenceBg} px-3 py-1 rounded-full`}>
          <div className={`text-xs font-bold ${confidenceColor}`}>
            {confidenceText}
          </div>
          <div className={`text-xs font-mono ${confidenceColor}`}>
            {(confidence * 100).toFixed(1)}%
          </div>
        </div>
        
        {/* Extraction Method */}
        <div className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
          📊 {extractionMethod}
        </div>
      </div>
    </div>
  );
};

/**
 * Section Component
 */
const AdminFieldSection = ({ title, fields, extractedData }) => {
  const hasAnyField = fields.some(field => extractedData[field]);
  
  if (!hasAnyField) {
    return (
      <div className="mb-6">
        <h5 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">
          {title}
        </h5>
        <div className="p-4 bg-gray-50 rounded-lg text-gray-500 italic text-sm">
          No fields detected in this section
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <h5 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1 flex items-center gap-2">
        <span>{title}</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
          {fields.filter(f => extractedData[f]).length} / {fields.length} fields
        </span>
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          if (!extractedData[field]) return null;
          
          return (
            <AdminFieldDisplay
              key={field}
              field={field}
              value={extractedData[field]}
              label={TEMPLATE_FIELD_LABELS[field] || field}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Main Admin HTS Detail View Component
 */
const AdminHTSDetailView = ({ extractedData, submissionInfo }) => {
  if (!extractedData) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 font-semibold">⚠️ No extracted data available</p>
        <p className="text-yellow-700 text-sm mt-2">
          This submission may have been created before OCR implementation or the extraction failed.
        </p>
      </div>
    );
  }
  
  const fields = extractedData.fields || extractedData;
  const stats = extractedData.stats || {};
  const confidence = extractedData.confidence || 0;
  const templateId = extractedData.templateId || 'doh-hts-2021-v2';
  const extractionMethod = extractedData.extractionMethod || 'unknown';
  
  // Calculate total fields
  const totalFrontFields = Object.values(FRONT_PAGE_SECTIONS).flat().length;
  const totalBackFields = Object.values(BACK_PAGE_SECTIONS).flat().length;
  const detectedFrontFields = Object.values(FRONT_PAGE_SECTIONS).flat().filter(f => fields[f]).length;
  const detectedBackFields = Object.values(BACK_PAGE_SECTIONS).flat().filter(f => fields[f]).length;
  
  return (
    <div className="space-y-6">
      {/* Extraction Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          🔍 OCR Extraction Analysis
        </h3>
        
        {/* Submission Info */}
        {submissionInfo && (
          <div className="mb-4 p-3 bg-white rounded border border-indigo-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Control Number</div>
                <div className="font-bold text-gray-900">{submissionInfo.control_number}</div>
              </div>
              <div>
                <div className="text-gray-600">Submitter</div>
                <div className="font-bold text-gray-900">{submissionInfo.username}</div>
              </div>
              <div>
                <div className="text-gray-600">Submission Date</div>
                <div className="font-bold text-gray-900">
                  {new Date(submissionInfo.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Status</div>
                <div className={`font-bold ${
                  submissionInfo.status === 'approved' ? 'text-green-600' :
                  submissionInfo.status === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {submissionInfo.status}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {(confidence).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Overall Confidence</div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {stats.highConfidence || 0}
            </div>
            <div className="text-sm text-gray-600">High Confidence</div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-3xl font-bold text-yellow-600">
              {stats.mediumConfidence || 0}
            </div>
            <div className="text-sm text-gray-600">Medium Confidence</div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-3xl font-bold text-red-600">
              {stats.lowConfidence || 0}
            </div>
            <div className="text-sm text-gray-600">Low Confidence</div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-3xl font-bold text-purple-600">
              {detectedFrontFields + detectedBackFields}
            </div>
            <div className="text-sm text-gray-600">Total Fields Detected</div>
          </div>
        </div>
        
        {/* Coverage Info */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 bg-white rounded border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Front Page Coverage</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(detectedFrontFields / totalFrontFields) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-blue-600">
                {detectedFrontFields}/{totalFrontFields}
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-white rounded border border-purple-200">
            <div className="text-sm text-gray-600 mb-1">Back Page Coverage</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(detectedBackFields / totalBackFields) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-purple-600">
                {detectedBackFields}/{totalBackFields}
              </span>
            </div>
          </div>
        </div>
        
        {/* Template Info */}
        <div className="mt-4 p-3 bg-white rounded border border-gray-200 text-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-gray-600">Template:</span>{' '}
              <span className="font-semibold text-gray-900">{templateId}</span>
            </div>
            <div>
              <span className="text-gray-600">Extraction Method:</span>{' '}
              <span className="font-semibold text-gray-900">{extractionMethod}</span>
            </div>
            <div>
              <span className="text-gray-600">OCR Completed:</span>{' '}
              <span className="font-semibold text-gray-900">
                {submissionInfo?.ocr_completed_at 
                  ? new Date(submissionInfo.ocr_completed_at).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Front Page */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2 flex items-center gap-2">
          📄 Front Page - Personal Information Sheet
          <span className="text-sm font-normal text-blue-600">
            ({detectedFrontFields}/{totalFrontFields} fields)
          </span>
        </h4>
        {Object.entries(FRONT_PAGE_SECTIONS).map(([sectionTitle, sectionFields]) => (
          <AdminFieldSection
            key={sectionTitle}
            title={sectionTitle}
            fields={sectionFields}
            extractedData={fields}
          />
        ))}
      </div>
      
      {/* Back Page */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-purple-500 pb-2 flex items-center gap-2">
          📄 Back Page - Testing & Medical History
          <span className="text-sm font-normal text-purple-600">
            ({detectedBackFields}/{totalBackFields} fields)
          </span>
        </h4>
        {Object.entries(BACK_PAGE_SECTIONS).map(([sectionTitle, sectionFields]) => (
          <AdminFieldSection
            key={sectionTitle}
            title={sectionTitle}
            fields={sectionFields}
            extractedData={fields}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminHTSDetailView;

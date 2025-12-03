import React, { useState } from 'react';

/**
 * Template-Based OCR Review Component
 * Displays all extracted fields from template-metadata.json with editing capabilities
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
  contactNumber: 'Contact Number',
  emailAddress: 'Email Address',
  serviceProvider: 'Service Provider',
  otherServices: 'Other Services Provided'
};

// Group fields by section for better organization
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
 * Editable Field Component
 */
const EditableOCRField = ({ field, value, label, onEdit, isEditing, onSave, onCancel, validationWarning }) => {
  // Extract the actual value, handling objects like {label, options}
  const extractValue = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val.value !== undefined) return val.value;
      if (val.label !== undefined) return val.label;
    }
    return val;
  };
  
  const [editValue, setEditValue] = useState(extractValue(value?.value || value));
  
  const confidence = value?.confidence || 0;
  const fieldValue = value?.value !== undefined ? value.value : value;
  const requiresReview = value?.requiresReview || false;
  const extractionMethod = value?.extractionMethod || 'unknown';
  
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
  
  const handleSave = () => {
    onSave(field, editValue);
  };
  
  // Handle checkbox group values (arrays)
  const renderFieldValue = () => {
    if (Array.isArray(fieldValue)) {
      return (
        <div className="flex flex-wrap gap-2 mb-2">
          {fieldValue.map((item, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {typeof item === 'object' ? item.label || JSON.stringify(item) : item}
            </span>
          ))}
        </div>
      );
    }
    
    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      );
    }
    
    // Handle object values (like {label, options})
    let displayValue = fieldValue;
    if (typeof fieldValue === 'object' && fieldValue !== null) {
      displayValue = fieldValue.label || fieldValue.value || JSON.stringify(fieldValue);
    }
    
    return (
      <div className="text-base font-semibold text-gray-900 mb-2">
        {displayValue || <span className="text-gray-400 italic">Not detected</span>}
      </div>
    );
  };
  
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
      
      {/* Validation Warning */}
      {validationWarning && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
          ⚠️ {validationWarning}
        </div>
      )}
      
      {/* Field Value or Input */}
      {renderFieldValue()}
      
      {/* Action Buttons */}
      <div className="flex gap-2 items-center">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditValue(fieldValue || '');
                onCancel();
              }}
              className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => onEdit(field)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            disabled={Array.isArray(fieldValue)} // Don't allow editing checkbox groups
          >
            {Array.isArray(fieldValue) ? 'Multi-select field' : 'Edit'}
          </button>
        )}
        
        {/* Extraction Method Badge */}
        <span className="text-xs text-gray-500 ml-auto">
          {extractionMethod}
        </span>
      </div>
    </div>
  );
};

/**
 * Section Component
 */
const FieldSection = ({ title, fields, extractedData, editingField, onEdit, onSave, onCancel, validationWarnings }) => {
  const hasAnyField = fields.some(field => extractedData[field]);
  
  if (!hasAnyField) return null;
  
  return (
    <div className="mb-6">
      <h5 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">
        {title}
      </h5>
      <div className="space-y-4">
        {fields.map((field) => {
          if (!extractedData[field]) return null;
          
          const warning = validationWarnings.find(w => w.field === field);
          
          return (
            <EditableOCRField
              key={field}
              field={field}
              value={extractedData[field]}
              label={TEMPLATE_FIELD_LABELS[field] || field}
              onEdit={onEdit}
              isEditing={editingField === field}
              onSave={onSave}
              onCancel={onCancel}
              validationWarning={warning?.message}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Cross-field validation helper
 * Checks for logical consistency between related fields
 */
const validateCrossFields = (data) => {
  const warnings = [];
  
  // Age vs Birth Date validation
  if (data.age?.value && data.birthDate?.value) {
    const birthDate = new Date(data.birthDate.value);
    const today = new Date();
    const calculatedAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    const extractedAge = parseInt(data.age.value);
    
    if (!isNaN(calculatedAge) && !isNaN(extractedAge) && Math.abs(calculatedAge - extractedAge) > 1) {
      warnings.push({
        field: 'age',
        message: `Age (${extractedAge}) does not match birth date (should be ~${calculatedAge})`
      });
    }
  }
  
  // Contact number format validation
  if (data.contactNumber?.value) {
    const phonePattern = /^(\+63|0)?[0-9]{10}$/;
    const cleaned = data.contactNumber.value.replace(/[\s\-()]/g, '');
    if (!phonePattern.test(cleaned)) {
      warnings.push({
        field: 'contactNumber',
        message: 'Contact number format may be invalid (expected Philippine format: 09XX-XXX-XXXX or +639XX-XXX-XXXX)'
      });
    }
  }
  
  // Email format validation
  if (data.email?.value) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(data.email.value)) {
      warnings.push({
        field: 'email',
        message: 'Email format appears invalid'
      });
    }
  }
  
  // Previous test consistency
  if (data.previouslyTested?.value === 'Yes' && !data.previousTestDate?.value) {
    warnings.push({
      field: 'previousTestDate',
      message: 'Previously tested is "Yes" but no previous test date provided'
    });
  }
  
  if (data.previouslyTested?.value === 'No' && data.previousTestDate?.value) {
    warnings.push({
      field: 'previousTestDate',
      message: 'Previously tested is "No" but previous test date is filled'
    });
  }
  
  // Test date validation (should not be in the future)
  if (data.testDate?.value) {
    const testDate = new Date(data.testDate.value);
    const today = new Date();
    if (testDate > today) {
      warnings.push({
        field: 'testDate',
        message: 'Test date is in the future'
      });
    }
  }
  
  return warnings;
};

/**
 * Main Template-Based OCR Review Component
 */
const TemplateBasedOCRReview = ({ extractedData, onUpdate, onAccept, onReanalyze }) => {
  const [editingField, setEditingField] = useState(null);
  const [modifiedData, setModifiedData] = useState({ ...extractedData });
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Run cross-field validation whenever data changes
  React.useEffect(() => {
    const warnings = validateCrossFields(modifiedData);
    setValidationWarnings(warnings);
  }, [modifiedData]);

  if (!extractedData) return null;

  const fields = extractedData.fields || extractedData;
  const stats = extractedData.stats || {};
  const confidence = extractedData.confidence || 0;
  
  const handleEdit = (field) => {
    setEditingField(field);
  };
  
  const handleSave = (field, newValue) => {
    const updatedData = {
      ...modifiedData,
      [field]: {
        ...modifiedData[field],
        value: newValue,
        edited: true
      }
    };
    setModifiedData(updatedData);
    setEditingField(null);
    
    // Notify parent component of changes
    if (onUpdate) {
      onUpdate(updatedData);
    }
  };
  
  const handleCancel = () => {
    setEditingField(null);
  };
  
  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-4">
      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm sticky top-0 z-10">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          📋 OCR Extraction Results - Review & Edit
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
        
        <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-500 text-blue-700">
          <p className="text-sm">
            💡 <strong>Tip:</strong> Click &quot;Edit&quot; on any field to modify its value. Fields with low confidence are recommended for review.
          </p>
        </div>
      </div>
      
      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-bold text-yellow-800 mb-2">
                Data Consistency Warnings
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    <strong>{TEMPLATE_FIELD_LABELS[warning.field] || warning.field}:</strong> {warning.message}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-yellow-600 mt-2">
                Please review and correct these fields before submitting.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Front Page */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-md font-bold text-gray-800 mb-4 border-b pb-2">
          📄 Front Page - Personal Information Sheet
        </h4>
        {Object.entries(FRONT_PAGE_SECTIONS).map(([sectionTitle, sectionFields]) => (
          <FieldSection
            key={sectionTitle}
            title={sectionTitle}
            fields={sectionFields}
            extractedData={modifiedData}
            editingField={editingField}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            validationWarnings={validationWarnings}
          />
        ))}
      </div>
      
      {/* Back Page */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-md font-bold text-gray-800 mb-4 border-b pb-2">
          📄 Back Page - Testing & Medical History
        </h4>
        {Object.entries(BACK_PAGE_SECTIONS).map(([sectionTitle, sectionFields]) => (
          <FieldSection
            key={sectionTitle}
            title={sectionTitle}
            fields={sectionFields}
            extractedData={modifiedData}
            editingField={editingField}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            validationWarnings={validationWarnings}
          />
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4 justify-end sticky bottom-0 bg-white p-4 rounded-lg shadow-lg">
        <button
          onClick={onReanalyze}
          className="px-6 py-2 border-2 border-blue-500 text-blue-700 rounded-lg hover:bg-blue-50 transition"
        >
          🔄 Re-analyze Images
        </button>
        <button
          onClick={() => onAccept(modifiedData)}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
        >
          ✓ Accept & Continue to Submission
        </button>
      </div>
      
      {/* Extraction Info */}
      <div className="text-center text-sm text-gray-500">
        Extraction Method: {extractedData.extractionMethod || 'Hybrid (Queries + Forms + Checkboxes)'} | 
        Template: {extractedData.templateId || 'doh-hts-2021-v2'}
      </div>
    </div>
  );
};

export default TemplateBasedOCRReview;

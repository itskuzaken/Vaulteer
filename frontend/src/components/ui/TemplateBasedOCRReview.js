import React, { useState, useMemo } from 'react';

/**
 * Template-Based OCR Review Component
 * Dynamically organizes fields by category based on HTS form structure
 * Auto-categorizes fields for cleaner, maintainable code
 */

// Comprehensive field metadata with categories matching HTS Form structure
const FIELD_METADATA = {
  // Test Result (not on HTS form, only in review)
  testResult: { label: 'Current Test Result', category: 'TEST RESULT', page: 'front', priority: 1 },
  
  // INFORMED CONSENT
  testDate: { label: 'Current Test Date', category: 'INFORMED CONSENT', page: 'front', priority: 1 },
  philHealthNumber: { label: 'PhilHealth Number', category: 'INFORMED CONSENT', page: 'front', priority: 2 },
  philSysNumber: { label: 'PhilSys Number', category: 'INFORMED CONSENT', page: 'front', priority: 2 },
  firstName: { label: 'First Name', category: 'INFORMED CONSENT', page: 'front', priority: 1 },
  middleName: { label: 'Middle Name', category: 'INFORMED CONSENT', page: 'front', priority: 2 },
  lastName: { label: 'Last Name', category: 'INFORMED CONSENT', page: 'front', priority: 1 },
  suffix: { label: 'Suffix', category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  parentalCode: { label: "Parental Code (Mother+Father+Birth Order)", category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  parentalCodeMother: { label: "Mother's First Name (First 2 letters)", category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  parentalCodeFather: { label: "Father's First Name (First 2 letters)", category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  birthOrder: { label: 'Birth Order', category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  contactNumber: { label: 'Contact Number', category: 'INFORMED CONSENT', page: 'front', priority: 2 },
  consentGiven: { label: 'Consent Given', category: 'INFORMED CONSENT', page: 'front', priority: 2 },
  consentSignature: { label: 'Consent Signature', category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  verbalConsent: { label: 'Verbal Consent', category: 'INFORMED CONSENT', page: 'front', priority: 2 },
  email: { label: 'Email', category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  emailAddress: { label: 'Email Address', category: 'INFORMED CONSENT', page: 'front', priority: 3 },
  
  // DEMOGRAPHIC DATA
  birthDate: { label: 'Birth Date', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 1 },
  age: { label: 'Age', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 1 },
  ageMonths: { label: 'Age in Months (for <1 year old)', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 2 },
  sex: { label: 'Sex (assigned at birth)', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 1 },
  genderIdentity: { label: 'Gender Identity', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 2 },
  currentResidenceCity: { label: 'Current Residence - City/Municipality', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 2 },
  currentResidenceProvince: { label: 'Current Residence - Province', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 2 },
  permanentResidenceCity: { label: 'Permanent Residence - City/Municipality', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  permanentResidenceProvince: { label: 'Permanent Residence - Province', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  placeOfBirthCity: { label: 'Place of Birth - City/Municipality', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  placeOfBirthProvince: { label: 'Place of Birth - Province', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  nationality: { label: 'Nationality', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 2 },
  nationalityOther: { label: 'Nationality - Other (specify)', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  civilStatus: { label: 'Civil Status', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 2 },
  livingWithPartner: { label: 'Currently living with a partner', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  numberOfChildren: { label: 'Number of children', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  isPregnant: { label: 'Currently pregnant (for female only)', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  region: { label: 'Region', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  province: { label: 'Province', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  cityMunicipality: { label: 'City/Municipality', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  barangay: { label: 'Barangay', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  houseNumberStreet: { label: 'House Number/Street', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  landmark: { label: 'Landmark', category: 'DEMOGRAPHIC DATA', page: 'front', priority: 3 },
  
  // EDUCATION & OCCUPATION
  educationalAttainment: { label: 'Highest Educational Attainment', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 2 },
  currentlyInSchool: { label: 'Currently in school', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  occupation: { label: 'Occupation', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 2 },
  currentlyWorking: { label: 'Currently working', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  workedOverseas: { label: 'Worked overseas/abroad in past 5 years', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  overseasReturnYear: { label: 'Overseas Return Year', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  overseasLocation: { label: 'Overseas Location (Ship/Land)', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  overseasCountry: { label: 'Overseas Country', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  monthlyIncome: { label: 'Monthly Income', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  pwdId: { label: 'PWD ID', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  indigenousPerson: { label: 'Indigenous Person', category: 'EDUCATION & OCCUPATION', page: 'front', priority: 3 },
  
  // HISTORY OF EXPOSURE / RISK ASSESSMENT
  motherHIV: { label: 'Mother with HIV', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessment: { label: 'History of Exposure / Risk Assessment', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexMaleStatus: { label: 'Sex with a MALE - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexMaleTotal: { label: 'Sex with a MALE - Total No.', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexMaleDate1: { label: 'Sex with a MALE - Date 1', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexMaleDate2: { label: 'Sex with a MALE - Date 2', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexFemaleStatus: { label: 'Sex with a FEMALE - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexFemaleTotal: { label: 'Sex with a FEMALE - Total No.', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexFemaleDate1: { label: 'Sex with a FEMALE - Date 1', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexFemaleDate2: { label: 'Sex with a FEMALE - Date 2', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskPaidForSexStatus: { label: 'Paid for sex (cash/kind) - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskPaidForSexDate: { label: 'Paid for sex (cash/kind) - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskReceivedPaymentStatus: { label: 'Received payment for sex - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskReceivedPaymentDate: { label: 'Received payment for sex - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexUnderDrugsStatus: { label: 'Sex under influence of drugs - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSexUnderDrugsDate: { label: 'Sex under influence of drugs - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskTattooStatus: { label: 'Tattoo exposure - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskTattooDate: { label: 'Tattoo exposure - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 3 },
  riskSharedNeedlesStatus: { label: 'Shared needles for drug injection - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskSharedNeedlesDate: { label: 'Shared needles for drug injection - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskBloodTransfusionStatus: { label: 'Received blood transfusion - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskBloodTransfusionDate: { label: 'Received blood transfusion - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskOccupationalExposureStatus: { label: 'Occupational exposure (needlestick/sharps) - Status', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskOccupationalExposureDate: { label: 'Occupational exposure (needlestick/sharps) - Date', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentSexMale: { label: 'Sex with a MALE', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentSexFemale: { label: 'Sex with a FEMALE', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentPaidForSex: { label: 'Paid for sex (in cash or kind)', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentReceivedPayment: { label: 'Received payment for sex', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentSexUnderInfluence: { label: 'Had sex under the influence of drugs', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentSharedNeedles: { label: 'Shared needles in injection of drugs', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentBloodTransfusion: { label: 'Received blood transfusion', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  riskAssessmentOccupationalExposure: { label: 'Occupational exposure (needlestick/sharps)', category: 'HISTORY OF EXPOSURE / RISK ASSESSMENT', page: 'back', priority: 2 },
  
  // REASONS FOR HIV TESTING
  reasonsForTesting: { label: 'Reasons for HIV Testing', category: 'REASONS FOR HIV TESTING', page: 'back', priority: 2 },
  
  // PREVIOUS HIV TEST
  previouslyTested: { label: 'Previously Tested for HIV', category: 'PREVIOUS HIV TEST', page: 'back', priority: 2 },
  previousTestDate: { label: 'Previous Test Date', category: 'PREVIOUS HIV TEST', page: 'back', priority: 2 },
  previousTestProvider: { label: 'HTS Provider (Facility/Organization)', category: 'PREVIOUS HIV TEST', page: 'back', priority: 3 },
  previousTestCity: { label: 'City/Municipality', category: 'PREVIOUS HIV TEST', page: 'back', priority: 3 },
  previousTestResult: { label: 'Previous Test Result', category: 'PREVIOUS HIV TEST', page: 'back', priority: 2 },
  
  // MEDICAL HISTORY & CLINICAL PICTURE
  medicalHistory: { label: 'Medical History', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  medicalTB: { label: 'Current TB Patient', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  medicalSTI: { label: 'Diagnosed with Other STIs', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  medicalPEP: { label: 'Taken PEP (Post-Exposure Prophylaxis)', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  medicalPrEP: { label: 'Currently Taking PrEP (Pre-Exposure Prophylaxis)', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  medicalHepatitisB: { label: 'Has Hepatitis B', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  medicalHepatitisC: { label: 'Has Hepatitis C', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  clinicalPicture: { label: 'Clinical Picture', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  symptoms: { label: 'Describe Signs/Symptoms', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  whoStaging: { label: 'WHO Staging', category: 'MEDICAL HISTORY & CLINICAL PICTURE', page: 'back', priority: 2 },
  
  // TESTING DETAILS
  clientType: { label: 'Client Type', category: 'TESTING DETAILS', page: 'back', priority: 2 },
  venue: { label: 'Venue', category: 'TESTING DETAILS', page: 'back', priority: 3 },
  modeOfReach: { label: 'Mode of Reach', category: 'TESTING DETAILS', page: 'back', priority: 2 },
  testingAccepted: { label: 'HIV Testing Status', category: 'TESTING DETAILS', page: 'back', priority: 1 },
  testingModality: { label: 'HIV Testing Modality', category: 'TESTING DETAILS', page: 'back', priority: 2 },
  testingRefusedReason: { label: 'Reason for Refusal', category: 'TESTING DETAILS', page: 'back', priority: 3 },
  linkageToCare: { label: 'Linkage to Care Plan', category: 'TESTING DETAILS', page: 'back', priority: 2 },
  refusalReason: { label: 'Refusal Reason', category: 'TESTING DETAILS', page: 'back', priority: 3 },
  otherServices: { label: 'Other Services Provided', category: 'TESTING DETAILS', page: 'back', priority: 3 },
  
  // INVENTORY INFORMATION
  kitName: { label: 'Test Kit Brand', category: 'INVENTORY INFORMATION', page: 'back', priority: 2 },
  testKitBrand: { label: 'Brand of Test Kit Used', category: 'INVENTORY INFORMATION', page: 'back', priority: 2 },
  kitLotNumber: { label: 'Test Kit Lot Number', category: 'INVENTORY INFORMATION', page: 'back', priority: 2 },
  testKitLotNumber: { label: 'Lot Number', category: 'INVENTORY INFORMATION', page: 'back', priority: 2 },
  testKitExpiration: { label: 'Test Kit Expiration Date', category: 'INVENTORY INFORMATION', page: 'back', priority: 2 },
  testResult: { label: 'HIV Test Result', category: 'TESTING DETAILS', page: 'back', priority: 2 },
  
  // HTS PROVIDER DETAILS
  testingFacility: { label: 'Name of Testing Facility/Organization', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityAddress: { label: 'Complete Mailing Address', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityRegion: { label: 'Facility Region', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityProvince: { label: 'Facility Province', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityCity: { label: 'Facility City', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityCode: { label: 'Facility Code', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityContactNumber: { label: 'Facility Contact Number', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  facilityEmail: { label: 'Facility Email Address', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  counselorName: { label: 'Name of Service Provider', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  serviceProvider: { label: 'Service Provider', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  counselorRole: { label: 'Role', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  counselorLicense: { label: 'Counselor License', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 3 },
  counselorDesignation: { label: 'Counselor Designation', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 3 },
  counselorContact: { label: 'Counselor Contact', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 3 },
  counselorSignature: { label: 'Name & Signature of Service Provider', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 },
  formCompletionDate: { label: 'Form Completion Date', category: 'HTS PROVIDER DETAILS', page: 'back', priority: 2 }
};

// Category display order matching HTS Form template structure
const CATEGORY_ORDER = {
  front: [
    'INFORMED CONSENT',
    'DEMOGRAPHIC DATA',
    'EDUCATION & OCCUPATION'
  ],
  back: [
    'HISTORY OF EXPOSURE / RISK ASSESSMENT',
    'REASONS FOR HIV TESTING',
    'PREVIOUS HIV TEST',
    'MEDICAL HISTORY & CLINICAL PICTURE',
    'TESTING DETAILS',
    'INVENTORY INFORMATION',
    'HTS PROVIDER DETAILS'
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
        <div className="flex flex-wrap gap-2">
          {fieldValue.map((item, index) => (
            <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
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
          className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors"
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
      <div className="text-base font-semibold text-gray-900 dark:text-white">
        {displayValue || <span className="text-gray-400 dark:text-gray-500 italic font-normal">Not detected</span>}
      </div>
    );
  };
  
  return (
    <div className={`relative p-4 border-2 rounded-2xl ${borderColor} bg-white dark:bg-gray-900 shadow-sm transition-colors`}>
      {/* Confidence Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${confidenceColor} ${confidence >= 0.90 ? 'bg-green-100' : confidence >= 0.70 ? 'bg-yellow-100' : 'bg-red-100'}`}>
          {confidenceText} {(confidence * 100).toFixed(0)}%
        </span>
        {requiresReview && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            ⚠️ Review
          </span>
        )}
      </div>
      
      {/* Field Label */}
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 pr-32">
        {label}
      </label>
      
      {/* Validation Warning */}
      {validationWarning && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <span>{validationWarning}</span>
        </div>
      )}
      
      {/* Field Value or Input */}
      <div className="mb-3">
        {renderFieldValue()}
      </div>
      
      {/* Action Buttons and Extraction Method */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditValue(fieldValue || '');
                  onCancel();
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => onEdit(field)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={Array.isArray(fieldValue)}
            >
              {Array.isArray(fieldValue) ? '📋 Multi-select' : '✏️ Edit'}
            </button>
          )}
        </div>
        
        {/* Extraction Method Badge */}
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {extractionMethod}
        </span>
      </div>
    </div>
  );
};

/**
 * Section Component - Dynamically renders fields in a category
 */
const FieldSection = ({ title, fields, extractedData, editingField, onEdit, onSave, onCancel, validationWarnings }) => {
  if (!fields || fields.length === 0) return null;
  
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h5 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </h5>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-gray-700 to-transparent"></div>
      </div>
      <div className="space-y-4">
        {fields.map((field) => {
          const fieldData = extractedData[field] || { value: null, confidence: 0, requiresReview: true };
          const warning = validationWarnings.find(w => w.field === field);
          const metadata = FIELD_METADATA[field] || { label: field, priority: 3 };
          
          return (
            <EditableOCRField
              key={field}
              field={field}
              value={fieldData}
              label={metadata.label}
              onEdit={onEdit}
              isEditing={editingField === field}
              onSave={onSave}
              onCancel={onCancel}
              validationWarning={warning?.message}
            />
          );
        })}
      </div>
    </section>
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

  // Dynamically organize fields by category
  const organizedFields = useMemo(() => {
    const categories = { front: {}, back: {} };
    
    // Get all fields from extracted data
    const allFields = Object.keys(extractedData).filter(key => 
      !['stats', 'confidence', 'extractionMethod', 'templateId', 'fields'].includes(key)
    );
    
    // Categorize each field
    allFields.forEach(fieldName => {
      const metadata = FIELD_METADATA[fieldName];
      if (metadata) {
        const page = metadata.page;
        const category = metadata.category;
        
        if (!categories[page][category]) {
          categories[page][category] = [];
        }
        categories[page][category].push(fieldName);
      }
    });
    
    // Sort fields within each category by priority
    Object.keys(categories).forEach(page => {
      Object.keys(categories[page]).forEach(category => {
        categories[page][category].sort((a, b) => {
          const priorityA = FIELD_METADATA[a]?.priority || 3;
          const priorityB = FIELD_METADATA[b]?.priority || 3;
          return priorityA - priorityB;
        });
      });
    });
    
    return categories;
  }, [extractedData]);

  // Run cross-field validation whenever data changes
  React.useEffect(() => {
    const warnings = validateCrossFields(modifiedData);
    setValidationWarnings(warnings);
  }, [modifiedData]);

  if (!extractedData) return null;

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
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Overall Summary - Dashboard Style - Fixed at top */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm transition-colors mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
              <span className="text-2xl">📋</span>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">OCR Extraction</p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Review & Edit Results</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {(confidence).toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">Overall Confidence</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.highConfidence || 0}
              </div>
              <div className="text-sm font-medium text-green-700 dark:text-green-300 mt-1">High Confidence</div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.mediumConfidence || 0}
              </div>
              <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mt-1">Medium Confidence</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.lowConfidence || 0}
              </div>
              <div className="text-sm font-medium text-red-700 dark:text-red-300 mt-1">Low Confidence</div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
              <span className="text-lg">💡</span>
              <span><strong>Tip:</strong> Click &quot;✏️ Edit&quot; on any field to modify its value. Fields with low confidence are recommended for review.</span>
            </p>
          </div>
        </div>
      </section>
      
      {/* Scrollable Content Area */}
      <div className="space-y-6">
        {/* Validation Warnings - Dashboard Style */}
        {validationWarnings.length > 0 && (
          <section className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-5 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h4 className="text-base font-bold text-yellow-800 dark:text-yellow-200 mb-3">
                  Data Consistency Warnings
                </h4>
                <ul className="space-y-2">
                  {validationWarnings.map((warning, index) => {
                    const fieldLabel = FIELD_METADATA[warning.field]?.label || warning.field;
                    return (
                      <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></span>
                        <span><strong>{fieldLabel}:</strong> {warning.message}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3 italic">
                  Please review and correct these fields before submitting.
                </p>
              </div>
            </div>
          </section>
        )}
        
        {/* Front Page - Dashboard Style */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm transition-colors">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">📄</span>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                Front Page - Personal Information Sheet
              </h4>
            </div>
            {CATEGORY_ORDER.front.map(category => (
              organizedFields.front[category] && (
                <FieldSection
                  key={category}
                  title={category}
                  fields={organizedFields.front[category]}
                  extractedData={modifiedData}
                  editingField={editingField}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  validationWarnings={validationWarnings}
                />
              )
            ))}
          </div>
        </section>
        
        {/* Back Page - Dashboard Style */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm transition-colors">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">📄</span>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                Back Page - Testing & Medical History
              </h4>
            </div>
            {CATEGORY_ORDER.back.map(category => (
              organizedFields.back[category] && (
                <FieldSection
                  key={category}
                  title={category}
                  fields={organizedFields.back[category]}
                  extractedData={modifiedData}
                  editingField={editingField}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  validationWarnings={validationWarnings}
                />
              )
            ))}
          </div>
        </section>
        
        {/* Action Buttons - Dashboard Style */}
        <div className="flex gap-4 justify-end bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-lg">
          <button
            onClick={onReanalyze}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 font-medium rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <span>🔄</span> Re-analyze Images
          </button>
          <button
            onClick={() => onAccept(modifiedData)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-md hover:shadow-lg"
          >
            <span>✓</span> Accept & Continue to Submission
          </button>
        </div>
        
        {/* Extraction Info */}
        <div className="text-center text-sm text-gray-500 pb-6">
          Extraction Method: {extractedData.extractionMethod || 'Hybrid (Queries + Forms + Checkboxes)'} | 
          Template: {extractedData.templateId || 'doh-hts-2021-v2'}
        </div>
      </div>
    </div>
  );
};

export default TemplateBasedOCRReview;

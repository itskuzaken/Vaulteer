import React from 'react';

/**
 * Admin HTS Form Detail View Component
 * Displays all extracted fields organized by DOH HTS Form 2021 official 10-section structure
 * Shows confidence scores, detection methods, and field-by-field details
 * 
 * Official Structure:
 * - Front Page (3 sections): INFORMED CONSENT, DEMOGRAPHIC DATA, EDUCATION & OCCUPATION
 * - Back Page (7 sections): HISTORY OF EXPOSURE, REASONS FOR TESTING, PREVIOUS TEST,
 *   MEDICAL HISTORY, TESTING DETAILS, INVENTORY INFO, HTS PROVIDER DETAILS
 */

// Field labels mapping from template metadata (101 fields total)
const TEMPLATE_FIELD_LABELS = {
  // Test Metadata
  testResult: 'Test Result',
  testDate: 'Test Date',
  
  // === FRONT PAGE ===
  
  // Personal Information & Identification
  philHealthNumber: 'PhilHealth Number',
  philSysNumber: 'PhilSys Number',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  suffix: 'Suffix',
  parentalCode: 'Parental Code',
  parentalCodeMother: "Mother's Code",
  parentalCodeFather: "Father's Code",
  birthOrder: 'Birth Order',
  
  // Demographic Data
  birthDate: 'Birth Date',
  age: 'Age (Years)',
  ageMonths: 'Age (Months)',
  sex: 'Sex',
  genderIdentity: 'Gender Identity',
  
  // Residence Information
  currentResidenceCity: 'Current Residence - City',
  currentResidenceProvince: 'Current Residence - Province',
  permanentResidenceCity: 'Permanent Residence - City',
  permanentResidenceProvince: 'Permanent Residence - Province',
  placeOfBirthCity: 'Place of Birth - City',
  placeOfBirthProvince: 'Place of Birth - Province',
  
  // Personal Status
  nationality: 'Nationality',
  nationalityOther: 'Nationality (Other)',
  civilStatus: 'Civil Status',
  livingWithPartner: 'Living with Partner',
  numberOfChildren: 'Number of Children',
  isPregnant: 'Is Pregnant',
  
  // Education & Occupation
  educationalAttainment: 'Educational Attainment',
  currentlyInSchool: 'Currently in School',
  occupation: 'Occupation',
  currentlyWorking: 'Currently Working',
  workedOverseas: 'Worked Overseas',
  overseasReturnYear: 'Overseas Return Year',
  overseasLocation: 'Overseas Location',
  overseasCountry: 'Overseas Country',
  
  // Contact Information
  contactNumber: 'Contact Number',
  emailAddress: 'Email Address',
  
  // Consent Information
  verbalConsent: 'Verbal Consent',
  consentGiven: 'Consent Given',
  consentSignature: 'Signature',
  consentDate: 'Consent Date',
  
  // === BACK PAGE ===
  
  // Mother HIV Status
  motherHIV: 'Mother with HIV',
  
  // Risk Assessment - Sex with Male
  riskSexMaleStatus: 'Sex with Male - Status',
  riskSexMaleTotal: 'Sex with Male - Total',
  riskSexMaleDate1: 'Sex with Male - Date 1',
  riskSexMaleDate2: 'Sex with Male - Date 2',
  
  // Risk Assessment - Sex with Female
  riskSexFemaleStatus: 'Sex with Female - Status',
  riskSexFemaleTotal: 'Sex with Female - Total',
  riskSexFemaleDate1: 'Sex with Female - Date 1',
  riskSexFemaleDate2: 'Sex with Female - Date 2',
  
  // Risk Assessment - Paid for Sex
  riskPaidForSexStatus: 'Paid for Sex - Status',
  riskPaidForSexDate: 'Paid for Sex - Date',
  
  // Risk Assessment - Received Payment
  riskReceivedPaymentStatus: 'Received Payment - Status',
  riskReceivedPaymentDate: 'Received Payment - Date',
  
  // Risk Assessment - Sex Under Drugs
  riskSexUnderDrugsStatus: 'Sex Under Drugs - Status',
  riskSexUnderDrugsDate: 'Sex Under Drugs - Date',
  
  // Risk Assessment - Shared Needles
  riskSharedNeedlesStatus: 'Shared Needles - Status',
  riskSharedNeedlesDate: 'Shared Needles - Date',
  
  // Risk Assessment - Blood Transfusion
  riskBloodTransfusionStatus: 'Blood Transfusion - Status',
  riskBloodTransfusionDate: 'Blood Transfusion - Date',
  
  // Risk Assessment - Occupational Exposure
  riskOccupationalExposureStatus: 'Occupational Exposure - Status',
  riskOccupationalExposureDate: 'Occupational Exposure - Date',
  
  // Risk Assessment Summary
  riskAssessment: 'Risk Assessment Summary',
  
  // Reasons for Testing
  reasonsForTesting: 'Reasons for Testing',
  testingRefusedReason: 'Testing Refusal Reason',
  
  // Previous HIV Test
  previouslyTested: 'Previously Tested',
  previousTestDate: 'Previous Test Date',
  previousTestProvider: 'Previous Test Provider',
  previousTestCity: 'Previous Test City',
  previousTestResult: 'Previous Test Result',
  
  // Medical History
  medicalHistory: 'Medical History',
  medicalTB: 'Tuberculosis (TB)',
  medicalSTI: 'STI',
  medicalPEP: 'PEP',
  medicalPrEP: 'PrEP',
  medicalHepatitisB: 'Hepatitis B',
  medicalHepatitisC: 'Hepatitis C',
  
  // Clinical Picture
  clinicalPicture: 'Clinical Picture',
  symptoms: 'Symptoms',
  whoStaging: 'WHO Staging',
  
  // Testing Details
  clientType: 'Client Type',
  modeOfReach: 'Mode of Reach',
  testingAccepted: 'Testing Accepted',
  testingModality: 'Testing Modality',
  linkageToCare: 'Linkage to Care',
  otherServices: 'Other Services',
  
  // Test Kit Information
  testKitBrand: 'Test Kit Brand',
  testKitLotNumber: 'Test Kit Lot Number',
  testKitExpiration: 'Test Kit Expiration',
  
  // Facility Information
  testingFacility: 'Testing Facility',
  facilityAddress: 'Facility Address',
  facilityCode: 'Facility Code',
  facilityRegion: 'Facility Region',
  facilityProvince: 'Facility Province',
  facilityCity: 'Facility City',
  facilityContactNumber: 'Facility Contact Number',
  facilityEmail: 'Facility Email',
  
  // Counselor Information
  counselorName: 'Counselor Name',
  counselorRole: 'Counselor Role',
  counselorLicense: 'Counselor License',
  counselorDesignation: 'Counselor Designation',
  counselorContact: 'Counselor Contact',
  counselorSignature: 'Counselor Signature',
  
  // Form Completion
  formCompletionDate: 'Form Completion Date'
};

// Group fields by section following DOH HTS Form 2021 official structure (10 sections total)
// Front Page: 3 sections | Back Page: 7 sections
const FRONT_PAGE_SECTIONS = {
  'INFORMED CONSENT': [
    'contactNumber', 'emailAddress',
    'verbalConsent', 'consentGiven', 'consentSignature', 'consentDate'
  ],
  'DEMOGRAPHIC DATA': [
    'testDate', 'philHealthNumber', 'philSysNumber',
    'firstName', 'middleName', 'lastName', 'suffix', 'fullName',
    'parentalCode', 'parentalCodeMother', 'parentalCodeFather', 'birthOrder',
    'birthDate', 'age', 'ageMonths',
    'sex', 'genderIdentity',
    'currentResidenceCity', 'currentResidenceProvince',
    'permanentResidenceCity', 'permanentResidenceProvince',
    'placeOfBirthCity', 'placeOfBirthProvince',
    'nationality', 'nationalityOther',
    'civilStatus', 'livingWithPartner', 'numberOfChildren', 'isPregnant'
  ],
  'EDUCATION & OCCUPATION': [
    'educationalAttainment', 'currentlyInSchool',
    'occupation', 'currentlyWorking',
    'workedOverseas', 'overseasReturnYear', 'overseasLocation', 'overseasCountry'
  ]
};

const BACK_PAGE_SECTIONS = {
  'HISTORY OF EXPOSURE / RISK ASSESSMENT': [
    'motherHIV',
    'riskAssessment',
    'riskSexMaleStatus', 'riskSexMaleTotal', 'riskSexMaleDate1', 'riskSexMaleDate2',
    'riskSexFemaleStatus', 'riskSexFemaleTotal', 'riskSexFemaleDate1', 'riskSexFemaleDate2',
    'riskPaidForSexStatus', 'riskPaidForSexDate',
    'riskReceivedPaymentStatus', 'riskReceivedPaymentDate',
    'riskSexUnderDrugsStatus', 'riskSexUnderDrugsDate',
    'riskSharedNeedlesStatus', 'riskSharedNeedlesDate',
    'riskBloodTransfusionStatus', 'riskBloodTransfusionDate',
    'riskOccupationalExposureStatus', 'riskOccupationalExposureDate'
  ],
  'REASONS FOR HIV TESTING': [
    'reasonsForTesting', 'testingRefusedReason'
  ],
  'PREVIOUS HIV TEST': [
    'previouslyTested', 'previousTestDate', 'previousTestProvider',
    'previousTestCity', 'previousTestResult'
  ],
  'MEDICAL HISTORY & CLINICAL PICTURE': [
    'medicalHistory', 'medicalTB', 'medicalSTI', 'medicalPEP',
    'medicalPrEP', 'medicalHepatitisB', 'medicalHepatitisC',
    'clinicalPicture', 'symptoms', 'whoStaging'
  ],
  'TESTING DETAILS': [
    'clientType', 'modeOfReach', 'testingAccepted', 'testingModality',
    'linkageToCare', 'testResult'
  ],
  'INVENTORY INFORMATION': [
    'otherServices',
    'testKitBrand', 'testKitLotNumber', 'testKitExpiration'
  ],
  'HTS PROVIDER DETAILS': [
    'testingFacility', 'facilityAddress', 'facilityCode',
    'facilityRegion', 'facilityProvince', 'facilityCity',
    'facilityContactNumber', 'facilityEmail',
    'counselorName', 'counselorRole', 'counselorLicense',
    'counselorDesignation', 'counselorContact', 'counselorSignature',
    'formCompletionDate'
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
      return <span className="text-gray-400 dark:text-gray-500 italic">Not detected</span>;
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
              <span key={index} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
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
    
    return <span className="text-gray-900 dark:text-white font-semibold">{displayValue}</span>;
  };
  
  return (
    <div className={`relative p-4 border-2 rounded-lg ${borderColor} bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow`}>
      {/* Field Label */}
      <div className="flex justify-between items-start mb-2">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {label}
        </label>
        
        {/* Badges */}
        <div className="flex gap-2 flex-wrap justify-end">
          {edited && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded font-semibold">
              ✏️ Edited
            </span>
          )}
          {requiresReview && (
            <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded font-semibold">
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
      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        {/* Confidence Indicator */}
        <div className={`flex items-center gap-2 ${confidenceBg} dark:opacity-90 px-3 py-1 rounded-full`}>
          <div className={`text-xs font-bold ${confidenceColor}`}>
            {confidenceText}
          </div>
          <div className={`text-xs font-mono ${confidenceColor}`}>
            {(confidence * 100).toFixed(1)}%
          </div>
        </div>
        
        {/* Extraction Method */}
        <div className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
          📊 {extractionMethod}
        </div>
      </div>
    </div>
  );
};

/**
 * Section Component - Supports both legacy field arrays and new structured data format
 */
const AdminFieldSection = ({ title, fields, extractedData, sectionData }) => {
  // If sectionData is provided (new format), use it instead of fields array
  if (sectionData) {
    const sectionFields = sectionData.fields || {};
    const avgConfidence = sectionData.avgConfidence || 0;
    const totalFields = sectionData.totalFields || Object.keys(sectionFields).length;
    
    if (Object.keys(sectionFields).length === 0) {
      return (
        <div className="mb-6">
          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
            {title}
          </h5>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 italic text-sm">
            No fields detected in this section
          </div>
        </div>
      );
    }
    
    return (
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h5 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">
            {title}
          </h5>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {totalFields} fields · {avgConfidence}% avg confidence
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-gray-700 to-transparent"></div>
        </div>
        <div className="space-y-4">
          {Object.entries(sectionFields).map(([fieldName, fieldData]) => (
            <AdminFieldDisplay
              key={fieldName}
              field={fieldName}
              value={fieldData}
              label={TEMPLATE_FIELD_LABELS[fieldName] || fieldName}
            />
          ))}
        </div>
      </section>
    );
  }
  
  // Legacy format: use fields array
  const hasAnyField = fields.some(field => extractedData[field]);
  
  if (!hasAnyField) {
    return (
      <div className="mb-6">
        <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
          {title}
        </h5>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 italic text-sm">
          No fields detected in this section
        </div>
      </div>
    );
  }
  
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h5 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </h5>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          {fields.filter(f => extractedData[f]).length} / {fields.length} fields
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-gray-700 to-transparent"></div>
      </div>
      <div className="space-y-4">
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
    </section>
  );
};

/**
 * Main Admin HTS Detail View Component
 * Displays extracted OCR data with official DOH HTS Form 2021 section structure
 * 
 * @param {Object} extractedData - OCR extraction result from textractService
 *   - fields: Flat key-value pairs of extracted fields
 *   - structuredData: Organized by front/back pages and sections (optional)
 *   - stats: Extraction statistics
 *   - confidence: Overall confidence score
 * @param {Object} submissionInfo - Submission metadata (control number, user, date, status)
 */
const AdminHTSDetailView = ({ extractedData, submissionInfo }) => {
  if (!extractedData) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-300 font-semibold">⚠️ No extracted data available</p>
        <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-2">
          This submission may have been created before OCR implementation or the extraction failed.
        </p>
      </div>
    );
  }
  
  // Extract data from response (supports both new structuredData and legacy flat format)
  const fields = extractedData.fields || extractedData;
  const stats = extractedData.stats || {};
  const confidence = extractedData.confidence || 0;
  const templateId = extractedData.templateId || 'doh-hts-2021-v2';
  const extractionMethod = extractedData.extractionMethod || 'unknown';
  const structuredData = extractedData.structuredData || null;
  const hasStructuredData = structuredData && (structuredData.front || structuredData.back);
  
  // Calculate total fields
  let totalFrontFields, totalBackFields, detectedFrontFields, detectedBackFields;
  
  if (hasStructuredData) {
    // Use structured data for accurate counts
    const frontSections = structuredData.front?.sections || {};
    const backSections = structuredData.back?.sections || {};
    
    totalFrontFields = Object.values(frontSections).reduce((sum, section) => 
      sum + (section.totalFields || 0), 0
    );
    totalBackFields = Object.values(backSections).reduce((sum, section) => 
      sum + (section.totalFields || 0), 0
    );
    detectedFrontFields = totalFrontFields;
    detectedBackFields = totalBackFields;
  } else {
    // Fallback to hardcoded sections
    totalFrontFields = Object.values(FRONT_PAGE_SECTIONS).flat().length;
    totalBackFields = Object.values(BACK_PAGE_SECTIONS).flat().length;
    detectedFrontFields = Object.values(FRONT_PAGE_SECTIONS).flat().filter(f => fields[f]).length;
    detectedBackFields = Object.values(BACK_PAGE_SECTIONS).flat().filter(f => fields[f]).length;
  }
  
  return (
    <div className="space-y-6">
      {/* Extraction Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 p-6 rounded-lg shadow dark:border dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🔍 OCR Extraction Analysis
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
            (DOH HTS Form 2021)
          </span>
        </h3>
        
        {/* Submission Info */}
        {submissionInfo && (
          <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border border-indigo-200 dark:border-indigo-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Control Number</div>
                <div className="font-bold text-gray-900 dark:text-white">{submissionInfo.control_number}</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Submitter</div>
                <div className="font-bold text-gray-900 dark:text-white">{submissionInfo.username}</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Submission Date</div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {new Date(submissionInfo.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Status</div>
                <div className={`font-bold ${
                  submissionInfo.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                  submissionInfo.status === 'rejected' ? 'text-red-600 dark:text-red-400' :
                  'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {submissionInfo.status}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {(confidence).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Confidence</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.highConfidence || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Confidence</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.mediumConfidence || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Medium Confidence</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.lowConfidence || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Low Confidence</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {detectedFrontFields + detectedBackFields}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Fields Detected</div>
          </div>
        </div>
        
        {/* Coverage Info */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Front Page Coverage (3 sections)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${(detectedFrontFields / totalFrontFields) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {detectedFrontFields}/{totalFrontFields}
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Back Page Coverage (7 sections)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 dark:bg-purple-400 h-2 rounded-full transition-all"
                  style={{ width: `${(detectedBackFields / totalBackFields) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {detectedBackFields}/{totalBackFields}
              </span>
            </div>
          </div>
        </div>
        
        {/* Template Info */}
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Template:</span>{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{templateId}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Extraction Method:</span>{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{extractionMethod}</span>
            </div>
            {hasStructuredData && (
              <div className="ml-auto">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-semibold">
                  ✓ Structured Data Available
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Front Page */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b-2 border-blue-500 dark:border-blue-400 pb-2 flex items-center gap-2">
          📄 Front Page (3 Sections)
          <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
            ({detectedFrontFields}/{totalFrontFields} fields)
          </span>
        </h4>
        {hasStructuredData && structuredData.front?.sections ? (
          // Render using structured data from backend
          Object.entries(structuredData.front.sections).map(([sectionTitle, sectionData]) => (
            <AdminFieldSection
              key={sectionTitle}
              title={sectionTitle}
              sectionData={sectionData}
              extractedData={fields}
            />
          ))
        ) : (
          // Fallback to hardcoded sections
          Object.entries(FRONT_PAGE_SECTIONS).map(([sectionTitle, sectionFields]) => (
            <AdminFieldSection
              key={sectionTitle}
              title={sectionTitle}
              fields={sectionFields}
              extractedData={fields}
            />
          ))
        )}
      </div>
      
      {/* Back Page */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b-2 border-purple-500 dark:border-purple-400 pb-2 flex items-center gap-2">
          📄 Back Page (7 Sections)
          <span className="text-sm font-normal text-purple-600 dark:text-purple-400">
            ({detectedBackFields}/{totalBackFields} fields)
          </span>
        </h4>
        {hasStructuredData && structuredData.back?.sections ? (
          // Render using structured data from backend
          Object.entries(structuredData.back.sections).map(([sectionTitle, sectionData]) => (
            <AdminFieldSection
              key={sectionTitle}
              title={sectionTitle}
              sectionData={sectionData}
              extractedData={fields}
            />
          ))
        ) : (
          // Fallback to hardcoded sections
          Object.entries(BACK_PAGE_SECTIONS).map(([sectionTitle, sectionFields]) => (
            <AdminFieldSection
              key={sectionTitle}
              title={sectionTitle}
              fields={sectionFields}
              extractedData={fields}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AdminHTSDetailView;

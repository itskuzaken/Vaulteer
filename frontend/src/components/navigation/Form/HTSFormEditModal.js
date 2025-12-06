import React from 'react';
import { IoClose, IoCheckmark, IoDocumentText, IoWarning, IoCheckmarkCircle, IoInformationCircle } from 'react-icons/io5';
import Button from '../../ui/Button';

/**
 * HTS Form Edit Modal - Allows editing of all extracted OCR fields
 * Organized by DOH HTS Form 2021 official 10-section structure:
 * 
 * FRONT PAGE (3 sections):
 *   1. INFORMED CONSENT (2 fields)
 *   2. DEMOGRAPHIC DATA (30 fields)
 *   3. EDUCATION & OCCUPATION (8 fields)
 * 
 * BACK PAGE (7 sections):
 *   4. HISTORY OF EXPOSURE / RISK ASSESSMENT (23 fields)
 *   5. REASONS FOR HIV TESTING (2 fields)
 *   6. PREVIOUS HIV TEST (5 fields)
 *   7. MEDICAL HISTORY & CLINICAL PICTURE (10 fields)
 *   8. TESTING DETAILS (6 fields)
 *   9. INVENTORY INFORMATION (3 fields)
 *   10. HTS PROVIDER DETAILS (15 fields)
 */
export default function HTSFormEditModal({
  isOpen,
  editableData,
  unmappedKeys = [],
  mappedUnmappedKeys = {},
  onClose,
  onSave,
  onFieldChange,
  onMapUnmappedKey
}) {
  if (!isOpen || !editableData) return null;

  // All available form fields organized by section for mapping
  // MUST match backend sectionMapping in textractService.js
  const formFields = {
    'INFORMED CONSENT': [
      'consentGiven', 'contactNumber', 'emailAddress', 'verbalConsent'
    ],
    'DEMOGRAPHIC DATA': [
      'testDate', 'philHealthNumber', 'philSysNumber',
      'firstName', 'middleName', 'lastName', 'suffix', 'birthOrder',
      'birthDate', 'age', 'ageMonths', 'sex', 'genderIdentity',
      'currentResidenceCity', 'currentResidenceProvince',
      'permanentResidenceCity', 'permanentResidenceProvince',
      'placeOfBirthCity', 'placeOfBirthProvince',
      'nationality', 'nationalityOther', 'civilStatus',
      'livingWithPartner', 'numberOfChildren', 'isPregnant'
    ],
    'EDUCATION & OCCUPATION': [
      'educationalAttainment', 'currentlyInSchool', 'occupation',
      'currentlyWorking', 'workedOverseas', 'overseasReturnYear',
      'overseasLocation', 'overseasCountry'
    ],
    'HISTORY OF EXPOSURE / RISK ASSESSMENT': [
      'motherHIV', 'riskAssessment',
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
      'medicalHistory', 'medicalTB', 'medicalSTI', 'medicalPEP', 'medicalPrEP',
      'medicalHepatitisB', 'medicalHepatitisC',
      'clinicalPicture', 'symptoms', 'whoStaging'
    ],
    'TESTING DETAILS': [
      'clientType', 'modeOfReach', 'testingAccepted',
      'testingModality', 'linkageToCare', 'testResult'
    ],
    'INVENTORY INFORMATION': [
      'otherServices', 'testKitBrand', 'testKitLotNumber', 'testKitExpiration'
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

  // Get label for field name
  const getFieldLabel = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Check if unmapped key has data
  const hasUnmappedKeys = Array.isArray(unmappedKeys) && unmappedKeys.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <IoDocumentText className="w-6 h-6 text-primary-red" />
            Edit Extracted Fields (DOH HTS Form 2021)
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <IoClose className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ========== FRONT PAGE SECTIONS (3 sections) ========== */}
          
          {/* SECTION 1: INFORMED CONSENT */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-lg mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <span className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
              INFORMED CONSENT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Number</label>
                <input
                  type="tel"
                  value={editableData.contactNumber || ''}
                  onChange={(e) => onFieldChange('contactNumber', e.target.value)}
                  placeholder="+63 XXX XXX XXXX"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={editableData.emailAddress || ''}
                  onChange={(e) => onFieldChange('emailAddress', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: DEMOGRAPHIC DATA */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-bold text-lg mb-4 text-green-900 dark:text-green-100 flex items-center gap-2">
              <span className="bg-green-600 dark:bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
              DEMOGRAPHIC DATA
            </h3>
            
            {/* Test Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Date *</label>
              <input
                type="date"
                value={editableData.testDate || ''}
                onChange={(e) => onFieldChange('testDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* ID Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PhilHealth Number</label>
                <input
                  type="text"
                  value={editableData.philHealthNumber || ''}
                  onChange={(e) => onFieldChange('philHealthNumber', e.target.value)}
                  placeholder="12 digits"
                  maxLength="12"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PhilSys Number</label>
                <input
                  type="text"
                  value={editableData.philSysNumber || ''}
                  onChange={(e) => onFieldChange('philSysNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                <input
                  type="text"
                  value={editableData.firstName || ''}
                  onChange={(e) => onFieldChange('firstName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Middle Name</label>
                <input
                  type="text"
                  value={editableData.middleName || ''}
                  onChange={(e) => onFieldChange('middleName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={editableData.lastName || ''}
                  onChange={(e) => onFieldChange('lastName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suffix</label>
                <input
                  type="text"
                  value={editableData.suffix || ''}
                  onChange={(e) => onFieldChange('suffix', e.target.value)}
                  placeholder="Jr., Sr., III, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Birth Order</label>
                <input
                  type="number"
                  value={editableData.birthOrder || ''}
                  onChange={(e) => onFieldChange('birthOrder', e.target.value)}
                  min="1"
                  placeholder="1, 2, 3..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Birth Date *</label>
                <input
                  type="date"
                  value={editableData.birthDate || ''}
                  onChange={(e) => onFieldChange('birthDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age (Years)</label>
                <input
                  type="number"
                  value={editableData.age || ''}
                  onChange={(e) => onFieldChange('age', e.target.value)}
                  min="0"
                  max="120"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age (Months, if &lt;1 yr)</label>
                <input
                  type="number"
                  value={editableData.ageMonths || ''}
                  onChange={(e) => onFieldChange('ageMonths', e.target.value)}
                  min="0"
                  max="11"
                  placeholder="0-11"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sex *</label>
                <select
                  value={editableData.sex || ''}
                  onChange={(e) => onFieldChange('sex', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender Identity</label>
                <select
                  value={editableData.genderIdentity || ''}
                  onChange={(e) => onFieldChange('genderIdentity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="Man">Man</option>
                  <option value="Woman">Woman</option>
                  <option value="Trans Woman">Trans Woman</option>
                  <option value="Trans Man">Trans Man</option>
                </select>
              </div>
            </div>

            {/* Residence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Residence - City</label>
                <input
                  type="text"
                  value={editableData.currentResidenceCity || ''}
                  onChange={(e) => onFieldChange('currentResidenceCity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Residence - Province</label>
                <input
                  type="text"
                  value={editableData.currentResidenceProvince || ''}
                  onChange={(e) => onFieldChange('currentResidenceProvince', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permanent Residence - City</label>
                <input
                  type="text"
                  value={editableData.permanentResidenceCity || ''}
                  onChange={(e) => onFieldChange('permanentResidenceCity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permanent Residence - Province</label>
                <input
                  type="text"
                  value={editableData.permanentResidenceProvince || ''}
                  onChange={(e) => onFieldChange('permanentResidenceProvince', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Place of Birth - City</label>
                <input
                  type="text"
                  value={editableData.placeOfBirthCity || ''}
                  onChange={(e) => onFieldChange('placeOfBirthCity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Place of Birth - Province</label>
                <input
                  type="text"
                  value={editableData.placeOfBirthProvince || ''}
                  onChange={(e) => onFieldChange('placeOfBirthProvince', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Civil Status & Family */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nationality</label>
                <select
                  value={editableData.nationality || ''}
                  onChange={(e) => onFieldChange('nationality', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nationality (Other)</label>
                <input
                  type="text"
                  value={editableData.nationalityOther || ''}
                  onChange={(e) => onFieldChange('nationalityOther', e.target.value)}
                  placeholder="Specify if Other"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Civil Status</label>
                <select
                  value={editableData.civilStatus || ''}
                  onChange={(e) => onFieldChange('civilStatus', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Living with Partner</label>
                <select
                  value={editableData.livingWithPartner || ''}
                  onChange={(e) => onFieldChange('livingWithPartner', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Children</label>
                <input
                  type="number"
                  value={editableData.numberOfChildren || ''}
                  onChange={(e) => onFieldChange('numberOfChildren', e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Is Pregnant</label>
              <select
                value={editableData.isPregnant || ''}
                onChange={(e) => onFieldChange('isPregnant', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: EDUCATION & OCCUPATION */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-bold text-lg mb-4 text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <span className="bg-purple-600 dark:bg-purple-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
              EDUCATION & OCCUPATION
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Educational Attainment</label>
                <select
                  value={editableData.educationalAttainment || ''}
                  onChange={(e) => onFieldChange('educationalAttainment', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select</option>
                  <option value="No Formal Education">No Formal Education</option>
                  <option value="Elementary">Elementary</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="Post Graduate">Post Graduate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently in School</label>
                <select
                  value={editableData.currentlyInSchool || ''}
                  onChange={(e) => onFieldChange('currentlyInSchool', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Occupation</label>
                <input
                  type="text"
                  value={editableData.occupation || ''}
                  onChange={(e) => onFieldChange('occupation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently Working</label>
                <select
                  value={editableData.currentlyWorking || ''}
                  onChange={(e) => onFieldChange('currentlyWorking', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Worked Overseas</label>
                <select
                  value={editableData.workedOverseas || ''}
                  onChange={(e) => onFieldChange('workedOverseas', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overseas Return Year</label>
                <input
                  type="number"
                  value={editableData.overseasReturnYear || ''}
                  onChange={(e) => onFieldChange('overseasReturnYear', e.target.value)}
                  min="1900"
                  max="2099"
                  placeholder="YYYY"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overseas Location</label>
                <input
                  type="text"
                  value={editableData.overseasLocation || ''}
                  onChange={(e) => onFieldChange('overseasLocation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overseas Country</label>
                <input
                  type="text"
                  value={editableData.overseasCountry || ''}
                  onChange={(e) => onFieldChange('overseasCountry', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* ========== BACK PAGE SECTIONS (7 sections) ========== */}

          {/* SECTION 4: HISTORY OF EXPOSURE / RISK ASSESSMENT */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="font-bold text-lg mb-4 text-red-900 dark:text-red-100 flex items-center gap-2">
              <span className="bg-red-600 dark:bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">4</span>
              HISTORY OF EXPOSURE / RISK ASSESSMENT
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mother with HIV</label>
              <select
                value={editableData.motherHIV || ''}
                onChange={(e) => onFieldChange('motherHIV', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            {/* Risk Assessment - Sex with Male */}
            <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Sex with a MALE</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={editableData.riskSexMaleStatus || ''}
                  onChange={(e) => onFieldChange('riskSexMaleStatus', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Status</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                <input
                  type="number"
                  value={editableData.riskSexMaleTotal || ''}
                  onChange={(e) => onFieldChange('riskSexMaleTotal', e.target.value)}
                  placeholder="Total No."
                  min="0"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={editableData.riskSexMaleDate1 || ''}
                  onChange={(e) => onFieldChange('riskSexMaleDate1', e.target.value)}
                  placeholder="MM/YYYY"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={editableData.riskSexMaleDate2 || ''}
                  onChange={(e) => onFieldChange('riskSexMaleDate2', e.target.value)}
                  placeholder="MM/YYYY"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Risk Assessment - Sex with Female */}
            <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Sex with a FEMALE</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={editableData.riskSexFemaleStatus || ''}
                  onChange={(e) => onFieldChange('riskSexFemaleStatus', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Status</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                <input
                  type="number"
                  value={editableData.riskSexFemaleTotal || ''}
                  onChange={(e) => onFieldChange('riskSexFemaleTotal', e.target.value)}
                  placeholder="Total No."
                  min="0"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={editableData.riskSexFemaleDate1 || ''}
                  onChange={(e) => onFieldChange('riskSexFemaleDate1', e.target.value)}
                  placeholder="MM/YYYY"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={editableData.riskSexFemaleDate2 || ''}
                  onChange={(e) => onFieldChange('riskSexFemaleDate2', e.target.value)}
                  placeholder="MM/YYYY"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Other Risk Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Paid for sex</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editableData.riskPaidForSexStatus || ''}
                    onChange={(e) => onFieldChange('riskPaidForSexStatus', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <input
                    type="text"
                    value={editableData.riskPaidForSexDate || ''}
                    onChange={(e) => onFieldChange('riskPaidForSexDate', e.target.value)}
                    placeholder="MM/YYYY"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Received payment for sex</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editableData.riskReceivedPaymentStatus || ''}
                    onChange={(e) => onFieldChange('riskReceivedPaymentStatus', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <input
                    type="text"
                    value={editableData.riskReceivedPaymentDate || ''}
                    onChange={(e) => onFieldChange('riskReceivedPaymentDate', e.target.value)}
                    placeholder="MM/YYYY"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Sex under influence of drugs</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editableData.riskSexUnderDrugsStatus || ''}
                    onChange={(e) => onFieldChange('riskSexUnderDrugsStatus', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <input
                    type="text"
                    value={editableData.riskSexUnderDrugsDate || ''}
                    onChange={(e) => onFieldChange('riskSexUnderDrugsDate', e.target.value)}
                    placeholder="MM/YYYY"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Shared needles</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editableData.riskSharedNeedlesStatus || ''}
                    onChange={(e) => onFieldChange('riskSharedNeedlesStatus', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <input
                    type="text"
                    value={editableData.riskSharedNeedlesDate || ''}
                    onChange={(e) => onFieldChange('riskSharedNeedlesDate', e.target.value)}
                    placeholder="MM/YYYY"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Blood transfusion</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editableData.riskBloodTransfusionStatus || ''}
                    onChange={(e) => onFieldChange('riskBloodTransfusionStatus', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <input
                    type="text"
                    value={editableData.riskBloodTransfusionDate || ''}
                    onChange={(e) => onFieldChange('riskBloodTransfusionDate', e.target.value)}
                    placeholder="MM/YYYY"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Occupational exposure</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editableData.riskOccupationalExposureStatus || ''}
                    onChange={(e) => onFieldChange('riskOccupationalExposureStatus', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <input
                    type="text"
                    value={editableData.riskOccupationalExposureDate || ''}
                    onChange={(e) => onFieldChange('riskOccupationalExposureDate', e.target.value)}
                    placeholder="MM/YYYY"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: REASONS FOR HIV TESTING */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-bold text-lg mb-4 text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
              <span className="bg-yellow-600 dark:bg-yellow-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">5</span>
              REASONS FOR HIV TESTING
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reasons for Testing</label>
              <textarea
                value={editableData.reasonsForTesting || ''}
                onChange={(e) => onFieldChange('reasonsForTesting', e.target.value)}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testing Refused Reason</label>
              <textarea
                value={editableData.testingRefusedReason || ''}
                onChange={(e) => onFieldChange('testingRefusedReason', e.target.value)}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          {/* SECTION 6: PREVIOUS HIV TEST */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <h3 className="font-bold text-lg mb-4 text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
              <span className="bg-cyan-600 dark:bg-cyan-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">6</span>
              PREVIOUS HIV TEST
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previously Tested</label>
                <select
                  value={editableData.previouslyTested || ''}
                  onChange={(e) => onFieldChange('previouslyTested', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Date</label>
                <input
                  type="date"
                  value={editableData.previousTestDate || ''}
                  onChange={(e) => onFieldChange('previousTestDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Provider</label>
                <input
                  type="text"
                  value={editableData.previousTestProvider || ''}
                  onChange={(e) => onFieldChange('previousTestProvider', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test City</label>
                <input
                  type="text"
                  value={editableData.previousTestCity || ''}
                  onChange={(e) => onFieldChange('previousTestCity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Result</label>
                <select
                  value={editableData.previousTestResult || ''}
                  onChange={(e) => onFieldChange('previousTestResult', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select</option>
                  <option value="Reactive">Reactive</option>
                  <option value="Non-Reactive">Non-Reactive</option>
                  <option value="Indeterminate">Indeterminate</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 7: MEDICAL HISTORY & CLINICAL PICTURE */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <h3 className="font-bold text-lg mb-4 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <span className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">7</span>
              MEDICAL HISTORY & CLINICAL PICTURE
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medical History</label>
              <textarea
                value={editableData.medicalHistory || ''}
                onChange={(e) => onFieldChange('medicalHistory', e.target.value)}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TB History</label>
                <select
                  value={editableData.medicalTB || ''}
                  onChange={(e) => onFieldChange('medicalTB', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">STI History</label>
                <select
                  value={editableData.medicalSTI || ''}
                  onChange={(e) => onFieldChange('medicalSTI', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PEP History</label>
                <select
                  value={editableData.medicalPEP || ''}
                  onChange={(e) => onFieldChange('medicalPEP', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PrEP History</label>
                <select
                  value={editableData.medicalPrEP || ''}
                  onChange={(e) => onFieldChange('medicalPrEP', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hepatitis B</label>
                <select
                  value={editableData.medicalHepatitisB || ''}
                  onChange={(e) => onFieldChange('medicalHepatitisB', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hepatitis C</label>
                <select
                  value={editableData.medicalHepatitisC || ''}
                  onChange={(e) => onFieldChange('medicalHepatitisC', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clinical Picture</label>
                <select
                  value={editableData.clinicalPicture || ''}
                  onChange={(e) => onFieldChange('clinicalPicture', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Asymptomatic">Asymptomatic</option>
                  <option value="Symptomatic">Symptomatic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Symptoms</label>
                <input
                  type="text"
                  value={editableData.symptoms || ''}
                  onChange={(e) => onFieldChange('symptoms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WHO Staging</label>
                <select
                  value={editableData.whoStaging || ''}
                  onChange={(e) => onFieldChange('whoStaging', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Stage 1">Stage 1</option>
                  <option value="Stage 2">Stage 2</option>
                  <option value="Stage 3">Stage 3</option>
                  <option value="Stage 4">Stage 4</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 8: TESTING DETAILS */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-800">
            <h3 className="font-bold text-lg mb-4 text-rose-900 dark:text-rose-100 flex items-center gap-2">
              <span className="bg-rose-600 dark:bg-rose-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">8</span>
              TESTING DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Type</label>
                <input
                  type="text"
                  value={editableData.clientType || ''}
                  onChange={(e) => onFieldChange('clientType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode of Reach</label>
                <input
                  type="text"
                  value={editableData.modeOfReach || ''}
                  onChange={(e) => onFieldChange('modeOfReach', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testing Accepted</label>
                <select
                  value={editableData.testingAccepted || ''}
                  onChange={(e) => onFieldChange('testingAccepted', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testing Modality</label>
                <input
                  type="text"
                  value={editableData.testingModality || ''}
                  onChange={(e) => onFieldChange('testingModality', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Linkage to Care</label>
                <input
                  type="text"
                  value={editableData.linkageToCare || ''}
                  onChange={(e) => onFieldChange('linkageToCare', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Result *</label>
                <select
                  value={editableData.testResult || ''}
                  onChange={(e) => onFieldChange('testResult', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select</option>
                  <option value="Reactive">Reactive</option>
                  <option value="Non-Reactive">Non-Reactive</option>
                  <option value="Indeterminate">Indeterminate</option>
                  <option value="Invalid">Invalid</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 9: INVENTORY INFORMATION */}
          <div className="bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 p-4 rounded-lg border border-lime-200 dark:border-lime-800">
            <h3 className="font-bold text-lg mb-4 text-lime-900 dark:text-lime-100 flex items-center gap-2">
              <span className="bg-lime-600 dark:bg-lime-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">9</span>
              INVENTORY INFORMATION
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Other Services</label>
              <textarea
                value={editableData.otherServices || ''}
                onChange={(e) => onFieldChange('otherServices', e.target.value)}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Kit Brand</label>
                <input
                  type="text"
                  value={editableData.testKitBrand || ''}
                  onChange={(e) => onFieldChange('testKitBrand', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Kit Lot Number</label>
                <input
                  type="text"
                  value={editableData.testKitLotNumber || ''}
                  onChange={(e) => onFieldChange('testKitLotNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Kit Expiration</label>
                <input
                  type="date"
                  value={editableData.testKitExpiration || ''}
                  onChange={(e) => onFieldChange('testKitExpiration', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 10: HTS PROVIDER DETAILS */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="bg-slate-600 dark:bg-slate-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">10</span>
              HTS PROVIDER DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testing Facility</label>
                <input
                  type="text"
                  value={editableData.testingFacility || ''}
                  onChange={(e) => onFieldChange('testingFacility', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Address</label>
                <input
                  type="text"
                  value={editableData.facilityAddress || ''}
                  onChange={(e) => onFieldChange('facilityAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Code</label>
                <input
                  type="text"
                  value={editableData.facilityCode || ''}
                  onChange={(e) => onFieldChange('facilityCode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Region</label>
                <input
                  type="text"
                  value={editableData.facilityRegion || ''}
                  onChange={(e) => onFieldChange('facilityRegion', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Province</label>
                <input
                  type="text"
                  value={editableData.facilityProvince || ''}
                  onChange={(e) => onFieldChange('facilityProvince', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility City</label>
                <input
                  type="text"
                  value={editableData.facilityCity || ''}
                  onChange={(e) => onFieldChange('facilityCity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Contact Number</label>
                <input
                  type="tel"
                  value={editableData.facilityContactNumber || ''}
                  onChange={(e) => onFieldChange('facilityContactNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Email</label>
                <input
                  type="email"
                  value={editableData.facilityEmail || ''}
                  onChange={(e) => onFieldChange('facilityEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="font-semibold text-md mb-3 text-gray-800 dark:text-gray-200">Counselor Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Name</label>
                  <input
                    type="text"
                    value={editableData.counselorName || ''}
                    onChange={(e) => onFieldChange('counselorName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Role</label>
                  <input
                    type="text"
                    value={editableData.counselorRole || ''}
                    onChange={(e) => onFieldChange('counselorRole', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor License</label>
                  <input
                    type="text"
                    value={editableData.counselorLicense || ''}
                    onChange={(e) => onFieldChange('counselorLicense', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Designation</label>
                  <input
                    type="text"
                    value={editableData.counselorDesignation || ''}
                    onChange={(e) => onFieldChange('counselorDesignation', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Contact</label>
                  <input
                    type="tel"
                    value={editableData.counselorContact || ''}
                    onChange={(e) => onFieldChange('counselorContact', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Signature</label>
                  <input
                    type="text"
                    value={editableData.counselorSignature || ''}
                    onChange={(e) => onFieldChange('counselorSignature', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form Completion Date</label>
                  <input
                    type="date"
                    value={editableData.formCompletionDate || ''}
                    onChange={(e) => onFieldChange('formCompletionDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unmapped Keys Mapping Section */}
        {hasUnmappedKeys && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-t-2 border-yellow-300 dark:border-yellow-700 p-6">
            <div className="flex items-start gap-3 mb-4">
              <IoWarning className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Map Unmapped Fields ({unmappedKeys.length})
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  OCR detected these fields but couldn&apos;t automatically match them to the form template. 
                  You can manually map them to the correct fields below. Your mappings help improve the system!
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unmappedKeys.map((key, index) => {
                const isDetailed = typeof key === 'object' && key !== null;
                const keyName = isDetailed ? (key.originalKey || key.normalizedKey) : key;
                const keyId = keyName || `unmapped-${index}`;
                const confidence = isDetailed ? key.confidence : null;
                const value = isDetailed ? key.value : null;
                const currentMapping = mappedUnmappedKeys[keyName];

                return (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border-2 border-yellow-200 dark:border-yellow-700 p-4 shadow-sm">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Left: Unmapped Key Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            Detected Field:
                          </span>
                          <span className="text-sm font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                            {keyName}
                          </span>
                          {confidence && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              confidence >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              confidence >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {confidence}%
                            </span>
                          )}
                        </div>

                        {value && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Detected Value:</span>
                            <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 font-medium">
                              {value}
                            </div>
                          </div>
                        )}

                        {isDetailed && key.normalizedKey && key.originalKey !== key.normalizedKey && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Normalized: <span className="font-mono">{key.normalizedKey}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Mapping Dropdown */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                          Map to Form Field:
                        </label>
                        <select
                          value={currentMapping?.targetField || ''}
                          onChange={(e) => onMapUnmappedKey(key, e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg 
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                   focus:border-primary-red focus:ring-2 focus:ring-primary-red/20
                                   hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                        >
                          <option value="">-- Select a field to map --</option>
                          {Object.entries(formFields).map(([sectionName, fields]) => (
                            <optgroup key={sectionName} label={sectionName}>
                              {fields.map(fieldName => (
                                <option key={fieldName} value={fieldName}>
                                  {getFieldLabel(fieldName)}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {currentMapping && (
                          <div className="flex items-center gap-2 text-xs">
                            <IoCheckmarkCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300 font-medium">
                              Mapped to: {getFieldLabel(currentMapping.targetField)}
                            </span>
                          </div>
                        )}

                        {value && !currentMapping && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            💡 Select a field above to assign this value
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mapping Statistics */}
            <div className="mt-4 pt-4 border-t border-yellow-300 dark:border-yellow-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{Object.keys(mappedUnmappedKeys).length}</span> of{' '}
                <span className="font-semibold">{unmappedKeys.length}</span> fields mapped
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <IoInformationCircle className="w-4 h-4" />
                Mapped values will be saved to the selected fields
              </div>
            </div>
          </div>
        )}

        {/* Footer with Save/Cancel Buttons */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              <IoClose className="w-5 h-5" />
              Cancel
            </Button>
            <Button
              onClick={onSave}
              variant="primary"
              className="flex-1"
            >
              <IoCheckmark className="w-5 h-5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

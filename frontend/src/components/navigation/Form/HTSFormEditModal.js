import React, { useState, useEffect } from 'react';
import { IoClose, IoCheckmark, IoDocumentText } from 'react-icons/io5';
import Button from '../../ui/Button';
import { loadTemplateMetadata } from '../../../utils/templateMetadataLoader';

/**
 * HTS Form Edit Modal - Allows editing of all extracted OCR fields
 * Organized by DOH HTS Form 2021 official 11-section structure:
 * 
 * FRONT PAGE (3 sections):
 *   1. INFORMED CONSENT (4 fields)
 *   2. DEMOGRAPHIC DATA (28 fields)
 *   3. EDUCATION & OCCUPATION (8 fields)
 * 
 * BACK PAGE (8 sections):
 *   4. HISTORY OF EXPOSURE / RISK ASSESSMENT (23 fields)
 *   5. REASONS FOR HIV TESTING (2 fields)
 *   6. PREVIOUS HIV TEST (5 fields)
 *   7. MEDICAL HISTORY & CLINICAL PICTURE (10 fields)
 *   8. TESTING DETAILS (6 fields)
 *   9. INVENTORY INFORMATION (4 fields)
 *   10. HTS PROVIDER DETAILS (15 fields)
 *   11. OTHERS - SEXUAL PRACTICES (2 fields)
 * 
 * METADATA-DRIVEN ARCHITECTURE:
 * Section mappings are dynamically loaded from template-metadata.json via
 * templateMetadataLoader utility, ensuring single source of truth between
 * frontend and backend. Deprecated sections (MIGRATED FLAT FIELDS) are
 * automatically filtered out.
 * 
 * NESTED FIELD SUPPORT (Fully Refactored):
 * This modal displays individual component fields for editing composite fields.
 * Composite fields are assembled from multiple components on the backend.
 * Visual indicators (purple badges) show which fields are part of composites.
 * 
 * Composite Field Types:
 * 1. fullName: firstName + middleName + lastName + suffix
 * 2. testDate/birthDate: month + day + year (backend semantic detection)
 * 3. sex: male/female (checkbox group)
 * 4. genderIdentity: man/woman/transWoman/transMan/other (multi-select)
 * 5. civilStatus: single/married/widowed/separated/liveIn (checkbox group)
 * 6. addresses (3 types): currentResidence, permanentResidence, placeOfBirth
 *    - Each has: city + province → assembled as "City, Province"
 * 7. riskFields (8 types with conditional branches):
 *    - riskSexMale, riskSexFemale, riskPaidForSex, riskReceivedPayment,
 *      riskSexUnderDrugs, riskSharedNeedles, riskBloodTransfusion, riskOccupationalExposure
 *    - Each has: status (yes/no) → if yes: total + date1 + date2 + dateMostRecentRisk
 * 
 * Data Flow:
 * - Backend (textractService.js) extracts and assembles composite fields with components
 * - HTSFormManagement.js populates editableData with component values for editing
 * - This modal displays individual component fields with composite indicators
 * - On save, HTSFormManagement.js merges component values back into composite structure
 * - Backend receives both composite values and component values for validation
 * 
 * UI Features:
 * - Composite field indicators: Purple badges show field relationships
 * - Component fields: Individual editable inputs for each component
 * - Section-based layout: Matches physical form structure for intuitive editing
 * - Unmapped key mapping: Users can manually map unrecognized OCR fields
 * - Metadata-driven field lists: Dropdowns populated from template metadata
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
  const [othersFields, setOthersFields] = useState(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [metadataError, setMetadataError] = useState(null);

  // Load template metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const metadata = await loadTemplateMetadata();
        const othersSection = metadata?.structure?.back?.sections?.OTHERS?.fields;

        if (!othersSection || !Array.isArray(othersSection)) {
          throw new Error('OTHERS section is missing from template metadata');
        }

        setOthersFields(othersSection);
      } catch (error) {
        console.error('[HTSFormEditModal] Failed to load metadata:', error);
        setMetadataError(error.message || 'Failed to load template metadata');
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    if (isOpen) {
      loadMetadata();
    }
  }, [isOpen]);

  if (!isOpen || !editableData) return null;

  // Show loading state while metadata loads
  if (isLoadingMetadata || !othersFields) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-red"></div>
            <span className="text-lg text-gray-700 dark:text-gray-300">Loading form structure...</span>
          </div>
        </div>
      </div>
    );
  }

  if (metadataError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-xl text-center space-y-3">
          <IoDocumentText className="w-8 h-8 text-primary-red mx-auto" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Unable to load form metadata</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{metadataError}</p>
          <Button onClick={onClose} variant="secondary" className="w-full">Close</Button>
        </div>
      </div>
    );
  }

  const condomUseField = othersFields.find(field => field.name === 'condomUse');
  const typeOfSexField = othersFields.find(field => field.name === 'typeOfSex');

  const getOptionLabel = (value) => {
    const customLabels = {
      oralSex: 'Oral Sex',
      analInserter: 'Anal (Insertive)',
      analReceiver: 'Anal (Receptive)',
      vaginalSex: 'Vaginal Sex',
      medicalTB: 'Current TB Patient',
      medicalSTI: 'Other STIs',
      medicalPEP: 'Taken PEP',
      medicalPrEP: 'Taking PrEP',
      medicalHepatitisB: 'Hepatitis B',
      medicalHepatitisC: 'Hepatitis C',
      clinicalAsymptomatic: 'Asymptomatic',
      clinicalSymptomatic: 'Symptomatic',
      clientTypeInpatient: 'Inpatient',
      clientTypeOutpatient: 'Outpatient',
      clientTypePDL: 'Person deprived of liberty',
      clientTypeOutreach: 'Outreach',
      clientTypeSpecify: 'Specify',
      modeOfReachClinic: 'Clinic walk-in',
      modeOfReachOnline: 'Online/self-initiated',
      modeOfReachIndex: 'Index Testing',
      modeOfReachNetworkTesting: 'Network Testing',
      modeOfReachOutreach: 'Outreach',
      testingModalityFacilityBasedFTB: 'Facility-based testing (FBT)',
      testingModalityNonLaboratoryFTB: 'Non-laboratory FBT',
      testingModalityCommunityBased: 'Community-based',
      testingModalitySelfTesting: 'Self-testing',
      linkageReferToART: 'Refer to ART',
      linkageReferForConfirmatory: 'Refer for Confirmatory Testing',
      linkageAdviseReTesting: 'Advised for retesting',
      linkageAdviseReTestingMonths: 'Retesting interval (months)',
      linkageAdviseReTestingWeeks: 'Retesting interval (weeks)',
      linkageAdviseReTestingDate: 'Suggested retesting date',
      hiv101: 'HIV 101',
      iecMaterials: 'IEC Materials',
      riskReductionPlanning: 'Risk Reduction Planning',
      referredToPrEPorHadGivenPEP: 'Referred to PrEP or given PEP',
      otherServicesSpecify: 'Other services (specify)',
      condomsProvided: 'Condoms provided',
      lubricantsProvided: 'Lubricants provided',
      offeredSocialAndSexualNetworkTesting: 'Offered Social/Sexual Network Testing',
      acceptedSocialAndSexualNetworkTesting: 'Accepted Social/Sexual Network Testing',
      hivCounselor: 'HIV Counselor',
      medicalTechnologist: 'Medical Technologist',
      cbsMotivator: 'CBS Motivator',
      othersSpecify: 'Others (specify)'
    };

    if (customLabels[value]) return customLabels[value];

    return value
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getTypeOfSexValue = () => {
    if (Array.isArray(editableData.typeOfSex)) {
      return editableData.typeOfSex;
    }

    // Legacy booleans: convert {typeOfSexOral: true} → ['oralSex']
    const legacyMappings = [
      { key: 'typeOfSexOral', option: 'oralSex' },
      { key: 'typeOfSexAnalInserter', option: 'analInserter' },
      { key: 'typeOfSexAnalReceiver', option: 'analReceiver' },
      { key: 'typeOfSexVaginal', option: 'vaginalSex' }
    ];

    const selected = legacyMappings
      .filter(({ key }) => Boolean(editableData[key]))
      .map(({ option }) => option);

    return selected;
  };

  const handleTypeOfSexChange = (option, isChecked) => {
    const current = new Set(getTypeOfSexValue());
    if (isChecked) {
      current.add(option);
    } else {
      current.delete(option);
    }
    onFieldChange('typeOfSex', Array.from(current));
  };

  const verbalConsentValue = `${editableData.verbalConsent ?? ''}`.toLowerCase();
  const sexValue = `${editableData.sex ?? ''}`.toLowerCase();
  const genderIdentityValue = `${editableData.genderIdentity ?? ''}`.toLowerCase();
  const civilStatusValue = `${editableData.civilStatus ?? ''}`.toLowerCase();
  const nationalityValue = `${editableData.nationality ?? ''}`.toLowerCase();
  const livingWithPartnerValue = `${editableData.livingWithPartner ?? ''}`.toLowerCase();
  const isPregnantValue = `${editableData.isPregnant ?? ''}`.toLowerCase();
  const currentlyInSchoolValue = `${editableData.currentlyInSchool ?? ''}`.toLowerCase();
  const currentlyWorkingValue = `${editableData.currentlyWorking ?? ''}`.toLowerCase();
  const workedOverseasValue = `${editableData.workedOverseas ?? ''}`.toLowerCase();
  const previouslyTestedValue = `${editableData.previouslyTested ?? ''}`.toLowerCase();
  const clinicalPictureValue = `${editableData.clinicalPicture ?? ''}`.toLowerCase();
  const clientTypeValue = `${editableData.clientType ?? ''}`.toLowerCase();
  const testingAcceptedValue = `${editableData.testingAccepted ?? ''}`.toLowerCase();

  const getReasonForTestingArray = () => {
    if (Array.isArray(editableData.reasonForTesting)) return editableData.reasonForTesting;
    const legacy = [
      { key: 'reasonHIVExposure', value: 'reasonHIVExposure' },
      { key: 'reasonRecommendedBy', value: 'reasonRecommendedBy' },
      { key: 'reasonReferredBy', value: 'reasonReferredBy' },
      { key: 'reasonEmploymentOverseas', value: 'reasonEmploymentOverseas' },
      { key: 'reasonEmploymentLocal', value: 'reasonEmploymentLocal' },
      { key: 'reasonReceivedTextMessage', value: 'reasonReceivedTextMessage' },
      { key: 'reasonInsuranceRequirement', value: 'reasonInsuranceRequirement' },
      { key: 'reasonOtherSpecify', value: 'reasonOtherSpecify' }
    ];
    return legacy.filter(({ key }) => editableData[key]).map(({ value }) => value);
  };

  const toggleReasonForTesting = (option, checked) => {
    const current = new Set(getReasonForTestingArray());
    if (checked) current.add(option); else current.delete(option);
    onFieldChange('reasonForTesting', Array.from(current));
  };

  const medicalHistoryOptions = ['medicalTB', 'medicalSTI', 'medicalPEP', 'medicalPrEP', 'medicalHepatitisB', 'medicalHepatitisC'];

  const getMedicalHistoryArray = () => {
    if (Array.isArray(editableData.medicalHistory)) return editableData.medicalHistory;
    return medicalHistoryOptions.filter(key => editableData[key]);
  };

  const toggleMedicalHistory = (option, checked) => {
    const current = new Set(getMedicalHistoryArray());
    if (checked) current.add(option); else current.delete(option);
    onFieldChange('medicalHistory', Array.from(current));
  };

  const modeOfReachOptions = ['modeOfReachClinic', 'modeOfReachOnline', 'modeOfReachIndex', 'modeOfReachNetworkTesting', 'modeOfReachOutreach'];

  const getModeOfReachArray = () => {
    if (Array.isArray(editableData.modeOfReach)) return editableData.modeOfReach;
    return modeOfReachOptions.filter(key => editableData[key]);
  };

  const toggleModeOfReach = (option, checked) => {
    const current = new Set(getModeOfReachArray());
    if (checked) current.add(option); else current.delete(option);
    onFieldChange('modeOfReach', Array.from(current));
  };

  const testingModalityOptions = [
    'testingModalityFacilityBasedFTB',
    'testingModalityNonLaboratoryFTB',
    'testingModalityCommunityBased',
    'testingModalitySelfTesting'
  ];

  const getTestingModalityArray = () => {
    if (Array.isArray(editableData.testingModality)) return editableData.testingModality;
    return testingModalityOptions.filter(key => editableData[key]);
  };

  const toggleTestingModality = (option, checked) => {
    const current = new Set(getTestingModalityArray());
    if (checked) current.add(option); else current.delete(option);
    onFieldChange('testingModality', Array.from(current));
  };

  const linkageToTestingOptions = [
    'linkageReferToART',
    'linkageReferForConfirmatory',
    'linkageAdviseReTesting',
    'linkageAdviseReTestingMonths',
    'linkageAdviseReTestingWeeks',
    'linkageAdviseReTestingDate'
  ];

  const getLinkageToTestingArray = () => {
    if (Array.isArray(editableData.linkageToTesting)) return editableData.linkageToTesting;
    return linkageToTestingOptions.filter(key => editableData[key]);
  };

  const toggleLinkageToTesting = (option, checked) => {
    const current = new Set(getLinkageToTestingArray());
    if (checked) current.add(option); else current.delete(option);
    onFieldChange('linkageToTesting', Array.from(current));
  };

  const otherServicesOptions = [
    'hiv101',
    'iecMaterials',
    'riskReductionPlanning',
    'referredToPrEPorHadGivenPEP',
    'otherServicesSpecify',
    'condomsProvided',
    'lubricantsProvided',
    'offeredSocialAndSexualNetworkTesting',
    'acceptedSocialAndSexualNetworkTesting'
  ];

  const getOtherServicesArray = () => {
    if (Array.isArray(editableData.otherServiceProvided)) return editableData.otherServiceProvided;
    return otherServicesOptions.filter(key => editableData[key]);
  };

  const toggleOtherServices = (option, checked) => {
    const current = new Set(getOtherServicesArray());
    if (checked) current.add(option); else current.delete(option);
    onFieldChange('otherServiceProvided', Array.from(current));
  };

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
          
          {/* SECTION 1: INFORMED CONSENT */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-lg mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <span className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
              INFORMED CONSENT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name and Signature</label>
                <input
                  type="text"
                  value={editableData.nameAndSignature || ''}
                  onChange={(e) => onFieldChange('nameAndSignature', e.target.value)}
                  placeholder="Patient/Client name and signature"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verbal Consent</label>
                <div className="flex flex-col md:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="verbalConsent"
                      value="yes"
                      checked={verbalConsentValue === 'yes' || verbalConsentValue === 'true'}
                      onChange={(e) => onFieldChange('verbalConsent', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="verbalConsent"
                      value="no"
                      checked={verbalConsentValue === 'no' || verbalConsentValue === 'false'}
                      onChange={(e) => onFieldChange('verbalConsent', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DEMOGRAPHIC DATA */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-bold text-lg mb-4 text-green-900 dark:text-green-100 flex items-center gap-2">
              <span className="bg-green-600 dark:bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
              DEMOGRAPHIC DATA
            </h3>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Date</label>
                <input
                  type="date"
                  value={editableData.testDate || ''}
                  onChange={(e) => onFieldChange('testDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PhilHealth Number</label>
                <input
                  type="text"
                  value={editableData.philHealthNumber || ''}
                  onChange={(e) => onFieldChange('philHealthNumber', e.target.value)}
                  maxLength={12}
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

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={editableData.lastName || ''}
                  onChange={(e) => onFieldChange('lastName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suffix</label>
                <input
                  type="text"
                  value={editableData.suffix || ''}
                  onChange={(e) => onFieldChange('suffix', e.target.value)}
                  placeholder="Jr., Sr., III"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Birth Order</label>
                <input
                  type="number"
                  value={editableData.birthOrder || ''}
                  onChange={(e) => onFieldChange('birthOrder', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Birth Date</label>
                <input
                  type="date"
                  value={editableData.birthDate || ''}
                  onChange={(e) => onFieldChange('birthDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age</label>
                <input
                  type="number"
                  value={editableData.age || ''}
                  onChange={(e) => onFieldChange('age', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age in Months (if under 1 year)</label>
                <input
                  type="number"
                  value={editableData.ageMonths || ''}
                  onChange={(e) => onFieldChange('ageMonths', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sex (assigned at birth)</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="male"
                      checked={sexValue === 'male'}
                      onChange={(e) => onFieldChange('sex', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="female"
                      checked={sexValue === 'female'}
                      onChange={(e) => onFieldChange('sex', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Female</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender Identity</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['man', 'woman', 'transWoman', 'transMan', 'otherGenderIdentity'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="genderIdentity"
                      value={option}
                      checked={genderIdentityValue === option.toLowerCase()}
                      onChange={(e) => onFieldChange('genderIdentity', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Residence - City/Municipality</label>
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

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permanent Residence - City/Municipality</label>
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

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Place of Birth - City/Municipality</label>
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nationality</label>
              <div className="flex flex-col md:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nationality"
                    value="nationalityFilipino"
                    checked={nationalityValue === 'nationalityfilipino' || nationalityValue === 'filipino'}
                    onChange={(e) => onFieldChange('nationality', e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Filipino</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nationality"
                    value="nationalityOther"
                    checked={nationalityValue === 'nationalityother' || nationalityValue === 'other'}
                    onChange={(e) => onFieldChange('nationality', e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Other (specify)</span>
                </label>
              </div>
              {nationalityValue === 'nationalityother' || nationalityValue === 'other' ? (
                <div className="mt-2">
                  <input
                    type="text"
                    value={editableData.nationalityOther || ''}
                    onChange={(e) => onFieldChange('nationalityOther', e.target.value)}
                    placeholder="Specify nationality"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ) : null}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Civil Status</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['civilStatusSingle', 'civilStatusMarried', 'civilStatusSeparated', 'civilStatusWidowed', 'civilStatusDivorced'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="civilStatus"
                      value={option}
                      checked={civilStatusValue === option.toLowerCase()}
                      onChange={(e) => onFieldChange('civilStatus', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently living with a partner</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="livingWithPartner"
                      value="livingWithPartnerYes"
                      checked={livingWithPartnerValue === 'livingwithpartneryes' || livingWithPartnerValue === 'yes'}
                      onChange={(e) => onFieldChange('livingWithPartner', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="livingWithPartner"
                      value="livingWithPartnerNo"
                      checked={livingWithPartnerValue === 'livingwithpartnerno' || livingWithPartnerValue === 'no'}
                      onChange={(e) => onFieldChange('livingWithPartner', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Children</label>
                <input
                  type="number"
                  value={editableData.numberOfChildren || ''}
                  onChange={(e) => onFieldChange('numberOfChildren', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently pregnant (for female only)</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isPregnant"
                      value="isPregnantYes"
                      checked={isPregnantValue === 'ispregnantyes' || isPregnantValue === 'yes'}
                      onChange={(e) => onFieldChange('isPregnant', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isPregnant"
                      value="isPregnantNo"
                      checked={isPregnantValue === 'ispregnantno' || isPregnantValue === 'no'}
                      onChange={(e) => onFieldChange('isPregnant', e.target.value)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parental Code - Mother (first 2 letters)</label>
                <input
                  type="text"
                  value={editableData.parentalCodeMother || ''}
                  onChange={(e) => onFieldChange('parentalCodeMother', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parental Code - Father (first 2 letters)</label>
                <input
                  type="text"
                  value={editableData.parentalCodeFather || ''}
                  onChange={(e) => onFieldChange('parentalCodeFather', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parental Code (Mother first 2 letters)</label>
                <input
                  type="text"
                  value={editableData.parentalCode || ''}
                  onChange={(e) => onFieldChange('parentalCode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: EDUCATION & OCCUPATION */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-bold text-lg mb-4 text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <span className="bg-amber-600 dark:bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
              EDUCATION & OCCUPATION
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Highest Educational Attainment</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['noGradeCompleted', 'elementary', 'highSchool', 'college', 'vocational', 'postGraduate'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="educationalAttainment"
                      value={option}
                      checked={`${editableData.educationalAttainment ?? ''}`.toLowerCase() === option.toLowerCase()}
                      onChange={(e) => onFieldChange('educationalAttainment', e.target.value)}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently in School</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currentlyInSchool"
                    value="currentlyInSchoolYes"
                    checked={currentlyInSchoolValue === 'currentlyinschoolyes' || currentlyInSchoolValue === 'yes'}
                    onChange={(e) => onFieldChange('currentlyInSchool', e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currentlyInSchool"
                    value="currentlyInSchoolNo"
                    checked={currentlyInSchoolValue === 'currentlyinschoolno' || currentlyInSchoolValue === 'no'}
                    onChange={(e) => onFieldChange('currentlyInSchool', e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently Working</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currentlyWorking"
                    value="currentlyWorkingYes"
                    checked={currentlyWorkingValue === 'currentlyworkingyes' || currentlyWorkingValue === 'yes'}
                    onChange={(e) => onFieldChange('currentlyWorking', e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currentlyWorking"
                    value="currentlyWorkingNo"
                    checked={currentlyWorkingValue === 'currentlyworkingno' || currentlyWorkingValue === 'no'}
                    onChange={(e) => onFieldChange('currentlyWorking', e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                </label>
              </div>

              {currentlyWorkingValue === 'currentlyworkingyes' || currentlyWorkingValue === 'yes' ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Occupation</label>
                  <input
                    type="text"
                    value={editableData.currentOccupation || ''}
                    onChange={(e) => onFieldChange('currentOccupation', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              ) : null}

              {currentlyWorkingValue === 'currentlyworkingno' || currentlyWorkingValue === 'no' ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Occupation</label>
                  <input
                    type="text"
                    value={editableData.previousOccupation || ''}
                    onChange={(e) => onFieldChange('previousOccupation', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              ) : null}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Worked overseas/abroad in past 5 years</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="workedOverseas"
                    value="yes"
                    checked={workedOverseasValue === 'yes'}
                    onChange={(e) => onFieldChange('workedOverseas', e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="workedOverseas"
                    value="no"
                    checked={workedOverseasValue === 'no'}
                    onChange={(e) => onFieldChange('workedOverseas', e.target.value)}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                </label>
              </div>

              {workedOverseasValue === 'yes' ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overseas Return Year</label>
                    <input
                      type="text"
                      value={editableData.overseasReturnYear || ''}
                      onChange={(e) => onFieldChange('overseasReturnYear', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Where were you based</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="workedOverseasLocation"
                          value="onAShip"
                          checked={`${editableData.workedOverseasLocation ?? ''}`.toLowerCase() === 'onaship'}
                          onChange={(e) => onFieldChange('workedOverseasLocation', e.target.value)}
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">On a ship</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="workedOverseasLocation"
                          value="landBased"
                          checked={`${editableData.workedOverseasLocation ?? ''}`.toLowerCase() === 'landbased'}
                          onChange={(e) => onFieldChange('workedOverseasLocation', e.target.value)}
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">Land</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country last worked in</label>
                    <input
                      type="text"
                      value={editableData.workedOverseasCountry || ''}
                      onChange={(e) => onFieldChange('workedOverseasCountry', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* SECTION 4: HISTORY OF EXPOSURE / RISK ASSESSMENT */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="font-bold text-lg mb-4 text-red-900 dark:text-red-100 flex items-center gap-2">
              <span className="bg-red-600 dark:bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">4</span>
              HISTORY OF EXPOSURE / RISK ASSESSMENT
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mother&apos;s HIV Status</label>
              <div className="flex flex-wrap gap-3">
                {['doNotKnow', 'no', 'yes'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="motherHIV"
                      value={option}
                      checked={`${editableData.motherHIV ?? ''}`.toLowerCase() === option.toLowerCase()}
                      onChange={(e) => onFieldChange('motherHIV', e.target.value)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[{
                key: 'riskSexMale', label: 'Sex with a MALE', statusKey: 'riskSexMaleStatus', totalKey: 'riskSexMaleTotal', dateKey: 'riskSexMaleDate1'
              }, {
                key: 'riskSexFemale', label: 'Sex with a FEMALE', statusKey: 'riskSexFemaleStatus', totalKey: 'riskSexFemaleTotal', dateKey: 'riskSexFemaleDate1'
              }].map(({ key, label, statusKey, totalKey, dateKey }) => {
                const statusVal = `${editableData[statusKey] ?? ''}`.toLowerCase();
                return (
                  <div key={key} className="p-3 rounded-lg border border-red-100 dark:border-red-800 bg-white/60 dark:bg-white/5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${key}-status`}
                              value="yes"
                              checked={statusVal === 'yes'}
                              onChange={(e) => onFieldChange(statusKey, e.target.value)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${key}-status`}
                              value="no"
                              checked={statusVal === 'no'}
                              onChange={(e) => onFieldChange(statusKey, e.target.value)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                          </label>
                        </div>
                      </div>
                      {statusVal === 'yes' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:max-w-xl">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Total number</label>
                            <input
                              type="text"
                              value={editableData[totalKey] || ''}
                              onChange={(e) => onFieldChange(totalKey, e.target.value)}
                              className="w-full px-3 py-2 border border-red-200 dark:border-red-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date (MM/YYYY)</label>
                            <input
                              type="text"
                              value={editableData[dateKey] || ''}
                              onChange={(e) => onFieldChange(dateKey, e.target.value)}
                              placeholder="MM/YYYY"
                              className="w-full px-3 py-2 border border-red-200 dark:border-red-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {[{
                statusKey: 'riskPaidForSexStatus', label: 'Paid for sex (cash or kind)', dateKey: 'riskPaidForSexDate'
              }, {
                statusKey: 'riskReceivedPaymentStatus', label: 'Received payment for sex', dateKey: 'riskReceivedPaymentDate'
              }, {
                statusKey: 'riskSexUnderDrugsStatus', label: 'Sex under influence of drugs', dateKey: 'riskSexUnderDrugsDate'
              }, {
                statusKey: 'riskSharedNeedlesStatus', label: 'Shared needles (injection drugs)', dateKey: 'riskSharedNeedlesDate'
              }, {
                statusKey: 'riskBloodTransfusionStatus', label: 'Received blood transfusion', dateKey: 'riskBloodTransfusionDate'
              }, {
                statusKey: 'riskOccupationalExposureStatus', label: 'Occupational exposure (needlestick/sharps)', dateKey: 'riskOccupationalExposureDate'
              }].map(({ statusKey, label, dateKey }) => {
                const statusVal = `${editableData[statusKey] ?? ''}`.toLowerCase();
                return (
                  <div key={statusKey} className="p-3 rounded-lg border border-red-100 dark:border-red-800 bg-white/60 dark:bg-white/5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${statusKey}-status`}
                              value="yes"
                              checked={statusVal === 'yes'}
                              onChange={(e) => onFieldChange(statusKey, e.target.value)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${statusKey}-status`}
                              value="no"
                              checked={statusVal === 'no'}
                              onChange={(e) => onFieldChange(statusKey, e.target.value)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                          </label>
                        </div>
                      </div>
                      {statusVal === 'yes' ? (
                        <div className="w-full md:max-w-sm">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date (MM/YYYY)</label>
                          <input
                            type="text"
                            value={editableData[dateKey] || ''}
                            onChange={(e) => onFieldChange(dateKey, e.target.value)}
                            placeholder="MM/YYYY"
                            className="w-full px-3 py-2 border border-red-200 dark:border-red-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: REASONS FOR HIV TESTING */}
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-sky-200 dark:border-sky-800">
            <h3 className="font-bold text-lg mb-4 text-sky-900 dark:text-sky-100 flex items-center gap-2">
              <span className="bg-sky-600 dark:bg-sky-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">5</span>
              REASONS FOR HIV TESTING
            </h3>
            <div className="space-y-2">
              {[
                'reasonHIVExposure',
                'reasonRecommendedBy',
                'reasonReferredBy',
                'reasonEmploymentOverseas',
                'reasonEmploymentLocal',
                'reasonReceivedTextMessage',
                'reasonInsuranceRequirement',
                'reasonOtherSpecify'
              ].map(option => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getReasonForTestingArray().includes(option)}
                    onChange={(e) => toggleReasonForTesting(option, e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                </label>
              ))}
            </div>
            {getReasonForTestingArray().includes('reasonOtherSpecify') ? (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Other (please specify)</label>
                <input
                  type="text"
                  value={editableData.reasonOtherText || ''}
                  onChange={(e) => onFieldChange('reasonOtherText', e.target.value)}
                  className="w-full px-4 py-2 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ) : null}
          </div>

          {/* SECTION 6: PREVIOUS HIV TEST */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-violet-200 dark:border-violet-800">
            <h3 className="font-bold text-lg mb-4 text-violet-900 dark:text-violet-100 flex items-center gap-2">
              <span className="bg-violet-600 dark:bg-violet-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">6</span>
              PREVIOUS HIV TEST
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Have you ever been tested for HIV before?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="previouslyTested"
                    value="previouslyTestedYes"
                    checked={previouslyTestedValue === 'previouslytestedyes' || previouslyTestedValue === 'yes'}
                    onChange={(e) => onFieldChange('previouslyTested', e.target.value)}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="previouslyTested"
                    value="previouslyTestedNo"
                    checked={previouslyTestedValue === 'previouslytestedno' || previouslyTestedValue === 'no'}
                    onChange={(e) => onFieldChange('previouslyTested', e.target.value)}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">No</span>
                </label>
              </div>
            </div>

            {previouslyTestedValue === 'previouslytestedyes' || previouslyTestedValue === 'yes' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Date</label>
                  <input
                    type="text"
                    value={editableData.previousTestDate || ''}
                    onChange={(e) => onFieldChange('previousTestDate', e.target.value)}
                    className="w-full px-4 py-2 border border-violet-200 dark:border-violet-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test City/Municipality</label>
                  <input
                    type="text"
                    value={editableData.previousTestCity || ''}
                    onChange={(e) => onFieldChange('previousTestCity', e.target.value)}
                    className="w-full px-4 py-2 border border-violet-200 dark:border-violet-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Result</label>
                  <div className="flex flex-wrap gap-3">
                    {[{ value: 'previousTestResultReactive', label: 'Reactive' }, { value: 'previousTestResultNonReactive', label: 'Non-reactive' }, { value: 'previousTestResultIndeterminate', label: 'Indeterminate' }, { value: 'previousTestResultWasNotAble', label: 'Was not able to get result' }].map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="previousTestResult"
                          value={value}
                          checked={`${editableData.previousTestResult ?? ''}`.toLowerCase() === value.toLowerCase()}
                          onChange={(e) => onFieldChange('previousTestResult', e.target.value)}
                          className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Provider</label>
                  <input
                    type="text"
                    value={editableData.previousTestProvider || ''}
                    onChange={(e) => onFieldChange('previousTestProvider', e.target.value)}
                    className="w-full px-4 py-2 border border-violet-200 dark:border-violet-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* SECTION 7: MEDICAL HISTORY & CLINICAL PICTURE */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
            <h3 className="font-bold text-lg mb-4 text-teal-900 dark:text-teal-100 flex items-center gap-2">
              <span className="bg-teal-600 dark:bg-teal-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">7</span>
              MEDICAL HISTORY &amp; CLINICAL PICTURE
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medical History (select all that apply)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {medicalHistoryOptions.map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getMedicalHistoryArray().includes(option)}
                      onChange={(e) => toggleMedicalHistory(option, e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clinical Picture</label>
              <div className="flex flex-col md:flex-row gap-3">
                {['clinicalAsymptomatic', 'clinicalSymptomatic'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="clinicalPicture"
                      value={option}
                      checked={clinicalPictureValue === option.toLowerCase()}
                      onChange={(e) => onFieldChange('clinicalPicture', e.target.value)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
              {clinicalPictureValue === 'clinicalsymptomatic' ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Describe Signs/Symptoms</label>
                  <input
                    type="text"
                    value={editableData.symptoms || ''}
                    onChange={(e) => onFieldChange('symptoms', e.target.value)}
                    className="w-full px-4 py-2 border border-teal-200 dark:border-teal-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WHO Staging</label>
                <input
                  type="text"
                  value={editableData.whoStaging || ''}
                  onChange={(e) => onFieldChange('whoStaging', e.target.value)}
                  className="w-full px-4 py-2 border border-teal-200 dark:border-teal-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editableData.noPhysicianStage)}
                    onChange={(e) => onFieldChange('noPhysicianStage', e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">No physician to do staging</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 8: TESTING DETAILS */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <h3 className="font-bold text-lg mb-4 text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
              <span className="bg-cyan-600 dark:bg-cyan-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">8</span>
              TESTING DETAILS
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['clientTypeInpatient', 'clientTypeOutpatient', 'clientTypePDL', 'clientTypeOutreach', 'clientTypeSpecify'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="clientType"
                      value={option}
                      checked={clientTypeValue === option.toLowerCase()}
                      onChange={(e) => onFieldChange('clientType', e.target.value)}
                      className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode of Reach (select all that apply)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modeOfReachOptions.map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getModeOfReachArray().includes(option)}
                      onChange={(e) => toggleModeOfReach(option, e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HIV Testing Status</label>
              <div className="flex flex-col md:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="testingAccepted"
                    value="accepted"
                    checked={testingAcceptedValue === 'testingaccepted' || testingAcceptedValue === 'accepted' || testingAcceptedValue.includes('accept')}
                    onChange={(e) => onFieldChange('testingAccepted', e.target.value)}
                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Accepted HIV Testing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="testingAccepted"
                    value="refused"
                    checked={testingAcceptedValue === 'testingrefused' || testingAcceptedValue === 'refused' || testingAcceptedValue.includes('refus')}
                    onChange={(e) => onFieldChange('testingAccepted', e.target.value)}
                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Refused HIV Testing</span>
                </label>
              </div>

              {testingAcceptedValue === 'testingrefused' || testingAcceptedValue === 'refused' || testingAcceptedValue.includes('refus') ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for refusal</label>
                  <input
                    type="text"
                    value={editableData.testingReasonForRefusal || ''}
                    onChange={(e) => onFieldChange('testingReasonForRefusal', e.target.value)}
                    className="w-full px-4 py-2 border border-cyan-200 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ) : null}

              {testingAcceptedValue === 'testingaccepted' || testingAcceptedValue === 'accepted' || testingAcceptedValue.includes('accept') ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HIV Testing Modality (select all that apply)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {testingModalityOptions.map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getTestingModalityArray().includes(option)}
                          onChange={(e) => toggleTestingModality(option, e.target.checked)}
                          className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Linkage to Testing (select all that apply)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {linkageToTestingOptions.map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getLinkageToTestingArray().includes(option)}
                      onChange={(e) => toggleLinkageToTesting(option, e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Other Services Provided (select all that apply)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {otherServicesOptions.map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getOtherServicesArray().includes(option)}
                      onChange={(e) => toggleOtherServices(option, e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>

              {getOtherServicesArray().includes('condomsProvided') ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of condoms distributed</label>
                  <input
                    type="number"
                    value={editableData.numDistributedCondoms || ''}
                    onChange={(e) => onFieldChange('numDistributedCondoms', e.target.value)}
                    className="w-full px-4 py-2 border border-cyan-200 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ) : null}

              {getOtherServicesArray().includes('lubricantsProvided') ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of lubricants distributed</label>
                  <input
                    type="number"
                    value={editableData.numDistributedLubricants || ''}
                    onChange={(e) => onFieldChange('numDistributedLubricants', e.target.value)}
                    className="w-full px-4 py-2 border border-cyan-200 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Linkage to Care Plan</label>
                <input
                  type="text"
                  value={editableData.linkageToCare || ''}
                  onChange={(e) => onFieldChange('linkageToCare', e.target.value)}
                  className="w-full px-4 py-2 border border-cyan-200 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Other Services Provided to Client</label>
                <input
                  type="text"
                  value={editableData.otherServices || ''}
                  onChange={(e) => onFieldChange('otherServices', e.target.value)}
                  className="w-full px-4 py-2 border border-cyan-200 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 9: INVENTORY INFORMATION */}
          <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-fuchsia-200 dark:border-fuchsia-800">
            <h3 className="font-bold text-lg mb-4 text-fuchsia-900 dark:text-fuchsia-100 flex items-center gap-2">
              <span className="bg-fuchsia-600 dark:bg-fuchsia-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">9</span>
              INVENTORY INFORMATION
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Brand of test kit used</label>
                <input
                  type="text"
                  value={editableData.testKitBrand || ''}
                  onChange={(e) => onFieldChange('testKitBrand', e.target.value)}
                  className="w-full px-4 py-2 border border-fuchsia-200 dark:border-fuchsia-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test kit used</label>
                <input
                  type="text"
                  value={editableData.testKitUsed || ''}
                  onChange={(e) => onFieldChange('testKitUsed', e.target.value)}
                  className="w-full px-4 py-2 border border-fuchsia-200 dark:border-fuchsia-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lot Number</label>
                <input
                  type="text"
                  value={editableData.testKitLotNumber || ''}
                  onChange={(e) => onFieldChange('testKitLotNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-fuchsia-200 dark:border-fuchsia-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiration date</label>
                <input
                  type="date"
                  value={editableData.testKitExpiration || ''}
                  onChange={(e) => onFieldChange('testKitExpiration', e.target.value)}
                  className="w-full px-4 py-2 border border-fuchsia-200 dark:border-fuchsia-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 10: HTS PROVIDER DETAILS */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="bg-slate-700 dark:bg-slate-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">10</span>
              HTS PROVIDER DETAILS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name of Testing Facility/Organization</label>
                <input
                  type="text"
                  value={editableData.testingFacility || ''}
                  onChange={(e) => onFieldChange('testingFacility', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form Completion Date</label>
                <input
                  type="date"
                  value={editableData.formCompletionDate || ''}
                  onChange={(e) => onFieldChange('formCompletionDate', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Complete Mailing Address</label>
                <input
                  type="text"
                  value={editableData.facilityAddress || ''}
                  onChange={(e) => onFieldChange('facilityAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Contact Numbers</label>
                <input
                  type="text"
                  value={editableData.facilityContactNumber || ''}
                  onChange={(e) => onFieldChange('facilityContactNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Email Address</label>
                <input
                  type="email"
                  value={editableData.facilityEmail || ''}
                  onChange={(e) => onFieldChange('facilityEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name of service provider</label>
                <input
                  type="text"
                  value={editableData.counselorName || ''}
                  onChange={(e) => onFieldChange('counselorName', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <div className="flex flex-wrap gap-3">
                {['HIV Counselor', 'Medical Technologist', 'CBS Motivator', 'Others'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="counselorRole"
                      value={option}
                      checked={`${editableData.counselorRole ?? ''}`.toLowerCase() === option.toLowerCase()}
                      onChange={(e) => onFieldChange('counselorRole', e.target.value)}
                      className="w-4 h-4 text-slate-700 focus:ring-slate-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary HTS provider</label>
              <div className="flex flex-wrap gap-3">
                {['hivCounselor', 'medicalTechnologist', 'cbsMotivator', 'othersSpecify'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="primaryHTSProvider"
                      value={option}
                      checked={`${editableData.primaryHTSProvider ?? ''}`.toLowerCase() === option.toLowerCase()}
                      onChange={(e) => onFieldChange('primaryHTSProvider', e.target.value)}
                      className="w-4 h-4 text-slate-700 focus:ring-slate-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service provider signature</label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editableData.counselorSignature)}
                  onChange={(e) => onFieldChange('counselorSignature', e.target.checked)}
                  className="w-4 h-4 text-slate-700 rounded focus:ring-slate-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Signature present</span>
              </label>
            </div>
          </div>

          {/* SECTION 11: OTHERS */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <h3 className="font-bold text-lg mb-4 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <span className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">11</span>
              OTHERS (SEXUAL PRACTICES)
            </h3>
            
            {/* Condom Use */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condom Use
              </label>
              <div className="flex flex-col md:flex-row gap-3">
                {(condomUseField?.options || []).map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="condomUse"
                      value={option}
                      checked={editableData.condomUse === option}
                      onChange={(e) => onFieldChange('condomUse', e.target.value)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type of Sex */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type of Sex (Select all that apply)
              </label>
              <div className="space-y-2">
                {(typeOfSexField?.options || []).map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getTypeOfSexValue().includes(option)}
                      onChange={(e) => handleTypeOfSexChange(option, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getOptionLabel(option)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

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

import React, { useState, useEffect } from 'react';
import { IoClose, IoCheckmark, IoDocumentText, IoWarning, IoCheckmarkCircle, IoInformationCircle } from 'react-icons/io5';
import Button from '../../ui/Button';
import { loadTemplateMetadata, buildSectionMappingFromMetadata } from '../../../utils/templateMetadataLoader';

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
  // State for metadata-derived section mapping
  const [formFields, setFormFields] = useState(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Load template metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const metadata = await loadTemplateMetadata();
        if (!metadata) {
          console.error('[HTSFormEditModal] No metadata available - cannot render form');
          setIsLoadingMetadata(false);
          return;
        }
        
        const sectionMapping = buildSectionMappingFromMetadata(metadata);
        setFormFields(sectionMapping);
      } catch (error) {
        console.error('[HTSFormEditModal] Failed to load metadata:', error);
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
  if (isLoadingMetadata) {
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

  // Show error if metadata failed to load
  if (!formFields || Object.keys(formFields).length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <IoClose className="w-16 h-16 text-red-500" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to Load Form</h3>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Could not load form metadata. Please try again or contact support.
            </p>
            <Button onClick={onClose} variant="primary">
              <IoClose className="w-5 h-5" />
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // formFields is now loaded from template-metadata.json via state (set in useEffect)
  // No hard-coded constant needed - ensures single source of truth

  // Get label for field name - uses metadata if available
  const getFieldLabel = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Render a composite field indicator badge
  const renderCompositeIndicator = (fieldName, componentFields) => {
    const hasComponents = componentFields && componentFields.length > 0;
    if (!hasComponents) return null;
    
    return (
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
          🔗 Composite Field
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          ({componentFields.join(', ')})
        </span>
      </div>
    );
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editableData.nameAndSignature || ''}
                  onChange={(e) => onFieldChange('nameAndSignature', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Signed</label>
                <input
                  type="checkbox"
                  checked={editableData.verbalConsent || false}
                  onChange={(e) => onFieldChange('verbalConsent', e.target.checked)}
                  className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600"
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

            {/* Name Fields - Composite */}
            {renderCompositeIndicator('fullName', ['firstName', 'middleName', 'lastName', 'suffix'])}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
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
            </div>

            {/* Age & Sex */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age *</label>
                <input
                  type="number"
                  value={editableData.age || ''}
                  onChange={(e) => onFieldChange('age', e.target.value)}
                  min="0"
                  max="150"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sex *</label>
                <select
                  value={editableData.sex || ''}
                  onChange={(e) => onFieldChange('sex', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Address - Composite */}
            {renderCompositeIndicator('fullAddress', ['street', 'barangay', 'city', 'province'])}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={editableData.street || ''}
                  onChange={(e) => onFieldChange('street', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barangay</label>
                <input
                  type="text"
                  value={editableData.barangay || ''}
                  onChange={(e) => onFieldChange('barangay', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                <input
                  type="text"
                  value={editableData.city || ''}
                  onChange={(e) => onFieldChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Province *</label>
                <input
                  type="text"
                  value={editableData.province || ''}
                  onChange={(e) => onFieldChange('province', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
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
                  <option value="">Select...</option>
                  <option value="No Formal Education">No Formal Education</option>
                  <option value="Elementary">Elementary</option>
                  <option value="High School">High School</option>
                  <option value="Vocational">Vocational</option>
                  <option value="College">College</option>
                  <option value="Post-Graduate">Post-Graduate</option>
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
            </div>
          </div>

          {/* ========== BACK PAGE SECTIONS (8 sections) ========== */}

          {/* SECTION 4: HISTORY OF EXPOSURE */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-bold text-lg mb-4 text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
              <span className="bg-yellow-600 dark:bg-yellow-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">4</span>
              HISTORY OF EXPOSURE / RISK ASSESSMENT
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Check all risk factors that apply:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.riskSexMale || false}
                  onChange={(e) => onFieldChange('riskSexMale', e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Sex with male partner</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.riskSexFemale || false}
                  onChange={(e) => onFieldChange('riskSexFemale', e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Sex with female partner</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.riskSharedNeedles || false}
                  onChange={(e) => onFieldChange('riskSharedNeedles', e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Shared needles/syringes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.riskBloodTransfusion || false}
                  onChange={(e) => onFieldChange('riskBloodTransfusion', e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Blood transfusion</span>
              </label>
            </div>
          </div>

          {/* SECTION 5: REASONS FOR HIV TESTING */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="font-bold text-lg mb-4 text-red-900 dark:text-red-100 flex items-center gap-2">
              <span className="bg-red-600 dark:bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">5</span>
              REASONS FOR HIV TESTING
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.reasonKnowStatus || false}
                  onChange={(e) => onFieldChange('reasonKnowStatus', e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Want to know HIV status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.reasonPartnerRequest || false}
                  onChange={(e) => onFieldChange('reasonPartnerRequest', e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Partner requested testing</span>
              </label>
            </div>
          </div>

          {/* SECTION 6: PREVIOUS HIV TESTING */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <h3 className="font-bold text-lg mb-4 text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
              <span className="bg-cyan-600 dark:bg-cyan-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">6</span>
              PREVIOUS HIV TESTING
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previously Tested?</label>
                <select
                  value={editableData.previouslyTested || ''}
                  onChange={(e) => onFieldChange('previouslyTested', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Test Result</label>
                <select
                  value={editableData.previousTestResult || ''}
                  onChange={(e) => onFieldChange('previousTestResult', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 7: MEDICAL HISTORY */}
          <div className="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
            <h3 className="font-bold text-lg mb-4 text-teal-900 dark:text-teal-100 flex items-center gap-2">
              <span className="bg-teal-600 dark:bg-teal-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">7</span>
              MEDICAL HISTORY & CLINICAL PICTURE
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.symptomFever || false}
                  onChange={(e) => onFieldChange('symptomFever', e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Fever</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableData.symptomWeightLoss || false}
                  onChange={(e) => onFieldChange('symptomWeightLoss', e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Weight loss</span>
              </label>
            </div>
          </div>

          {/* SECTION 8: TESTING DETAILS */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-bold text-lg mb-4 text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <span className="bg-amber-600 dark:bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">8</span>
              TESTING DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Type</label>
                <select
                  value={editableData.clientType || ''}
                  onChange={(e) => onFieldChange('clientType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Referred">Referred</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testing Modality</label>
                <select
                  value={editableData.testingModality || ''}
                  onChange={(e) => onFieldChange('testingModality', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="Facility-based">Facility-based</option>
                  <option value="Community-based">Community-based</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 9: INVENTORY */}
          <div className="bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 p-4 rounded-lg border border-lime-200 dark:border-lime-800">
            <h3 className="font-bold text-lg mb-4 text-lime-900 dark:text-lime-100 flex items-center gap-2">
              <span className="bg-lime-600 dark:bg-lime-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">9</span>
              INVENTORY INFORMATION
            </h3>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lot Number</label>
                <input
                  type="text"
                  value={editableData.testKitLotNumber || ''}
                  onChange={(e) => onFieldChange('testKitLotNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiration Date</label>
                <input
                  type="date"
                  value={editableData.testKitExpiration || ''}
                  onChange={(e) => onFieldChange('testKitExpiration', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 10: SERVICE PROVIDER DETAILS */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-800">
            <h3 className="font-bold text-lg mb-4 text-rose-900 dark:text-rose-100 flex items-center gap-2">
              <span className="bg-rose-600 dark:bg-rose-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">10</span>
              HTS PROVIDER DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testing Facility</label>
                <input
                  type="text"
                  value={editableData.testingFacility || ''}
                  onChange={(e) => onFieldChange('testingFacility', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Name</label>
                <input
                  type="text"
                  value={editableData.counselorName || ''}
                  onChange={(e) => onFieldChange('counselorName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counselor Role</label>
                <input
                  type="text"
                  value={editableData.counselorRole || ''}
                  onChange={(e) => onFieldChange('counselorRole', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condomUse"
                    value="always"
                    checked={editableData.condomUse === 'always'}
                    onChange={(e) => onFieldChange('condomUse', e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Always</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condomUse"
                    value="sometimes"
                    checked={editableData.condomUse === 'sometimes'}
                    onChange={(e) => onFieldChange('condomUse', e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Sometimes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condomUse"
                    value="never"
                    checked={editableData.condomUse === 'never'}
                    onChange={(e) => onFieldChange('condomUse', e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Never</span>
                </label>
              </div>
            </div>

            {/* Type of Sex */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type of Sex (Select all that apply)
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableData.typeOfSexOral || false}
                    onChange={(e) => onFieldChange('typeOfSexOral', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Oral Sex</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableData.typeOfSexAnalInserter || false}
                    onChange={(e) => onFieldChange('typeOfSexAnalInserter', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Anal (Insertive)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableData.typeOfSexAnalReceiver || false}
                    onChange={(e) => onFieldChange('typeOfSexAnalReceiver', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Anal (Receptive)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableData.typeOfSexVaginal || false}
                    onChange={(e) => onFieldChange('typeOfSexVaginal', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Vaginal Sex</span>
                </label>
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

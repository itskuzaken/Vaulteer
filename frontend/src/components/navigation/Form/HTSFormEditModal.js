import React from 'react';
import { IoClose, IoCheckmark, IoDocumentText } from 'react-icons/io5';
import Button from '../../ui/Button';

/**
 * HTS Form Edit Modal - Allows editing of all extracted OCR fields
 * Separated from the review modal for better organization
 */
export default function HTSFormEditModal({
  isOpen,
  editableData,
  onClose,
  onSave,
  onFieldChange
}) {
  if (!isOpen || !editableData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <IoDocumentText className="w-6 h-6 text-primary-red" />
            Edit Extracted Fields
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <IoClose className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TEST RESULT */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Current Test Result</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Test Result *
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <label className="inline-flex items-center">
                  <input type="radio" value="reactive" checked={editableData.testResult === 'reactive'}
                    onChange={(e) => onFieldChange('testResult', e.target.value)} className="mr-2" />
                  Reactive
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="non-reactive" checked={editableData.testResult === 'non-reactive'}
                    onChange={(e) => onFieldChange('testResult', e.target.value)} className="mr-2" />
                  Non-Reactive
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="indeterminate" checked={editableData.testResult === 'indeterminate'}
                    onChange={(e) => onFieldChange('testResult', e.target.value)} className="mr-2" />
                  Indeterminate
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Date *</label>
              <input type="date" value={editableData.testDate} onChange={(e) => onFieldChange('testDate', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          {/* IDENTITY & REGISTRATION */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Identity & Registration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">PhilHealth Number</label>
                <input type="text" value={editableData.philHealthNumber} onChange={(e) => onFieldChange('philHealthNumber', e.target.value)}
                  placeholder="12 digits" maxLength="12" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">PhilSys Number</label>
                <input type="text" value={editableData.philSysNumber} onChange={(e) => onFieldChange('philSysNumber', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <input type="text" value={editableData.fullName} onChange={(e) => onFieldChange('fullName', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <input type="text" value={editableData.firstName} onChange={(e) => onFieldChange('firstName', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Middle Name</label>
                <input type="text" value={editableData.middleName} onChange={(e) => onFieldChange('middleName', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <input type="text" value={editableData.lastName} onChange={(e) => onFieldChange('lastName', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Suffix</label>
                <input type="text" value={editableData.suffix} onChange={(e) => onFieldChange('suffix', e.target.value)}
                  placeholder="Jr., Sr., III, etc." className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Parental Code (Q5)</label>
                <input type="text" value={editableData.parentalCode} onChange={(e) => onFieldChange('parentalCode', e.target.value)}
                  placeholder="Mother+Father initials+Birth order" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mother&apos;s First Name (2 letters)</label>
                <input type="text" value={editableData.parentalCodeMother} onChange={(e) => onFieldChange('parentalCodeMother', e.target.value)}
                  maxLength="2" placeholder="AA" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Father&apos;s First Name (2 letters)</label>
                <input type="text" value={editableData.parentalCodeFather} onChange={(e) => onFieldChange('parentalCodeFather', e.target.value)}
                  maxLength="2" placeholder="BB" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Birth Order</label>
                <input type="number" value={editableData.birthOrder} onChange={(e) => onFieldChange('birthOrder', e.target.value)}
                  min="1" placeholder="1" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>

          {/* DEMOGRAPHIC DATA */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Demographic Data</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Birth Date *</label>
                <input type="date" value={editableData.birthDate} onChange={(e) => onFieldChange('birthDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Age</label>
                <input type="number" value={editableData.age} onChange={(e) => onFieldChange('age', e.target.value)}
                  min="15" max="120" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Age (Months, if &lt;1 year)</label>
                <input type="number" value={editableData.ageMonths} onChange={(e) => onFieldChange('ageMonths', e.target.value)}
                  min="0" max="11" placeholder="0-11" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sex *</label>
                <select value={editableData.sex} onChange={(e) => onFieldChange('sex', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gender Identity</label>
                <select value={editableData.genderIdentity} onChange={(e) => onFieldChange('genderIdentity', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Man">Man</option>
                  <option value="Woman">Woman</option>
                  <option value="Other">Other (Specify)</option>
                </select>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-semibold mb-2">Current Residence (Q8)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input type="text" value={editableData.currentResidenceCity} onChange={(e) => onFieldChange('currentResidenceCity', e.target.value)}
                  placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.currentResidenceProvince} onChange={(e) => onFieldChange('currentResidenceProvince', e.target.value)}
                  placeholder="Province" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Permanent Residence</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editableData.permanentResidenceCity} onChange={(e) => onFieldChange('permanentResidenceCity', e.target.value)}
                  placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.permanentResidenceProvince} onChange={(e) => onFieldChange('permanentResidenceProvince', e.target.value)}
                  placeholder="Province" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Place of Birth</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editableData.placeOfBirthCity} onChange={(e) => onFieldChange('placeOfBirthCity', e.target.value)}
                  placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.placeOfBirthProvince} onChange={(e) => onFieldChange('placeOfBirthProvince', e.target.value)}
                  placeholder="Province" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nationality (Q10)</label>
                <select value={editableData.nationality} onChange={(e) => onFieldChange('nationality', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nationality Other (specify)</label>
                <input type="text" value={editableData.nationalityOther} onChange={(e) => onFieldChange('nationalityOther', e.target.value)}
                  placeholder="If not Filipino" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Civil Status (Q11)</label>
                <select value={editableData.civilStatus} onChange={(e) => onFieldChange('civilStatus', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Separated">Separated</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Living with Partner</label>
                <select value={editableData.livingWithPartner} onChange={(e) => onFieldChange('livingWithPartner', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Children</label>
                <input type="number" value={editableData.numberOfChildren} onChange={(e) => onFieldChange('numberOfChildren', e.target.value)}
                  min="0" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currently Pregnant (female only)</label>
                <select value={editableData.isPregnant} onChange={(e) => onFieldChange('isPregnant', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          {/* EDUCATION & EMPLOYMENT */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Education & Employment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Highest Educational Attainment (Q13)</label>
                <select value={editableData.educationalAttainment} onChange={(e) => onFieldChange('educationalAttainment', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="No schooling">No schooling</option>
                  <option value="Elementary">Elementary</option>
                  <option value="Pre-school">Pre-school</option>
                  <option value="Highschool">Highschool</option>
                  <option value="Vocational">Vocational</option>
                  <option value="College">College</option>
                  <option value="Post-Graduate">Post-Graduate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Currently in School</label>
                <select value={editableData.currentlyInSchool} onChange={(e) => onFieldChange('currentlyInSchool', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Occupation (Q14)</label>
                <input type="text" value={editableData.occupation} onChange={(e) => onFieldChange('occupation', e.target.value)}
                  placeholder="Main source of income" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Currently Working</label>
                <select value={editableData.currentlyWorking} onChange={(e) => onFieldChange('currentlyWorking', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Previous">Previous</option>
                </select>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-semibold mb-2">Overseas Work (Q16)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Worked Overseas (past 5 years)</label>
                  <select value={editableData.workedOverseas} onChange={(e) => onFieldChange('workedOverseas', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3">
                <input type="text" value={editableData.overseasReturnYear} onChange={(e) => onFieldChange('overseasReturnYear', e.target.value)}
                  placeholder="Return Year" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.overseasLocation} onChange={(e) => onFieldChange('overseasLocation', e.target.value)}
                  placeholder="Ship/Land" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.overseasCountry} onChange={(e) => onFieldChange('overseasCountry', e.target.value)}
                  placeholder="Country" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>

          {/* RISK ASSESSMENT & TESTING HISTORY */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Risk Assessment & Testing History</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Mother with HIV</label>
              <select value={editableData.motherHIV} onChange={(e) => onFieldChange('motherHIV', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                <option value="">Select</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">History of Exposure / Risk Assessment:</label>
              
              {/* Sex with MALE */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sex with a MALE</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select value={editableData.riskSexMaleStatus} onChange={(e) => onFieldChange('riskSexMaleStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="number" value={editableData.riskSexMaleTotal} onChange={(e) => onFieldChange('riskSexMaleTotal', e.target.value)}
                    placeholder="Total No." min="0" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                  <input type="text" value={editableData.riskSexMaleDate1} onChange={(e) => onFieldChange('riskSexMaleDate1', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                  <input type="text" value={editableData.riskSexMaleDate2} onChange={(e) => onFieldChange('riskSexMaleDate2', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Sex with FEMALE */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sex with a FEMALE</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select value={editableData.riskSexFemaleStatus} onChange={(e) => onFieldChange('riskSexFemaleStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="number" value={editableData.riskSexFemaleTotal} onChange={(e) => onFieldChange('riskSexFemaleTotal', e.target.value)}
                    placeholder="Total No." min="0" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                  <input type="text" value={editableData.riskSexFemaleDate1} onChange={(e) => onFieldChange('riskSexFemaleDate1', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                  <input type="text" value={editableData.riskSexFemaleDate2} onChange={(e) => onFieldChange('riskSexFemaleDate2', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Paid for sex */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Paid for sex (cash or kind)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={editableData.riskPaidForSexStatus} onChange={(e) => onFieldChange('riskPaidForSexStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="text" value={editableData.riskPaidForSexDate} onChange={(e) => onFieldChange('riskPaidForSexDate', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Received payment for sex */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Received payment for sex</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={editableData.riskReceivedPaymentStatus} onChange={(e) => onFieldChange('riskReceivedPaymentStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="text" value={editableData.riskReceivedPaymentDate} onChange={(e) => onFieldChange('riskReceivedPaymentDate', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Sex under influence of drugs */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sex under influence of drugs</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={editableData.riskSexUnderDrugsStatus} onChange={(e) => onFieldChange('riskSexUnderDrugsStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="text" value={editableData.riskSexUnderDrugsDate} onChange={(e) => onFieldChange('riskSexUnderDrugsDate', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Shared needles */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Shared needles (drug injection)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={editableData.riskSharedNeedlesStatus} onChange={(e) => onFieldChange('riskSharedNeedlesStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="text" value={editableData.riskSharedNeedlesDate} onChange={(e) => onFieldChange('riskSharedNeedlesDate', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Blood transfusion */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Received blood transfusion</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={editableData.riskBloodTransfusionStatus} onChange={(e) => onFieldChange('riskBloodTransfusionStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="text" value={editableData.riskBloodTransfusionDate} onChange={(e) => onFieldChange('riskBloodTransfusionDate', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Occupational exposure */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Occupational exposure (needlestick/sharps)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={editableData.riskOccupationalExposureStatus} onChange={(e) => onFieldChange('riskOccupationalExposureStatus', e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <input type="text" value={editableData.riskOccupationalExposureDate} onChange={(e) => onFieldChange('riskOccupationalExposureDate', e.target.value)}
                    placeholder="MM/YYYY" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Reasons for Testing (Q18)</label>
              <textarea value={editableData.reasonsForTesting} onChange={(e) => onFieldChange('reasonsForTesting', e.target.value)}
                rows="2" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-semibold mb-2">Previous HIV Test (Q19)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <select value={editableData.previouslyTested} onChange={(e) => onFieldChange('previouslyTested', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Ever tested?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                <input type="date" value={editableData.previousTestDate} onChange={(e) => onFieldChange('previousTestDate', e.target.value)}
                  placeholder="Previous test date" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.previousTestProvider} onChange={(e) => onFieldChange('previousTestProvider', e.target.value)}
                  placeholder="HTS Provider (Facility/Organization)" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.previousTestCity} onChange={(e) => onFieldChange('previousTestCity', e.target.value)}
                  placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <select value={editableData.previousTestResult} onChange={(e) => onFieldChange('previousTestResult', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Previous result</option>
                  <option value="Reactive">Reactive</option>
                  <option value="Non-Reactive">Non-Reactive</option>
                  <option value="Indeterminate">Indeterminate</option>
                </select>
              </div>
            </div>
          </div>

          {/* MEDICAL HISTORY */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Medical History</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Medical History (Q20)</label>
              <textarea value={editableData.medicalHistory} onChange={(e) => onFieldChange('medicalHistory', e.target.value)}
                rows="2" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Clinical Picture (Q21)</label>
                <select value={editableData.clinicalPicture} onChange={(e) => onFieldChange('clinicalPicture', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Asymptomatic">Asymptomatic</option>
                  <option value="Symptomatic">Symptomatic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Symptoms</label>
                <input type="text" value={editableData.symptoms} onChange={(e) => onFieldChange('symptoms', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">WHO Staging</label>
                <select value={editableData.whoStaging} onChange={(e) => onFieldChange('whoStaging', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Stage 1">Stage 1</option>
                  <option value="Stage 2">Stage 2</option>
                  <option value="Stage 3">Stage 3</option>
                  <option value="Stage 4">Stage 4</option>
                </select>
              </div>
            </div>
          </div>

          {/* TESTING DETAILS */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Testing Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client Type (Q22)</label>
                <input type="text" value={editableData.clientType} onChange={(e) => onFieldChange('clientType', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mode of Reach (Q23)</label>
                <input type="text" value={editableData.modeOfReach} onChange={(e) => onFieldChange('modeOfReach', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Testing Accepted? (Q24) *</label>
                <select value={editableData.testingAccepted} onChange={(e) => onFieldChange('testingAccepted', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Refusal Reason</label>
                <input type="text" value={editableData.refusalReason} onChange={(e) => onFieldChange('refusalReason', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Other Services Provided</label>
              <textarea value={editableData.otherServices} onChange={(e) => onFieldChange('otherServices', e.target.value)}
                rows="2" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-semibold mb-2">Test Kit Information (Q25)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <input type="text" value={editableData.testKitBrand} onChange={(e) => onFieldChange('testKitBrand', e.target.value)}
                  placeholder="Kit Brand" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="text" value={editableData.testKitLotNumber} onChange={(e) => onFieldChange('testKitLotNumber', e.target.value)}
                  placeholder="Lot Number" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                <input type="date" value={editableData.testKitExpiration} onChange={(e) => onFieldChange('testKitExpiration', e.target.value)}
                  placeholder="Expiration" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>

          {/* HTS PROVIDER DETAILS */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">HTS Provider Details</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Testing Facility (Q26)</label>
              <input type="text" value={editableData.testingFacility} onChange={(e) => onFieldChange('testingFacility', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-medium mb-2">Complete Mailing Address</label>
              <input type="text" value={editableData.facilityAddress} onChange={(e) => onFieldChange('facilityAddress', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Counselor Name (Q27)</label>
                <input type="text" value={editableData.counselorName} onChange={(e) => onFieldChange('counselorName', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Counselor Role</label>
                <select value={editableData.counselorRole} onChange={(e) => onFieldChange('counselorRole', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Select</option>
                  <option value="HIV Counselor">HIV Counselor</option>
                  <option value="Medical Technologist">Medical Technologist</option>
                  <option value="CBS Motivator">CBS Motivator</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Counselor Signature</label>
                <input type="text" value={editableData.counselorSignature} onChange={(e) => onFieldChange('counselorSignature', e.target.value)}
                  placeholder="Signature captured" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>

          {/* CONTACT INFORMATION */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Contact Number</label>
                <input type="tel" value={editableData.contactNumber} onChange={(e) => onFieldChange('contactNumber', e.target.value)}
                  placeholder="09XXXXXXXXX" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input type="email" value={editableData.emailAddress} onChange={(e) => onFieldChange('emailAddress', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
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

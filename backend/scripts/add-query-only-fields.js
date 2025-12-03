#!/usr/bin/env node
/**
 * Add Query-Only Fields to Template Metadata
 * 
 * Adds the 46 missing query-only fields to template-metadata.json
 * These fields rely entirely on AWS Textract Queries API without coordinate fallback
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

// Query-only fields to add (no coordinate regions, extraction via queries only)
const queryOnlyFields = {
  front: {
    contactNumber: {
      label: 'Contact Number',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What are the contact numbers for the patient?'
    },
    emailAddress: {
      label: 'Email Address',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the email address of the patient?'
    },
    parentalCodeMother: {
      label: "Mother's First Name (First 2 letters)",
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: "What are the first 2 letters of mother's first name?"
    },
    occupation: {
      label: 'Occupation',
      type: 'text',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: "What is the patient's current or previous occupation?"
    },
    overseasReturnYear: {
      label: 'Overseas Return Year',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If the patient worked overseas, what year did they return from their last contract?'
    },
    overseasLocation: {
      label: 'Overseas Location',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'Where was the patient based while working overseas - on a ship or on land?'
    },
    overseasCountry: {
      label: 'Overseas Country',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What country did the patient last work in while overseas?'
    }
  },
  back: {
    motherHIV: {
      label: "Mother's HIV Status",
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Is the mother of the patient known to have HIV?'
    },
    riskSexMaleStatus: {
      label: 'Sex with Male - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient had sex with a male partner? Answer Yes or No'
    },
    riskSexMaleTotal: {
      label: 'Sex with Male - Total',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex with male, what is the total number?'
    },
    riskSexMaleDate1: {
      label: 'Sex with Male - Date 1',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex with male, what is the first date in MM/YYYY format?'
    },
    riskSexMaleDate2: {
      label: 'Sex with Male - Date 2',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex with male, what is the second date in MM/YYYY format?'
    },
    riskSexFemaleStatus: {
      label: 'Sex with Female - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient had sex with a female partner? Answer Yes or No'
    },
    riskSexFemaleTotal: {
      label: 'Sex with Female - Total',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex with female, what is the total number?'
    },
    riskSexFemaleDate1: {
      label: 'Sex with Female - Date 1',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex with female, what is the first date in MM/YYYY format?'
    },
    riskSexFemaleDate2: {
      label: 'Sex with Female - Date 2',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex with female, what is the second date in MM/YYYY format?'
    },
    riskPaidForSexStatus: {
      label: 'Paid for Sex - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient paid for sex in cash or kind? Answer Yes or No'
    },
    riskPaidForSexDate: {
      label: 'Paid for Sex - Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to paid for sex, what is the date in MM/YYYY format?'
    },
    riskReceivedPaymentStatus: {
      label: 'Received Payment for Sex - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient received payment for sex? Answer Yes or No'
    },
    riskReceivedPaymentDate: {
      label: 'Received Payment - Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to received payment, what is the date in MM/YYYY format?'
    },
    riskSexUnderDrugsStatus: {
      label: 'Sex Under Drugs - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient had sex under the influence of drugs? Answer Yes or No'
    },
    riskSexUnderDrugsDate: {
      label: 'Sex Under Drugs - Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to sex under drugs, what is the date in MM/YYYY format?'
    },
    riskSharedNeedlesStatus: {
      label: 'Shared Needles - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient shared needles for drug injection? Answer Yes or No'
    },
    riskSharedNeedlesDate: {
      label: 'Shared Needles - Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to shared needles, what is the date in MM/YYYY format?'
    },
    riskBloodTransfusionStatus: {
      label: 'Blood Transfusion - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient received blood transfusion? Answer Yes or No'
    },
    riskBloodTransfusionDate: {
      label: 'Blood Transfusion - Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to blood transfusion, what is the date in MM/YYYY format?'
    },
    riskOccupationalExposureStatus: {
      label: 'Occupational Exposure - Status',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient had occupational exposure to needlestick or sharps? Answer Yes or No'
    },
    riskOccupationalExposureDate: {
      label: 'Occupational Exposure - Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If yes to occupational exposure, what is the date in MM/YYYY format?'
    },
    previousTestDate: {
      label: 'Previous Test Date',
      type: 'date',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'If yes, when was the previous HIV test date?'
    },
    previousTestProvider: {
      label: 'Previous Test Provider',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'Which HTS provider or facility conducted the previous test?'
    },
    previousTestCity: {
      label: 'Previous Test City',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'In what city or municipality was the previous test conducted?'
    },
    medicalTB: {
      label: 'Current TB Patient',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Is the patient a current TB patient?'
    },
    medicalSTI: {
      label: 'Other STIs',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient been diagnosed with other STIs?'
    },
    medicalPEP: {
      label: 'Taken PEP',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Has the patient taken PEP (Post-Exposure Prophylaxis)?'
    },
    medicalPrEP: {
      label: 'Taking PrEP',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Is the patient currently taking PrEP (Pre-Exposure Prophylaxis)?'
    },
    medicalHepatitisB: {
      label: 'Hepatitis B',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Does the patient have hepatitis B?'
    },
    medicalHepatitisC: {
      label: 'Hepatitis C',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'Does the patient have hepatitis C?'
    },
    testingModality: {
      label: 'Testing Modality',
      type: 'checkbox',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'What HIV testing modality was used - Facility-based, Non-laboratory, Community-based, or Self-testing?'
    },
    linkageToCare: {
      label: 'Linkage to Care',
      type: 'text',
      required: false,
      priority: 2,
      extractionMethod: 'query-only',
      query: 'What is the linkage to care plan for the patient after testing? - Refer to ART, Advised for retesting, Refer for Confirmatory Testing, or Suggested date:(MM/DD/YYYY)'
    },
    testingRefusedReason: {
      label: 'Refusal Reason',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'If testing was refused, what was the reason?'
    },
    facilityContactNumber: {
      label: 'Facility Contact Number',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What are the contact numbers for the testing facility?'
    },
    facilityEmail: {
      label: 'Facility Email',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the email address of the testing facility?'
    },
    facilityCode: {
      label: 'Facility Code',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the facility code or identifier?'
    },
    facilityRegion: {
      label: 'Facility Region',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What region is the testing facility located in?'
    },
    facilityProvince: {
      label: 'Facility Province',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What province is the testing facility located in?'
    },
    facilityCity: {
      label: 'Facility City',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What city or municipality is the testing facility located in?'
    },
    formCompletionDate: {
      label: 'Form Completion Date',
      type: 'date',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the date when the form was completed?'
    },
    counselorLicense: {
      label: 'Counselor License',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the license number of the counselor or service provider?'
    },
    counselorDesignation: {
      label: 'Counselor Designation',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the designation or position of the service provider?'
    },
    counselorContact: {
      label: 'Counselor Contact',
      type: 'text',
      required: false,
      priority: 3,
      extractionMethod: 'query-only',
      query: 'What is the contact number of the service provider?'
    }
  }
};

// Add fields to metadata
console.log('Adding query-only fields to template metadata...\n');

let addedCount = 0;

// Add front page fields
for (const [fieldName, fieldConfig] of Object.entries(queryOnlyFields.front)) {
  if (!metadata.ocrMapping.front.fields[fieldName]) {
    metadata.ocrMapping.front.fields[fieldName] = fieldConfig;
    console.log(`✅ Added front.${fieldName}`);
    addedCount++;
  } else {
    console.log(`⏭️  Skipped front.${fieldName} (already exists)`);
  }
}

// Add back page fields
for (const [fieldName, fieldConfig] of Object.entries(queryOnlyFields.back)) {
  if (!metadata.ocrMapping.back.fields[fieldName]) {
    metadata.ocrMapping.back.fields[fieldName] = fieldConfig;
    console.log(`✅ Added back.${fieldName}`);
    addedCount++;
  } else {
    console.log(`⏭️  Skipped back.${fieldName} (already exists)`);
  }
}

// Save updated metadata
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log(`\n✅ Added ${addedCount} query-only fields to template metadata`);
console.log(`📄 Updated: ${metadataPath}`);
console.log(`\nRun validation again: node scripts/validate-ocr-mappings.js`);

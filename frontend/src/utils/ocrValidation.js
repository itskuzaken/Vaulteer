/**
 * OCR Validation and Pattern Matching Utilities
 * Validates and corrects OCR-extracted field values
 */

// Philippines Municipalities Database (comprehensive list)
const PHILIPPINES_MUNICIPALITIES = [
  'Manila', 'Quezon City', 'Caloocan', 'Davao City', 'Cebu City',
  'Zamboanga City', 'Taguig', 'Antipolo', 'Pasig', 'Cagayan de Oro',
  'Parañaque', 'Valenzuela', 'Bacoor', 'General Santos', 'Las Piñas',
  'Makati', 'Bacolod', 'Muntinlupa', 'San Jose del Monte', 'Iloilo City',
  'Dasmariñas', 'Marikina', 'Mandaluyong', 'San Pedro', 'Calamba',
  'Tarlac City', 'Baguio', 'Biñan', 'Lucena', 'Iligan',
  'Malabon', 'Mandaue', 'Butuan', 'Angeles', 'Lapu-Lapu',
  'San Fernando', 'Cainta', 'Batangas City', 'Navotas', 'Imus',
  'Lipa', 'Legazpi', 'Taytay', 'Naga', 'Malolos',
  'San Mateo', 'Puerto Princesa', 'General Trias', 'Cabanatuan',
  'Meycauayan', 'Silang', 'Santa Rosa', 'Baliuag', 'Rodriguez',
  'Cavite City', 'Olongapo', 'Mabalacat', 'Tacloban', 'Tagum',
  'Cabuyao', 'Gapan', 'Tanza', 'Cotabato City', 'Sorsogon City',
  'Santa Maria', 'Marilao', 'San Jose', 'Koronadal', 'Roxas City',
  'Ormoc', 'Dumaguete', 'Kidapawan', 'Digos', 'Pagadian',
  'Valencia', 'San Pablo', 'Tagaytay', 'Malaybalay', 'San Carlos',
  'Panabo', 'Marawi', 'Surigao City', 'Tuguegarao', 'Dipolog',
  'San Juan', 'Pasay', 'Zamboanga del Sur', 'Isabela', 'Calbayog',
  'Sagay', 'Tabuk', 'Bogo', 'Tandag', 'Toledo', 'Borongan'
];

// Common Testing Facilities
const TESTING_FACILITIES = [
  'Research Institute for Tropical Medicine',
  'RITM',
  'San Lazaro Hospital',
  'Lung Center of the Philippines',
  'Philippine General Hospital',
  'PGH',
  'Vicente Sotto Memorial Medical Center',
  'Southern Philippines Medical Center',
  'East Avenue Medical Center',
  'Philippine Heart Center',
  'National Kidney and Transplant Institute',
  'Dr. Jose N. Rodriguez Memorial Hospital',
  'Ospital ng Maynila Medical Center',
  'Quezon City General Hospital',
  'Makati Medical Center',
  'St. Luke\'s Medical Center',
  'Manila Doctors Hospital',
  'Chinese General Hospital',
  'Medical City',
  'Asian Hospital and Medical Center'
];

// Field Patterns
const PATTERNS = {
  control_number: /^[A-Z]{2,4}\d{6,10}$/i,
  date: /^\d{2}[-/]\d{2}[-/]\d{4}$/,
  phone: /^(09|\+639)\d{9}$/,
  philhealth: /^\d{2}-\d{9}-\d$/,
  age: /^\d{1,3}$/,
  sex: /^(M|F|Male|Female)$/i,
  test_result: /^(Positive|Negative|Pending|Inconclusive)$/i
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find closest match from a list using fuzzy matching
 */
function findClosestMatch(value, validOptions, threshold = 0.3) {
  if (!value || !validOptions.length) return null;
  
  let bestMatch = null;
  let bestScore = Infinity;
  
  for (const option of validOptions) {
    const distance = levenshteinDistance(
      value.toLowerCase(),
      option.toLowerCase()
    );
    const maxLength = Math.max(value.length, option.length);
    const similarity = 1 - (distance / maxLength);
    
    if (similarity >= (1 - threshold) && distance < bestScore) {
      bestMatch = option;
      bestScore = distance;
    }
  }
  
  return bestMatch;
}

/**
 * Validate control number format
 */
function validateControlNumber(value) {
  if (!value) return { isValid: false, corrected: null };
  
  // Remove common OCR errors (spaces, O->0, I->1)
  let cleaned = value.replace(/\s/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1');
  
  const isValid = PATTERNS.control_number.test(cleaned);
  
  return {
    isValid,
    corrected: isValid ? cleaned.toUpperCase() : null,
    confidence: isValid ? 0.95 : 0.3
  };
}

/**
 * Validate and normalize date format
 */
function validateDate(value) {
  if (!value) return { isValid: false, corrected: null };
  
  // Try to parse various date formats
  let cleaned = value.replace(/\s/g, '');
  
  // Convert common OCR errors
  cleaned = cleaned.replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/l/g, '1');
  
  // Try MM-DD-YYYY or MM/DD/YYYY
  const match = cleaned.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  
  if (match) {
    const [, month, day, year] = match;
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const yearNum = parseInt(year);
    
    // Basic validation
    if (monthNum >= 1 && monthNum <= 12 && 
        dayNum >= 1 && dayNum <= 31 &&
        yearNum >= 1900 && yearNum <= 2100) {
      return {
        isValid: true,
        corrected: `${month}/${day}/${year}`,
        confidence: 0.9
      };
    }
  }
  
  return { isValid: false, corrected: null, confidence: 0.2 };
}

/**
 * Validate phone number
 */
function validatePhone(value) {
  if (!value) return { isValid: false, corrected: null };
  
  // Clean up
  let cleaned = value.replace(/[\s\-()]/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1');
  
  // Try to match Philippine mobile format
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return {
      isValid: true,
      corrected: cleaned,
      confidence: 0.9
    };
  }
  
  if (cleaned.startsWith('+639') && cleaned.length === 13) {
    return {
      isValid: true,
      corrected: cleaned,
      confidence: 0.9
    };
  }
  
  // Try to fix common patterns
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
    return {
      isValid: true,
      corrected: cleaned,
      confidence: 0.7
    };
  }
  
  return { isValid: false, corrected: null, confidence: 0.2 };
}

/**
 * Validate PhilHealth number
 */
function validatePhilHealth(value) {
  if (!value) return { isValid: false, corrected: null };
  
  let cleaned = value.replace(/\s/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1');
  
  // Format: XX-XXXXXXXXX-X
  const match = cleaned.match(/(\d{2})-?(\d{9})-?(\d)/);
  
  if (match) {
    const formatted = `${match[1]}-${match[2]}-${match[3]}`;
    return {
      isValid: true,
      corrected: formatted,
      confidence: 0.85
    };
  }
  
  return { isValid: false, corrected: null, confidence: 0.2 };
}

/**
 * Validate address using fuzzy matching against municipality database
 */
function validateAddress(value) {
  if (!value || value.length < 3) {
    return { isValid: false, corrected: null, confidence: 0.1 };
  }
  
  const closestMatch = findClosestMatch(value, PHILIPPINES_MUNICIPALITIES, 0.25);
  
  if (closestMatch) {
    return {
      isValid: true,
      corrected: closestMatch,
      confidence: 0.8,
      suggestion: closestMatch
    };
  }
  
  return { isValid: false, corrected: null, confidence: 0.3 };
}

/**
 * Validate testing facility
 */
function validateTestingFacility(value) {
  if (!value || value.length < 5) {
    return { isValid: false, corrected: null, confidence: 0.1 };
  }
  
  const closestMatch = findClosestMatch(value, TESTING_FACILITIES, 0.3);
  
  if (closestMatch) {
    return {
      isValid: true,
      corrected: closestMatch,
      confidence: 0.75,
      suggestion: closestMatch
    };
  }
  
  return { isValid: false, corrected: value, confidence: 0.4 };
}

/**
 * Validate test result
 */
function validateTestResult(value) {
  if (!value) return { isValid: false, corrected: null };
  
  const validResults = ['Positive', 'Negative', 'Pending', 'Inconclusive'];
  const closestMatch = findClosestMatch(value, validResults, 0.25);
  
  if (closestMatch) {
    return {
      isValid: true,
      corrected: closestMatch,
      confidence: 0.9
    };
  }
  
  return { isValid: false, corrected: null, confidence: 0.2 };
}

/**
 * Validate age
 */
function validateAge(value) {
  if (!value) return { isValid: false, corrected: null };
  
  let cleaned = value.replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/[^\d]/g, '');
  
  const age = parseInt(cleaned);
  
  if (!isNaN(age) && age >= 0 && age <= 120) {
    return {
      isValid: true,
      corrected: age.toString(),
      confidence: 0.95
    };
  }
  
  return { isValid: false, corrected: null, confidence: 0.2 };
}

/**
 * Validate sex/gender
 */
function validateSex(value) {
  if (!value) return { isValid: false, corrected: null };
  
  const cleaned = value.trim().toUpperCase();
  
  if (cleaned === 'M' || cleaned === 'MALE') {
    return { isValid: true, corrected: 'M', confidence: 0.95 };
  }
  
  if (cleaned === 'F' || cleaned === 'FEMALE') {
    return { isValid: true, corrected: 'F', confidence: 0.95 };
  }
  
  return { isValid: false, corrected: null, confidence: 0.2 };
}

/**
 * Main validation function - validates all fields in extracted data
 */
export function validateAndCorrectFields(extractedData) {
  const validations = {};
  
  // Map field names to validation functions
  const fieldValidators = {
    control_number: validateControlNumber,
    collection_date: validateDate,
    date_released: validateDate,
    date_received: validateDate,
    contact_number: validatePhone,
    philhealth_number: validatePhilHealth,
    address: validateAddress,
    testing_facility: validateTestingFacility,
    test_result: validateTestResult,
    age: validateAge,
    sex: validateSex
  };
  
  // Validate each field
  for (const [fieldName, value] of Object.entries(extractedData)) {
    const validator = fieldValidators[fieldName];
    
    if (validator && value) {
      const result = validator(value);
      
      validations[fieldName] = {
        original: value,
        ...result
      };
    }
  }
  
  return validations;
}

/**
 * Get validation summary statistics
 */
export function getValidationSummary(validations) {
  const total = Object.keys(validations).length;
  const valid = Object.values(validations).filter(v => v.isValid).length;
  const corrected = Object.values(validations).filter(v => v.corrected && v.corrected !== v.original).length;
  const avgConfidence = Object.values(validations)
    .reduce((sum, v) => sum + (v.confidence || 0), 0) / total;
  
  return {
    total,
    valid,
    corrected,
    avgConfidence: Math.round(avgConfidence * 100),
    validPercentage: Math.round((valid / total) * 100)
  };
}

const ocrValidation = {
  validateAndCorrectFields,
  getValidationSummary,
  PHILIPPINES_MUNICIPALITIES,
  TESTING_FACILITIES
};

export default ocrValidation;

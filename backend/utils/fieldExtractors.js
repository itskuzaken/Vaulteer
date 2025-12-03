/**
 * Specialized Field Extractors
 * Philippine-specific field extraction and validation utilities
 */

/**
 * Extract and validate PhilHealth number
 * Format: XX-XXXXXXXXX-X (12 digits with dashes)
 * @param {string} text - Raw text
 * @returns {Object} { value, confidence, valid }
 */
function extractPhilHealthNumber(text) {
  if (!text) return { value: null, confidence: 0, valid: false };

  // Remove spaces and normalize
  const cleaned = text.replace(/\s+/g, '').replace(/[–—]/g, '-');
  
  // Pattern: 12 digits with optional dashes in format XX-XXXXXXXXX-X
  const patterns = [
    /(\d{2})-?(\d{9})-?(\d{1})/,
    /(\d{12})/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let digits;
      if (match[1] && match[2] && match[3]) {
        digits = match[1] + match[2] + match[3];
      } else {
        digits = match[1];
      }

      if (digits.length === 12) {
        const formatted = `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`;
        return {
          value: formatted,
          confidence: 0.95,
          valid: true,
          raw: text
        };
      }
    }
  }

  return { value: text, confidence: 0.3, valid: false };
}

/**
 * Extract and validate PhilSys number
 * Format: 16 digits (exactly, no more, no less)
 * @param {string} text - Raw text
 * @returns {Object} { value, confidence, valid }
 */
function extractPhilSysNumber(text) {
  if (!text) return { value: null, confidence: 0, valid: false };

  // Remove common OCR artifacts and separators
  const cleaned = text.replace(/\s+/g, '')
                      .replace(/[-–—]/g, '')
                      .replace(/[O]/g, '0')  // Common OCR mistake: O -> 0
                      .replace(/[I|l]/g, '1') // Common OCR mistakes: I/l -> 1
                      .replace(/[^\d]/g, '');  // Keep only digits
  
  // Must be exactly 16 digits (PhilHealth is 12, so this helps differentiate)
  if (cleaned.length === 16 && /^\d{16}$/.test(cleaned)) {
    return {
      value: cleaned,
      confidence: 0.95,
      valid: true,
      raw: text
    };
  }
  
  // Partial match with lower confidence
  const partialMatch = cleaned.match(/(\d{16})/);
  if (partialMatch) {
    return {
      value: partialMatch[1],
      confidence: 0.85,
      valid: true,
      raw: text
    };
  }

  // If it's close to 16 digits, return with low confidence
  if (cleaned.length >= 14 && cleaned.length <= 18 && /^\d+$/.test(cleaned)) {
    return {
      value: cleaned,
      confidence: 0.4,
      valid: false,
      raw: text,
      reason: `Expected 16 digits, got ${cleaned.length}`
    };
  }

  return { value: text, confidence: 0.3, valid: false };
}

/**
 * Extract and validate Philippine mobile number
 * Formats: 09XX-XXX-XXXX, +639XX-XXX-XXXX, 639XX-XXX-XXXX
 * @param {string} text - Raw text
 * @returns {Object} { value, confidence, valid }
 */
function extractPhilippineMobileNumber(text) {
  if (!text) return { value: null, confidence: 0, valid: false };

  const cleaned = text.replace(/\s+/g, '').replace(/[()]/g, '');

  const patterns = [
    /^(\+63|0)9(\d{2})(\d{3})(\d{4})$/,
    /^(\+63|0)9(\d{9})$/,
    /^639(\d{9})$/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // Normalize to 09XX-XXX-XXXX format
      let digits;
      if (match[1] === '+63' || match[1] === '63') {
        digits = '09' + (match[2] + (match[3] || '') + (match[4] || '')).slice(0, 9);
      } else {
        digits = '09' + (match[2] + (match[3] || '') + (match[4] || '')).slice(0, 9);
      }

      if (digits.length === 11 && digits.startsWith('09')) {
        const formatted = `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
        return {
          value: formatted,
          confidence: 0.90,
          valid: true,
          raw: text
        };
      }
    }
  }

  return { value: text, confidence: 0.3, valid: false };
}

/**
 * Extract and validate date fields
 * Supports multiple formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
 * @param {string} text - Raw text
 * @param {Object} options - { preferDMY: false }
 * @returns {Object} { value, confidence, valid, parsed }
 */
function extractDate(text, options = {}) {
  const { preferDMY = false } = options;
  
  if (!text) return { value: null, confidence: 0, valid: false };

  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Try various date patterns
  const patterns = [
    // ISO format
    { regex: /(\d{4})-(\d{2})-(\d{2})/, order: 'ymd' },
    // US format with slashes
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: preferDMY ? 'dmy' : 'mdy' },
    // Space-separated
    { regex: /(\d{1,2})\s+(\d{1,2})\s+(\d{4})/, order: preferDMY ? 'dmy' : 'mdy' },
    // Dash-separated
    { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/, order: preferDMY ? 'dmy' : 'mdy' }
  ];

  for (const { regex, order } of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      let year, month, day;

      if (order === 'ymd') {
        [, year, month, day] = match;
      } else if (order === 'mdy') {
        [, month, day, year] = match;
      } else if (order === 'dmy') {
        [, day, month, year] = match;
      }

      year = parseInt(year);
      month = parseInt(month);
      day = parseInt(day);

      // Validate ranges
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        
        // Check if date is valid (handles Feb 30, etc.)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          const formatted = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
          return {
            value: formatted,
            confidence: 0.90,
            valid: true,
            parsed: { year, month, day },
            raw: text
          };
        }
      }
    }
  }

  return { value: text, confidence: 0.3, valid: false };
}

/**
 * Extract age and validate against birthdate if provided
 * @param {string} text - Raw text
 * @param {Object} birthDate - Optional birthdate { year, month, day }
 * @returns {Object} { value, confidence, valid, warning }
 */
function extractAge(text, birthDate = null) {
  if (!text) return { value: null, confidence: 0, valid: false };

  const match = text.match(/(\d{1,3})/);
  if (!match) return { value: text, confidence: 0.3, valid: false };

  const age = parseInt(match[1]);

  // Validate reasonable age range
  if (age < 0 || age > 120) {
    return { value: text, confidence: 0.2, valid: false, warning: 'Age out of reasonable range' };
  }

  // Cross-validate with birthdate if provided
  if (birthDate) {
    const today = new Date();
    const birth = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
    const calculatedAge = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));

    if (Math.abs(calculatedAge - age) > 1) {
      return {
        value: age,
        confidence: 0.5,
        valid: false,
        warning: `Age (${age}) does not match birthdate (calculated: ${calculatedAge})`,
        calculatedAge
      };
    }
  }

  return {
    value: age,
    confidence: 0.90,
    valid: true
  };
}

/**
 * Validate and extract Philippine address components
 * @param {Object} addressFields - { region, province, city, barangay }
 * @returns {Object} Validated address with hierarchy check
 */
function validatePhilippineAddress(addressFields) {
  // Philippine regions
  const regions = {
    'NCR': ['Metro Manila', 'National Capital Region'],
    'CAR': ['Cordillera Administrative Region', 'CAR'],
    'Region I': ['Ilocos Region', 'Region 1'],
    'Region II': ['Cagayan Valley', 'Region 2'],
    'Region III': ['Central Luzon', 'Region 3'],
    'Region IV-A': ['CALABARZON', 'Region 4A'],
    'Region IV-B': ['MIMAROPA', 'Region 4B'],
    'Region V': ['Bicol Region', 'Region 5'],
    'Region VI': ['Western Visayas', 'Region 6'],
    'Region VII': ['Central Visayas', 'Region 7'],
    'Region VIII': ['Eastern Visayas', 'Region 8'],
    'Region IX': ['Zamboanga Peninsula', 'Region 9'],
    'Region X': ['Northern Mindanao', 'Region 10'],
    'Region XI': ['Davao Region', 'Region 11'],
    'Region XII': ['SOCCSKSARGEN', 'Region 12'],
    'Region XIII': ['Caraga', 'Region 13'],
    'BARMM': ['Bangsamoro', 'BARMM']
  };

  const result = {
    valid: true,
    warnings: [],
    region: addressFields.region,
    province: addressFields.province,
    city: addressFields.city,
    barangay: addressFields.barangay
  };

  // Basic validation: check if region is recognized
  if (addressFields.region) {
    const regionFound = Object.values(regions).some(aliases => 
      aliases.some(alias => 
        alias.toLowerCase().includes(addressFields.region.toLowerCase()) ||
        addressFields.region.toLowerCase().includes(alias.toLowerCase())
      )
    );

    if (!regionFound) {
      result.warnings.push(`Region "${addressFields.region}" not recognized`);
      result.valid = false;
    }
  }

  // Note: Full hierarchy validation would require a comprehensive Philippine
  // address database (PSGC). This is a simplified version.

  return result;
}

/**
 * Extract checkbox selections from text
 * @param {string} text - Raw text with checked indicators
 * @param {Array} options - Available options
 * @returns {Array} Selected options
 */
function extractCheckboxSelections(text, options) {
  if (!text) return [];

  const selected = [];
  const lowerText = text.toLowerCase();

  // Look for check indicators
  const checkIndicators = ['✓', '✔', 'x', '[x]', '(x)', 'yes', 'checked'];

  for (const option of options) {
    const lowerOption = option.toLowerCase();
    
    // Check if option appears with a check indicator nearby
    for (const indicator of checkIndicators) {
      const pattern = new RegExp(`${indicator}.*${lowerOption}|${lowerOption}.*${indicator}`, 'i');
      if (pattern.test(lowerText)) {
        selected.push(option);
        break;
      }
    }
  }

  return selected;
}

module.exports = {
  extractPhilHealthNumber,
  extractPhilSysNumber,
  extractPhilippineMobileNumber,
  extractDate,
  extractAge,
  validatePhilippineAddress,
  extractCheckboxSelections
};

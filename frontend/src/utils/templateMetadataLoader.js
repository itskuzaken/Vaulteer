/**
 * Template Metadata Loader for Frontend
 * Generates section mappings and field metadata from backend template-metadata.json
 * Ensures single source of truth between frontend and backend
 */

// Import template metadata from backend
// Note: In production, this should be fetched from API or bundled during build
let cachedMetadata = null;

/**
 * Load template metadata
 * @returns {Promise<Object>} Template metadata object
 */
export async function loadTemplateMetadata() {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  try {
    // In development, fetch from backend assets
    // In production, this should be bundled or fetched from API
    const response = await fetch('/api/template-metadata/hts');
    if (response.ok) {
      cachedMetadata = await response.json();
      return cachedMetadata;
    }
  } catch (error) {
    console.warn('[templateMetadataLoader] Failed to load from API, using inline fallback:', error.message);
  }

  // Fallback: return null and let components handle gracefully
  return null;
}

/**
 * Extract field names from section fields array
 * Handles both string fields and object fields with name property
 * Also extracts subfields and option variants
 * @param {Array} fields - Array of field definitions
 * @returns {Array<string>} Array of field names
 */
function extractFieldNames(fields) {
  if (!Array.isArray(fields)) return [];
  
  const fieldNames = [];
  
  fields.forEach(field => {
    // Handle string field names
    if (typeof field === 'string') {
      fieldNames.push(field);
      return;
    }
    
    // Handle object field definitions
    if (typeof field === 'object' && field !== null) {
      const fieldName = field.name || field.label;
      if (fieldName) {
        fieldNames.push(fieldName);
        
        // Extract subfields if present
        if (Array.isArray(field.subfields)) {
          field.subfields.forEach(subfield => {
            if (typeof subfield === 'string') {
              fieldNames.push(`${fieldName}${capitalizeFirst(subfield)}`);
            }
          });
        }
        
        // Extract option variants if present
        if (Array.isArray(field.options)) {
          field.options.forEach(option => {
            if (option.value) {
              const optionName = capitalizeFirst(option.value.replace(/[^a-zA-Z0-9]/g, ''));
              if (optionName) {
                fieldNames.push(`${fieldName}${optionName}`);
              }
            }
          });
        }
      }
    }
  });
  
  return fieldNames;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Build section mapping from template metadata
 * Mirrors backend buildSectionMappingFromMetadata() logic
 * @param {Object} metadata - Template metadata object
 * @returns {Object} Section mapping { sectionName: [fieldNames] }
 */
export function buildSectionMappingFromMetadata(metadata) {
  if (!metadata || !metadata.structure) {
    return {};
  }
  
  const mapping = {};
  
  // Process front page sections
  if (metadata.structure.front && metadata.structure.front.sections) {
    Object.entries(metadata.structure.front.sections).forEach(([sectionName, sectionData]) => {
      const fields = sectionData.fields || [];
      mapping[sectionName] = extractFieldNames(fields);
    });
  }
  
  // Process back page sections
  if (metadata.structure.back && metadata.structure.back.sections) {
    Object.entries(metadata.structure.back.sections).forEach(([sectionName, sectionData]) => {
      const fields = sectionData.fields || [];
      mapping[sectionName] = extractFieldNames(fields);
    });
  }
  
  return mapping;
}

/**
 * Get front page section names from metadata
 * @param {Object} metadata - Template metadata object
 * @returns {Array<string>} Array of front page section names
 */
export function getFrontPageSections(metadata) {
  if (!metadata || !metadata.structure || !metadata.structure.front || !metadata.structure.front.sections) {
    return [];
  }
  return Object.keys(metadata.structure.front.sections);
}

/**
 * Get back page section names from metadata
 * @param {Object} metadata - Template metadata object
 * @returns {Array<string>} Array of back page section names
 */
export function getBackPageSections(metadata) {
  if (!metadata || !metadata.structure || !metadata.structure.back || !metadata.structure.back.sections) {
    return [];
  }
  return Object.keys(metadata.structure.back.sections);
}

/**
 * Check if section is on front page
 * @param {Object} metadata - Template metadata object
 * @param {string} sectionName - Section name to check
 * @returns {boolean} True if section is on front page
 */
export function isFrontPageSection(metadata, sectionName) {
  if (!metadata || !metadata.structure || !metadata.structure.front || !metadata.structure.front.sections) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(metadata.structure.front.sections, sectionName);
}

/**
 * Get all field names from metadata
 * @param {Object} metadata - Template metadata object
 * @returns {Array<string>} Array of all field names
 */
export function getAllFieldNames(metadata) {
  const sectionMapping = buildSectionMappingFromMetadata(metadata);
  const allFields = new Set();
  
  Object.values(sectionMapping).forEach(fields => {
    fields.forEach(field => allFields.add(field));
  });
  
  return Array.from(allFields);
}

/**
 * Split sections into front and back page mappings
 * @param {Object} metadata - Template metadata object
 * @returns {Object} { frontPageSections: {}, backPageSections: {} }
 */
export function splitSectionsByPage(metadata) {
  if (!metadata || !metadata.structure) {
    return { frontPageSections: {}, backPageSections: {} };
  }
  
  const frontPageSections = {};
  const backPageSections = {};
  
  // Build front page sections
  if (metadata.structure.front && metadata.structure.front.sections) {
    Object.entries(metadata.structure.front.sections).forEach(([sectionName, sectionData]) => {
      const fields = sectionData.fields || [];
      frontPageSections[sectionName] = extractFieldNames(fields);
    });
  }
  
  // Build back page sections
  if (metadata.structure.back && metadata.structure.back.sections) {
    Object.entries(metadata.structure.back.sections).forEach(([sectionName, sectionData]) => {
      const fields = sectionData.fields || [];
      backPageSections[sectionName] = extractFieldNames(fields);
    });
  }
  
  return { frontPageSections, backPageSections };
}

// Compact fallback with top 3 critical sections for graceful degradation
const MINIMAL_FALLBACK = {
  'INFORMED CONSENT': ['nameAndSignature', 'contactNumber', 'emailAddress', 'verbalConsent'],
  'DEMOGRAPHIC DATA': ['testDate', 'philHealthNumber', 'firstName', 'lastName', 'birthDate', 'age', 'sex'],
  'TESTING DETAILS': ['clientType', 'testingModality', 'testingAccepted']
};

/**
 * Get section mapping with fallback
 * Returns metadata-derived mapping or minimal fallback
 * @param {Object} metadata - Template metadata object
 * @returns {Object} Section mapping
 */
export function getSectionMappingWithFallback(metadata) {
  if (!metadata) {
    console.warn('[templateMetadataLoader] No metadata available, using minimal fallback');
    return MINIMAL_FALLBACK;
  }
  
  const mapping = buildSectionMappingFromMetadata(metadata);
  
  if (Object.keys(mapping).length === 0) {
    console.warn('[templateMetadataLoader] Empty mapping from metadata, using minimal fallback');
    return MINIMAL_FALLBACK;
  }
  
  return mapping;
}

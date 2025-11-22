/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone) => {
  // Philippine mobile number format: 09XX-XXX-XXXX or +639XXXXXXXXX
  const patterns = [
    /^09\d{9}$/, // 09123456789
    /^09\d{2}-\d{3}-\d{4}$/, // 09XX-XXX-XXXX
    /^\+639\d{9}$/, // +639123456789
  ];
  return patterns.some((pattern) => pattern.test(phone));
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
};

/**
 * Calculate profile completion percentage
 */
export const calculateProfileCompletion = (profileData) => {
  const requiredFields = [
    "first_name",
    "last_name",
    "birthdate",
    "gender",
    "mobile_number",
    "city",
  ];

  const filledFields = requiredFields.filter(
    (field) =>
      profileData &&
      profileData[field] &&
      profileData[field].toString().trim() !== ""
  );

  return Math.round((filledFields.length / requiredFields.length) * 100);
};

/**
 * Remove duplicates from array based on ID field
 */
export const removeDuplicates = (array, idField = "id") => {
  if (!array || !Array.isArray(array)) return [];
  return Array.from(
    new Map(array.map((item) => [item[idField], item])).values()
  );
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if two objects are equal
 */
export const areObjectsEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missing = [];

  requiredFields.forEach((field) => {
    if (!data[field] || data[field].toString().trim() === "") {
      missing.push(field);
    }
  });

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
};

/**
 * Format field name for display (snake_case to Title Case)
 */
export const formatFieldName = (fieldName) => {
  return fieldName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Role color mappings
 */
export const roleColors = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  staff: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  volunteer:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  applicant: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

/**
 * Status color mappings
 */
export const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  deactivated: "bg-gray-900 text-white dark:bg-black dark:text-white",
};

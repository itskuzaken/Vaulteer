// Validation helpers for forms
// Keep these validators permissive for international names (Unicode-aware)
// and consistent across the front end.

export const isValidName = (value) => {
  if (!value) return false;
  // Allow letters with diacritics, spaces, hyphens, apostrophes and dots.
  // Use Unicode property escapes with the 'u' flag.
  const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}'\-\.\s]+$/u;
  return namePattern.test(value.trim());
};

export const isValidMiddleInitial = (value) => {
  if (!value) return true; // optional
  const pattern = /^[A-Za-z]$/;
  return pattern.test(value.trim());
};

export const isValidNickname = (value) => {
  if (!value) return false;
  // Allow letters, numbers, spaces, dash, underscore, dot, some symbols.
  const pattern = /^[\p{L}\p{M}0-9_\-\.\s]+$/u;
  return pattern.test(value.trim());
};

export const isValidMobile = (value) => {
  if (!value) return false;
  // Normalize preceding country codes/format to local '09' format
  const normalized = normalizeMobile(value);
  const pattern = /^09\d{9}$/;
  return pattern.test(normalized);
};

export const normalizeMobile = (value) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  let normalized = digits;

  // If starts with country code '63'
  if (normalized.startsWith("63")) {
    const rest = normalized.slice(2);
    // Replace leading '63' with '0' and keep the rest as-is. If nothing follows, set to '0'.
    if (rest.length === 0) {
      normalized = "0";
    } else {
      normalized = `0${rest}`;
    }
  } else if (normalized.startsWith("9")) {
    normalized = `0${normalized}`;
  }

  // Cap to 11 digits
  if (normalized.length > 11) normalized = normalized.slice(0, 11);
  return normalized;
};

export const isValidCity = (value) => {
  if (!value) return false;
  // Require at least one letter; allow numbers for cases like 'District 6' but not only digits
  const pattern = /^(?=.*[\p{L}\p{M}])[\p{L}\p{M}0-9\s\-\.']+$/u;
  return pattern.test(value.trim());
};

export const isValidSocialUrl = (value, platform) => {
  if (!value) return true; // optional
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (platform === 'facebook') {
      return /(facebook|fb)\.com$/.test(hostname);
    }
    if (platform === 'twitter') {
      return /twitter\.com$/.test(hostname);
    }
    if (platform === 'instagram') {
      return /instagram\.com$/.test(hostname);
    }
    if (platform === 'tiktok') {
      return /tiktok\.com$/.test(hostname);
    }
    // Fallback: allow any http/https URL
    return url.protocol.startsWith('http');
  } catch (err) {
    return false;
  }
};

export const isValidGraduation = (value) => {
  if (!value) return false;
  const pattern = /^\d{4}$/;
  if (!pattern.test(value.trim())) return false;
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  // allow up to 10 years in the future (for expected graduation)
  if (year < 1900 || year > currentYear + 10) return false;
  return true;
};

export const isNotFutureDate = (value) => {
  if (!value) return false;
  const input = new Date(value);
  const today = new Date();
  // zero the time portion of today's date
  today.setHours(0,0,0,0);
  input.setHours(0,0,0,0);
  return input.getTime() <= today.getTime();
};

export const isValidSmallText = (value, maxLength = 1000) => {
  if (!value) return false;
  return value.trim().length <= maxLength;
};

export const isAlpha = (value) => {
  if (!value) return false;
  // Allow letters (including unicode), spaces, hyphens, and apostrophes.
  const pattern = /^[\p{L}\p{M}]+(?:[\s\-'][\p{L}\p{M}]+)*$/u;
  return pattern.test(value.trim());
};

export const countSentences = (value) => {
  if (!value) return 0;
  // Split on sentence enders: ., !, ? followed by whitespace or end of string
  // Also consider line breaks as separators
  const parts = value
    .split(/[.!?]+\s*|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length;
};

export const isSentenceCountInRange = (value, min = 5, max = 10) => {
  const c = countSentences(value);
  return c >= min && c <= max;
};

const validators = {
  isValidName,
  isValidMiddleInitial,
  isValidNickname,
  isValidMobile,
  isValidCity,
  isValidSocialUrl,
  isValidGraduation,
  isNotFutureDate,
  isValidSmallText,
  isAlpha,
  countSentences,
  isSentenceCountInRange,
};

export default validators;

// Server-side validators for forms
// Keep consistent rules with frontend validators

function isValidName(value) {
  if (!value) return false;
  // Allow basic letters, spaces, hyphens, apostrophes, dots
  const pattern = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\.\s]+$/u;
  return pattern.test(value.trim());
}

function isValidMiddleInitial(value) {
  if (!value) return true; // optional
  const pattern = /^[A-Za-z]$/;
  return pattern.test(value.trim());
}

function isValidMobile(value) {
  if (!value) return false;
  const normalized = normalizeMobile(value);
  const pattern = /^09\d{9}$/;
  return pattern.test(normalized);
}

function normalizeMobile(value) {
  if (!value) return '';
  const digits = ('' + value).replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('63')) {
    const rest = normalized.slice(2);
    // Replace leading '63' with '0' (do not prepend an extra '9').
    if (rest.length === 0) normalized = '0';
    else normalized = `0${rest}`;
  } else if (normalized.startsWith('9')) {
    normalized = `0${normalized}`;
  }
  if (normalized.length > 11) normalized = normalized.slice(0, 11);
  return normalized;
}

function isNotFutureDate(value) {
  if (!value) return false;
  const input = new Date(value);
  const today = new Date();
  today.setHours(0,0,0,0);
  input.setHours(0,0,0,0);
  return input.getTime() <= today.getTime();
}

function isValidGraduation(value) {
  if (!value) return false;
  const pattern = /^\d{4}$/;
  if (!pattern.test(value.trim())) return false;
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 10) return false;
  return true;
}

function isValidSmallText(value, maxLength = 1000) {
  if (!value) return false;
  return value.trim().length <= maxLength;
}

function isValidSocialUrl(value, platform) {
  if (!value) return true; // optional
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (platform === 'facebook') return hostname.includes('facebook.com') || hostname.includes('fb.com');
    if (platform === 'twitter') return hostname.includes('twitter.com');
    if (platform === 'instagram') return hostname.includes('instagram.com');
    if (platform === 'tiktok') return hostname.includes('tiktok.com');
    return true;
  } catch (err) {
    return false;
  }
}

function isValidCity(value) {
  if (!value) return false;
  // Ensure city has at least one letter and contains only letters/numbers/spaces/basic punctuation
  const pattern = /^(?=.*[A-Za-z])[A-Za-z0-9\s\-\.'’]+$/u;
  return pattern.test(value.trim());
}

function isAlpha(value) {
  if (!value) return false;
  // Unicode letters, spaces, hyphens, apostrophes
  const pattern = /^[\p{L}\p{M}]+(?:[\s\-']?[\p{L}\p{M}]+)*$/u;
  return pattern.test(value.trim());
}

function countSentences(value) {
  if (!value) return 0;
  const parts = value
    .split(/[.!?]+\s*|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length;
}

function isSentenceCountInRange(value, min = 5, max = 10) {
  const c = countSentences(value);
  return c >= min && c <= max;
}

module.exports = {
  isValidName,
  isValidMiddleInitial,
  isValidMobile,
  isNotFutureDate,
  isValidGraduation,
  isValidSmallText,
  isValidSocialUrl,
  isValidCity,
  isAlpha,
  normalizeMobile,
  countSentences,
  isSentenceCountInRange,
};

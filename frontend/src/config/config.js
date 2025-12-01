// Centralized configuration helpers

const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT || "3001";

const getDefaultProtocol = () =>
  typeof window !== "undefined" ? window.location.protocol : "http:";

const getDefaultHost = () =>
  typeof window !== "undefined" ? window.location.hostname : "localhost";

const normalizeBase = (value) => {
  if (!value) return value;

  const trimmed = value.endsWith("/") ? value.slice(0, -1) : value;
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
};

// Support multiple environment var names for historical reasons (BASE vs URL)
const resolvedEnvBase =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://vaulteer.kuzaken.tech/api";

const resolvedDefaultBase = `${getDefaultProtocol()}//${getDefaultHost()}:${DEFAULT_API_PORT}/api`;

export const API_BASE = normalizeBase(resolvedEnvBase) || resolvedDefaultBase;

// Backend base URL (without /api suffix) for static file serving
export const BACKEND_URL = API_BASE.replace(/\/api$/, '');

if (typeof window !== "undefined") {
  console.log(
    `[Vaulteer] Frontend configured to reach backend via API base: ${API_BASE}`
  );
  console.log(
    `[Vaulteer] Backend URL for static files: ${BACKEND_URL}`
  );
}

// Useful: warn during development if the configured API_BASE appears to be pointing
// to the production host rather than the local dev server. This commonly causes
// a "Failed to fetch" error when the dev backend is running on a different host.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  if (
    API_BASE.includes("vaulteer.kuzaken.tech") &&
    !API_BASE.includes("localhost")
  ) {
    console.warn(
      `[Vaulteer] Warning: API_BASE (${API_BASE}) points to production host; if you're developing locally, set NEXT_PUBLIC_API_URL to your local server (e.g., http://192.168.1.14:5000)`
    );
  }
}

/**
 * Normalize attachment URL to handle both relative and absolute paths
 * @param {string} url - The attachment URL from API
 * @returns {string} - Normalized absolute URL
 */
export function normalizeAttachmentUrl(url) {
  if (!url) return '';
  
  // If already absolute URL (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If relative URL (starts with /), prepend BACKEND_URL
  if (url.startsWith('/')) {
    return `${BACKEND_URL}${url}`;
  }
  
  // Otherwise, treat as relative and prepend BACKEND_URL with /
  return `${BACKEND_URL}/${url}`;
}

// Add other shared constants here as needed
export const REQUEST_TIMEOUT_MS = 15000; // example default timeout
export const STORAGE_KEYS = {
  AUTH_TOKEN: "token",
  USER_ROLE: "user_role",
};

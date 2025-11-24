/**
 * Internal API Client for Next.js Server-Side Code
 *
 * IMPORTANT: This module should ONLY be imported in server-side code:
 * - Server Components (React Server Components)
 * - Server Actions (use server directive)
 * - API Routes (/app/api/*)
 * - getServerSideProps / getStaticProps
 *
 * DO NOT import this in client components or use in browser code!
 * The INTERNAL_API_TOKEN must remain server-side only.
 */

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:5000";
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

if (!INTERNAL_API_TOKEN && process.env.NODE_ENV === "production") {
  console.error(
    "[internalApiClient] INTERNAL_API_TOKEN not set in production!"
  );
}

/**
 * Make authenticated requests to internal-only backend endpoints
 * @param {string} endpoint - API endpoint path (e.g., '/api/internal/health')
 * @param {RequestInit} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>}
 */
async function callInternalApi(endpoint, options = {}) {
  const url = `${BACKEND_INTERNAL_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    "X-Internal-Token": INTERNAL_API_TOKEN,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error("[internalApiClient] fetch error:", {
      endpoint,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Helper to call internal API and return JSON response
 * @param {string} endpoint - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>}
 */
async function callInternalApiJson(endpoint, options = {}) {
  const response = await callInternalApi(endpoint, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Internal API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Example: Get detailed internal stats
 * @returns {Promise<object>}
 */
async function getDetailedStats() {
  return callInternalApiJson("/api/internal/stats/detailed", {
    method: "GET",
  });
}

/**
 * Example: Refresh cache
 * @param {string} cacheKey - Cache key to refresh
 * @param {boolean} force - Force refresh
 * @returns {Promise<object>}
 */
async function refreshCache(cacheKey, force = false) {
  return callInternalApiJson("/api/internal/refresh-cache", {
    method: "POST",
    body: JSON.stringify({ cacheKey, force }),
  });
}

/**
 * Example: Internal health check
 * @returns {Promise<object>}
 */
async function checkInternalHealth() {
  return callInternalApiJson("/api/internal/health", {
    method: "GET",
  });
}

module.exports = {
  callInternalApi,
  callInternalApiJson,
  getDetailedStats,
  refreshCache,
  checkInternalHealth,
};

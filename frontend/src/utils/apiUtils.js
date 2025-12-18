import { getIdToken } from "../services/firebase";

/**
 * Enhanced fetch wrapper that automatically handles token expiration
 * Retries the request once with a fresh token if it receives a 401 error
 * 
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} The fetch response
 */
export async function fetchWithAuth(url, options = {}) {
  // Get initial token
  const token = await getIdToken();

  // Helpful debug info (do NOT log raw tokens)
  try {
    console.debug('[API] fetchWithAuth — token present:', !!token, 'url:', url);
  } catch (e) {
    /* ignore */
  }

  // If no token (not signed in), throw a helpful error rather than attempting the call
  if (!token) {
    const err = new Error('Not authenticated — please sign in to continue.');
    err.status = 401;
    err.requiresAuth = true;
    console.warn('[API] Request attempted without authentication:', url);
    throw err;
  }

  // Set up headers with authorization
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  // Make the first request
  let response;
  try {
    response = await fetch(url, {
    ...options,
    headers,
  });
  } catch (networkErr) {
    const err = new Error(
      `Network error while contacting API (${url}): ${networkErr.message || networkErr}`
    );
    err.status = 0;
    err.isNetworkError = true;
    console.error('[apiUtils] Network error contacting', url, networkErr);
    throw err;
  }

  // If we get a 401 (unauthorized), try refreshing the token
  if (response.status === 401) {
    console.log('[API] Token expired, refreshing and retrying request...');
    
    // Force refresh the token
    const freshToken = await getIdToken(true);
    try { console.debug('[API] fetchWithAuth — refreshed token present:', !!freshToken, 'url:', url); } catch (e) { /* ignore */ }

    // Retry the request with the fresh token
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${freshToken}`,
      },
    });
  }

  return response;
}

/**
 * Helper function to make authenticated API calls with automatic token refresh
 * Includes error handling and JSON parsing
 * 
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object>} The parsed JSON response
 * @throws {Error} If the request fails after retry
 */
export async function apiCall(url, options = {}) {
  // Automatic retry/backoff for idempotent GET/HEAD requests on 429
  const method = (options.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const maxRetries = isIdempotent ? 2 : 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let attempt = 0;
  while (true) {
    try {
      const response = await fetchWithAuth(url, options);

      if (response.status === 429) {
        // Rate limited — attempt to compute retry delay from headers
        const retryAfterHeader = response.headers.get('Retry-After');
        const rateLimitReset = response.headers.get('RateLimit-Reset') || response.headers.get('ratelimit-reset');
        let retryAfterMs = null;

        if (retryAfterHeader) {
          // Retry-After can be seconds or HTTP date
          const asNumber = Number(retryAfterHeader);
          if (!Number.isNaN(asNumber)) {
            retryAfterMs = asNumber * 1000;
          } else {
            const asDate = Date.parse(retryAfterHeader);
            if (!Number.isNaN(asDate)) retryAfterMs = Math.max(0, asDate - Date.now());
          }
        } else if (rateLimitReset) {
          const asNumber = Number(rateLimitReset);
          if (!Number.isNaN(asNumber)) retryAfterMs = Math.max(0, asNumber * 1000 - Date.now());
        }

        // If we can retry (idempotent and attempt < maxRetries), backoff and try again
        if (isIdempotent && attempt < maxRetries) {
          attempt += 1;
          const backoffMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : Math.min(1000 * 2 ** attempt, 15000);
          console.warn(`[API] Rate limited (${url}). Retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})`);
          await sleep(backoffMs);
          continue; // retry loop
        }

        // No retry left or non-idempotent: return a helpful error with retryAfterMs on it
        const json = await response.json().catch(() => null);
        const message = (json && (json.error || json.message)) || `Request rate-limited (${response.status})`;
        const err = new Error(message);
        err.status = 429;
        err.retryAfterMs = retryAfterMs;
        throw err;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(error.message || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Network errors or thrown errors bubble up after logging
      console.error('[API] Request failed:', error);
      throw error;
    }
  }
}

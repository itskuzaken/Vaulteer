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
  
  // Set up headers with authorization
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  // Make the first request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401 (unauthorized), try refreshing the token
  if (response.status === 401) {
    console.log('[API] Token expired, refreshing and retrying request...');
    
    // Force refresh the token
    const freshToken = await getIdToken(true);
    
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
  try {
    const response = await fetchWithAuth(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `Request failed with status ${response.status}` 
      }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
}

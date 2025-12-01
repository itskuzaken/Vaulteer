import { API_BASE, STORAGE_KEYS } from "../config/config";
import { getIdToken } from "./firebase";

const TOKEN_STORAGE_KEY = STORAGE_KEYS?.AUTH_TOKEN || "token";
const MAX_AUTH_RETRIES = 5;

// Rate-limit / retry settings for 429 handling
const MAX_429_RETRIES = 5;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;
const JITTER_FACTOR = 0.2;

// In-memory maps for request dedupe and simple caching
const activeRequests = new Map();
const responseCache = new Map();

// Export function to clear caches (useful on login/logout)
export const clearAuthCache = () => {
  responseCache.clear();
  activeRequests.clear();
  persistToken(null);
};

const readStoredToken = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (storageError) {
    console.warn("Unable to access localStorage for auth token:", storageError);
    return null;
  }
};

const persistToken = (token) => {
  if (typeof window === "undefined") return;

  try {
    if (!token) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch (storageError) {
    console.warn("Unable to persist auth token in localStorage:", storageError);
  }
};

export const resolveToken = async (forceRefresh = false) => {
  let token = forceRefresh ? null : readStoredToken();

  if (!token) {
    token = await getIdToken(forceRefresh);
    if (token) {
      persistToken(token);
    }
  }

  return token;
};

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function backoffDelay(attempt, serverRetryAfterSeconds) {
  if (
    serverRetryAfterSeconds &&
    !Number.isNaN(Number(serverRetryAfterSeconds))
  ) {
    return Math.min(Number(serverRetryAfterSeconds) * 1000, MAX_BACKOFF_MS);
  }
  const base = Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  const jitter =
    base * (Math.random() * JITTER_FACTOR * (Math.random() > 0.5 ? 1 : -1));
  return Math.max(100, Math.round(base + jitter));
}

function makeRequestKey(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? options.body : "";
  // Exclude auth header from key so concurrent users (same session) can share
  const headers = { ...(options.headers || {}) };
  delete headers.Authorization;
  return `${method} ${endpoint} ${JSON.stringify(headers)} ${body}`;
}

export async function fetchWithAuth(endpoint, options = {}, attempt = 0) {
  const method = (options.method || "GET").toUpperCase();

  // Optional cache support for GET requests - options.cacheTTL (ms)
  const cacheKey =
    method === "GET" && options.cacheTTL
      ? makeRequestKey(endpoint, options)
      : null;
  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  // Deduplicate concurrent identical requests
  const requestKey = makeRequestKey(endpoint, options);
  if (activeRequests.has(requestKey)) {
    return activeRequests.get(requestKey);
  }

  const promise = (async () => {
    try {
      const token = await resolveToken(attempt > 0);

      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      else throw new Error("Authentication required. Please log in again.");

      // Retry loop for 429 responses (exponential backoff) + 401 refresh flow
      let retryCount429 = 0;

      while (true) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });

        let data;
        let parseError;
        let rawBody = "";

        try {
          rawBody = await response.text();
          data = rawBody ? JSON.parse(rawBody) : null;
        } catch (err) {
          parseError = err;
        }

        // 401 -> attempt token refresh (up to MAX_AUTH_RETRIES)
        if (response.status === 401 && attempt < MAX_AUTH_RETRIES) {
          persistToken(null);
          const refreshed = await resolveToken(true);
          if (refreshed) {
            headers["Authorization"] = `Bearer ${refreshed}`;
            attempt += 1;
            continue;
          }
        }

        // 429 -> exponential backoff retry
        if (response.status === 429 && retryCount429 < MAX_429_RETRIES) {
          retryCount429 += 1;
          const retryAfter = response.headers.get?.("retry-after") ?? null;
          const delay = backoffDelay(retryCount429 - 1, retryAfter);
          console.warn(
            `[apiClient] 429 for ${endpoint} (attempt ${retryCount429}), backing off ${delay}ms`
          );
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          const message =
            data?.message ||
            data?.error ||
            rawBody ||
            parseError?.message ||
            `Request failed with status ${response.status}`;
          const error = new Error(message);
          error.status = response.status;
          error.payload = data;
          // Developer-friendly logging for 403 during local development
          if (response.status === 403 && typeof window !== "undefined") {
            console.warn(`[apiClient] Request to ${endpoint} returned 403:`, message);
          }
          throw error;
        }

        // Success: cache if requested
        if (cacheKey) {
          const ttl = Number(options.cacheTTL) || 0;
          if (ttl > 0) {
            responseCache.set(cacheKey, {
              expiresAt: Date.now() + ttl,
              data: data ?? {},
            });
          }
        }

        return data ?? {};
      }
    } finally {
      activeRequests.delete(requestKey);
    }
  })();

  activeRequests.set(requestKey, promise);
  return promise;
}

export function clearApiCache() {
  responseCache.clear();
}

export function removeApiCacheKey(endpoint, options = {}) {
  const key = makeRequestKey(endpoint, options);
  responseCache.delete(key);
}

import { API_BASE, STORAGE_KEYS } from "../config/config";
import { getIdToken } from "./firebase";

const TOKEN_STORAGE_KEY = STORAGE_KEYS?.AUTH_TOKEN || "token";
const MAX_AUTH_RETRIES = 1;

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

export async function fetchWithAuth(endpoint, options = {}, attempt = 0) {
  const token = await resolveToken(attempt > 0);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    throw new Error("Authentication required. Please log in again.");
  }

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

  if (!response.ok) {
    if (response.status === 401 && attempt < MAX_AUTH_RETRIES) {
      persistToken(null);
      const refreshedToken = await resolveToken(true);
      if (refreshedToken) {
        return fetchWithAuth(endpoint, options, attempt + 1);
      }
    }

    const message =
      data?.message ||
      data?.error ||
      rawBody ||
      parseError?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data ?? {};
}

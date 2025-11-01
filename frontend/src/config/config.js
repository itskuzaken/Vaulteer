// Centralized configuration
// Use environment variable if provided (e.g., NEXT_PUBLIC_API_BASE), else fallback
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3001/api" ||
  "http://192.168.68.102:3001/api";

if (typeof window !== "undefined") {
  console.log(
    `[Vaulteer] Frontend configured to reach backend via API base: ${API_BASE}`
  );
}

// Add other shared constants here as needed
export const REQUEST_TIMEOUT_MS = 15000; // example default timeout
export const STORAGE_KEYS = {
  AUTH_TOKEN: "token",
  USER_ROLE: "user_role",
};

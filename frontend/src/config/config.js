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

const resolvedEnvBase =
  process.env.NEXT_PUBLIC_API_URL || "https://vaulteer.kuzaken.tech/api";

const resolvedDefaultBase = `${getDefaultProtocol()}//${getDefaultHost()}:${DEFAULT_API_PORT}/api`;

export const API_BASE = normalizeBase(resolvedEnvBase) || resolvedDefaultBase;

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

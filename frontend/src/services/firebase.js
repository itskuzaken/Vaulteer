// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Allow developers to pass the entire Firebase configuration as a single
// `NEXT_PUBLIC_FIREBASE` JSON string during development, otherwise fall back to
// individual `NEXT_PUBLIC_FIREBASE_*` environment variables.
let firebaseConfig = null;

if (
  typeof process.env.NEXT_PUBLIC_FIREBASE === "string" &&
  process.env.NEXT_PUBLIC_FIREBASE.trim().length > 0
) {
  try {
    firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE);
  } catch (err) {
    console.warn(
      "Invalid JSON for NEXT_PUBLIC_FIREBASE — falling back to individual env vars",
      err
    );
  }
}

if (!firebaseConfig) {
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

// Validate essential config early to give a clearer error
if (!firebaseConfig.apiKey || typeof firebaseConfig.apiKey !== "string") {
  const helpful =
    "Missing or invalid NEXT_PUBLIC_FIREBASE_API_KEY — set the public web API key for your Firebase web app in your frontend environment (.env.local or your deployment environment).";
  // On the server (SSR) fail early with a helpful error to avoid obscure 'invalid-api-key' messages
  console.error("[Firebase] config error:", helpful);
  throw new Error(helpful);
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  // Firebase initialization can fail with errors like 'auth/invalid-api-key'.
  // Provide a clearer message to help debugging during SSR and deployments.
  const message =
    err && err.code === "auth/invalid-api-key"
      ? "[Firebase] invalid API key provided. Check NEXT_PUBLIC_FIREBASE_API_KEY in your environment (frontend/.env.local or your deployment env). Make sure this key matches the key listed under Firebase Console > Project settings > General > Your apps."
      : `[Firebase] initialization failed: ${
          err && err.message ? err.message : String(err)
        }`;
  console.error(message, err);
  // Throw a clearer error for SSR so deployment logs will show the root cause.
  throw new Error(message);
}

// Export Firebase Authentication and Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const getIdToken = async (forceRefresh = false) => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken(forceRefresh);
  }
  return null;
};

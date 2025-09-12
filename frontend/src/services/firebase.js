// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration (now pulled from env when available)
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyA2j12esXTlkLHr_-Poxp12-ye-LeRNYic",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "my-firebase-efa7a.firebaseapp.com",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DB_URL ||
    "https://my-firebase-efa7a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "my-firebase-efa7a",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "my-firebase-efa7a.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER || "315643404212",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:315643404212:web:cbb7c6b8ff3b9902751ce1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase Authentication and Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const getIdToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
};

// Centralized environment configuration & validation
require("dotenv").config();

function req(name, fallback, opts = { required: false }) {
  const v = process.env[name] ?? fallback;
  if (opts.required && (v === undefined || v === "")) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

const isProduction = process.env.NODE_ENV === "production";

const CONFIG = {
  NODE_ENV: req("NODE_ENV", "development"),
  PORT: parseInt(req("PORT", "5000"), 10),
  LAN_ADDRESS: req("LAN_ADDRESS", ""),
  DB_HOST: req("DB_HOST", "localhost", { required: isProduction }),
  DB_USER: req("DB_USER", "root", { required: isProduction }),
  DB_PASS: req("DB_PASS", "", { required: isProduction }),
  DB_NAME: req("DB_NAME", "vaulteer_db", { required: isProduction }),
  DB_CONN_LIMIT: parseInt(req("DB_CONN_LIMIT", "10"), 10),
  FRONTEND_URL: req(
    "FRONTEND_URL",
    "http://localhost:3000",
    "http://192.168.68.102:3000"
  ),
};

// Validate Firebase credentials in production
if (isProduction) {
  const hasFirebaseJSON = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasFirebaseBase64 = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const hasFirebasePath = !!process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!hasFirebaseJSON && !hasFirebaseBase64 && !hasFirebasePath) {
    throw new Error(
      "Production requires Firebase credentials: set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_SERVICE_ACCOUNT"
    );
  }
}

module.exports = { CONFIG };

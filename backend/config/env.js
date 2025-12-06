// Centralized environment configuration & validation
const path = require('path');
// Load .env from the backend folder explicitly to support running scripts from subfolders
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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
    "http://192.168.68.102:3000",
    "https://vaulteer.kuzaken.tech"
  ),
  email: {
    provider: req("EMAIL_PROVIDER", "ses"), // 'sendgrid', 'smtp', or 'ses'
    sendgridApiKey: req("SENDGRID_API_KEY", ""),
    smtp: {
      host: req("SMTP_HOST", ""),
      port: parseInt(req("SMTP_PORT", "587"), 10),
      user: req("SMTP_USER", ""),
      pass: req("SMTP_PASS", ""),
    },
    ses: {
      region: req("AWS_SES_REGION", "us-east-1"),
      accessKeyId: req("AWS_ACCESS_KEY_ID", ""),
      secretAccessKey: req("AWS_SECRET_ACCESS_KEY", ""),
    },
    fromEmail: req("FROM_EMAIL", "noreply@vaulteer.com"),
    fromName: req("FROM_NAME", "Vaulteer"),
  },
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

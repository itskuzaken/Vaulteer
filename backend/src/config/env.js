// Centralized environment configuration & validation
require("dotenv").config();

function req(name, fallback, opts = { required: false }) {
  const v = process.env[name] ?? fallback;
  if (opts.required && (v === undefined || v === "")) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

const CONFIG = {
  NODE_ENV: req("NODE_ENV", "development"),
  PORT: parseInt(req("PORT", "5000"), 10),
  LAN_ADDRESS: req("LAN_ADDRESS", ""),
  DB_HOST: req("DB_HOST", "localhost"),
  DB_USER: req("DB_USER", "root"),
  DB_PASS: req("DB_PASS", ""),
  DB_NAME: req("DB_NAME", "redvault_db"),
  DB_CONN_LIMIT: parseInt(req("DB_CONN_LIMIT", "10"), 10),
  FRONTEND_ORIGINS: req("FRONTEND_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

module.exports = { CONFIG };

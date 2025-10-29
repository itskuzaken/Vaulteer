const mysql = require("mysql2/promise");
const { CONFIG } = require("../config/env");

let pool = null;
let ready = false;

async function initPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: CONFIG.DB_HOST,
    user: CONFIG.DB_USER,
    password: CONFIG.DB_PASS,
    database: CONFIG.DB_NAME,
    waitForConnections: true,
    connectionLimit: CONFIG.DB_CONN_LIMIT,
    queueLimit: 0,
    timezone: "+08:00", // Force UTC+8 timezone (Asia/Manila, Singapore, etc.)
  });

  try {
    await pool.query("SELECT 1");
    ready = true;
    console.log(
      `✓ Connected to database: ${CONFIG.DB_NAME} at ${CONFIG.DB_HOST}`
    );

    // Auto-migration: ensure users.name column exists
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME='users' AND COLUMN_NAME='name'`,
      [CONFIG.DB_NAME]
    );

    if (rows.length === 0) {
      console.log("[MIGRATION] Adding missing column users.name...");
      await pool.query(
        "ALTER TABLE users ADD COLUMN name VARCHAR(128) NULL AFTER uid"
      );
      await pool.query(
        "UPDATE users SET name = SUBSTRING_INDEX(email,'@',1) WHERE name IS NULL OR name = ''"
      );
      await pool.query(
        "ALTER TABLE users MODIFY COLUMN name VARCHAR(128) NOT NULL"
      );
      console.log("[MIGRATION] users.name column added and backfilled.");
    }
  } catch (err) {
    console.error("✗ MySQL pool init failed:", err.message);
    throw err;
  }

  return pool;
}

function getPool() {
  if (!pool) throw new Error("Pool not initialized. Call initPool() first.");
  return pool;
}

function isReady() {
  return ready;
}

module.exports = { initPool, getPool, isReady };

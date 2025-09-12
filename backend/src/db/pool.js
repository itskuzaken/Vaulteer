const mysql = require("mysql2/promise");
const { CONFIG } = require("../config/env");

let pool;
let ready = false;

async function initPool() {
  if (pool) return pool;
  pool = await mysql.createPool({
    host: CONFIG.DB_HOST,
    user: CONFIG.DB_USER,
    password: CONFIG.DB_PASS,
    database: CONFIG.DB_NAME,
    waitForConnections: true,
    connectionLimit: CONFIG.DB_CONN_LIMIT,
    queueLimit: 0,
  });
  ready = true;
  return pool;
}
function getPool() {
  if (!pool) throw new Error("Pool not initialized yet");
  return pool;
}
function isReady() {
  return ready;
}

module.exports = { initPool, getPool, isReady };

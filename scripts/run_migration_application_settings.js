const fs = require("fs");
const path = require("path");
const { initPool, getPool } = require("../backend/db/pool");

(async () => {
  try {
    await initPool();
    const pool = getPool();
    const sql = fs.readFileSync(
      path.join(
        __dirname,
        "../backend/migrations/20251129_create_application_settings.sql"
      ),
      "utf8"
    );
    console.log("Running migration: create application_settings");
    await pool.query(sql);
    console.log("Migration applied successfully");
    const [rows] = await pool.query("SELECT * FROM application_settings");
    console.log("Settings rows:", rows);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message || err);
    process.exit(1);
  }
})();

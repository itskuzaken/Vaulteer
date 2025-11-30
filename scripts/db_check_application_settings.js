const { initPool, getPool } = require("../backend/db/pool");

(async () => {
  try {
    await initPool();
    const pool = getPool();
    const [rows] = await pool.query('SHOW TABLES LIKE "application_settings"');
    console.log("SHOW TABLES result:", rows);
    const [count] = await pool.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='application_settings'"
    );
    console.log("Count:", count[0].count);
    try {
      const [data] = await pool.query(
        "SELECT * FROM application_settings LIMIT 1"
      );
      console.log("Data sample:", data);
    } catch (e) {
      console.error("select error:", e.message);
    }
    process.exit(0);
  } catch (e) {
    console.error("err", e.message);
    process.exit(1);
  }
})();

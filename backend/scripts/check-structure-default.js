const { initPool } = require('../db/pool');
(async () => {
  const pool = await initPool();
  const [rows] = await pool.query("SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hts_forms' AND COLUMN_NAME = 'structure_version'");
  console.log('structure_version default:', rows[0]?.COLUMN_DEFAULT);
  await pool.end();
})();

const { initPool } = require('../db/pool');
(async () => {
  try {
    const pool = await initPool();
    const [cols] = await pool.query("SHOW COLUMNS FROM hts_forms LIKE 'field_regions'");
    console.log('Field column:', cols);
    const [cols2] = await pool.query("SHOW COLUMNS FROM hts_forms LIKE 'field_regions_exists'");
    console.log('Exists column:', cols2);
    const [idx] = await pool.query("SHOW INDEX FROM hts_forms WHERE Key_name = 'idx_field_regions_exists'");
    console.log('Index:', idx);
    const [migs] = await pool.query("SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10");
    console.log('schema_migrations:', migs);
    await pool.end();
  } catch (err) {
    console.error('DB check failed:', err.message);
    process.exit(1);
  }
})();

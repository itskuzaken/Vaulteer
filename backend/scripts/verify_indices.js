const { initPool } = require('../db/pool');

const EXPECTED = {
  activity_logs: [
    'idx_activity_performed_by',
    'idx_activity_target',
    'fts_activity_text',
  ],
  event_participants: [
    'idx_participants_event_status',
    'idx_participants_event_regdate',
    'idx_participants_user_status',
  ],
  events: ['idx_events_status_end', 'idx_events_status_start'],
  event_updates: ['idx_updates_event_type_created'],
};

async function verify() {
  const pool = await initPool();
  try {
    for (const [table, indices] of Object.entries(EXPECTED)) {
      const [rows] = await pool.query(
        `SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      const presentIndexNames = new Set(rows.map((r) => r.INDEX_NAME));
      console.log(`\n🔎 Table: ${table}`);
      for (const idx of indices) {
        if (presentIndexNames.has(idx)) {
          console.log(`  ✅ ${idx}`);
        } else {
          console.log(`  ⚠️  MISSING: ${idx}`);
        }
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error verifying indices:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();

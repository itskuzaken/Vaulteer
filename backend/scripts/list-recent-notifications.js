const { initPool, getPool } = require('../db/pool');

(async function() {
  try {
    await initPool();
    const [rows] = await getPool().query('SELECT notification_id, user_id, title, message, action_url, metadata, created_at FROM notifications ORDER BY created_at DESC LIMIT 20');
    console.table(rows.map(r => ({ id: r.notification_id, user_id: r.user_id, title: r.title, message: r.message, action_url: r.action_url, metadata: r.metadata, created_at: r.created_at })));
    process.exit(0);
  } catch (err) {
    console.error('Failed to list notifications:', err);
    process.exit(1);
  }
})();

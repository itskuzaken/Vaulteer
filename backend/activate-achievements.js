require('dotenv').config();
const { initPool, getPool } = require('./db/pool');

async function activateAchievements() {
  await initPool();
  const pool = await getPool();
  
  const [result] = await pool.query('UPDATE achievements SET is_active = 1');
  console.log(`✅ Activated ${result.affectedRows} achievements`);
  
  const [rows] = await pool.query('SELECT achievement_id, badge_code, achievement_name FROM achievements WHERE is_active = 1');
  console.log('\nActive achievements:');
  rows.forEach(a => console.log(`  - ${a.achievement_name} (${a.badge_code})`));
  
  process.exit(0);
}

activateAchievements();

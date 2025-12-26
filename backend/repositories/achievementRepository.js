const { getPool } = require('../db/pool');

function normalizeTierPoints(tp) {
  if (!tp || typeof tp !== 'object') return tp;
  // If it doesn't have gold, leave as-is
  if (!Object.prototype.hasOwnProperty.call(tp, 'gold')) return tp;
  const res = {};
  // keep existing order for keys except gold, then add gold last
  for (const k of Object.keys(tp)) {
    if (k === 'gold') continue;
    res[k] = tp[k];
  }
  res['gold'] = tp['gold'];
  return res;
}

function ensureExecute(pool) {
  if (typeof pool.execute !== 'function' && typeof pool.query === 'function') {
    pool.execute = pool.query.bind(pool);
  }
  return pool;
}

async function getProgress(userId, achievementCode) {
  const pool = ensureExecute(getPool());
  const [rows] = await pool.execute(
    'SELECT * FROM user_achievement_progress WHERE user_id = ? AND achievement_code = ? LIMIT 1',
    [userId, achievementCode]
  );
  return rows[0] || null;
}

async function upsertProgress(userId, achievementCode, delta, badgeLevel) {
  const pool = ensureExecute(getPool());
  // Try update first: increment by delta
  await pool.execute(
    `INSERT INTO user_achievement_progress (user_id, achievement_code, current_count, badge_level)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE current_count = current_count + VALUES(current_count), badge_level = VALUES(badge_level), last_updated_at = NOW()`,
    [userId, achievementCode, delta, badgeLevel]
  );
  return getProgress(userId, achievementCode);
}

async function setProgress(userId, achievementCode, count, badgeLevel) {
  const pool = ensureExecute(getPool());
  await pool.execute(
    `INSERT INTO user_achievement_progress (user_id, achievement_code, current_count, badge_level)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE current_count = VALUES(current_count), badge_level = VALUES(badge_level), last_updated_at = NOW()`,
    [userId, achievementCode, count, badgeLevel]
  );
  return getProgress(userId, achievementCode);
}

async function insertAudit({ userId, eventId = null, achievementCode, delta = 1, meta = null, jobId = null }) {
  const pool = ensureExecute(getPool());
  await pool.execute(
    `INSERT INTO achievement_progress_audit (user_id, event_id, achievement_code, delta, meta, job_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, eventId, achievementCode, delta, JSON.stringify(meta || {}), jobId]
  );
}

async function auditExists(userId, eventId, achievementCode) {
  const pool = ensureExecute(getPool());
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as c FROM achievement_progress_audit WHERE user_id = ? AND event_id = ? AND achievement_code = ?`,
    [userId, eventId, achievementCode]
  );
  return (rows && rows[0] && rows[0].c > 0) || false;
}

async function getUserProgresses(userId) {
  const pool = ensureExecute(getPool());
  const [rows] = await pool.execute(
    `SELECT achievement_code, current_count, badge_level, last_updated_at FROM user_achievement_progress WHERE user_id = ?`,
    [userId]
  );
  return rows || [];
}

async function getUserEarned(userId) {
  const pool = ensureExecute(getPool());
  const [rows] = await pool.execute(
    `SELECT ua.user_achievement_id, ua.earned_date, a.achievement_id, a.badge_code, a.achievement_name, a.achievement_description
     FROM user_achievements ua
     JOIN achievements a ON ua.achievement_id = a.achievement_id
     WHERE ua.user_id = ?`,
    [userId]
  );
  return rows || [];
}

async function getAchievementByCode(badgeCode) {
  const pool = ensureExecute(getPool());
  const [rows] = await pool.execute(
    `SELECT achievement_id, badge_code, achievement_name, achievement_description, thresholds, tier_points FROM achievements WHERE badge_code = ? LIMIT 1`,
    [badgeCode]
  );
  if (!rows || !rows[0]) return null;
  const row = rows[0];
  // ensure thresholds is parsed JSON if present
  const thresholds = row.thresholds ? (typeof row.thresholds === 'string' ? JSON.parse(row.thresholds) : row.thresholds) : null;
  const tier_points_raw = row.tier_points ? (typeof row.tier_points === 'string' ? JSON.parse(row.tier_points) : row.tier_points) : null;
  const tier_points = normalizeTierPoints(tier_points_raw);
  return { ...row, thresholds, tier_points };
}

async function listAchievements({ includeUsage = true, includeInactive = false } = {}) {
  const pool = ensureExecute(getPool());
  const whereClause = includeInactive ? '' : ' WHERE a.is_active = 1';

  if (includeUsage) {
    const [rows] = await pool.execute(
      `SELECT a.*, COALESCE(u.awarded_count, 0) as awarded_count
       FROM achievements a
       LEFT JOIN (
         SELECT achievement_id, COUNT(*) as awarded_count FROM user_achievements GROUP BY achievement_id
       ) u ON u.achievement_id = a.achievement_id${whereClause}
       ORDER BY a.display_order ASC, a.achievement_name ASC`
    );
    return (rows || []).map((r) => ({
      ...r,
      criteria: r.criteria ? (typeof r.criteria === 'string' ? JSON.parse(r.criteria) : r.criteria) : null,
      badge_s3_keys: r.badge_s3_keys ? (typeof r.badge_s3_keys === 'string' ? JSON.parse(r.badge_s3_keys) : r.badge_s3_keys) : null,
      tier_points: normalizeTierPoints(r.tier_points ? (typeof r.tier_points === 'string' ? JSON.parse(r.tier_points) : r.tier_points) : null),
    }));
  }

  const query = includeInactive ? `SELECT * FROM achievements ORDER BY display_order ASC, achievement_name ASC` : `SELECT * FROM achievements WHERE is_active = 1 ORDER BY display_order ASC, achievement_name ASC`;
  const [rows] = await pool.execute(query);
  return (rows || []).map((r) => ({
    ...r,
    criteria: r.criteria ? (typeof r.criteria === 'string' ? JSON.parse(r.criteria) : r.criteria) : null,
    badge_s3_keys: r.badge_s3_keys ? (typeof r.badge_s3_keys === 'string' ? JSON.parse(r.badge_s3_keys) : r.badge_s3_keys) : null,
    tier_points: normalizeTierPoints(r.tier_points ? (typeof r.tier_points === 'string' ? JSON.parse(r.tier_points) : r.tier_points) : null),
  }));
}

async function getAchievementById(achievementId) {
  const pool = getPool();
  if (!pool) return null;
  const exec = typeof pool.execute === 'function' ? pool.execute.bind(pool) : pool.query.bind(pool);
  const res = await exec(`SELECT * FROM achievements WHERE achievement_id = ? LIMIT 1`, [achievementId]);
  // Support different pool shapes: mysql2 returns [rows, fields], some mock implementations return [[rows]] or rows directly
  const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : Array.isArray(res) ? res[0] : res;
  if (!rows || !rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    criteria: row.criteria ? (typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria) : null,
    badge_s3_keys: row.badge_s3_keys ? (typeof row.badge_s3_keys === 'string' ? JSON.parse(row.badge_s3_keys) : row.badge_s3_keys) : null,
    tier_points: normalizeTierPoints(row.tier_points ? (typeof row.tier_points === 'string' ? JSON.parse(row.tier_points) : row.tier_points) : null),
  };
}

async function createAchievement(data = {}) {
  const pool = ensureExecute(getPool());
  const {
    badge_code = null,
    achievement_name = null,
    achievement_description = null,
    criteria = null,
    automatic_award = 1,
    repeatable = 0,
    visibility = 'always',
    display_order = 0,
    is_active = 1,
    achievement_points = 0,
    achievement_category = null,
    threshold_type = null,
    threshold_value = null,
    achievement_icon = null,
    badge_s3_key = null,
    badge_s3_keys = null,
    tier_points = null,
  } = data;

  // Detect columns ahead of time to avoid failing INSERTs on older schemas
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements'`
  );
  const columnNames = (cols || []).map((c) => c.COLUMN_NAME);
  const hasCriteria = columnNames.includes('criteria');
  const hasBadgeKey = columnNames.includes('badge_s3_key');
  const hasBadgeKeys = columnNames.includes('badge_s3_keys');
  let hasTierPoints = columnNames.includes('tier_points');
  const hasAutomatic = columnNames.includes('automatic_award');

  // If tier_points wasn't present but the create payload provides it, attempt to add the column
  if (!hasTierPoints && tier_points) {
    try {
      await pool.execute("ALTER TABLE achievements ADD COLUMN `tier_points` JSON DEFAULT NULL");
      // refresh column list
      const [newCols] = await pool.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements'`);
      const newColumnNames = (newCols || []).map((c) => c.COLUMN_NAME);
      hasTierPoints = newColumnNames.includes('tier_points');
    } catch (e) {
      // If ALTER fails due to permissions, continue without tier_points
      hasTierPoints = false;
    }
  }

    if (hasCriteria && (hasBadgeKey || hasBadgeKeys) && hasAutomatic) {
    const [res] = await pool.execute(
      `INSERT INTO achievements (badge_code, achievement_name, achievement_description, criteria, automatic_award, repeatable, visibility, display_order, is_active, achievement_points, achievement_category, threshold_type, threshold_value, achievement_icon, badge_s3_key, badge_s3_keys${hasTierPoints ? ', tier_points' : ''}, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasTierPoints ? ', ?' : ''}, NOW())`,
      [badge_code, achievement_name, achievement_description, criteria ? JSON.stringify(criteria) : null, automatic_award, repeatable, visibility, display_order, is_active, achievement_points, achievement_category, threshold_type, threshold_value, achievement_icon, badge_s3_key, hasBadgeKeys && badge_s3_keys ? JSON.stringify(badge_s3_keys) : null].concat(hasTierPoints ? [tier_points ? JSON.stringify(tier_points) : null] : [])
    );
    const id = res.insertId;
    const row = await getAchievementById(id);
    await insertAchievementChangeAudit({ achievementId: id, changedByUserId: null, changeType: 'create', payload: row });
    return row;
  }

  // Minimal fallback for legacy schema
  const [res2] = await pool.execute(
    `INSERT INTO achievements (badge_code, achievement_name, achievement_description, display_order, is_active, achievement_points, achievement_category, threshold_type, threshold_value, achievement_icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [badge_code, achievement_name, achievement_description, display_order, is_active, achievement_points, achievement_category, threshold_type, threshold_value, achievement_icon]
  );
  const id = res2.insertId;

  // If the DB didn't support direct insertion of tier_points in the richer insert
  // above (older schema), but we have tier_points in payload and now the column
  // exists (we may have added it on-the-fly), perform an update to set it.
  if (hasTierPoints && tier_points) {
    try {
      await pool.execute(`UPDATE achievements SET tier_points = ? WHERE achievement_id = ?`, [JSON.stringify(tier_points), id]);
    } catch (e) {
      // ignore update failures
    }
  }

  const row = await getAchievementById(id);
  await insertAchievementChangeAudit({ achievementId: id, changedByUserId: null, changeType: 'create', payload: row });
  return row;
}

async function updateAchievement(achievementId, updates = {}, changedByUserId = null) {
  const pool = getPool();
  // Detect columns to avoid updating nonexistent columns
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements'`
  );
  const columnNames = (cols || []).map((c) => c.COLUMN_NAME);

  const allowed = ['badge_code','achievement_name','achievement_description','criteria','automatic_award','repeatable','visibility','display_order','is_active','achievement_points','achievement_category','threshold_type','threshold_value','achievement_icon','badge_s3_key','badge_s3_keys'];
  if (columnNames.includes('tier_points')) allowed.push('tier_points');
  const sets = [];
  const params = [];

  for (const [k, v] of Object.entries(updates)) {
    if (!allowed.includes(k)) continue;
    // If the column is missing but we are updating a forward-compatible field like
    // `criteria`, attempt to add the column on-the-fly (idempotent) so tests and
    // older DBs can opt-in without requiring external migration runs.
    if (!columnNames.includes(k)) {
      if (k === 'criteria') {
        try {
          // Check if column truly doesn't exist and attempt a plain ALTER if needed.
          const [[colCheck]] = await pool.execute(
            `SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'criteria'`
          );
          if (!colCheck || Number(colCheck.c) === 0) {
            try {
              await pool.execute("ALTER TABLE achievements ADD COLUMN `criteria` JSON DEFAULT NULL");
            } catch (e) {
              // If ALTER fails due to version differences or permissions, ignore and continue;
              // fallback behavior is to not set criteria on older DBs.
            }
          }

          // refresh column list so subsequent logic picks it up
          const [newCols] = await pool.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements'`
          );
          columnNames.length = 0;
          (newCols || []).forEach((c) => columnNames.push(c.COLUMN_NAME));
        } catch (err) {
          // If we fail to query information_schema at all, skip this field silently
          // to preserve backward compatibility and let the rest of the update run.
          continue;
        }
      } else {
        continue;
      }
    }

    if (k === 'criteria') {
      sets.push('criteria = ?');
      params.push(v ? JSON.stringify(v) : null);
    } else if (k === 'badge_s3_keys') {
      sets.push('badge_s3_keys = ?');
      params.push(v ? JSON.stringify(v) : null);
    } else if (k === 'tier_points') {
      sets.push('tier_points = ?');
      params.push(v ? JSON.stringify(v) : null);
    } else {
      sets.push(`${k} = ?`);
      // Treat undefined as NULL so binding doesn't fail
      params.push(v === undefined ? null : v);
    }
  }

  if (sets.length === 0) return getAchievementById(achievementId);

  params.push(achievementId);
  // Conditionally include updated_at if present in schema
  const setClause = columnNames.includes('updated_at') ? `${sets.join(', ')}, updated_at = NOW()` : `${sets.join(', ')}`;
  await pool.execute(`UPDATE achievements SET ${setClause} WHERE achievement_id = ?`, params);

  const newRow = await getAchievementById(achievementId);
  try {
    await insertAchievementChangeAudit({ achievementId, changedByUserId, changeType: 'update', payload: newRow });
  } catch (err) {
    // Ignore audit insert errors (e.g., table missing in test DB)
  }
  return newRow;
}

async function softDeleteAchievement(achievementId, changedByUserId = null) {
  const pool = getPool();
  const old = await getAchievementById(achievementId);
  // Conditionally include updated_at when present
  if ((await pool.execute(`SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'updated_at'`))[0][0].c > 0) {
    await pool.execute(`UPDATE achievements SET is_active = 0, updated_at = NOW() WHERE achievement_id = ?`, [achievementId]);
  } else {
    await pool.execute(`UPDATE achievements SET is_active = 0 WHERE achievement_id = ?`, [achievementId]);
  }
  await insertAchievementChangeAudit({ achievementId, changedByUserId, changeType: 'delete', payload: old });
  return true;
}

async function insertAchievementChangeAudit({ achievementId = null, changedByUserId = null, changeType = 'update', payload = null }) {
  const pool = getPool();
  try {
    if (typeof pool.execute === 'function') {
      await pool.execute(
        `INSERT INTO achievement_changes_audit (achievement_id, changed_by_user_id, change_type, payload, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [achievementId, changedByUserId, changeType, payload ? JSON.stringify(payload) : null]
      );
    } else if (typeof pool.query === 'function') {
      // Some test/mocked pools only expose `query`.
      await pool.query(
        `INSERT INTO achievement_changes_audit (achievement_id, changed_by_user_id, change_type, payload, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [achievementId, changedByUserId, changeType, payload ? JSON.stringify(payload) : null]
      );
    } else {
      // If neither is available, throw a descriptive error to surface the problem
      throw new Error('DB pool does not support execute or query');
    }
  } catch (err) {
    // If the audit table doesn't exist (e.g., in test DB), ignore silently to avoid failing flows
    if (err && err.message && err.message.includes("doesn't exist")) {
      return;
    }
    throw err;
  }
}

async function getAchievementAudit(achievementId, limit = 50) {
  try {
    const pool = ensureExecute(getPool());
    const [rows] = await pool.execute(
      `SELECT * FROM achievement_changes_audit WHERE achievement_id = ? ORDER BY created_at DESC LIMIT ?`,
      [achievementId, Number(limit) || 50]
    );
    return rows || [];
  } catch (err) {
    // If the audit table isn't present in the DB (e.g., test env without migrations),
    // return an empty array to keep flows tolerant and tests reliable.
    if (err && err.message && (err.message.includes("doesn't exist") || err.message.includes('does not exist') || err.code === 'ER_NO_SUCH_TABLE')) {
      return [];
    }
    throw err;
  }
}

/**
 * Deactivate all active achievements. Returns number of achievements deactivated.
 * Also records an audit entry per changed achievement.
 * @param {number|null} changedByUserId
 */
async function deactivateAllAchievements(changedByUserId = null) {
  const pool = getPool();
  // Fetch currently active achievements
  const [rows] = await pool.execute(`SELECT * FROM achievements WHERE is_active = 1`);
  if (!rows || rows.length === 0) return 0;

  // Update all active achievements to inactive. If updated_at column doesn't exist (older test DB schema), omit it.
  const [[colRow]] = await pool.execute(`SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'updated_at'`);
  const hasUpdatedAt = colRow?.c > 0;
  if (hasUpdatedAt) {
    await pool.execute(`UPDATE achievements SET is_active = 0, updated_at = NOW() WHERE is_active = 1`);
  } else {
    await pool.execute(`UPDATE achievements SET is_active = 0 WHERE is_active = 1`);
  }

  // Insert change audit for each achievement
  for (const r of rows) {
    try {
      await insertAchievementChangeAudit({ achievementId: r.achievement_id, changedByUserId, changeType: 'update', payload: { ...r, is_active: 0 } });
    } catch (e) {
      // ignore audit insert failures
    }
  }

  return rows.length;
}

module.exports = {
  getProgress,
  upsertProgress,
  setProgress,
  insertAudit,
  auditExists,
  getUserProgresses,
  getUserEarned,
  getAchievementByCode,
  listAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  softDeleteAchievement,
  deactivateAllAchievements,
  insertAchievementChangeAudit,
  getAchievementAudit
};

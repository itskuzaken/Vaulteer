const { getPool } = require("../db/pool");
const { calculateLevel } = require("../config/gamificationRules");

class GamificationRepository {
  constructor() {
    // simple in-memory cache for thresholds
    this._thresholdsCache = null;
    this._thresholdsCachedAt = 0;
    this._thresholdsTTL = 60 * 60 * 1000; // 1 hour
  }

  async getPointsThresholds() {
    const now = Date.now();
    if (this._thresholdsCache && now - this._thresholdsCachedAt < this._thresholdsTTL) {
      return this._thresholdsCache;
    }
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT level, points_cumulative, points_required_for_next, reward_title
         FROM points_level_thresholds ORDER BY level ASC`
    );
    this._thresholdsCache = rows;
    this._thresholdsCachedAt = Date.now();
    return rows;
  }

  async getThresholdForLevel(level) {
    const thresholds = await this.getPointsThresholds();
    return thresholds.find((t) => t.level === level) || null;
  }

  invalidateThresholdsCache() {
    this._thresholdsCache = null;
    this._thresholdsCachedAt = 0;
  }

  async withTransaction(work) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async ensureStatsRow(userId, connection = null) {
    const conn = connection || getPool();
    await conn.query(
      "INSERT IGNORE INTO user_gamification_stats (user_id) VALUES (?)",
      [userId]
    );
  }

  async applyStatUpdates(
    connection,
    userId,
    pointsDelta = 0,
    statsDelta = {},
    { allowNegativeLifetime = false } = {}
  ) {
    const updates = [];
    const params = [];

    if (pointsDelta !== 0) {
      updates.push("total_points = GREATEST(total_points + ?, 0)");
      params.push(pointsDelta);

      if (pointsDelta > 0 || allowNegativeLifetime) {
        const lifetimeDelta = pointsDelta > 0 ? pointsDelta : 0;
        updates.push("lifetime_points = GREATEST(lifetime_points + ?, 0)");
        params.push(lifetimeDelta);
      }

      updates.push("last_rewarded_at = NOW()");
    }

    Object.entries(statsDelta || {}).forEach(([column, delta]) => {
      if (!delta) return;
      updates.push(`${column} = GREATEST(${column} + ?, 0)`);
      params.push(delta);
    });

    updates.push("updated_at = NOW()");
    params.push(userId);

    if (updates.length <= 1) return; // only updated_at -- skip

    await connection.query(
      `UPDATE user_gamification_stats SET ${updates.join(
        ", "
      )} WHERE user_id = ?`,
      params
    );
  }

  async recordAction({
    userId,
    action,
    eventId = null,
    pointsDelta = 0,
    metadata = {},
    dedupeKey,
    statsDelta = {},
    allowNegativeLifetime = false,
  }) {
    if (!userId || !action || !dedupeKey) {
      return { skipped: true, reason: "missing_fields" };
    }

    return this.withTransaction(async (conn) => {
      await this.ensureStatsRow(userId, conn);

      const payload = metadata ? JSON.stringify(metadata) : null;

      const [insertResult] = await conn.query(
        `INSERT IGNORE INTO gamification_events
           (user_id, event_id, action, points_delta, metadata, dedupe_key)
         VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)`,
        [userId, eventId, action, pointsDelta, payload, dedupeKey]
      );

      if (insertResult.affectedRows === 0) {
        return { skipped: true, reason: "duplicate" };
      }

      await this.applyStatUpdates(conn, userId, pointsDelta, statsDelta, {
        allowNegativeLifetime,
      });

      return { skipped: false, pointsDelta };
    });
  }

  async bumpStreak(userId, windowHours = 48) {
    const pool = getPool();
    await this.ensureStatsRow(userId);

    const [[stats]] = await pool.query(
      "SELECT current_streak, longest_streak, last_streak_event FROM user_gamification_stats WHERE user_id = ?",
      [userId]
    );

    const now = Date.now();
    const lastEvent = stats?.last_streak_event
      ? new Date(stats.last_streak_event).getTime()
      : null;

    let newStreak = 1;
    if (lastEvent) {
      const diffHours = (now - lastEvent) / (1000 * 60 * 60);
      if (diffHours <= windowHours) {
        newStreak = (stats?.current_streak || 0) + 1;
      }
    }

    const longest = Math.max(stats?.longest_streak || 0, newStreak);

    await pool.query(
      `UPDATE user_gamification_stats
         SET current_streak = ?,
             longest_streak = ?,
             last_streak_event = NOW()
       WHERE user_id = ?`,
      [newStreak, longest, userId]
    );

    return { currentStreak: newStreak, longestStreak: longest };
  }

  async syncLevel(userId) {
    const pool = getPool();
    const [[stats]] = await pool.query(
      "SELECT lifetime_points, current_level FROM user_gamification_stats WHERE user_id = ?",
      [userId]
    );

    if (!stats) {
      await this.ensureStatsRow(userId);
      return this.syncLevel(userId);
    }

    const thresholds = await this.getPointsThresholds();

    // Determine current level from lifetime_points using thresholds (hard-stop)
    const lifetime = Number(stats.lifetime_points || 0);
    let newLevel = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      const t = thresholds[i];
      if (lifetime >= Number(t.points_cumulative)) {
        newLevel = t.level;
        break;
      }
    }

    // Compute points to next level
    const next = thresholds.find((t) => t.level === newLevel + 1);
    const pointsToNext = next ? Math.max(0, Number(next.points_cumulative) - lifetime) : 0;

    await pool.query(
      "UPDATE user_gamification_stats SET current_level = ?, points_to_next_level = ? WHERE user_id = ?",
      [newLevel, pointsToNext, userId]
    );

    return newLevel;
  }

  async getStats(userId) {
    const pool = getPool();
    await this.ensureStatsRow(userId);
    const [[stats]] = await pool.query(
      "SELECT * FROM user_gamification_stats WHERE user_id = ?",
      [userId]
    );
    return stats;
  }

  async getRecentEvents(userId, limit = 10) {
    const pool = getPool();
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const [rows] = await pool.query(
      `SELECT action, points_delta, metadata, created_at
         FROM gamification_events
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [userId, safeLimit]
    );

    return rows.map((row) => ({
      ...row,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata,
    }));
  }

  async getUserLevelStats(userId) {
    const pool = getPool();
    await this.ensureStatsRow(userId);
    const [[row]] = await pool.query(
      `SELECT u.user_id, u.role_id, u.uid, s.total_points, s.lifetime_points, s.current_level, s.points_to_next_level
         FROM user_gamification_stats s
         JOIN users u ON u.user_id = s.user_id
         WHERE s.user_id = ?`,
      [userId]
    );
    return row || null;
  }

  async updateUserLevel(userId, newLevel, pointsToNext) {
    const pool = getPool();
    await pool.query(
      `UPDATE user_gamification_stats SET current_level = ?, points_to_next_level = ?, updated_at = NOW() WHERE user_id = ?`,
      [newLevel, pointsToNext, userId]
    );
    // Invalidate any caches elsewhere
    return true;
  }

  async getUserBadges(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM view_user_badges WHERE user_id = ? ORDER BY earned_date DESC`,
      [userId]
    );
    return rows;
  }

  async getBadgeCatalog() {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT *
         FROM achievements
        WHERE badge_code IS NOT NULL AND is_active = 1
        ORDER BY display_order ASC, achievement_id ASC`
    );
    return rows;
  }

  async grantBadge(userId, badge, { awardedByUserId = null } = {}) {
    if (!badge?.achievement_id) return false;

    return this.withTransaction(async (conn) => {
      await this.ensureStatsRow(userId, conn);
      const [insertResult] = await conn.query(
        `INSERT IGNORE INTO user_achievements
           (user_id, achievement_id, earned_date, awarded_by_user_id)
         VALUES (?, ?, CURDATE(), ?)`,
        [userId, badge.achievement_id, awardedByUserId]
      );

      if (insertResult.affectedRows === 0) {
        return false;
      }

      await conn.query(
        `UPDATE user_gamification_stats
            SET badges_earned = badges_earned + 1,
                last_badge_awarded_at = NOW()
          WHERE user_id = ?`,
        [userId]
      );

      return true;
    });
  }

  async getBadgeByCode(badgeCode) {
    if (!badgeCode) return null;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM achievements WHERE badge_code = ? LIMIT 1`,
      [badgeCode]
    );
    return rows[0] || null;
  }

  async recalculateUser(userId) {
    const pool = getPool();
    await this.ensureStatsRow(userId);

    const [[points]] = await pool.query(
      `SELECT
         COALESCE(SUM(points_delta), 0) AS total_points,
         COALESCE(SUM(CASE WHEN points_delta > 0 THEN points_delta ELSE 0 END), 0) AS lifetime_points
       FROM gamification_events
       WHERE user_id = ?`,
      [userId]
    );

    const [[participation]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status IN ('registered','waitlisted') THEN 1 ELSE 0 END) AS registered,
         SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) AS attended
       FROM event_participants
       WHERE user_id = ?`,
      [userId]
    );

    const [[hosted]] = await pool.query(
      `SELECT COUNT(*) AS hosted FROM events WHERE created_by_user_id = ?`,
      [userId]
    );

    const [[badges]] = await pool.query(
      `SELECT COUNT(*) AS badges FROM user_achievements WHERE user_id = ?`,
      [userId]
    );

    await pool.query(
      `UPDATE user_gamification_stats
          SET total_points = ?,
              lifetime_points = ?,
              events_registered = COALESCE(?, 0),
              events_attended = COALESCE(?, 0),
              events_hosted = COALESCE(?, 0),
              badges_earned = COALESCE(?, 0),
              updated_at = NOW()
        WHERE user_id = ?`,
      [
        points?.total_points ?? 0,
        points?.lifetime_points ?? 0,
        participation?.registered ?? 0,
        participation?.attended ?? 0,
        hosted?.hosted ?? 0,
        badges?.badges ?? 0,
        userId,
      ]
    );

    await this.syncLevel(userId);
    return this.getStats(userId);
  }

  async getLeaderboard({ period = "all", limit = 20 }) {
    const pool = getPool();
    const safeLimit = Math.max(1, Math.min(limit, 50));

    if (period === "monthly") {
      const [rows] = await pool.query(
        `SELECT ge.user_id, u.name, u.email, u.profile_picture, ugs.current_level, r.role, SUM(ge.points_delta) AS points
           FROM gamification_events ge
           JOIN users u ON ge.user_id = u.user_id
           LEFT JOIN user_gamification_stats ugs ON u.user_id = ugs.user_id
           JOIN roles r ON u.role_id = r.role_id
          WHERE ge.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND r.role = 'volunteer'
          GROUP BY ge.user_id, u.name, u.email, u.profile_picture, ugs.current_level, r.role
          HAVING points > 0
          ORDER BY points DESC
          LIMIT ?`,
        [safeLimit]
      );
      return rows;
    }

    const [rows] = await pool.query(
      `SELECT ugs.user_id, u.name, u.email, u.profile_picture, ugs.current_level, r.role, ugs.total_points AS points
         FROM user_gamification_stats ugs
         JOIN users u ON ugs.user_id = u.user_id
         JOIN roles r ON u.role_id = r.role_id AND r.role = 'volunteer'
        ORDER BY ugs.total_points DESC
        LIMIT ?`,
      [safeLimit]
    );
    return rows;
  }

  async getLeaderboardFull({ period = 'all', limit = 100, offset = 0, aroundUserId = null } = {}) {
    const pool = getPool();
    const safeLimit = Math.max(1, Math.min(limit, 500));
    let safeOffset = Math.max(0, Number(offset) || 0);

    // If aroundUserId is provided, compute their rank and center the slice around them
    if (aroundUserId) {
      // compute rank for the user depending on period using point counts (no window functions)
      if (period === 'monthly') {
        const [[userPointsRow]] = await pool.query(
          `SELECT SUM(ge.points_delta) AS user_points
             FROM gamification_events ge
             JOIN users u ON ge.user_id = u.user_id
             JOIN roles r ON u.role_id = r.role_id
            WHERE ge.user_id = ? AND ge.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND r.role = 'volunteer'
            LIMIT 1`,
          [aroundUserId]
        );
        const userPoints = (userPointsRow && userPointsRow.user_points) || 0;
        const [[userRankRow]] = await pool.query(
          `SELECT COUNT(*) + 1 AS rnk FROM (
             SELECT SUM(ge.points_delta) AS points
               FROM gamification_events ge
               JOIN users u ON ge.user_id = u.user_id
               JOIN roles r ON u.role_id = r.role_id
              WHERE ge.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND r.role = 'volunteer'
              GROUP BY ge.user_id
              HAVING points > ?
           ) t`,
          [userPoints]
        );
        if (userRankRow && userRankRow.rnk) {
          safeOffset = Math.max(0, userRankRow.rnk - Math.floor(safeLimit / 2));
        }
      } else {
        const [[userPointsRow]] = await pool.query(
          `SELECT ugs.total_points AS user_points FROM user_gamification_stats ugs WHERE ugs.user_id = ? LIMIT 1`,
          [aroundUserId]
        );
        const userPoints = (userPointsRow && userPointsRow.user_points) || 0;
        const [[userRankRow]] = await pool.query(
          `SELECT COUNT(*) + 1 AS rnk
             FROM user_gamification_stats ugs
             JOIN users u ON ugs.user_id = u.user_id
             JOIN roles r ON u.role_id = r.role_id
            WHERE r.role = 'volunteer' AND ugs.total_points > ?`,
          [userPoints]
        );
        if (userRankRow && userRankRow.rnk) {
          safeOffset = Math.max(0, userRankRow.rnk - Math.floor(safeLimit / 2));
        }
      }
    }

    if (period === 'monthly') {
      // total count of active monthly contributors (points > 0)
      const [totalRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM (
           SELECT ge.user_id, SUM(ge.points_delta) AS points
             FROM gamification_events ge
             JOIN users u ON ge.user_id = u.user_id
             JOIN roles r ON u.role_id = r.role_id
            WHERE ge.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND r.role = 'volunteer'
            GROUP BY ge.user_id
            HAVING points > 0
         ) t`
      );
      const total = (totalRows && totalRows[0] && totalRows[0].total) || 0;

      const [rowsRaw] = await pool.query(
        `SELECT u.user_id, u.name, u.email, u.profile_picture, COALESCE(ugs.current_level, 1) AS current_level, SUM(ge.points_delta) AS points
           FROM gamification_events ge
           JOIN users u ON ge.user_id = u.user_id
           LEFT JOIN user_gamification_stats ugs ON u.user_id = ugs.user_id
           JOIN roles r ON u.role_id = r.role_id
          WHERE ge.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND r.role = 'volunteer'
          GROUP BY u.user_id, u.name, u.email, u.profile_picture, ugs.current_level
          HAVING points > 0
          ORDER BY points DESC
          LIMIT ? OFFSET ?`,
        [safeLimit, safeOffset]
      );

      const rows = (rowsRaw || []).map((row, idx) => ({ ...row, rank: safeOffset + idx + 1 }));

      return { total, entries: rows };
    }

    // all-time leaderboard
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM user_gamification_stats ugs
         JOIN users u ON ugs.user_id = u.user_id
         JOIN roles r ON u.role_id = r.role_id
        WHERE r.role = 'volunteer'`
    );

    const total = (totalRows && totalRows[0] && totalRows[0].total) || 0;

    const [rowsRaw] = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.profile_picture, ugs.current_level, ugs.total_points AS points
         FROM user_gamification_stats ugs
         JOIN users u ON ugs.user_id = u.user_id
         JOIN roles r ON u.role_id = r.role_id
        WHERE r.role = 'volunteer'
        ORDER BY ugs.total_points DESC
        LIMIT ? OFFSET ?`,
      [safeLimit, safeOffset]
    );

    const rows = (rowsRaw || []).map((row, idx) => ({ ...row, rank: safeOffset + idx + 1 }));

    return { total, entries: rows };
  }

  async initializeUserLevelStats(userId) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO user_gamification_stats
       (user_id, total_points, lifetime_points, current_level, points_to_next_level, created_at, updated_at)
       VALUES (?, 0, 0, 1, 125, NOW(), NOW())
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [userId]
    );
    return true;
  }

  /* Achievement mapping repository helpers */

  async getAchievementMappings({ eventId = null, eventType = null, triggerAction = null, targetRole = null } = {}) {
    const pool = getPool();
    const clauses = ["eam.is_active = 1"];
    const params = [];

    if (eventId !== null) {
      clauses.push("(eam.event_id = ?)");
      params.push(eventId);
    }

    if (eventType !== null) {
      clauses.push("(eam.event_type = ?)");
      params.push(eventType);
    }

    if (triggerAction !== null) {
      clauses.push("eam.trigger_action = ?");
      params.push(triggerAction);
    }

    if (targetRole !== null) {
      // allow explicit target role OR 'any' wildcard to match all roles
      clauses.push("((eam.target_role = ?) OR (eam.target_role = 'any'))");
      params.push(targetRole);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT eam.*, a.achievement_name, a.badge_code, a.achievement_points
         FROM event_achievement_mappings eam
         JOIN achievements a ON eam.achievement_id = a.achievement_id
         ${where}
         ORDER BY eam.mapping_id ASC`,
      params
    );

    return rows || [];
  }

  async createAchievementMapping({ achievementId, eventId = null, eventType = null, triggerAction = 'EVENT_ATTEND', targetRole = 'volunteer', createdBy = null }) {
    const pool = getPool();
    const [res] = await pool.query(
      `INSERT INTO event_achievement_mappings (achievement_id, event_id, event_type, trigger_action, target_role, is_active, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [achievementId, eventId, eventType, triggerAction, targetRole, createdBy]
    );

    const mappingId = res.insertId;
    const [[row]] = await pool.query(
      `SELECT eam.*, a.achievement_name, a.badge_code, a.achievement_points
         FROM event_achievement_mappings eam
         JOIN achievements a ON eam.achievement_id = a.achievement_id
         WHERE eam.mapping_id = ? LIMIT 1`,
      [mappingId]
    );

    return row || null;
  }

  async updateAchievementMapping(mappingId, updates = {}) {
    const pool = getPool();
    const allowed = ['event_id', 'event_type', 'trigger_action', 'target_role', 'is_active'];
    const sets = [];
    const params = [];

    Object.entries(updates).forEach(([k, v]) => {
      if (!allowed.includes(k)) return;
      sets.push(`${k} = ?`);
      params.push(v);
    });

    if (sets.length === 0) return null;

    params.push(mappingId);
    await pool.query(`UPDATE event_achievement_mappings SET ${sets.join(', ')} WHERE mapping_id = ?`, params);

    const [[row]] = await pool.query(
      `SELECT eam.*, a.achievement_name, a.badge_code, a.achievement_points
         FROM event_achievement_mappings eam
         JOIN achievements a ON eam.achievement_id = a.achievement_id
         WHERE eam.mapping_id = ? LIMIT 1`,
      [mappingId]
    );

    return row || null;
  }

  async deleteAchievementMapping(mappingId) {
    const pool = getPool();
    const [res] = await pool.query(`DELETE FROM event_achievement_mappings WHERE mapping_id = ?`, [mappingId]);
    return res.affectedRows > 0;
  }

  async getAchievementsForEvent({ eventId = null, eventType = null, triggerAction = null, targetRole = null } = {}) {
    const pool = getPool();
    const clauses = ["eam.is_active = 1"];
    const params = [];

    if (triggerAction) {
      clauses.push("eam.trigger_action = ?");
      params.push(triggerAction);
    }

    if (eventId !== null) {
      clauses.push("(eam.event_id = ?)");
      params.push(eventId);
    }

    if (eventType !== null) {
      clauses.push("(eam.event_type = ?)");
      params.push(eventType);
    }

    if (targetRole !== null) {
      // allow explicit target role OR 'any' wildcard to match all roles
      clauses.push("((eam.target_role = ?) OR (eam.target_role = 'any'))");
      params.push(targetRole);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT DISTINCT a.*
         FROM event_achievement_mappings eam
         JOIN achievements a ON eam.achievement_id = a.achievement_id
         ${where}
         ORDER BY a.achievement_id ASC`,
      params
    );

    return rows || [];
  }
}

module.exports = new GamificationRepository();

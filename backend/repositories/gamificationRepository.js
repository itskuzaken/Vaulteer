const { getPool } = require("../db/pool");
const { calculateLevel } = require("../config/gamificationRules");

class GamificationRepository {
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
      "SELECT total_points FROM user_gamification_stats WHERE user_id = ?",
      [userId]
    );

    if (!stats) {
      await this.ensureStatsRow(userId);
      return this.syncLevel(userId);
    }

    const level = calculateLevel(stats.total_points);
    await pool.query(
      "UPDATE user_gamification_stats SET current_level = ? WHERE user_id = ?",
      [level, userId]
    );
    return level;
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
        `SELECT ge.user_id, u.name, u.email, SUM(ge.points_delta) AS points
           FROM gamification_events ge
           JOIN users u ON ge.user_id = u.user_id
          WHERE ge.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY ge.user_id, u.name, u.email
          HAVING points > 0
          ORDER BY points DESC
          LIMIT ?`,
        [safeLimit]
      );
      return rows;
    }

    const [rows] = await pool.query(
      `SELECT ugs.user_id, u.name, u.email, ugs.total_points AS points
         FROM user_gamification_stats ugs
         JOIN users u ON ugs.user_id = u.user_id
        ORDER BY ugs.total_points DESC
        LIMIT ?`,
      [safeLimit]
    );
    return rows;
  }
}

module.exports = new GamificationRepository();

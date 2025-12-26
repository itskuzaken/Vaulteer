const gamificationRepository = require("../repositories/gamificationRepository");
const systemSettingsRepository = require("../repositories/systemSettingsRepository");
const {
  ACTION_CONFIG,
  GAMIFICATION_ACTIONS,
  STREAK_CONFIG,
  pointsToNextLevel,
} = require("../config/gamificationRules");
const { logHelpers } = require("./activityLogService");
const notificationService = require("./notificationService");

// Mapping from gamification actions to system setting keys
const ACTION_TO_SETTING_KEY = {
  [GAMIFICATION_ACTIONS.EVENT_REGISTER]: 'event_register_points',
  [GAMIFICATION_ACTIONS.WAITLIST_JOIN]: 'waitlist_join_points',
  [GAMIFICATION_ACTIONS.WAITLIST_PROMOTION]: 'waitlist_promotion_points',
  [GAMIFICATION_ACTIONS.EVENT_ATTEND]: 'event_attend_points',
  [GAMIFICATION_ACTIONS.EVENT_CANCEL]: 'event_cancel_points',
  [GAMIFICATION_ACTIONS.EVENT_HOST_PUBLISHED]: 'event_host_published_points',
  [GAMIFICATION_ACTIONS.STREAK_DAY]: 'streak_day_points',
  // Note: BADGE_BONUS and LEVEL_UP_BONUS don't have system settings, keep using ACTION_CONFIG
};

class GamificationService {
  buildDedupeKey(action, userId, eventId = null, suffix = "default") {
    return `${action}:${userId}:${eventId || "none"}:${suffix}`;
  }

  async logAward({ userId, action, pointsDelta, performedBy, metadata }) {
    if (pointsDelta === 0) return;

    const actor = performedBy || {
      userId,
      name: metadata?.userName || "System",
      role: metadata?.userRole || "system",
    };

    await logHelpers.logGamificationAward({
      userId,
      action,
      pointsDelta,
      performedBy: actor,
      metadata: {
        eventId: metadata?.eventId || null,
        eventUid: metadata?.eventUid || null,
        context: metadata,
      },
    });
  }


  async notifyBadgeUnlocked(userId, badge, context = {}) {
    try {
      await notificationService.notifyBadgeUnlocked({
        userId,
        badge,
        context,
      });
    } catch (error) {
      console.warn("Failed to send badge notification", error);
    }
  }

  async notifyPointsAward({ userId, action, pointsDelta, metadata = {} }) {
    try {
      await require('./notificationService').notifyGamificationPoints({ userId, action, pointsDelta, metadata });
    } catch (err) {
      console.warn('notifyPointsAward failed', err?.message || err);
    }
  }

  async awardAction({
    userId,
    action,
    eventId = null,
    eventUid = null,
    metadata = {},
    performedBy = null,
    pointsOverride = null,
    dedupeSuffix = "default",
  }) {
    if (!userId || !action) {
      return { skipped: true, reason: "missing_fields" };
    }

    const config = ACTION_CONFIG[action];
    if (!config) {
      return { skipped: true, reason: "unknown_action" };
    }

    // Get points from system settings if available, otherwise use ACTION_CONFIG default

    let pointsFromSettings = null;
    const settingKey = ACTION_TO_SETTING_KEY[action];
    if (settingKey) {
      try {
        pointsFromSettings = await systemSettingsRepository.getSettingValue(
          'gamification',
          settingKey,
          null
        );
      } catch (err) {
        // If settings retrieval fails (e.g., DB not initialized in tests), fall back to defaults
        console.warn('gamificationService: failed to read system setting', settingKey, err?.message || err);
        pointsFromSettings = null;
      }
    }

    const pointsDelta = Number.isFinite(pointsOverride)
      ? pointsOverride
      : (pointsFromSettings !== null ? pointsFromSettings : config.points || 0);

    const dedupeKey = this.buildDedupeKey(
      action,
      userId,
      eventId,
      dedupeSuffix
    );

    const beforeStats = await gamificationRepository.getUserLevelStats(userId);

    const record = await gamificationRepository.recordAction({
      userId,
      action,
      eventId,
      pointsDelta,
      metadata: { ...metadata, eventUid },
      dedupeKey,
      statsDelta: config.stats,
      allowNegativeLifetime: !!config.allowNegative,
    });

    if (record.skipped) {
      return record;
    }

    if (config.streakEligible) {
      await gamificationRepository.bumpStreak(
        userId,
        STREAK_CONFIG.windowHours
      );
    }

    // After applying points, check for level-ups for volunteers
    const afterStats = await gamificationRepository.getUserLevelStats(userId);
    let user = null;
    try {
      user = await require('../repositories/userRepository').getById(userId);
    } catch (err) {
      console.warn('gamificationService: failed to fetch user data', err?.message || err);
      user = null;
    }

    if (user?.role === 'volunteer') {
      await this.checkAndProcessLevelUps(userId, Number(beforeStats?.total_points || 0), Number(afterStats?.total_points || 0), performedBy || null);
    } else {
      // keep sync for non-volunteers (no level changes expected)
      await gamificationRepository.syncLevel(userId);
    }

    const newlyGrantedBadges = await this.evaluateBadges(userId, {
      performedBy,
      triggerAction: action,
      eventId,
      eventUid,
    });

    // Evaluate explicit event->achievement mappings (admin-configured)
    const mappingGrants = await this.evaluateEventAchievementMappings({
      userId,
      userRole: user?.role || null,
      eventId,
      eventType: metadata?.eventType || null,
      triggerAction: action,
      performedBy,
      eventUid,
    });

    await this.logAward({
      userId,
      action,
      pointsDelta,
      performedBy,
      metadata: { ...metadata, eventId, eventUid },
    });

    await this.notifyPointsAward({
      userId,
      action,
      pointsDelta,
      metadata: { ...metadata, eventId, eventUid },
    });

    return {
      ...record,
      action,
      pointsDelta,
      newlyGrantedBadges,
      mappingGrants,
      eventId,
      eventUid,
    };
  }

  decodeMetadata(row) {
    if (!row?.metadata) return row;
    return {
      ...row,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata,
    };
  }

  meetsThreshold(badge, stats) {
    if (!badge?.threshold_type || !badge?.threshold_value) return false;
    const value = Number(badge.threshold_value);
    switch (badge.threshold_type) {
      case "POINTS":
        return (stats?.total_points || 0) >= value;
      case "EVENT_REGISTER":
        return (stats?.events_registered || 0) >= value;
      case "EVENT_ATTEND":
        return (stats?.events_attended || 0) >= value;
      case "EVENT_HOST":
        return (stats?.events_hosted || 0) >= value;
      case "STREAK_DAYS":
        return (stats?.longest_streak || 0) >= value;
      default:
        return false;
    }
  }

  async evaluateBadges(userId, context = {}) {
    const [stats, catalog, ownedBadges] = await Promise.all([
      gamificationRepository.getStats(userId),
      gamificationRepository.getBadgeCatalog(),
      gamificationRepository.getUserBadges(userId),
    ]);

    const ownedBadgesList = Array.isArray(ownedBadges) ? ownedBadges : [];
    const catalogList = Array.isArray(catalog) ? catalog : [];
    const ownedCodes = new Set(ownedBadgesList.map((badge) => badge.badge_code));
    const newlyGranted = [];

    // iterate the normalized catalog list (avoid referencing possibly undefined original value)
    for (const badge of catalogList) {
      if (!badge.badge_code || ownedCodes.has(badge.badge_code)) continue;
      if (!this.meetsThreshold(badge, stats)) continue;

      const granted = await gamificationRepository.grantBadge(userId, badge, {
        awardedByUserId: context?.performedBy?.userId || null,
      });

      if (!granted) continue;
      ownedCodes.add(badge.badge_code);
      newlyGranted.push(badge);

      await logHelpers.logBadgeAwarded({
        userId,
        badgeCode: badge.badge_code,
        badgeName: badge.achievement_name,
        performedBy: context?.performedBy || null,
        metadata: {
          eventId: context?.eventId || null,
          eventUid: context?.eventUid || null,
          triggerAction: context?.triggerAction,
          thresholdType: badge.threshold_type,
          thresholdValue: badge.threshold_value,
        },
      });

      await this.notifyBadgeUnlocked(userId, badge, context);

      if (badge.achievement_points) {
        const bonusRecord = await gamificationRepository.recordAction({
          userId,
          action: GAMIFICATION_ACTIONS.BADGE_BONUS,
          eventId: context?.eventId || null,
          pointsDelta: badge.achievement_points,
          metadata: { badgeCode: badge.badge_code },
          dedupeKey: this.buildDedupeKey(
            GAMIFICATION_ACTIONS.BADGE_BONUS,
            userId,
            badge.badge_code,
            "badge"
          ),
        });

        if (!bonusRecord.skipped) {
          const logMetadata = {
            badgeCode: badge.badge_code,
            badgeName: badge.achievement_name,
            eventId: context?.eventId || null,
            eventUid: context?.eventUid || null,
          };

          await this.logAward({
            userId,
            action: GAMIFICATION_ACTIONS.BADGE_BONUS,
            pointsDelta: badge.achievement_points,
            performedBy: context?.performedBy || null,
            metadata: logMetadata,
          });

          await this.notifyPointsAward({
            userId,
            action: GAMIFICATION_ACTIONS.BADGE_BONUS,
            pointsDelta: badge.achievement_points,
            metadata: logMetadata,
          });
        }
      }
    }

    if (newlyGranted.length) {
      await gamificationRepository.syncLevel(userId);
    }

    return newlyGranted;
  }

  async getSummary(userId) {
    const [stats, badges, events] = await Promise.all([
      gamificationRepository.getStats(userId),
      gamificationRepository.getUserBadges(userId),
      gamificationRepository.getRecentEvents(userId, 10),
    ]);

    // Calculate level data using the new threshold system
    const thresholds = await gamificationRepository.getPointsThresholds();
    const totalPoints = stats?.total_points || 0;

    // Calculate current level dynamically based on total points
    // Find the highest level where cumulative threshold <= total points
    let currentLevel = 1;
    for (const threshold of thresholds) {
      if (totalPoints >= Number(threshold.points_cumulative)) {
        currentLevel = threshold.level;
      } else {
        break; // thresholds are ordered by level, so we can stop here
      }
    }

    // Find current level threshold (cumulative points needed to reach current level)
    const currentLevelThreshold = thresholds.find(t => t.level === currentLevel);
    const currentThreshold = currentLevelThreshold ? Number(currentLevelThreshold.points_cumulative) : 0;

    // Find next level threshold (cumulative points needed to reach next level)
    const nextLevelThreshold = thresholds.find(t => t.level === currentLevel + 1);
    const nextThreshold = nextLevelThreshold ? Number(nextLevelThreshold.points_cumulative) : null;

    // Calculate points to next level
    const pointsToNext = nextThreshold ? Math.max(0, nextThreshold - totalPoints) : 0;
    const isMaxLevel = !nextLevelThreshold;

    const levelData = {
      currentLevel,
      currentThreshold,
      nextThreshold,
      pointsToNext,
      isMaxLevel,
    };

    return {
      stats,
      badges,
      recentEvents: events.map((row) => this.decodeMetadata(row)),
      levelData,
    };
  }

  async getLeaderboard({ period = "all", limit = 20 } = {}) {
    return gamificationRepository.getLeaderboard({ period, limit });
  }

  async getLeaderboardFull({ period = 'all', limit = 100, offset = 0, aroundUserId = null } = {}) {
    // Simple wrapper to repository implementation; can apply service-level caching or enrichment here later
    return gamificationRepository.getLeaderboardFull({ period, limit, offset, aroundUserId });
  }

  async recalculateUser(userId) {
    return gamificationRepository.recalculateUser(userId);
  }

  async getUserAchievements(userId) {
    const progress = await require('../repositories/achievementRepository').getUserProgresses(userId);
    const earned = await require('../repositories/achievementRepository').getUserEarned(userId);
    return { progress, earned };
  }

  // Public listing for volunteer/catalog views (filters out inactive achievements)
  async listPublicAchievements() {
    const rows = await require('../repositories/achievementRepository').listAchievements();
    const list = Array.isArray(rows) ? rows : [];
    return list
      .filter((r) => r && (r.is_active === 1 || r.is_active === true))
      .map((r) => {
        const badgeMap = r.badge_s3_keys ? (typeof r.badge_s3_keys === 'string' ? JSON.parse(r.badge_s3_keys) : r.badge_s3_keys) : null;
        const singleKey = r.badge_s3_key || r.achievement_icon || null;
        return {
          achievement_id: r.achievement_id,
          badge_code: r.badge_code,
          achievement_name: r.achievement_name,
          achievement_description: r.achievement_description,
          thresholds: r.thresholds ? (typeof r.thresholds === 'string' ? JSON.parse(r.thresholds) : r.thresholds) : null,
          threshold_type: r.threshold_type || null,
          threshold_value: r.threshold_value || null,
          tier_points: r.tier_points || null,
          achievement_points: r.achievement_points || null,
          badge_s3_keys: badgeMap || (singleKey ? { single: singleKey } : null),
          display_order: r.display_order || 0,
        };
      });
  }

  // Returns merged catalog + user progress and presigned URLs for display
  async getUserAchievementsFull(userId) {
    const s3Service = require('./s3Service');
    const repo = require('../repositories/achievementRepository');
    const [catalog, progressRows, earnedRows] = await Promise.all([
      this.listPublicAchievements(),
      repo.getUserProgresses(userId),
      repo.getUserEarned(userId),
    ]);

    const progressMap = (Array.isArray(progressRows) ? progressRows : []).reduce((acc, p) => {
      if (p && p.achievement_code) acc[p.achievement_code] = p;
      return acc;
    }, {});

    const earnedSet = new Set((Array.isArray(earnedRows) ? earnedRows : []).map((r) => r.achievement_id || r.badge_code));

    // Build list of required s3 keys to presign (unique)
    const s3KeysNeeded = new Set();
    for (const ach of catalog) {
      const keys = ach.badge_s3_keys || {};
      for (const k of Object.values(keys || {})) {
        if (k) s3KeysNeeded.add(k);
      }
    }

    // Presign all keys in parallel (best-effort). Use a short TTL from s3Service default
    const presignedMap = {};
    await Promise.all(
      Array.from(s3KeysNeeded).map(async (k) => {
        try {
          presignedMap[k] = await s3Service.getPresignedDownloadUrl(k);
        } catch (err) {
          // don't throw — just omit URL for that key
          presignedMap[k] = null;
        }
      })
    );

    // Merge catalog with user progress
    const merged = catalog.map((ach) => {
      const code = ach.badge_code;
      const p = progressMap[code] || { current_count: 0, badge_level: null, last_updated_at: null };
      const earned = !!(earnedSet.has(ach.achievement_id) || earnedSet.has(code));

      // Determine nextThreshold and progressPercent
      let progressPercent = 0;
      let nextThreshold = null;
      if (ach.thresholds && typeof ach.thresholds === 'object') {
        // thresholds object: { bronze, silver, gold }
        const thresholds = ach.thresholds;
        const levels = ['bronze','silver','gold'];
        // find the next threshold after current_count
        const currentCount = Number(p.current_count || 0);
        let lower = 0; let upper = 0; let found = false;
        for (const lvl of levels) {
          if (typeof thresholds[lvl] === 'number' && Number.isFinite(thresholds[lvl])) {
            const val = Number(thresholds[lvl]);
            if (currentCount < val) {
              lower = lower || 0;
              upper = val;
              nextThreshold = { tier: lvl, value: val };
              progressPercent = Math.min(100, Math.round((currentCount / val) * 100));
              found = true;
              break;
            }
            lower = val;
          }
        }
        if (!found) {
          // either at or past the highest tier
          progressPercent = earned ? 100 : 0;
        }
      } else if (ach.threshold_value && Number.isFinite(Number(ach.threshold_value))) {
        const currentCount = Number(p.current_count || 0);
        const target = Number(ach.threshold_value);
        progressPercent = Math.min(100, Math.round((currentCount / target) * 100));
        nextThreshold = { tier: 'default', value: target };
      } else {
        progressPercent = earned ? 100 : 0;
      }

      // Build badge_s3_url_map from presignedMap
      const urlMap = {};
      const keys = ach.badge_s3_keys || {};
      for (const [tier, k] of Object.entries(keys || {})) {
        urlMap[tier] = k ? presignedMap[k] || null : null;
      }

      return {
        ...ach,
        current_count: p.current_count || 0,
        badge_level: p.badge_level || null,
        last_updated_at: p.last_updated_at || null,
        earned,
        progressPercent,
        nextThreshold,
        badge_s3_url_map: urlMap,
      };
    });

    return merged;
  }

  // Batch presign GET URLs for given keys
  async presignBadgeGetUrls(keys = []) {
    if (!Array.isArray(keys)) throw new Error('keys must be an array');
    const s3Service = require('./s3Service');
    const result = {};
    await Promise.all(
      keys.map(async (k) => {
        try {
          result[k] = await s3Service.getPresignedDownloadUrl(k);
        } catch (err) {
          result[k] = null;
        }
      })
    );
    return result;
  }

  async getLevelThresholds() {
    return gamificationRepository.getPointsThresholds();
  }

  async getLevelProgress(userId, authUser = null) {
    const stats = await gamificationRepository.getUserLevelStats(userId);
    const thresholds = await gamificationRepository.getPointsThresholds();
    const next = thresholds.find((t) => t.level === (stats.current_level || 1) + 1) || null;
    return {
      current_level: stats.current_level,
      lifetime_points: stats.lifetime_points,
      total_points: stats.total_points,
      points_to_next_level: stats.points_to_next_level,
      next_level_rewards: next || null,
      eligibleForLeveling: authUser?.role === 'volunteer',
    };
  }

  /* Admin helpers: achievements and mapping management */
  async listAchievements() {
    return require('../repositories/achievementRepository').listAchievements();
  }

  async getAchievement(achievementId) {
    return require('../repositories/achievementRepository').getAchievementById(achievementId);
  }

  async createAchievement(data = {}, performedBy = null) {
    const repo = require('../repositories/achievementRepository');
    const created = await repo.createAchievement(data);
    await repo.insertAchievementChangeAudit({ achievementId: created?.achievement_id || null, changedByUserId: performedBy?.userId || null, changeType: 'create', payload: created });
    return created;
  }

  async updateAchievement(achievementId, updates = {}, performedBy = null) {
    const repo = require('../repositories/achievementRepository');
    const updated = await repo.updateAchievement(achievementId, updates);
    await repo.insertAchievementChangeAudit({ achievementId, changedByUserId: performedBy?.userId || null, changeType: 'update', payload: updates });
    return updated;
  }

  async deleteAchievement(achievementId, performedBy = null) {
    const repo = require('../repositories/achievementRepository');
    const res = await repo.softDeleteAchievement(achievementId, performedBy?.userId || null);
    return res;
  }

  async getAchievementAudit(achievementId, limit = 50) {
    return require('../repositories/achievementRepository').getAchievementAudit(achievementId, limit);
  }

  async listAchievementMappings({ eventId = null, eventType = null, triggerAction = null, targetRole = null } = {}) {
    return gamificationRepository.getAchievementMappings({ eventId, eventType, triggerAction, targetRole });
  }

  async createAchievementMapping({ achievement_id, event_id = null, event_type = null, trigger_action = 'EVENT_ATTEND', target_role = 'volunteer', created_by = null }) {
    const allowedTriggers = ['EVENT_REGISTER','EVENT_ATTEND','EVENT_HOST_PUBLISHED','EVENT_CANCEL','ANY'];
    const allowedRoles = ['volunteer','staff','admin','any'];

    if (!achievement_id) {
      throw new Error('achievement_id is required');
    }

    if (!allowedTriggers.includes(trigger_action)) {
      throw new Error('invalid trigger_action');
    }

    if (!allowedRoles.includes(target_role)) {
      throw new Error('invalid target_role');
    }

    return gamificationRepository.createAchievementMapping({
      achievementId: achievement_id,
      eventId: event_id,
      eventType: event_type,
      triggerAction: trigger_action,
      targetRole: target_role,
      createdBy: created_by,
    });
  }

  async updateAchievementMapping(mappingId, updates = {}) {
    const allowedTriggers = ['EVENT_REGISTER','EVENT_ATTEND','EVENT_HOST_PUBLISHED','EVENT_CANCEL','ANY'];
    const allowedRoles = ['volunteer','staff','admin','any'];

    if (updates.trigger_action && !allowedTriggers.includes(updates.trigger_action)) {
      throw new Error('invalid trigger_action');
    }

    if (updates.target_role && !allowedRoles.includes(updates.target_role)) {
      throw new Error('invalid target_role');
    }

    const dbUpdates = {};
    if (updates.event_id !== undefined) dbUpdates.event_id = updates.event_id;
    if (updates.event_type !== undefined) dbUpdates.event_type = updates.event_type;
    if (updates.trigger_action !== undefined) dbUpdates.trigger_action = updates.trigger_action;
    if (updates.target_role !== undefined) dbUpdates.target_role = updates.target_role;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    return gamificationRepository.updateAchievementMapping(mappingId, dbUpdates);
  }

  async deleteAchievementMapping(mappingId) {
    return gamificationRepository.deleteAchievementMapping(mappingId);
  }

  // Badge upload helpers
  async presignBadgeUpload(achievementId, contentType = 'image/png', tier = 'single') {
    // Choose deterministic key based on achievement badge_code when available so tier uploads overwrite existing tiers
    const repo = require('../repositories/achievementRepository');
    let row = null;
    try {
      row = await repo.getAchievementById(achievementId);
    } catch (e) {
      // If DB isn't available (e.g., in unit tests) fall back to deterministic key
      row = null;
    }
    const badgeCode = row && row.badge_code ? row.badge_code : `achievement_${achievementId}`;

    const extension = contentType === 'image/svg+xml' ? 'svg' : contentType === 'image/jpeg' ? 'jpg' : 'png';
    const key = `achievement_badges/${badgeCode}/${tier}.${extension}`;
    const uploadUrl = await require('./s3Service').getPresignedUploadUrl(key, contentType);
    return { uploadUrl, s3Key: key };
  }

  async saveAchievementBadge(achievementId, s3Key, performedBy = null, tier = 'single') {
    const pool = require('../db/pool').getPool();
    console.log(`[gamificationService] saveAchievementBadge called achievementId=${achievementId} tier=${tier} s3Key=${s3Key}`);
    // Fetch current row to determine old key (use query for broader compatibility)
    const [oldRows] = await pool.query('SELECT * FROM achievements WHERE achievement_id = ? LIMIT 1', [achievementId]);
    const oldRow = (Array.isArray(oldRows) && oldRows[0]) ? oldRows[0] : (oldRows && oldRows[0]) ? oldRows[0] : null;

    // Determine update strategy: prefer badge_s3_keys JSON column if present
    const exec = typeof pool.execute === 'function' ? pool.execute.bind(pool) : pool.query.bind(pool);
    try {
      const [[colCheck]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_keys'");
      const hasBadgeKeys = colCheck && Number(colCheck.c) > 0;

      if (hasBadgeKeys) {
        // Read existing JSON map
        const current = oldRow && oldRow.badge_s3_keys ? (typeof oldRow.badge_s3_keys === 'string' ? JSON.parse(oldRow.badge_s3_keys) : oldRow.badge_s3_keys) : {};
        const oldKey = current && current[tier] ? current[tier] : null;

        // Update JSON map locally
        current[tier] = s3Key;
        await exec('UPDATE achievements SET badge_s3_keys = ? WHERE achievement_id = ?', [JSON.stringify(current), achievementId]);

        // Also update legacy badge_s3_key for compatibility if single-tier or first tier
        if (tier === 'single') {
          try {
            const [[badgeKeyCheck]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_key'");
            if (badgeKeyCheck && Number(badgeKeyCheck.c) > 0) {
              await exec('UPDATE achievements SET badge_s3_key = ? WHERE achievement_id = ?', [s3Key, achievementId]);
            }
          } catch (e) {
            // ignore
          }

          // If achievement_icon column exists, also update it for compatibility with older code and tests
          try {
            const [[iconCheck]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'achievement_icon'");
            if (iconCheck && Number(iconCheck.c) > 0) {
              await exec('UPDATE achievements SET achievement_icon = ? WHERE achievement_id = ?', [s3Key, achievementId]);
            }
          } catch (e) {
            // ignore failures to detect/update legacy column
          }
        }

        // Delete old S3 object if different
        if (oldKey && oldKey !== s3Key) {
          try { await require('./s3Service').deleteImage(oldKey); } catch (e) { /* ignore */ }
        }

        const updated = await require('../repositories/achievementRepository').getAchievementById(achievementId);
        console.log('[gamificationService] updated row (json path):', updated);
        await require('../repositories/achievementRepository').insertAchievementChangeAudit({ achievementId, changedByUserId: performedBy?.userId || null, changeType: 'badge_upload', payload: { tier, s3Key } });
        return updated;
      }

      // Fallback to single-file behavior for legacy schemas
      const oldKeyLegacy = oldRow?.badge_s3_key || oldRow?.achievement_icon || null;

      // Check which legacy columns exist to avoid SQL errors on older schemas
      const [[badgeKeyCol]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_key'");
      const [[iconCol]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'achievement_icon'");
      const hasBadgeKeyCol = badgeKeyCol && Number(badgeKeyCol.c) > 0;
      const hasIconCol = iconCol && Number(iconCol.c) > 0;

      const updates = [];
      const params = [];
      if (hasBadgeKeyCol) {
        updates.push('badge_s3_key = ?');
        params.push(s3Key);
      }
      if (hasIconCol) {
        updates.push('achievement_icon = ?');
        params.push(s3Key);
      }

      if (updates.length > 0) {
        const q = `UPDATE achievements SET ${updates.join(', ')} WHERE achievement_id = ?`;
        params.push(achievementId);
        await exec(q, params);
      }

      if (oldKeyLegacy && oldKeyLegacy !== s3Key) {
        try { await require('./s3Service').deleteImage(oldKeyLegacy); } catch (e) { /* ignore */ }
      }

      const updatedLegacy = await require('../repositories/achievementRepository').getAchievementById(achievementId);
      console.log('[gamificationService] updated row (legacy path):', updatedLegacy);
      await require('../repositories/achievementRepository').insertAchievementChangeAudit({ achievementId, changedByUserId: performedBy?.userId || null, changeType: 'badge_upload', payload: { s3Key } });
      return updatedLegacy;
    } catch (err) {
      // If something goes wrong, rethrow as it's important to signal failure
      throw err;
    }
  }



  async deleteAchievementBadge(achievementId, tier = 'single') {
    const pool = require('../db/pool').getPool();
    const exec = typeof pool.execute === 'function' ? pool.execute.bind(pool) : pool.query.bind(pool);
    // Fetch row (select only columns that exist to avoid SQL errors on older schemas)
    let row;
    try {
      const [[badgeKeyCol]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_key'");
      if (badgeKeyCol && Number(badgeKeyCol.c) > 0) {
        const [[r]] = await pool.query('SELECT badge_s3_key, badge_s3_keys, achievement_icon FROM achievements WHERE achievement_id = ? LIMIT 1', [achievementId]);
        row = r;
      } else {
        const [[r]] = await pool.query('SELECT badge_s3_keys, achievement_icon FROM achievements WHERE achievement_id = ? LIMIT 1', [achievementId]);
        row = r;
      }
    } catch (e) {
      // As a last resort, try a permissive select that may still fail in very old schemas
      const [[r]] = await pool.query('SELECT achievement_icon FROM achievements WHERE achievement_id = ? LIMIT 1', [achievementId]);
      row = r;
    }
    // If pool doesn't support execute (e.g., mocked test pool), use legacy minimal behavior
    if (typeof pool.execute !== 'function') {
      const legacyKey = row?.badge_s3_key || row?.achievement_icon || null;
      if (legacyKey) {
        try { await require('./s3Service').deleteImage(legacyKey); } catch (e) { /* ignore */ }
        try {
          const [[badgeKeyExists]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_key'");
          const [[iconExists]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'achievement_icon'");
          const updates = [];
          const params = [];
          if (iconExists && Number(iconExists.c) > 0) {
            updates.push('achievement_icon = NULL');
          }
          if (badgeKeyExists && Number(badgeKeyExists.c) > 0) {
            updates.push('badge_s3_key = NULL');
          }
          if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            await pool.query(`UPDATE achievements SET ${updates.join(', ')} WHERE achievement_id = ?`, [achievementId]);
          }
        } catch (e) {
          // ignore update errors in legacy mock path
        }
      }
      return true;
    }

    // If JSON map exists, remove the specified tier
    try {
      const [[colCheck]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_keys'");
      const hasBadgeKeys = colCheck && Number(colCheck.c) > 0;
      if (hasBadgeKeys && row && row.badge_s3_keys) {
        let current = typeof row.badge_s3_keys === 'string' ? JSON.parse(row.badge_s3_keys) : row.badge_s3_keys || {};
        if (!tier) {
          const keys = Object.values(current || {});
          for (const k of keys) {
            try { await require('./s3Service').deleteImage(k); } catch (e) { /* ignore */ }
          }
          current = {};
          await exec('UPDATE achievements SET badge_s3_keys = ? WHERE achievement_id = ?', [null, achievementId]);
        } else {
          const keyToDelete = current[tier];
          if (keyToDelete) {
            try { await require('./s3Service').deleteImage(keyToDelete); } catch (e) { /* ignore */ }
            delete current[tier];
            await exec('UPDATE achievements SET badge_s3_keys = ? WHERE achievement_id = ?', [Object.keys(current).length ? JSON.stringify(current) : null, achievementId]);
            try {
              const updatedRow = await require('../repositories/achievementRepository').getAchievementById(achievementId);
              console.log('[gamificationService] post-delete updated row (json path):', updatedRow);
            } catch (e) {
              /* ignore */
            }
          }
        }
        // If single tier was deleted or delete-all was requested, also clear legacy presentation columns if present
        if (tier === 'single' || !tier) {
          try {
            const [[badgeKeyCheck]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_key'");
            if (badgeKeyCheck && Number(badgeKeyCheck.c) > 0 && row.badge_s3_key) {
              await exec('UPDATE achievements SET badge_s3_key = NULL WHERE achievement_id = ?', [achievementId]);
            }
          } catch (e) { /* ignore */ }

          try {
            const [[iconCheck]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'achievement_icon'");
            if (iconCheck && Number(iconCheck.c) > 0 && row.achievement_icon) {
              await exec('UPDATE achievements SET achievement_icon = NULL WHERE achievement_id = ?', [achievementId]);
            }
          } catch (e) { /* ignore */ }
        }
        return true;
      }

      // Fallback to legacy behavior: delete achievement_icon and badge_s3_key
      const legacyKey = row?.badge_s3_key || row?.achievement_icon || null;
      if (legacyKey) {
        try { await require('./s3Service').deleteImage(legacyKey); } catch (e) { /* ignore */ }
        try {
          const [[badgeKeyExists]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'badge_s3_key'");
          const [[iconExists]] = await pool.query("SELECT COUNT(1) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievements' AND COLUMN_NAME = 'achievement_icon'");
          const updates = [];
          const params = [];
          if (iconExists && Number(iconExists.c) > 0) updates.push('achievement_icon = NULL');
          if (badgeKeyExists && Number(badgeKeyExists.c) > 0) updates.push('badge_s3_key = NULL');
          if (updates.length > 0) {
            await exec(`UPDATE achievements SET ${updates.join(', ')} WHERE achievement_id = ?`, [achievementId]);
          }
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (err) {
      // If something failed, attempt legacy delete
      try {
        const legacyKey = row?.badge_s3_key || row?.achievement_icon || null;
        if (legacyKey) {
          await require('./s3Service').deleteImage(legacyKey);
          await exec('UPDATE achievements SET achievement_icon = NULL, badge_s3_key = NULL WHERE achievement_id = ?', [achievementId]);
        }
      } catch (e) {
        // ignore
      }
      return true;
    }
  }

  /**
   * Update achievement thresholds (admin)
   * thresholds should be an object: { bronze: number, silver: number, gold: number }
   */
  async updateAchievementThresholds(achievementId, thresholds = {}) {
    const pool = require('../db/pool').getPool();

    const { bronze, silver, gold } = thresholds || {};
    if ([bronze, silver, gold].some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
      throw new Error('thresholds must contain numeric bronze, silver, gold values');
    }
    if (!(bronze < silver && silver < gold)) {
      throw new Error('thresholds must satisfy bronze < silver < gold');
    }

    // Update DB
    await pool.query('UPDATE achievements SET thresholds = ? WHERE achievement_id = ?', [JSON.stringify({ bronze, silver, gold }), achievementId]);

    // Fetch updated row
    const [[row]] = await pool.query('SELECT * FROM achievements WHERE achievement_id = ? LIMIT 1', [achievementId]);

    // Clear badgeService cache for this achievement code if present
    try {
      const badgeCode = row?.badge_code;
      if (badgeCode) {
        require('./badgeService').clearThresholdCache(badgeCode);
      }
    } catch (err) {
      // non-fatal
    }

    return row || null;
  }

  /**
   * Evaluate and grant mapped achievements for an event action.
   * Only awards mappings that match the recipient user's role (target_role).
   */
  async evaluateEventAchievementMappings({ userId, userRole, eventId = null, eventType = null, triggerAction = null, performedBy = null, eventUid = null } = {}) {
    if (!userId || !triggerAction) return [];

    // Get achievements mapped for this event+action scoped to the user's role
    const achievements = await gamificationRepository.getAchievementsForEvent({ eventId, eventType, triggerAction, targetRole: userRole });
    const newlyGranted = [];

    for (const ach of achievements) {
      try {
        const granted = await gamificationRepository.grantBadge(userId, ach, { awardedByUserId: performedBy?.userId || null });
        if (!granted) continue;

        newlyGranted.push(ach);

        await logHelpers.logBadgeAwarded({
          userId,
          badgeCode: ach.badge_code,
          badgeName: ach.achievement_name,
          performedBy: performedBy || null,
          metadata: { eventId: eventId || null, eventUid: eventUid || null, triggerAction },
        });

        await this.notifyBadgeUnlocked(userId, ach, { eventId, eventUid, triggerAction });

        // Determine points to award: prefer tier_points.single if configured, fall back to achievement_points
        let pointsToAward = 0;
        try {
          const tierPoints = ach.tier_points ? (typeof ach.tier_points === 'string' ? JSON.parse(ach.tier_points) : ach.tier_points) : null;
          pointsToAward = Number(tierPoints?.single ?? ach.achievement_points ?? 0) || 0;
        } catch (err) {
          pointsToAward = Number(ach.achievement_points || 0) || 0;
        }

        if (pointsToAward > 0) {
          const bonusRecord = await gamificationRepository.recordAction({
            userId,
            action: GAMIFICATION_ACTIONS.BADGE_BONUS,
            eventId: eventId || null,
            pointsDelta: pointsToAward,
            metadata: { badgeCode: ach.badge_code },
            dedupeKey: this.buildDedupeKey(GAMIFICATION_ACTIONS.BADGE_BONUS, userId, ach.badge_code, 'badge'),
          });

          if (!bonusRecord.skipped) {
            const logMetadata = { badgeCode: ach.badge_code, badgeName: ach.achievement_name, eventId: eventId || null, eventUid: eventUid || null };
            await this.logAward({ userId, action: GAMIFICATION_ACTIONS.BADGE_BONUS, pointsDelta: pointsToAward, performedBy: performedBy || null, metadata: logMetadata });
            await this.notifyPointsAward({ userId, action: GAMIFICATION_ACTIONS.BADGE_BONUS, pointsDelta: pointsToAward, metadata: logMetadata });
          }
        }
      } catch (err) {
        console.warn('Failed to grant mapped achievement', ach, err && err.message ? err.message : err);
      }
    }

    if (newlyGranted.length) {
      await gamificationRepository.syncLevel(userId);
    }

    return newlyGranted;
  }

  /**
   * Check and process level-ups based on total points.
   * Handles multi-level jumps and grants rewards per level.
   */
  async checkAndProcessLevelUps(userId, beforeTotalPoints, afterTotalPoints, performedBy = null) {
    if (!userId) return { levelsGained: 0 };
    if (afterTotalPoints <= beforeTotalPoints) return { levelsGained: 0 };

    const thresholds = await gamificationRepository.getPointsThresholds();
    const userStats = await gamificationRepository.getUserLevelStats(userId);
    const startLevel = userStats?.current_level || 1;
    let currentLevel = startLevel;
    let levelsGained = 0;

    // While loop to process each level one-by-one
    while (true) {
      const nextThreshold = thresholds.find((t) => t.level === currentLevel + 1);
      if (!nextThreshold) break; // no further levels
      if (afterTotalPoints < Number(nextThreshold.points_cumulative)) break;

      // Process this level-up in a transaction for idempotency
      await gamificationRepository.withTransaction(async (conn) => {
        // NOTE: reward_badge_code and reward_points_bonus columns were removed from schema.
        // If you need to award badges or bonus points on level-up, implement that via
        // Achievement mappings or an explicit mapping table and invoke it here.

        // Update user's level in DB
        const total = afterTotalPoints;
        const nextNext = thresholds.find((t) => t.level === currentLevel + 2);
        const pointsToNext = nextNext ? Math.max(0, Number(nextNext.points_cumulative) - total) : 0;
        await gamificationRepository.updateUserLevel(userId, currentLevel + 1, pointsToNext);

        // Log and notify (no badge/bonus fields available)
        await logHelpers.logLevelUp({
          userId,
          userName: null,
          newLevel: currentLevel + 1,
          totalPoints: afterTotalPoints,
          rewards: { reward_title: nextThreshold.reward_title || null },
          performedBy: performedBy || { userId: 'system', name: 'System', role: 'system' }
        });
        await notificationService.notifyLevelUp({ userId, newLevel: currentLevel + 1, rewards: { reward_title: nextThreshold.reward_title || null } });
      });

      currentLevel += 1;
      levelsGained += 1;
    }

    return { levelsGained, newLevel: currentLevel };
  }
}

module.exports = new GamificationService();
module.exports.GAMIFICATION_ACTIONS = GAMIFICATION_ACTIONS;

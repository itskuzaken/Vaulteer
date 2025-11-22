const gamificationRepository = require("../repositories/gamificationRepository");
const {
  ACTION_CONFIG,
  GAMIFICATION_ACTIONS,
  STREAK_CONFIG,
  pointsToNextLevel,
} = require("../config/gamificationRules");
const { logHelpers } = require("./activityLogService");
const notificationService = require("./notificationService");

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

  async notifyPointsAward({ userId, action, pointsDelta, metadata }) {
    if (!pointsDelta) return;
    try {
      await notificationService.notifyGamificationPoints({
        userId,
        action,
        pointsDelta,
        metadata,
      });
    } catch (error) {
      console.warn("Failed to send gamification notification", error);
    }
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

    const pointsDelta = Number.isFinite(pointsOverride)
      ? pointsOverride
      : config.points || 0;

    const dedupeKey = this.buildDedupeKey(
      action,
      userId,
      eventId,
      dedupeSuffix
    );

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

    await gamificationRepository.syncLevel(userId);

    const newlyGrantedBadges = await this.evaluateBadges(userId, {
      performedBy,
      triggerAction: action,
      eventId,
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

    const ownedCodes = new Set(ownedBadges.map((badge) => badge.badge_code));
    const newlyGranted = [];

    for (const badge of catalog) {
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

    const nextLevel = pointsToNextLevel(stats?.total_points || 0);

    return {
      stats,
      badges,
      recentEvents: events.map((row) => this.decodeMetadata(row)),
      nextLevel,
    };
  }

  async getLeaderboard({ period = "all", limit = 20 } = {}) {
    return gamificationRepository.getLeaderboard({ period, limit });
  }

  async recalculateUser(userId) {
    return gamificationRepository.recalculateUser(userId);
  }
}

module.exports = new GamificationService();
module.exports.GAMIFICATION_ACTIONS = GAMIFICATION_ACTIONS;

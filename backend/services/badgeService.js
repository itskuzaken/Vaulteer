const achievementDefs = require('../config/achievements');
const achievementRepo = require('../repositories/achievementRepository');
const systemSettingsRepository = require('../repositories/systemSettingsRepository');
const { getPool } = require('../db/pool');

// Simple in-memory cache for achievement thresholds (TTL in ms)
const thresholdsCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function getThresholdsForAchievement(achievementCode) {
  const now = Date.now();
  const cached = thresholdsCache.get(achievementCode);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.val;
  }

  try {
    const ach = await achievementRepo.getAchievementByCode(achievementCode);
    const val = ach && ach.thresholds ? ach.thresholds : (achievementDefs[achievementCode] ? achievementDefs[achievementCode].thresholds : null);
    thresholdsCache.set(achievementCode, { val, ts: Date.now() });
    return val;
  } catch (err) {
    // fallback to config
    const val = achievementDefs[achievementCode] ? achievementDefs[achievementCode].thresholds : null;
    thresholdsCache.set(achievementCode, { val, ts: Date.now() });
    return val;
  }
}

function determineBadgeLevel(count, thresholds) {
  if (!thresholds) return 'none';
  if (count >= thresholds.gold) return 'gold';
  if (count >= thresholds.silver) return 'silver';
  if (count >= thresholds.bronze) return 'bronze';
  return 'none';
}

async function incrementProgress({ userId, achievementCode, delta = 1, meta = null, eventId = null, jobId = null }) {
  // Respect global enable_badges setting: if disabled, do not process achievements
  try {
    const enabled = await systemSettingsRepository.getSettingValue('gamification', 'enable_badges', true);
    if (!enabled) {
      console.log(`[badgeService] incrementProgress skipped for ${achievementCode} because enable_badges=false`);
      return { promoted: false, reason: 'badges_disabled' };
    }
  } catch (err) {
    // If settings read fails, default to allowing processing to avoid silently dropping awards
    console.warn('[badgeService] failed to read enable_badges setting, proceeding:', err.message || err);
  }
  const def = achievementDefs[achievementCode] || null;
  const thresholds = await getThresholdsForAchievement(achievementCode);
  if (!def && !thresholds) throw new Error(`Unknown achievement code: ${achievementCode}`);

  // Insert an audit row (we don't enforce uniqueness here; consumers should check before calling if needed)
  await achievementRepo.insertAudit({ userId, eventId, achievementCode, delta, meta, jobId });

  // Get existing progress
  const existing = await achievementRepo.getProgress(userId, achievementCode);
  const current = existing ? existing.current_count : 0;
  const newCount = current + delta;
  const newBadge = determineBadgeLevel(newCount, thresholds || def.thresholds);

  // Upsert progress with new badge
  await achievementRepo.upsertProgress(userId, achievementCode, delta, newBadge);

  // If badge changed to a non-none and it's the first time (i.e. existing.badge_level !== newBadge), record to user_achievements table
  if (existing && existing.badge_level !== newBadge && newBadge !== 'none') {
    await awardBadgeIfNotRecorded(userId, achievementCode, newBadge);
    return { promoted: true, newBadge, newCount };
  }

  if (!existing && newBadge !== 'none') {
    await awardBadgeIfNotRecorded(userId, achievementCode, newBadge);
    return { promoted: true, newBadge, newCount };
  }

  return { promoted: false, newBadge, newCount };
}

async function setProgress(userId, achievementCode, count, meta = null, eventId = null, jobId = null) {
  // Respect global enable_badges setting: if disabled, do not process achievements
  try {
    const enabled = await systemSettingsRepository.getSettingValue('gamification', 'enable_badges', true);
    if (!enabled) {
      console.log(`[badgeService] setProgress skipped for ${achievementCode} because enable_badges=false`);
      return { promoted: false, reason: 'badges_disabled' };
    }
  } catch (err) {
    console.warn('[badgeService] failed to read enable_badges setting, proceeding:', err.message || err);
  }
  const def = achievementDefs[achievementCode] || null;
  const thresholds = await getThresholdsForAchievement(achievementCode);
  if (!def && !thresholds) throw new Error(`Unknown achievement code: ${achievementCode}`);

  const newBadge = determineBadgeLevel(count, thresholds || def.thresholds);
  // Insert audit to indicate we've processed this event for the achievement
  await achievementRepo.insertAudit({ userId, eventId, achievementCode, delta: 0, meta, jobId });
  await achievementRepo.setProgress(userId, achievementCode, count, newBadge);

  // If promoted and not previously recorded, award
  const existing = await achievementRepo.getProgress(userId, achievementCode);
  if (existing && existing.badge_level !== newBadge && newBadge !== 'none') {
    await awardBadgeIfNotRecorded(userId, achievementCode, newBadge);
    return { promoted: true, newBadge, newCount: count };
  }

  return { promoted: false, newBadge, newCount: count };
}
async function awardBadgeIfNotRecorded(userId, achievementCode, badgeLevel) {
  // Respect global enable_badges setting as a safety net
  try {
    const enabled = await systemSettingsRepository.getSettingValue('gamification', 'enable_badges', true);
    if (!enabled) {
      console.log(`[badgeService] awardBadgeIfNotRecorded skipped for ${achievementCode} because enable_badges=false`);
      return;
    }
  } catch (err) {
    console.warn('[badgeService] failed to read enable_badges setting, proceeding:', err.message || err);
  }
  // For MVP we map achievementCode -> achievements table by badge_code
  const pool = getPool();
  try {
    // Prefer repository method (handles JSON parsing and is easier to mock in tests)
    let achievementRow = null;
    try {
      achievementRow = await require('../repositories/achievementRepository').getAchievementByCode(achievementCode);
    } catch (e) {
      // ignore
    }

    // Fallback to a raw DB select if repo didn't return a row
    if (!achievementRow) {
      const [rows] = await pool.execute('SELECT achievement_id, achievement_points, tier_points, achievement_name, badge_code FROM achievements WHERE badge_code = ? LIMIT 1', [achievementCode]);
      achievementRow = rows && rows[0] ? rows[0] : null;
    }

    const achievementId = achievementRow && achievementRow.achievement_id ? achievementRow.achievement_id : null;

    // Insert into user_achievements to register earned badge (if we have mapping)
    if (achievementId) {
      await pool.execute(
        `INSERT IGNORE INTO user_achievements (user_id, achievement_id, earned_date, awarded_by_user_id)
         VALUES (?, ?, CURDATE(), NULL)`,
        [userId, achievementId]
      );
    }

    // Also write a simple notification record (if you have a notifications table)
    // Keep it soft: Many deployments don't have notification system fully wired
    try {
      await pool.execute(
        `INSERT INTO notifications (user_id, title, message, created_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, 'Achievement Earned', `You've earned ${badgeLevel} for ${achievementCode}`]
      );
    } catch (err) {
      // ignore if notifications table missing
    }
    // Award badge bonus points if configured: prefer per-tier points, fall back to achievement_points
    try {
      const gamificationService = require('./gamificationService');
      let pointsToAward = 0;
      if (achievementRow) {
        const tierPoints = achievementRow.tier_points ? (typeof achievementRow.tier_points === 'string' ? JSON.parse(achievementRow.tier_points) : achievementRow.tier_points) : null;
        console.log('[badgeService] awardBadgeIfNotRecorded: achievementRow=', achievementRow, 'tierPointsRaw=', achievementRow?.tier_points, 'parsedTierPoints=', tierPoints, 'badgeLevel=', badgeLevel);
        if (tierPoints) {
          // prefer explicit tier key (bronze/silver/gold) or 'single'
          pointsToAward = Number(tierPoints[badgeLevel] ?? tierPoints.single ?? 0) || 0;
        } else if (Number.isFinite(achievementRow.achievement_points)) {
          pointsToAward = Number(achievementRow.achievement_points) || 0;
        }
      }

      console.log('[badgeService] awardBadgeIfNotRecorded: pointsToAward=', pointsToAward);

      if (pointsToAward > 0) {
        await gamificationService.awardAction({
          userId,
          action: require('./gamificationService').GAMIFICATION_ACTIONS.BADGE_BONUS,
          pointsOverride: pointsToAward,
          metadata: { badgeCode: achievementRow?.badge_code, badgeName: achievementRow?.achievement_name, achievementId },
          dedupeSuffix: `${achievementCode}:${badgeLevel}`
        });
        console.log('[badgeService] awardBadgeIfNotRecorded: awardAction called');
      }
    } catch (err) {
      // don't let gamification failures break badge awarding
      console.warn('[badgeService] failed to award badge bonus points:', err?.message || err);
    }
  } catch (err) {
    console.warn('[badgeService] awardBadgeIfNotRecorded failed:', err.message || err);
  }
}

function clearThresholdCache(achievementCode = null) {
  if (achievementCode) thresholdsCache.delete(achievementCode);
  else thresholdsCache.clear();
}

module.exports = {
  incrementProgress,
  setProgress,
  clearThresholdCache
};

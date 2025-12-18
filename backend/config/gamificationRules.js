const GAMIFICATION_ACTIONS = {
  EVENT_REGISTER: "EVENT_REGISTER",
  WAITLIST_JOIN: "WAITLIST_JOIN",
  WAITLIST_PROMOTION: "WAITLIST_PROMOTION",
  EVENT_ATTEND: "EVENT_ATTEND",
  EVENT_CANCEL: "EVENT_CANCEL",
  EVENT_HOST_PUBLISHED: "EVENT_HOST_PUBLISHED",
  STREAK_DAY: "STREAK_DAY",
  BADGE_BONUS: "BADGE_BONUS",
  LEVEL_UP_BONUS: "LEVEL_UP_BONUS",
};

const ACTION_CONFIG = {
  [GAMIFICATION_ACTIONS.EVENT_REGISTER]: {
    points: 10,
    stats: { events_registered: 1 },
    streakEligible: false,
  },
  [GAMIFICATION_ACTIONS.WAITLIST_JOIN]: {
    points: 5,
    stats: {},
    streakEligible: false,
  },
  [GAMIFICATION_ACTIONS.WAITLIST_PROMOTION]: {
    points: 8,
    stats: { events_registered: 1 },
    streakEligible: false,
  },
  [GAMIFICATION_ACTIONS.EVENT_ATTEND]: {
    points: 40,
    stats: { events_attended: 1 },
    streakEligible: true,
  },
  [GAMIFICATION_ACTIONS.EVENT_CANCEL]: {
    points: -5,
    stats: { events_registered: -1 },
    streakEligible: false,
    allowNegative: true,
  },
  [GAMIFICATION_ACTIONS.EVENT_HOST_PUBLISHED]: {
    points: 25,
    stats: { events_hosted: 1 },
    streakEligible: false,
  },
  [GAMIFICATION_ACTIONS.STREAK_DAY]: {
    points: 5,
    stats: {},
    streakEligible: false,
  },
  [GAMIFICATION_ACTIONS.BADGE_BONUS]: {
    points: 0,
    stats: {},
    streakEligible: false,
  },
};

const STREAK_CONFIG = {
  windowHours: 48,
  bonusAction: GAMIFICATION_ACTIONS.STREAK_DAY,
  bonusPoints: ACTION_CONFIG[GAMIFICATION_ACTIONS.STREAK_DAY].points,
};

const LEVEL_STEP = 100; // DEPRECATED: Keep for backwards compatibility, new system uses lookup table

// DEPRECATED: Old linear formula - replaced by lookup table approach
function calculateLevel(totalPoints = 0) {
  return Math.max(1, Math.floor(Math.max(totalPoints, 0) / LEVEL_STEP) + 1);
}

// DEPRECATED: Old points calculation - replaced by lookup table approach
function pointsToNextLevel(totalPoints = 0) {
  const level = calculateLevel(totalPoints);
  const nextThreshold = level * LEVEL_STEP;
  const remaining = nextThreshold - Math.max(totalPoints, 0);
  return {
    currentLevel: level,
    nextThreshold,
    remaining: remaining <= 0 ? 0 : remaining,
  };
}

// ===== NEW LEVELING SYSTEM FUNCTIONS =====

// Cache for points thresholds (Hard-Stop approach)
let thresholdsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get points thresholds from database with caching
 * @returns {Promise<Array>} Array of threshold objects
 */
async function getPointsThresholds() {
  const now = Date.now();
  if (thresholdsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return thresholdsCache;
  }

  const { getPool } = require('../db/pool');
  const pool = getPool();

  const [rows] = await pool.query(
    'SELECT level, points_cumulative, points_required_for_next, reward_title FROM points_level_thresholds ORDER BY level ASC'
  );

  thresholdsCache = rows;
  cacheTimestamp = now;

  return rows;
}

/**
 * Calculate current level from lifetime points using binary search
 * @param {number} lifetimePoints
 * @returns {Promise<number>} Current level
 */
async function calculateLevelFromPoints(lifetimePoints) {
  const thresholds = await getPointsThresholds();

  // Binary search to find the highest level where points_cumulative <= lifetimePoints
  let left = 0;
  let right = thresholds.length - 1;
  let result = 1; // Minimum level is 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (thresholds[mid].points_cumulative <= lifetimePoints) {
      result = thresholds[mid].level;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}

/**
 * Get next level threshold information
 * @param {number} currentLevel
 * @returns {Promise<Object|null>} Next level data or null if at max
 */
async function getNextLevelThreshold(currentLevel) {
  const thresholds = await getPointsThresholds();
  return thresholds.find(t => t.level === currentLevel + 1) || null;
}

/**
 * Get level progress information for a user
 * @param {number} lifetimePoints
 * @returns {Promise<Object>} Level progress data
 */
async function getLevelProgress(lifetimePoints) {
  const currentLevel = await calculateLevelFromPoints(lifetimePoints);
  const nextThreshold = await getNextLevelThreshold(currentLevel);

  const currentThreshold = (await getPointsThresholds()).find(t => t.level === currentLevel);
  const pointsIntoLevel = lifetimePoints - (currentThreshold?.points_cumulative || 0);
  const pointsToNext = nextThreshold ? nextThreshold.points_cumulative - lifetimePoints : 0;

  return {
    currentLevel,
    lifetimePoints,
    pointsIntoLevel,
    pointsToNext,
    nextLevelThreshold: nextThreshold?.points_cumulative || null,
    nextLevelRewards: nextThreshold ? {
      title: nextThreshold.reward_title
    } : null,
    isMaxLevel: !nextThreshold
  };
}

/**
 * Invalidate the thresholds cache (call after admin updates)
 */
function invalidateThresholdsCache() {
  thresholdsCache = null;
  cacheTimestamp = 0;
}

module.exports = {
  GAMIFICATION_ACTIONS,
  ACTION_CONFIG,
  STREAK_CONFIG,
  LEVEL_STEP, // DEPRECATED
  calculateLevel, // DEPRECATED
  pointsToNextLevel, // DEPRECATED
  // NEW FUNCTIONS
  getPointsThresholds,
  calculateLevelFromPoints,
  getNextLevelThreshold,
  getLevelProgress,
  invalidateThresholdsCache,
};

const GAMIFICATION_ACTIONS = {
  EVENT_REGISTER: "EVENT_REGISTER",
  WAITLIST_JOIN: "WAITLIST_JOIN",
  WAITLIST_PROMOTION: "WAITLIST_PROMOTION",
  EVENT_ATTEND: "EVENT_ATTEND",
  EVENT_CANCEL: "EVENT_CANCEL",
  EVENT_HOST_PUBLISHED: "EVENT_HOST_PUBLISHED",
  STREAK_DAY: "STREAK_DAY",
  BADGE_BONUS: "BADGE_BONUS",
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

const LEVEL_STEP = 100;

function calculateLevel(totalPoints = 0) {
  return Math.max(1, Math.floor(Math.max(totalPoints, 0) / LEVEL_STEP) + 1);
}

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

module.exports = {
  GAMIFICATION_ACTIONS,
  ACTION_CONFIG,
  STREAK_CONFIG,
  LEVEL_STEP,
  calculateLevel,
  pointsToNextLevel,
};

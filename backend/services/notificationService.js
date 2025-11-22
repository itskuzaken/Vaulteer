const { getPool } = require("../db/pool");

function toJson(metadata) {
  if (!metadata) {
    return null;
  }
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.warn("Unable to serialize notification metadata", error);
    return null;
  }
}

async function createNotification({
  userId,
  title,
  message,
  type = "info",
  actionUrl = null,
  metadata = null,
}) {
  if (!userId) {
    throw new Error("createNotification requires a userId");
  }

  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, action_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title || "", message || "", type, actionUrl, toJson(metadata)]
  );

  return { notificationId: result.insertId };
}

const ACTION_LABELS = {
  EVENT_REGISTER: "event registration",
  WAITLIST_JOIN: "waitlist registration",
  WAITLIST_PROMOTION: "waitlist promotion",
  EVENT_ATTEND: "event attendance",
  EVENT_CANCEL: "event cancellation",
  EVENT_HOST_PUBLISHED: "event publishing",
  STREAK_DAY: "streak bonus",
  BADGE_BONUS: "badge bonus",
};

function formatActionLabel(action) {
  return (
    ACTION_LABELS[action] ||
    action?.toLowerCase()?.replace(/_/g, " ") ||
    "gamification"
  );
}

async function notifyGamificationPoints({
  userId,
  action,
  pointsDelta,
  metadata = {},
}) {
  if (!userId || !pointsDelta) {
    return null;
  }

  const positive = pointsDelta >= 0;
  const descriptor = formatActionLabel(action);
  const eventTitle = metadata.eventTitle;
  const prefix = positive ? "+" : "";
  const title = `${prefix}${pointsDelta} pts ${
    positive ? "earned" : "adjusted"
  }`;
  const baseMessage = positive
    ? `You earned ${prefix}${pointsDelta} pts from ${descriptor}.`
    : `Your total was adjusted by ${pointsDelta} pts due to ${descriptor}.`;
  const message = eventTitle ? `${baseMessage} (${eventTitle})` : baseMessage;

  return createNotification({
    userId,
    title,
    message,
    type: positive ? "success" : "warning",
    metadata: {
      ...metadata,
      action,
      pointsDelta,
      notificationKind: "gamification_points",
    },
  });
}

async function notifyBadgeUnlocked({ userId, badge, context = {} }) {
  if (!userId || !badge) {
    return null;
  }

  const title = `New Badge: ${badge.achievement_name}`;
  const message =
    badge.achievement_description ||
    "You unlocked a new badge! Keep up the amazing work.";

  return createNotification({
    userId,
    title,
    message,
    type: "success",
    metadata: {
      badgeCode: badge.badge_code,
      badgeId: badge.achievement_id,
      pointsBonus: badge.achievement_points || 0,
      notificationKind: "gamification_badge",
      triggerAction: context.triggerAction || null,
      eventId: context.eventId || null,
      eventUid: context.eventUid || null,
    },
  });
}

module.exports = {
  createNotification,
  notifyGamificationPoints,
  notifyBadgeUnlocked,
};

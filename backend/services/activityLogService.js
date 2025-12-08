const { getPool } = require("../db/pool");
const { DateTime } = require("luxon");

const toIsoPlus8 = (date = new Date()) =>
  DateTime.fromJSDate(new Date(date), { zone: "utc" })
    .setZone("Asia/Singapore")
    .toISO({ suppressMilliseconds: true });

/**
 * Activity Log Service
 * Handles all audit logging operations
 */

const LOG_TYPES = {
  AUTH: "AUTH",
  VOLUNTEER_MANAGEMENT: "VOLUNTEER_MANAGEMENT",
  STAFF_MANAGEMENT: "STAFF_MANAGEMENT",
  APPLICATION: "APPLICATION",
  EVENT: "EVENT",
  GAMIFICATION: "GAMIFICATION",
  POST: "POST",
  DATA_ACCESS: "DATA_ACCESS",
  SETTINGS: "SETTINGS",
  SECURITY: "SECURITY",
  BULK_OPERATION: "BULK_OPERATION",
  COMMUNICATION: "COMMUNICATION",
  DOCUMENT: "DOCUMENT",
  PROFILE: "PROFILE",
  TRAINING: "TRAINING",
};

const SEVERITY_LEVELS = {
  INFO: "INFO",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

/**
 * Create a new activity log entry
 */
async function createLog({
  type,
  action,
  performedBy,
  targetResource = null,
  changes = null,
  description = "",
  severity = "INFO",
  ipAddress = null,
  userAgent = null,
  sessionId = null,
  metadata = null,
  occurredAt = null,
}) {
  try {
    const pool = getPool();
    let columns = `type, action, performed_by_user_id, performed_by_name, performed_by_role,
        target_resource_type, target_resource_id,
        changes, description, severity, ip_address, user_agent, session_id, metadata`;
    let placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";

    // Set performed_by_user_id to NULL for system operations to avoid FK constraint
    const performedByUserId =
      performedBy.userId === "system" ? null : performedBy.userId;

    // Normalize metadata.timestamp to +08 ISO if present
    let normalizedMetadata = metadata;
    try {
      if (metadata && metadata.timestamp) {
        normalizedMetadata = { ...metadata, timestamp: toIsoPlus8(metadata.timestamp) };
      }
    } catch (err) {
      // If normalization fails, keep original metadata
      normalizedMetadata = metadata;
    }

    const values = [
      type,
      action,
      performedByUserId,
      performedBy.name,
      performedBy.role,
      targetResource?.type || null,
      targetResource?.id || null,
      changes ? JSON.stringify(changes) : null,
      description,
      severity,
      ipAddress,
      userAgent,
      sessionId,
      normalizedMetadata ? JSON.stringify(normalizedMetadata) : null,
    ];

    // Always set a created_at in +08 timezone. Use occurredAt if supplied, else now.
    const toPlus8MySQL = (d) => {
      // Use luxon to convert to Asia/Singapore and format to MySQL DATETIME
      const dt = DateTime.fromJSDate(d, { zone: 'utc' }).setZone('Asia/Singapore');
      return dt.toFormat("yyyy-LL-dd HH:mm:ss");
    };

    const createdDate = occurredAt ? new Date(occurredAt) : new Date();
    if (!Number.isNaN(createdDate.getTime())) {
      columns += ", created_at";
      placeholders += ", ?";
      values.push(toPlus8MySQL(createdDate));
    }

    const query = `
      INSERT INTO activity_logs (${columns})
      VALUES (${placeholders})
    `;

    const [result] = await pool.query(query, values);
    return { log_id: result.insertId, ...performedBy };
  } catch (error) {
    console.error("Error creating activity log:", error);
    throw error;
  }
}

/**
 * Get activity logs with filtering
 */
async function getLogs({
  role = null,
  userId = null,
  type = null,
  severity = null,
  action = null,
  actorRole = null,
  status = null,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0,
  searchTerm = null,
}) {
  try {
    const pool = getPool();
    const whereClauses = [`1=1`];
    const params = [];

    // Role-based filtering for the requester
    if (role === "volunteer" && userId) {
      whereClauses.push(`performed_by_user_id = ?`);
      params.push(userId);
    } else if (role === "staff" && userId) {
      whereClauses.push(
        `(performed_by_user_id = ? OR performed_by_role = 'staff')`
      );
      params.push(userId);
    }

    // Type filter
    if (type && type !== "ALL") {
      whereClauses.push(`type = ?`);
      params.push(type);
    }

    // Severity filter
    if (severity && severity !== "ALL") {
      whereClauses.push(`severity = ?`);
      params.push(severity);
    }

    // Action filter
    if (action && action !== "ALL") {
      whereClauses.push(`action = ?`);
      params.push(action);
    }

    // Actor role filter
    if (actorRole && actorRole !== "ALL") {
      whereClauses.push(`performed_by_role = ?`);
      params.push(actorRole);
    }

    // Status filter (success / failed)
    if (status === "success") {
      whereClauses.push(`(
        severity IN ('INFO', 'LOW')
        OR (
          JSON_EXTRACT(metadata, '$.statusCode') IS NOT NULL
          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.statusCode')) AS UNSIGNED) < 400
        )
        OR (
          JSON_EXTRACT(metadata, '$.status') IS NOT NULL
          AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.status'))) IN ('success', 'completed', 'ok')
        )
      )`);
    } else if (status === "failed") {
      whereClauses.push(`(
        severity IN ('MEDIUM', 'HIGH', 'CRITICAL')
        OR (
          JSON_EXTRACT(metadata, '$.statusCode') IS NOT NULL
          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.statusCode')) AS UNSIGNED) >= 400
        )
        OR (
          JSON_EXTRACT(metadata, '$.status') IS NOT NULL
          AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.status'))) IN ('failed', 'error', 'denied')
        )
      )`);
    }

    // Date range filter
    if (startDate) {
      whereClauses.push(`created_at >= ?`);
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push(`created_at <= ?`);
      params.push(endDate);
    }

    // Search filter (full-text with fallback)
    if (searchTerm) {
      const trimmed = searchTerm.trim();
      const likePattern = `%${trimmed}%`;

      if (trimmed.length >= 3) {
        whereClauses.push(`(
          MATCH(description, action) AGAINST (? IN NATURAL LANGUAGE MODE)
          OR performed_by_name LIKE ?
          OR action LIKE ?
          OR description LIKE ?
        )`);
        params.push(trimmed, likePattern, likePattern, likePattern);
      } else {
        whereClauses.push(`(
          performed_by_name LIKE ?
          OR action LIKE ?
          OR description LIKE ?
        )`);
        params.push(likePattern, likePattern, likePattern);
      }
    }

    const whereClause = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const dataQuery = `
      SELECT *
      FROM activity_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM activity_logs
      ${whereClause}
    `;

    const dataValues = [...params, safeLimit, safeOffset];
    const countValues = [...params];

    const [countRows] = await pool.query(countQuery, countValues);
    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

    const [rows] = await pool.query(dataQuery, dataValues);

    const parsedRows = rows.map((row) => ({
      ...row,
      metadata: row.metadata
        ? typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      changes: row.changes
        ? typeof row.changes === "string"
          ? JSON.parse(row.changes)
          : row.changes
        : null,
      
      created_at_local: row.created_at
      ? DateTime.fromJSDate(new Date(row.created_at), { zone: 'utc' })
        .setZone('Asia/Singapore')
        .toISO({ suppressMilliseconds: true })
      : null,
    }));

    return {
      items: parsedRows,
      total,
    };
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    throw error;
  }
}

/**
 * Get log statistics
 */
async function getLogStats({ role = null, userId = null, days = 7 }) {
  try {
    const pool = getPool();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
        SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN type = 'SECURITY' THEN 1 ELSE 0 END) as security_events,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as period_count
      FROM activity_logs
      WHERE 1=1
    `;

    const values = [cutoffDate];

    if (role === "volunteer" && userId) {
      query += ` AND performed_by_user_id = ?`;
      values.push(userId);
    } else if (role === "staff" && userId) {
      query += ` AND performed_by_user_id = ?`;
      values.push(userId);
    }

    const [rows] = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error("Error fetching log statistics:", error);
    throw error;
  }
}

/**
 * Delete old logs (for data retention)
 */
async function deleteOldLogs(daysToKeep = 90) {
  try {
    const pool = getPool();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const query = `
      DELETE FROM activity_logs
      WHERE created_at < ? AND severity NOT IN ('HIGH', 'CRITICAL')
    `;

    const [result] = await pool.query(query, [cutoffDate]);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting old logs:", error);
    throw error;
  }
}

/**
 * Get user activity summary
 */
async function getUserActivitySummary(userId) {
  try {
    const pool = getPool();
    const query = `
      SELECT 
        type,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM activity_logs
      WHERE performed_by_user_id = ?
      GROUP BY type
      ORDER BY count DESC
    `;

    const [rows] = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    console.error("Error fetching user activity summary:", error);
    throw error;
  }
}

/**
 * Helper object for common logging actions
 * Provides consistent logging interface across the application
 */
const logHelpers = {
  // Event Management Logging
  logEventCreated: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "CREATE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Created event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, timestamp: toIsoPlus8() },
    }),

  logEventUpdated: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    changes,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "UPDATE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      changes,
      description: `Updated event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, timestamp: toIsoPlus8() },
    }),

  logEventDeleted: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "DELETE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Deleted event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.MEDIUM,
      metadata: { ...metadata, eventUid, timestamp: toIsoPlus8() },
    }),

  logEventPublished: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "PUBLISH",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Published event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, timestamp: toIsoPlus8() },
    }),

  logEventArchived: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    reason = "manual",
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "ARCHIVE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Archived event: ${eventTitle} (${reason})`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: {
        ...metadata,
        eventUid,
        reason,
        timestamp: new Date().toISOString(),
      },
    }),

    logEventCancelled: ({
      eventId,
      eventUid,
      eventTitle,
      performedBy,
      reason = "manual",
      metadata = {},
    }) =>
      createLog({
        type: LOG_TYPES.EVENT,
        action: "CANCEL",
        performedBy,
        targetResource: { type: "event", id: eventId, name: eventTitle },
        description: `Cancelled event: ${eventTitle} (${reason})`,
        severity: SEVERITY_LEVELS.WARNING,
        metadata: {
          ...metadata,
          eventUid,
          reason,
          timestamp: new Date().toISOString(),
        },
      }),

  logEventPostponed: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    previousStatus,
    postponedUntil = null,
    reason = null,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "POSTPONE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      changes: { field: "status", previous: previousStatus, next: "postponed" },
      description: `Postponed event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: {
        ...metadata,
        eventUid,
        postponedUntil,
        reason,
        timestamp: new Date().toISOString(),
      },
    }),

  logEventStatusChange: ({
    eventId,
    eventUid,
    eventTitle,
    performedBy,
    previousStatus,
    newStatus,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "STATUS_CHANGE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      changes: { field: "status", previous: previousStatus, next: newStatus },
      description: `Changed event status from ${previousStatus} to ${newStatus}: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, timestamp: new Date().toISOString() },
    }),

  // Event Participation Logging
  logEventRegistration: ({
    eventId,
    eventUid,
    eventTitle,
    userId,
    userName,
    registrationStatus = "registered",
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "REGISTER",
      performedBy: {
        userId,
        name: userName,
        role: metadata.role || "volunteer",
      },
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Registered for event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, registrationStatus, timestamp: toIsoPlus8() },
    }),

  logEventCancellation: ({
    eventId,
    eventUid,
    eventTitle,
    userId,
    userName,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "CANCEL_REGISTRATION",
      performedBy: {
        userId,
        name: userName,
        role: metadata.role || "volunteer",
      },
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Cancelled registration for event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, timestamp: toIsoPlus8() },
    }),

  logEventAttendance: ({
    eventId,
    eventUid,
    eventTitle,
    userId,
    userName,
    markedBy,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "MARK_ATTENDANCE",
      performedBy: markedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      description: `Marked ${userName} as attended for event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, attendeeUserId: userId, timestamp: toIsoPlus8() },
    }),

  logEventParticipantStatusChange: ({
    eventId,
    eventUid,
    eventTitle,
    userId,
    userName,
    performedBy,
    previousStatus,
    newStatus,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.EVENT,
      action: "PARTICIPANT_STATUS_UPDATE",
      performedBy,
      targetResource: { type: "event", id: eventId, name: eventTitle },
      changes: {
        field: "participant_status",
        previous: previousStatus,
        next: newStatus,
      },
      description: `Updated ${userName}'s status from ${previousStatus} to ${newStatus} for event: ${eventTitle}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, eventUid, participantUserId: userId, timestamp: toIsoPlus8() },
    }),

  // Gamification Logging
  logGamificationAward: ({
    userId,
    userName,
    action,
    pointsDelta,
    performedBy,
    eventId = null,
    eventUid = null,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.GAMIFICATION,
      action: `${action}_POINTS`,
      performedBy: performedBy || {
        userId,
        name: userName || "System",
        role: "system",
      },
      targetResource: { type: "user", id: userId, name: userName },
      description: `${
        pointsDelta >= 0 ? "+" : ""
      }${pointsDelta} points for ${action}`,
      severity: pointsDelta >= 0 ? SEVERITY_LEVELS.INFO : SEVERITY_LEVELS.LOW,
      metadata: {
        ...metadata,
        action,
        pointsDelta,
        eventId,
        eventUid,
        timestamp: toIsoPlus8(),
      },
    }),

  logBadgeAwarded: ({
    userId,
    userName,
    badgeCode,
    badgeName,
    performedBy,
    eventId = null,
    eventUid = null,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.GAMIFICATION,
      action: "BADGE_AWARDED",
      performedBy: performedBy || { userId, name: "System", role: "system" },
      targetResource: { type: "user", id: userId, name: userName },
      description: `Earned badge: ${badgeName}`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, badgeCode, badgeName, eventId, eventUid, timestamp: toIsoPlus8() },
    }),

  logGamificationAdjustment: ({
    userId,
    userName,
    reason,
    pointsDelta,
    performedBy,
    metadata = {},
  }) =>
    createLog({
      type: LOG_TYPES.GAMIFICATION,
      action: "POINTS_ADJUSTMENT",
      performedBy,
      targetResource: { type: "user", id: userId, name: userName },
      description: `${
        pointsDelta >= 0 ? "+" : ""
      }${pointsDelta} points adjustment: ${reason}`,
      severity: SEVERITY_LEVELS.MEDIUM,
      metadata: { ...metadata, reason, pointsDelta, timestamp: toIsoPlus8() },
    }),

  logStreakAchievement: ({ userId, userName, streakDays, metadata = {} }) =>
    createLog({
      type: LOG_TYPES.GAMIFICATION,
      action: "STREAK_MILESTONE",
      performedBy: { userId, name: "System", role: "system" },
      targetResource: { type: "user", id: userId, name: userName },
      description: `Achieved ${streakDays}-day streak`,
      severity: SEVERITY_LEVELS.INFO,
      metadata: { ...metadata, streakDays, timestamp: toIsoPlus8() },
    }),

  // Error Logging
  logError: ({
    type,
    action,
    performedBy,
    error,
    context = {},
    metadata = {},
  }) =>
    createLog({
      type,
      action: `${action}_ERROR`,
      performedBy,
      description: `Error during ${action}: ${error.message}`,
      severity: SEVERITY_LEVELS.HIGH,
      metadata: { ...metadata, error: error.message, stack: error.stack, context, timestamp: toIsoPlus8() },
    }),
};

module.exports = {
  LOG_TYPES,
  SEVERITY_LEVELS,
  createLog,
  getLogs,
  getLogStats,
  deleteOldLogs,
  getUserActivitySummary,
  logHelpers,
};

const { getPool } = require("../db/pool");

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
}) {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO activity_logs (
        type, action, performed_by_user_id, performed_by_name, performed_by_role,
        target_resource_type, target_resource_id,
        changes, description, severity, ip_address, user_agent, session_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      type,
      action,
      performedBy.userId,
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
      metadata ? JSON.stringify(metadata) : null,
    ];

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
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0,
  searchTerm = null,
}) {
  try {
    const pool = getPool();
    let query = `SELECT * FROM activity_logs WHERE 1=1`;
    const values = [];

    // Role-based filtering
    if (role === "volunteer" && userId) {
      query += ` AND performed_by_user_id = ?`;
      values.push(userId);
    } else if (role === "staff" && userId) {
      query += ` AND (performed_by_user_id = ? OR performed_by_role = 'staff')`;
      values.push(userId);
    }
    // Admin sees all logs (no additional filter needed)

    // Type filter
    if (type) {
      query += ` AND type = ?`;
      values.push(type);
    }

    // Severity filter
    if (severity) {
      query += ` AND severity = ?`;
      values.push(severity);
    }

    // Date range filter
    if (startDate) {
      query += ` AND created_at >= ?`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= ?`;
      values.push(endDate);
    }

    // Search filter
    if (searchTerm) {
      query += ` AND (
        performed_by_name LIKE ? OR
        action LIKE ? OR
        description LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    const [rows] = await pool.query(query, values);

    // Parse JSON fields (metadata and changes)
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
    }));

    return parsedRows;
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

module.exports = {
  LOG_TYPES,
  SEVERITY_LEVELS,
  createLog,
  getLogs,
  getLogStats,
  deleteOldLogs,
  getUserActivitySummary,
};

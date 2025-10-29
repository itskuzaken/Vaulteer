const express = require("express");
const router = express.Router();
const {
  createLog,
  getLogs,
  getLogStats,
  getUserActivitySummary,
} = require("../services/activityLogService");
const { authenticate, requireRole } = require("../middleware/auth");
const { getPool } = require("../db/pool");

// Helper function to get user data from firebaseUid
async function getUserFromFirebaseUid(firebaseUid) {
  const pool = getPool();
  const [results] = await pool.query(
    `SELECT u.user_id, u.uid, u.name, u.email, r.role, u.status
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.uid = ? LIMIT 1`,
    [firebaseUid]
  );
  return results[0] || null;
}

/**
 * @route   POST /api/logs
 * @desc    Create a new activity log entry
 * @access  Private (all authenticated users)
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      type,
      action,
      targetResource,
      changes,
      description,
      severity,
      metadata,
    } = req.body;

    // Get user info from firebaseUid
    const user = await getUserFromFirebaseUid(req.firebaseUid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Get user info for log
    const performedBy = {
      userId: user.user_id,
      name: user.name || user.email,
      role: user.role,
    };

    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const sessionId = req.session?.id || null;

    const log = await createLog({
      type,
      action,
      performedBy,
      targetResource,
      changes,
      description,
      severity: severity || "INFO",
      ipAddress,
      userAgent,
      sessionId,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create activity log",
    });
  }
});

/**
 * @route   GET /api/logs
 * @desc    Get activity logs with filtering
 * @access  Private (role-based access)
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      type,
      severity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      searchTerm,
    } = req.query;

    // Get user info from firebaseUid
    const user = await getUserFromFirebaseUid(req.firebaseUid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userRole = user.role;
    const userId = user.user_id;

    const logs = await getLogs({
      role: userRole,
      userId,
      type,
      severity,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset),
      searchTerm,
    });

    // Debug: Log timestamp information
    if (logs.length > 0) {
      console.log("\n=== BACKEND TIMESTAMP DEBUG ===");
      console.log("Sample log from database:", logs[0]);
      console.log("created_at value:", logs[0].created_at);
      console.log("created_at type:", typeof logs[0].created_at);
      console.log("metadata value:", logs[0].metadata);
      console.log("metadata type:", typeof logs[0].metadata);
      if (logs[0].metadata) {
        console.log("metadata.timestamp:", logs[0].metadata.timestamp);
        console.log("metadata.localTime:", logs[0].metadata.localTime);
      }
      console.log("Server current time:", new Date());
      console.log("Server timezone offset:", new Date().getTimezoneOffset());
      console.log("================================\n");
    }

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity logs",
    });
  }
});

/**
 * @route   GET /api/logs/stats
 * @desc    Get activity log statistics
 * @access  Private (role-based access)
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Get user info from firebaseUid
    const user = await getUserFromFirebaseUid(req.firebaseUid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userRole = user.role;
    const userId = user.user_id;

    const stats = await getLogStats({
      role: userRole,
      userId,
      days: parseInt(days),
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching log stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch log statistics",
    });
  }
});

/**
 * @route   GET /api/logs/user/:userId/summary
 * @desc    Get user activity summary
 * @access  Private (Admin/Staff or own data)
 */
router.get("/user/:userId/summary", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get requesting user info from firebaseUid
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check authorization: Admin, Staff, or own data
    if (
      requestingUser.role !== "admin" &&
      requestingUser.role !== "staff" &&
      requestingUser.user_id !== parseInt(userId)
    ) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to view this user's activity",
      });
    }

    const summary = await getUserActivitySummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching user activity summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user activity summary",
    });
  }
});

/**
 * @route   GET /api/logs/export
 * @desc    Export logs as CSV
 * @access  Private (Admin only)
 */
router.get("/export", authenticate, async (req, res) => {
  try {
    // Get user info from firebaseUid
    const user = await getUserFromFirebaseUid(req.firebaseUid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if user is admin
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only administrators can export logs",
      });
    }

    const { type, severity, startDate, endDate, searchTerm } = req.query;

    const logs = await getLogs({
      role: "admin",
      userId: user.user_id,
      type,
      severity,
      startDate,
      endDate,
      limit: 10000, // Higher limit for export
      offset: 0,
      searchTerm,
    });

    // Convert to CSV
    const csvHeaders = [
      "Timestamp",
      "Type",
      "Action",
      "User",
      "Role",
      "Severity",
      "Description",
      "IP Address",
    ];

    const csvRows = logs.map((log) => [
      new Date(log.created_at).toISOString(),
      log.type,
      log.action,
      log.performed_by_name,
      log.performed_by_role,
      log.severity,
      log.description || "",
      log.ip_address || "",
    ]);

    const csv = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=activity-logs-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("Error exporting logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export logs",
    });
  }
});

module.exports = router;

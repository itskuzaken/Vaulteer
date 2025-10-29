const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getPool } = require("../db/pool");

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 * @query   ?limit=10&offset=0&unread_only=false
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    console.log("[Notifications] Fetching for Firebase UID:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's database ID
    const [userRows] = await pool.query(
      "SELECT user_id FROM users WHERE uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDbId = userRows[0].user_id;

    // Parse query parameters
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unread_only === "true";

    // Build query
    let query = `
      SELECT 
        notification_id,
        title,
        message,
        type,
        is_read,
        action_url,
        metadata,
        created_at,
        read_at
      FROM notifications
      WHERE user_id = ?
    `;

    const queryParams = [userDbId];

    if (unreadOnly) {
      query += " AND is_read = FALSE";
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [notifications] = await pool.query(query, queryParams);

    // Get unread count
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userDbId]
    );

    console.log(
      `[Notifications] Found ${notifications.length} notifications, ${countResult[0].unread_count} unread`
    );

    res.json({
      success: true,
      data: {
        notifications,
        unread_count: countResult[0].unread_count,
        total: notifications.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's database ID
    const [userRows] = await pool.query(
      "SELECT user_id FROM users WHERE uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDbId = userRows[0].user_id;

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userDbId]
    );

    res.json({
      success: true,
      data: {
        unread_count: countResult[0].count,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;
    const notificationId = req.params.id;

    console.log(
      `[Notifications] Marking notification ${notificationId} as read`
    );

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's database ID
    const [userRows] = await pool.query(
      "SELECT user_id FROM users WHERE uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDbId = userRows[0].user_id;

    // Verify notification belongs to user and update
    const [result] = await pool.query(
      "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE notification_id = ? AND user_id = ?",
      [notificationId, userDbId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Notification not found or unauthorized" });
    }

    // Get updated unread count
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userDbId]
    );

    res.json({
      success: true,
      data: {
        notification_id: notificationId,
        unread_count: countResult[0].count,
      },
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Mark all notifications as read for the user
 * @access  Private
 */
router.patch("/mark-all-read", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    console.log("[Notifications] Marking all as read for user");

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's database ID
    const [userRows] = await pool.query(
      "SELECT user_id FROM users WHERE uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDbId = userRows[0].user_id;

    // Mark all unread notifications as read
    const [result] = await pool.query(
      "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE",
      [userDbId]
    );

    console.log(`[Notifications] Marked ${result.affectedRows} as read`);

    res.json({
      success: true,
      data: {
        marked_count: result.affectedRows,
        unread_count: 0,
      },
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's database ID
    const [userRows] = await pool.query(
      "SELECT user_id FROM users WHERE uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDbId = userRows[0].user_id;

    // Delete notification (verify ownership)
    const [result] = await pool.query(
      "DELETE FROM notifications WHERE notification_id = ? AND user_id = ?",
      [notificationId, userDbId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Notification not found or unauthorized" });
    }

    // Get updated unread count
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userDbId]
    );

    res.json({
      success: true,
      data: {
        deleted: true,
        unread_count: countResult[0].count,
      },
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (Admin/System only)
 * @access  Private (Admin)
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;
    const { target_user_id, title, message, type, action_url, metadata } =
      req.body;

    console.log("[Notifications] Creating new notification");

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify admin role (optional - you can implement this)
    const [userRows] = await pool.query(
      "SELECT u.user_id, r.role FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    // Optional: Uncomment to restrict to admin only
    // if (userRows[0].role !== 'admin') {
    //   return res.status(403).json({ error: "Admin access required" });
    // }

    // Validate required fields
    if (!target_user_id || !title || !message) {
      return res
        .status(400)
        .json({
          error: "Missing required fields: target_user_id, title, message",
        });
    }

    // Insert notification
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, action_url, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        target_user_id,
        title,
        message,
        type || "info",
        action_url || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    console.log(
      `[Notifications] Created notification ID: ${result.insertId} for user ${target_user_id}`
    );

    res.status(201).json({
      success: true,
      data: {
        notification_id: result.insertId,
        created: true,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

module.exports = router;

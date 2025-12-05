const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getPool } = require("../db/pool");

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics (Admin only)
 * @access  Private (Admin)
 */
router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    console.log("[Stats Dashboard] Firebase UID:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is admin
    const [userRows] = await pool.query(
      "SELECT r.role FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.uid = ?",
      [userId]
    );

    console.log(
      "[Stats Dashboard] User found:",
      userRows.length > 0,
      "Role:",
      userRows[0]?.role
    );

    if (!userRows.length || userRows[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Fetch statistics
    const [totalVolunteers] = await pool.query(
      "SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role = 'volunteer' AND u.status = 'active'"
    );

    const [totalStaff] = await pool.query(
      "SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role = 'staff' AND u.status = 'active'"
    );

    const [totalApplicants] = await pool.query(
      `SELECT COUNT(DISTINCT a.applicant_id) as count 
       FROM applicants a 
       JOIN application_statuses s ON a.status_id = s.status_id 
       WHERE s.status_name = 'pending'`
    );

    const [recentLogs] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );

    const stats = {
      total_volunteers: totalVolunteers[0]?.count || 0,
      total_staff: totalStaff[0]?.count || 0,
      total_applicants: totalApplicants[0]?.count || 0,
      recent_activity: recentLogs[0]?.count || 0,
    };

    console.log("[Stats Dashboard] Stats calculated:", stats);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    console.error("Error details:", error.message);
    console.error("SQL Error:", error.sqlMessage);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

/**
 * @route   GET /api/stats/staff
 * @desc    Get staff-specific statistics
 * @access  Private (Staff)
 */
router.get("/staff", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    console.log("[Stats Staff] Firebase UID:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is staff
    const [userRows] = await pool.query(
      "SELECT u.user_id, r.role FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.uid = ?",
      [userId]
    );

    console.log(
      "[Stats Staff] User found:",
      userRows.length > 0,
      "Role:",
      userRows[0]?.role
    );

    if (!userRows.length) {
      console.log("[Stats Staff] User not found in database");
      return res.status(404).json({ error: "User not found" });
    }

    if (userRows[0].role !== "staff") {
      console.log(
        "[Stats Staff] Access denied - user role is:",
        userRows[0].role
      );
      return res.status(403).json({
        error: "Staff access required",
        message: `Current role: ${userRows[0].role}. This endpoint requires staff role.`,
      });
    }

    const userDbId = userRows[0].user_id;

    // Fetch staff-specific statistics
    const [myVolunteers] = await pool.query(
      "SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role = 'volunteer' AND u.status = 'active'"
    );

    const [myTasks] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE performed_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
      [userDbId]
    );

    const [myActivity] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE performed_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)",
      [userDbId]
    );

    const stats = {
      total_volunteers: myVolunteers[0]?.count || 0,
      my_tasks: myTasks[0]?.count || 0,
      my_activity_today: myActivity[0]?.count || 0,
    };

    console.log("[Stats Staff] Stats calculated:", stats);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching staff stats:", error);
    console.error("Error details:", error.message);
    console.error("SQL Error:", error.sqlMessage);
    res.status(500).json({ error: "Failed to fetch staff statistics" });
  }
});

/**
 * @route   GET /api/stats/volunteer
 * @desc    Get volunteer-specific statistics
 * @access  Private (Volunteer)
 */
router.get("/volunteer", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    console.log("[Stats Volunteer] Firebase UID:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is volunteer
    const [userRows] = await pool.query(
      "SELECT u.user_id, r.role FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.uid = ?",
      [userId]
    );

    console.log(
      "[Stats Volunteer] User found:",
      userRows.length > 0,
      "Role:",
      userRows[0]?.role
    );

    if (!userRows.length) {
      console.log("[Stats Volunteer] User not found in database");
      return res.status(404).json({ error: "User not found" });
    }

    if (userRows[0].role !== "volunteer") {
      console.log(
        "[Stats Volunteer] Access denied - user role is:",
        userRows[0].role
      );
      return res.status(403).json({
        error: "Volunteer access required",
        message: `Current role: ${userRows[0].role}. This endpoint requires volunteer role.`,
      });
    }

    const userDbId = userRows[0].user_id;

    // Fetch volunteer-specific statistics
    const [myActivity] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE performed_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
      [userDbId]
    );

    const [myActivityToday] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE performed_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)",
      [userDbId]
    );

    const stats = {
      my_activity_week: myActivity[0]?.count || 0,
      my_activity_today: myActivityToday[0]?.count || 0,
      total_events: 0, // Placeholder - update when events table exists
    };

    console.log("[Stats Volunteer] Stats calculated:", stats);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching volunteer stats:", error);
    console.error("Error details:", error.message);
    console.error("SQL Error:", error.sqlMessage);
    res.status(500).json({ error: "Failed to fetch volunteer statistics" });
  }
});

module.exports = router;

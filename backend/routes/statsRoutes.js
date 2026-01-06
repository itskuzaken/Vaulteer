const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getPool } = require("../db/pool");
const statsService = require("../services/statsService");
const statsCache = require("../services/statsCache");

/**
 * Helper function to get date range based on range parameter
 */
function getDateRange(range) {
  const now = new Date();
  switch(range) {
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { start: yesterday, end: yesterdayEnd };
    
    case 'last7':
      const last7 = new Date(now);
      last7.setDate(last7.getDate() - 7);
      return { start: last7, end: now };
    
    case 'last30':
      const last30 = new Date(now);
      last30.setDate(last30.getDate() - 30);
      return { start: last30, end: now };
    
    default:
      // Default to last 7 days
      const defaultLast7 = new Date(now);
      defaultLast7.setDate(defaultLast7.getDate() - 7);
      return { start: defaultLast7, end: now };
  }
}

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics with breakdowns (Admin only)
 * @access  Private (Admin)
 * @query   range - Time range filter: yesterday | last7 | last30
 */
router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;
    const range = req.query.range || 'last7';
    const compare = req.query.compare === 'true';

    // If custom date range provided, use those ISO params (expected format: YYYY-MM-DD or ISO)
    let start, end;
    if (req.query.start && req.query.end) {
      start = new Date(req.query.start);
      end = new Date(req.query.end);
    } else {
      ({ start, end } = getDateRange(range));
    }

    console.log("[Stats Dashboard] Firebase UID:", userId, "Range:", range, "Compare:", compare, "Start:", start, "End:", end);

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

    // Check cache first
    const cacheKey = statsCache.generateKey('admin', { range, compare, start: start?.toISOString(), end: end?.toISOString() });
    const cached = statsCache.get(cacheKey);
    if (cached) {
      console.log("[Stats Dashboard] Cache HIT");
      return res.json(cached);
    }

    // Date range for filtering is already computed above (from range or start/end params)
    
    // OPTIMIZED: Combined user stats query (volunteers + staff in single query)
    const [userStats] = await pool.query(
      `SELECT 
         r.role,
         u.status,
         COUNT(*) as count
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role IN ('volunteer', 'staff')
       GROUP BY r.role, u.status`
    );

    // Process combined results into separate breakdowns
    let totalVolunteersCount = 0;
    let totalStaffCount = 0;
    const volunteersBreakdownObj = {};
    const staffBreakdownObj = {};
    
    userStats.forEach(row => {
      if (row.role === 'volunteer') {
        volunteersBreakdownObj[row.status] = row.count;
        totalVolunteersCount += row.count;
      } else if (row.role === 'staff') {
        staffBreakdownObj[row.status] = row.count;
        totalStaffCount += row.count;
      }
    });

    // OPTIMIZED: Combined applicants query with status breakdown
    const [applicantsData] = await pool.query(
      `SELECT 
         s.status_name,
         COUNT(*) as count
       FROM applicants a
       JOIN application_statuses s ON a.status_id = s.status_id
       WHERE a.application_date >= ? AND a.application_date <= ?
       GROUP BY s.status_name`,
      [start, end]
    );

    // Fetch all possible application statuses (for ensuring all are present)
    const [allAppStatuses] = await pool.query(
      `SELECT status_name FROM application_statuses`
    );

    // Build applicants breakdown with all statuses defaulting to 0
    const applicationsBreakdownObj = {};
    allAppStatuses.forEach(s => {
      applicationsBreakdownObj[s.status_name] = 0;
    });
    
    let totalApplicantsCount = 0;
    applicantsData.forEach(row => {
      applicationsBreakdownObj[row.status_name] = row.count;
      totalApplicantsCount += row.count;
    });

    // Fetch event participation stats. Use preset helper for known periods or custom helper for arbitrary ranges
    let eventStats = { periods: {} };
    if (['yesterday','last7','last30'].includes(range)) {
      eventStats = await statsService.getEventParticipationStats({ periods: [range] });
    } else {
      const ev = await statsService.getEventStatsForRange(start.toISOString(), end.toISOString());
      eventStats.periods.custom = { current: ev.current, previous: ev.previous, deltas: ev.deltas };
    }

    // Format event participation breakdown
    const eventParticipation = eventStats?.periods?.[range]?.current || eventStats?.periods?.custom?.current || {};
    const eventParticipationsBreakdownObj = {
      registered: eventParticipation.registered || 0,
      attended: eventParticipation.attended || 0,
      cancelled: eventParticipation.cancelled || 0,
      waitlisted: eventParticipation.waitlisted || 0,
    };

    // If compare=true, compute previous period values and deltas for date-filtered metrics
    let previous = null;
    let deltas = null;

    if (compare) {
      // previous applicant range (elastic previous span)
      const span = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - span);
      const prevEnd = new Date(start.getTime() - 1);

      const [prevTotalApplicants] = await pool.query(
        `SELECT COUNT(DISTINCT a.applicant_id) as count 
         FROM applicants a 
         WHERE a.application_date >= ? AND a.application_date <= ?`,
        [prevStart, prevEnd]
      );

      const [prevApplicationsBreakdown] = await pool.query(
        `SELECT s.status_name, COUNT(*) as count
         FROM applicants a
         JOIN application_statuses s ON a.status_id = s.status_id
         WHERE a.application_date >= ? AND a.application_date <= ?
         GROUP BY s.status_name`,
        [prevStart, prevEnd]
      );

      // seed previous breakdowns with all statuses
      const prevApplicationsBreakdownObj = {};
      allAppStatuses.forEach(s => {
        prevApplicationsBreakdownObj[s.status_name] = 0;
      });
      prevApplicationsBreakdown.forEach(row => {
        prevApplicationsBreakdownObj[row.status_name] = row.count;
      });

      // Event stats: use existing service for presets, or custom range helper
      let eventPrev = { total: 0, registered: 0, attended: 0, cancelled: 0, waitlisted: 0 };
      if (['yesterday','last7','last30'].includes(range)) {
        const ev = eventStats?.periods?.[range];
        if (ev && ev.previous) {
          eventPrev = ev.previous;
        }
      } else {
        const ev = eventStats?.periods?.custom;
        if (ev && ev.previous) {
          eventPrev = ev.previous;
        }
      }

      // percent change helper
      const pct = (curr, prev) => {
        if (prev === 0) return null;
        return Number(((curr - prev) / prev) * 100).toFixed(1);
      };

      previous = {
        total_applicants: prevTotalApplicants[0]?.count || 0,
        applications_breakdown: prevApplicationsBreakdownObj,
        event_participations: eventPrev.total || 0,
        event_participations_breakdown: {
          registered: eventPrev.registered || 0,
          attended: eventPrev.attended || 0,
          cancelled: eventPrev.cancelled || 0,
          waitlisted: eventPrev.waitlisted || 0,
        },
      };

      deltas = {
        total_applicants: pct(totalApplicantsCount, previous.total_applicants),
        event_participations: pct(eventParticipation.total || 0, previous.event_participations),
      };
    }

    // Fetch 7-day trends for sparklines
    const trends = await statsService.getDashboardTrends();

    const stats = {
      range,
      // All-time headcount (not filtered by date)
      total_volunteers: totalVolunteersCount,
      volunteers_breakdown: volunteersBreakdownObj,
      volunteers_filter: 'all_time',
      
      total_staff: totalStaffCount,
      staff_breakdown: staffBreakdownObj,
      staff_filter: 'all_time',
      
      // Period-filtered activity
      total_applicants: totalApplicantsCount,
      applications_breakdown: applicationsBreakdownObj,
      applicants_filter: range,
      
      event_participations: eventParticipation.total || 0,
      event_participations_breakdown: eventParticipationsBreakdownObj,
      events_filter: range,
      
      // Trend data for sparklines
      trends,
      
      ...(previous ? { previous } : {}),
      ...(deltas ? { deltas } : {}),
    };

    console.log("[Stats Dashboard] Stats calculated:", stats);

    const response = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    statsCache.set(cacheKey, response, statsCache.DEFAULT_TTL);

    res.json(response);
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

    // Check cache first
    const cacheKey = statsCache.generateKey('staff', { userId: userDbId });
    const cached = statsCache.get(cacheKey);
    if (cached) {
      console.log("[Stats Staff] Cache HIT");
      return res.json(cached);
    }

    // Fetch staff-specific statistics
    // FIXED: Match admin dashboard behavior - count ALL volunteers, not just active
    const [volunteerStats] = await pool.query(
      `SELECT u.status, COUNT(*) as count 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id 
       WHERE r.role = 'volunteer'
       GROUP BY u.status`
    );

    // Build volunteers breakdown and total
    let totalVolunteersCount = 0;
    const volunteersBreakdownObj = {};
    volunteerStats.forEach(row => {
      volunteersBreakdownObj[row.status] = row.count;
      totalVolunteersCount += row.count;
    });

    const [myTasks] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE performed_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
      [userDbId]
    );

    const [myActivity] = await pool.query(
      "SELECT COUNT(*) as count FROM activity_logs WHERE performed_by_user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)",
      [userDbId]
    );

    const stats = {
      total_volunteers: totalVolunteersCount,
      volunteers_breakdown: volunteersBreakdownObj,
      volunteers_filter: 'all_time',
      my_tasks: myTasks[0]?.count || 0,
      my_activity_today: myActivity[0]?.count || 0,
    };

    console.log("[Stats Staff] Stats calculated:", stats);

    const response = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    statsCache.set(cacheKey, response, statsCache.DEFAULT_TTL);

    res.json(response);
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

/**
 * @route   GET /api/stats/participation
 * @desc    Get participation statistics (HTS form submissions)
 * @access  Private (staff or admin)
 */
router.get("/participation", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.firebaseUid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check role (allow staff or admin)
    const [userRows] = await pool.query(
      "SELECT u.user_id, r.role FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.uid = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const role = userRows[0].role;
    if (role !== "staff" && role !== "admin") {
      return res.status(403).json({ error: "Staff or admin access required" });
    }

    const stats = await statsService.getParticipationStats();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching participation stats:", error);
    res.status(500).json({ error: "Failed to fetch participation statistics" });
  }
});

module.exports = router;


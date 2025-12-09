/**
 * Internal-only routes
 * These routes are protected by internalOnly middleware and should ONLY be called
 * by server-side code (Next.js SSR, background jobs, etc.) - never from browsers
 */

const express = require("express");
const router = express.Router();
const { getPool } = require("../db/pool");
const emailService = require("../services/emailService");

/**
 * Health check for internal monitoring
 * GET /api/internal/health
 */
router.get("/health", async (req, res) => {
  try {
    // Check database connectivity
    const pool = getPool();
    const [rows] = await pool.query("SELECT 1 as healthy");

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: rows[0].healthy === 1 ? "connected" : "error",
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("[internal/health] error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Cache refresh endpoint (example)
 * POST /api/internal/refresh-cache
 */
router.post("/refresh-cache", async (req, res) => {
  try {
    const { cacheKey, force } = req.body;

    // Implement your cache refresh logic here
    console.log("[internal/refresh-cache] called", { cacheKey, force });

    res.json({
      success: true,
      message: "Cache refresh initiated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[internal/refresh-cache] error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/internal/test-email
 * Body: { to, subject, text, html }
 * Protected by internalOnly middleware
 */
router.post("/test-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required to/subject/text/html' });
    }
    const result = await emailService.sendEmail(to, subject, html || text, text || '');
    res.json({ success: result.success, messageId: result.messageId, error: result.error });
  } catch (error) {
    console.error('[internal/test-email] error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Admin statistics endpoint (example)
 * GET /api/internal/stats/detailed
 * Returns detailed statistics that should not be exposed to public API
 */
router.get("/stats/detailed", async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query("SELECT COUNT(*) as total FROM users");
    const [events] = await pool.query("SELECT COUNT(*) as total FROM events");
    const [applicants] = await pool.query(
      "SELECT COUNT(*) as total FROM applicants"
    );

    // Add more sensitive stats here
    res.json({
      timestamp: new Date().toISOString(),
      users: users[0].total,
      events: events[0].total,
      applicants: applicants[0].total,
      // Example: add system metrics, memory usage, etc.
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  } catch (error) {
    console.error("[internal/stats] error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

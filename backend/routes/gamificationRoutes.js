const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, requireRole } = require("../middleware/auth");
const gamificationService = require("../services/gamificationService");

router.get(
  "/summary",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await gamificationService.getSummary(req.currentUserId);
    res.json({ success: true, data });
  })
);

router.get(
  "/leaderboard",
  authenticate,
  asyncHandler(async (req, res) => {
    const period = (req.query.period || "all").toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await gamificationService.getLeaderboard({ period, limit });
    res.json({ success: true, data });
  })
);

router.post(
  "/recalculate/:userId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10);

    if (Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const data = await gamificationService.recalculateUser(targetUserId);
    res.json({
      success: true,
      message: "Gamification stats recalculated",
      data,
    });
  })
);

module.exports = router;

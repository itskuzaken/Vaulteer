const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const eventRepository = require("../repositories/eventRepository");
const gamificationService = require("../services/gamificationService");

// GET /api/me - Get current user info
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const authUser = req.authenticatedUser;

    if (!authUser) {
      return res.status(403).json({ error: "User not found in DB" });
    }

    const [participationSummary, gamificationSummary] = await Promise.all([
      eventRepository.getUserParticipationSummary(authUser.userId),
      gamificationService.getSummary(authUser.userId),
    ]);

    res.json({
      user_id: authUser.userId,
      uid: authUser.uid,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      status: authUser.status,
      last_login_at: authUser.lastLoginAt,
      updated_at: authUser.updatedAt,
      participating_events: participationSummary,
      gamification: gamificationSummary,
    });
  })
);

module.exports = router;

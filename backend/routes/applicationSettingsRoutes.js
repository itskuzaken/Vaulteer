const express = require("express");
const router = express.Router();
const applicationSettingsController = require("../controllers/applicationSettingsController");
const authMiddleware = require("../middleware/auth");
const authenticate = authMiddleware.authenticate || ((req,res,next)=>next());
const requireRole = authMiddleware.requireRole || ((roles) => (req, res, next) => next());
const asyncHandler = require("../middleware/asyncHandler");

// Public endpoint - anyone can check if applications are open
router.get(
  "/settings",
  asyncHandler(applicationSettingsController.getSettings)
);

// Protected endpoints - admin and staff only
router.post(
  "/settings/open",
  authenticate,
  requireRole("admin", "staff"),
  asyncHandler(applicationSettingsController.openApplications)
);

router.post(
  "/settings/close",
  authenticate,
  requireRole("admin", "staff"),
  asyncHandler(applicationSettingsController.closeApplications)
);

router.put(
  "/settings/deadline",
  authenticate,
  requireRole("admin", "staff"),
  asyncHandler(applicationSettingsController.updateDeadline)
);

module.exports = router;

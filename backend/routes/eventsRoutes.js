const express = require("express");
const router = express.Router();
const eventsController = require("../controllers/eventsController");
const { authenticate } = require("../middleware/auth");

// Helper middleware to check if user is admin or staff
const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.authenticatedUser) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userRole = req.authenticatedUser.role?.toLowerCase();

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({
        success: false,
        message: "Authorization failed",
      });
    }
  };
};

// ============================================
// PUBLIC ROUTES (AUTHENTICATED USERS)
// ============================================

// Get upcoming events
router.get("/upcoming", authenticate, eventsController.getUpcomingEvents);

// Get all events (with filters)
router.get("/", authenticate, eventsController.getAllEvents);

// Get event details
router.get("/:uid", authenticate, eventsController.getEventDetails);

// ============================================
// VOLUNTEER PARTICIPATION
// ============================================

// Get my registered events
router.get("/my/events", authenticate, eventsController.getMyEvents);

// Join an event
router.post("/:uid/join", authenticate, eventsController.joinEvent);

// Leave an event
router.delete("/:uid/leave", authenticate, eventsController.leaveEvent);

// ============================================
// ADMIN/STAFF MANAGEMENT
// ============================================

// Create event
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.createEvent
);

// Update event
router.put(
  "/:uid",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.updateEvent
);

// Delete event
router.delete(
  "/:uid",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.deleteEvent
);

// Publish event
router.post(
  "/:uid/publish",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.publishEvent
);

// Postpone event
router.post(
  "/:uid/postpone",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.postponeEvent
);

// Archive event
router.post(
  "/:uid/archive",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.archiveEvent
);

// Cancel event
router.post(
  "/:uid/cancel",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.cancelEvent
);

// Get event statistics
router.get(
  "/:uid/stats",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.getEventStats
);

// Get creator statistics
router.get(
  "/my/stats",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.getCreatorStats
);

// ============================================
// PARTICIPANT MANAGEMENT (ADMIN/STAFF ONLY)
// ============================================

// Get event participants
router.get(
  "/:uid/participants",
  authenticate,
  eventsController.getEventParticipants
);

// Update participant status
router.patch(
  "/:uid/participants/:userId",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.updateParticipantStatus
);

// Mark attendance (bulk)
router.post(
  "/:uid/attendance",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.markAttendance
);

// Get attendance list
router.get(
  "/:uid/attendance",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.getAttendance
);

// Check-in a participant (staff/admin)
router.post(
  "/:uid/attendance/checkin",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.checkInParticipant
);

// Patch attendance for a single participant (staff/admin)
router.patch(
  "/:uid/attendance/:participantId",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.patchAttendance
);

// Auto-flag absences (admin only)
router.post(
  "/:uid/attendance/auto-flag",
  authenticate,
  authorizeRoles("admin"),
  eventsController.autoFlagAbsences
);

// Attendance audit log (admin/staff)
router.get(
  "/:uid/attendance/audit",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.getAttendanceAudit
);

// Attendance report (admin/staff)
router.get(
  "/:uid/attendance/report",
  authenticate,
  authorizeRoles("admin", "staff"),
  eventsController.getAttendanceReport
);

// Reports endpoints (stored snapshots)
router.get(
  '/:uid/reports',
  authenticate,
  authorizeRoles('admin', 'staff'),
  eventsController.listEventReports
);

router.post(
  '/:uid/reports/generate',
  authenticate,
  authorizeRoles('admin', 'staff'),
  eventsController.generateEventReport
);

router.get(
  '/:uid/reports/:reportId/download',
  authenticate,
  authorizeRoles('admin', 'staff'),
  eventsController.downloadEventReport
);

module.exports = router;

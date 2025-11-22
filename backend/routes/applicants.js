const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const {
  listApplicants,
  approveApplicant,
  rejectApplicant,
  getAllApplicationStatuses,
  updateApplicantStatus,
  getApplicantStatusHistory,
} = require("../repositories/applicantRepository");
const { getPool } = require("../db/pool");

// Helper to resolve UID to user_id
async function getUserIdFromUid(uid) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT user_id FROM users WHERE uid = ? LIMIT 1`,
    [uid]
  );
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  return rows[0].user_id;
}

// Helper to get current user's ID from Firebase UID
async function getCurrentUserIdFromFirebaseUid(firebaseUid) {
  if (!firebaseUid) {
    throw new Error("Authentication required: Firebase UID not found");
  }
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT user_id FROM users WHERE uid = ? LIMIT 1`,
    [firebaseUid]
  );
  if (rows.length === 0) {
    throw new Error("Current user not found");
  }
  return rows[0].user_id;
}

// Get all application statuses
router.get(
  "/statuses",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getAllApplicationStatuses());
  })
);

// Get applicant status history
router.get(
  "/:id/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const userId = isNaN(id) ? await getUserIdFromUid(id) : parseInt(id);
    res.json(await getApplicantStatusHistory(userId));
  })
);

// Update applicant status (new generic endpoint)
router.put(
  "/:id/status",
  authenticate,
  asyncHandler(async (req, res) => {
    console.log("[PUT /:id/status] Request received");
    console.log("[PUT /:id/status] params.id:", req.params.id);
    console.log("[PUT /:id/status] body:", req.body);
    console.log("[PUT /:id/status] firebaseUid:", req.firebaseUid);
    console.log("[PUT /:id/status] currentUserId:", req.currentUserId);
    console.log("[PUT /:id/status] authenticatedUser:", req.authenticatedUser);

    const id = req.params.id;
    const { status, notes } = req.body;

    if (!status) {
      console.log("[PUT /:id/status] ERROR: Status is missing");
      return res.status(400).json({ error: "Status is required" });
    }

    try {
      const userId = isNaN(id) ? await getUserIdFromUid(id) : parseInt(id);
      console.log("[PUT /:id/status] Resolved userId:", userId);

      // Use currentUserId if available (from auth middleware), otherwise try firebaseUid
      let currentUserId;
      if (req.currentUserId) {
        currentUserId = req.currentUserId;
        console.log(
          "[PUT /:id/status] Using currentUserId from auth:",
          currentUserId
        );
      } else if (req.firebaseUid) {
        currentUserId = await getCurrentUserIdFromFirebaseUid(req.firebaseUid);
        console.log(
          "[PUT /:id/status] Resolved from firebaseUid:",
          currentUserId
        );
      } else {
        throw new Error("Authentication required: No user ID found in request");
      }

      const result = await updateApplicantStatus(
        userId,
        status,
        currentUserId,
        notes
      );
      console.log("[PUT /:id/status] Success:", result);

      res.json(result);
    } catch (error) {
      console.error("[PUT /:id/status] ERROR:", error.message);
      throw error;
    }
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listApplicants());
  })
);
router.put(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    // Resolve UID to user_id if needed
    const id = req.params.id;
    const userId = isNaN(id) ? await getUserIdFromUid(id) : parseInt(id);
    res.json(await approveApplicant(userId));
  })
);
router.put(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    // Resolve UID to user_id if needed
    const id = req.params.id;
    const userId = isNaN(id) ? await getUserIdFromUid(id) : parseInt(id);
    res.json(await rejectApplicant(userId));
  })
);

module.exports = router;

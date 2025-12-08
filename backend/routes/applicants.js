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
  createApplicantWithProfile,
} = require("../repositories/applicantRepository");
const {
  isValidName,
  isValidMiddleInitial,
  isValidMobile,
  normalizeMobile,
  isNotFutureDate,
  isValidGraduation,
  isValidSmallText,
  isValidSocialUrl,
  isValidCity,
  isAlpha,
  countSentences,
  isSentenceCountInRange,
} = require("../utils/formValidators");
const { getPool } = require("../db/pool");
const applicationSettingsRepository = require("../repositories/applicationSettingsRepository");

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

// POST /api/applicants - Create new volunteer application
router.post(
  "/",
  asyncHandler(async (req, res) => {
    // Check if applications are open
    const settings = await applicationSettingsRepository.getSettings();

    if (!settings || !settings.is_open) {
      return res.status(403).json({
        success: false,
        message: "Applications are currently closed",
        code: "APPLICATIONS_CLOSED",
      });
    }

    const { user, form } = req.body;

    // Validate required user fields
    if (!user || !user.uid || !user.name || !user.email) {
      return res.status(400).json({
        error: "Missing required user information (uid, name, email)",
      });
    }

    // Validate required form fields
    const requiredFields = [
      "firstName",
      "lastName",
      "birthdate",
      "gender",
      "consent",
      "mobileNumber",
      "city",
      "currentStatus",
      "declarationCommitment",
      "volunteerReason",
      "volunteerFrequency",
    ];

    const missingFields = requiredFields.filter((field) => !form[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required form fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate declaration commitment is "agree"
    if (form.declarationCommitment !== "agree") {
      return res.status(400).json({
        error: "Declaration of commitment must be agreed to",
      });
    }

    // If gender is Other, require genderOther and ensure it contains letters only
    if (form.gender === "Other") {
      if (!form.genderOther || !form.genderOther.trim()) {
        return res.status(400).json({
          error: "Please specify gender when 'Other' is selected",
          fields: ["genderOther"],
        });
      }
      if (!isAlpha(form.genderOther)) {
        return res.status(400).json({
          error: "Gender (Other) must contain only letters",
          fields: ["genderOther"],
        });
      }
    }

    // Additional format validations
    const formatErrors = [];
    if (!isValidName(form.firstName)) formatErrors.push('firstName');
    if (!isValidName(form.lastName)) formatErrors.push('lastName');
    if (form.middleInitial && !isValidMiddleInitial(form.middleInitial)) formatErrors.push('middleInitial');
    if (!isNotFutureDate(form.birthdate)) formatErrors.push('birthdate');
    if (!isValidMobile(form.mobileNumber)) formatErrors.push('mobileNumber');
    if (form.facebook && !isValidSocialUrl(form.facebook,'facebook')) formatErrors.push('facebook');
    if (form.twitter && !isValidSocialUrl(form.twitter,'twitter')) formatErrors.push('twitter');
    if (form.instagram && !isValidSocialUrl(form.instagram,'instagram')) formatErrors.push('instagram');
    if (form.tiktok && !isValidSocialUrl(form.tiktok,'tiktok')) formatErrors.push('tiktok');
    if (form.graduation && !isValidGraduation(form.graduation)) formatErrors.push('graduation');
    if (!isValidCity(form.city)) formatErrors.push('city');
    if (form.position && !isValidSmallText(form.position,100)) formatErrors.push('position');
    if (form.industry && !isValidSmallText(form.industry,100)) formatErrors.push('industry');
    if (form.volunteerReason && !isValidSmallText(form.volunteerReason,600)) formatErrors.push('volunteerReason');
    if (form.volunteerReason && !isSentenceCountInRange(form.volunteerReason,5,10)) formatErrors.push('volunteerReason_sentence_count');

    if (formatErrors.length > 0) {
      // Provide a clearer message when the sentence count fails on volunteer reason
      if (formatErrors.includes('volunteerReason_sentence_count')) {
        return res.status(400).json({
          error: 'Volunteer reason must be between 5 and 10 sentences',
          fields: ['volunteerReason'],
        });
      }
      return res.status(400).json({
        error: 'Invalid form field format',
        fields: formatErrors,
      });
    }

    // Normalize mobile number before saving
    if (form.mobileNumber) {
      form.mobileNumber = normalizeMobile(form.mobileNumber);
    }

    try {
      const result = await createApplicantWithProfile(user, form);
      res.status(201).json(result);
    } catch (error) {
      console.error("[POST /api/applicants] Error:", error);

      // Handle duplicate application
      if (error.message.includes("already submitted")) {
        return res.status(409).json({
          error: "Application already submitted",
          message: error.message,
        });
      }

      // Generic error
      res.status(500).json({
        error: "Failed to submit application",
        message: error.message,
      });
    }
  })
);

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
    // Check if user has staff or admin role
    const userRole = req.authenticatedUser?.role?.toLowerCase();
    if (!userRole || !["admin", "staff"].includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden: Only admin and staff can update applicant status",
      });
    }
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

    // Staff can only move to intermediate statuses, admin can approve/reject
    const restrictedStatuses = ["approved", "rejected"];
    if (
      userRole === "staff" &&
      restrictedStatuses.includes(status.toLowerCase())
    ) {
      return res.status(403).json({
        error: "Forbidden: Only admin can approve or reject applications",
      });
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

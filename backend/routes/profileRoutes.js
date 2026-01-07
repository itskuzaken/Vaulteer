const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getPool } = require("../db/pool");
const applicantRepository = require("../repositories/applicantRepository");
const s3Service = require("../services/s3Service");

// Helper function to get user from Firebase UID
async function getUserFromFirebaseUid(firebaseUid) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, u.last_login_at, u.updated_at, r.role
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.uid = ?`,
    [firebaseUid]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Helper to get profile owner by UID (param)
async function getUserByUid(uid) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, u.last_login_at, u.updated_at, u.profile_picture, r.role
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.uid = ?`,
    [uid]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Preload profile user when :uid param is present
router.param("uid", async (req, res, next, uidParam) => {
  try {
    const profileUid = uidParam?.trim();
    if (!profileUid) {
      return res.status(400).json({ error: "Profile UID is required" });
    }

    if (/^\d+$/.test(profileUid)) {
      return res
        .status(400)
        .json({ error: "Profile UID must be a Firebase UID" });
    }

    const profileUser = await getUserByUid(profileUid);

    if (!profileUser) {
      return res.status(404).json({ error: "Profile not found" });
    }

    req.profileUser = profileUser;
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/profile/:uid
 * @desc    Get user profile by UID
 * @access  Private (Own profile or Admin/Staff)
 */
router.get("/:uid", authenticate, async (req, res) => {
  try {
    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const profileUser = req.profileUser;

    // Check authorization: Users can view their own profile, Admin/Staff can view all
    const canView =
      requestingUser.user_id === profileUser.user_id ||
      requestingUser.uid === profileUser.uid ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canView) {
      return res.status(403).json({
        error: "Unauthorized to view this profile",
      });
    }

    res.json({
      success: true,
      data: profileUser,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * @route   PUT /api/profile/:uid
 * @desc    Update user profile
 * @access  Private (Own profile only)
 */
router.put("/:uid", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const { name, email, phone, address } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const profileUser = req.profileUser;

    // Check authorization: Users can only edit their own profile
    if (requestingUser.user_id !== profileUser.user_id) {
      return res.status(403).json({
        error: "Unauthorized to update this profile",
      });
    }

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Build update query dynamically (only for existing columns)
    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }
    // Skip phone and address until migration is run
    // if (phone !== undefined) {
    //   updates.push("phone = ?");
    //   values.push(phone || null);
    // }
    // if (address !== undefined) {
    //   updates.push("address = ?");
    //   values.push(address || null);
    // }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(profileUser.user_id);

    // Update user profile
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`,
      values
    );

    // Fetch updated profile
    const [updatedRows] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, u.last_login_at, u.updated_at, r.role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [profileUser.user_id]
    );

    res.json({
      success: true,
      data: updatedRows[0],
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * @route   POST /api/profile/change-password
 * @desc    Change user password (Firebase-based)
 * @access  Private
 */
router.post("/change-password", authenticate, async (req, res) => {
  try {
    // Note: Since you're using Firebase Auth, password changes should be handled
    // through Firebase on the frontend using updatePassword()
    // This endpoint is here for completeness but Firebase handles this client-side

    res.json({
      success: true,
      message:
        "Password changes are handled through Firebase Authentication on the client side",
    });
  } catch (error) {
    console.error("Error with password change:", error);
    res.status(500).json({ error: "Failed to process password change" });
  }
});

/**
 * @route   GET /api/profile/:uid/comprehensive
 * @desc    Get comprehensive user profile with all related data
 * @access  Private (Own profile or Admin/Staff)
 */
router.get("/:uid/comprehensive", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check authorization
    const canView =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canView) {
      return res.status(403).json({
        error: "Unauthorized to view this profile",
      });
    }

    // 1. Basic user info
    const [userRows] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, u.last_login_at, u.updated_at, u.profile_picture, r.role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const profileData = {
      user: userRows[0],
      profile: null,
      workProfile: null,
      studentProfile: null,
      trainings: [],
      achievements: [],
      availableDays: [],
      workingDays: [],
      schoolDays: [],
      volunteerRoles: [],
    };

    // If user is an applicant, fetch application data
    if (profileData.user.role === "applicant") {
      try {
        const [applicantRows] = await pool.query(
          `SELECT a.application_date, s.status_name AS application_status
           FROM applicants a
           LEFT JOIN application_statuses s ON a.status_id = s.status_id
           WHERE a.user_id = ?`,
          [userId]
        );
        if (applicantRows.length > 0) {
          profileData.user = {
            ...profileData.user,
            ...applicantRows[0],
          };
        }
      } catch (applicantError) {
        // Log error but don't fail the request
        console.warn("Error fetching applicant data:", applicantError.message);
        // Set default application status if query fails
        profileData.user.application_status = "pending";
      }
    }

    // 2. User profile (detailed personal info)
    const [profileRows] = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id = ?`,
      [userId]
    );
    if (profileRows.length > 0) {
      profileData.profile = profileRows[0];
      // Include volunteer info for applicants
      if (profileData.user.role === "applicant") {
        profileData.volunteerInfo = {
          volunteer_reason: profileRows[0].volunteer_reason,
          volunteer_frequency: profileRows[0].volunteer_frequency,
        };
      }
    }

    // 3. Work profile (if working professional)
    const [workRows] = await pool.query(
      `SELECT wp.* FROM user_work_profile wp
       JOIN user_profiles up ON wp.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    if (workRows.length > 0) {
      profileData.workProfile = workRows[0];
    }

    // 4. Student profile (if student)
    const [studentRows] = await pool.query(
      `SELECT sp.* FROM user_student_profile sp
       JOIN user_profiles up ON sp.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    if (studentRows.length > 0) {
      profileData.studentProfile = studentRows[0];
    }

    // 5. Trainings
    const [trainingRows] = await pool.query(
      `SELECT t.training_id, t.training_name
       FROM user_trainings t
       JOIN user_profile_trainings upt ON t.training_id = upt.training_id
       JOIN user_profiles up ON upt.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    profileData.trainings = trainingRows;

    // 6. Achievements (optional - table may not exist yet)
    try {
      const [achievementRows] = await pool.query(
        `SELECT a.achievement_id, a.achievement_name, a.achievement_description, 
                a.achievement_icon, a.achievement_category, a.achievement_points,
                ua.earned_date, ua.notes,
                awarder.name as awarded_by_name
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.achievement_id
         LEFT JOIN users awarder ON ua.awarded_by_user_id = awarder.user_id
         WHERE ua.user_id = ?
         ORDER BY ua.earned_date DESC`,
        [userId]
      );
      profileData.achievements = achievementRows;
    } catch (achievementError) {
      // Achievements table may not exist yet - skip
      console.log(
        "Achievements table not available:",
        achievementError.message
      );
      profileData.achievements = [];
    }

    // 7. Available days (general availability)
    const [availableDaysRows] = await pool.query(
      `SELECT d.day_id, d.day_name
       FROM days d
       JOIN user_available_days uad ON d.day_id = uad.day_id
       JOIN user_profiles up ON uad.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    profileData.availableDays = availableDaysRows;

    // 8. Working days (for working professionals)
    const [workingDaysRows] = await pool.query(
      `SELECT d.day_id, d.day_name
       FROM days d
       JOIN user_working_days uwd ON d.day_id = uwd.day_id
       JOIN user_profiles up ON uwd.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    profileData.workingDays = workingDaysRows;

    // 9. School days (for students)
    const [schoolDaysRows] = await pool.query(
      `SELECT d.day_id, d.day_name
       FROM days d
       JOIN user_school_days usd ON d.day_id = usd.day_id
       JOIN user_profiles up ON usd.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    profileData.schoolDays = schoolDaysRows;

    // 10. Volunteer roles (for applicants and volunteers)
    const [volunteerRolesRows] = await pool.query(
      `SELECT r.role_id, r.role_name
       FROM user_roles r
       JOIN user_profile_roles upr ON r.role_id = upr.role_id
       JOIN user_profiles up ON upr.profile_id = up.profile_id
       WHERE up.user_id = ?`,
      [userId]
    );
    profileData.volunteerRoles = volunteerRolesRows;

    res.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching comprehensive profile:", error);
    res.status(500).json({ error: "Failed to fetch comprehensive profile" });
  }
});

/**
 * @route   PUT /api/profile/:uid/personal
 * @desc    Update user personal profile (user_profiles table)
 * @access  Private (Own profile only)
 */
router.put("/:uid/personal", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const {
      first_name,
      middle_initial,
      last_name,
      nickname,
      birthdate,
      gender,
      mobile_number,
      city,
      current_status,
      facebook,
      twitter,
      instagram,
      tiktok,
    } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own personal profile unless admin
    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Check if user_profiles entry exists
    const [existingProfile] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (existingProfile.length > 0) {
      // Update existing profile
      const profileId = existingProfile[0].profile_id;
      await pool.query(
        `UPDATE user_profiles 
         SET first_name = ?, middle_initial = ?, last_name = ?, nickname = ?,
             birthdate = ?, gender = ?, mobile_number = ?, city = ?,
             current_status = ?, facebook = ?, twitter = ?, instagram = ?, tiktok = ?
         WHERE profile_id = ?`,
        [
          first_name,
          middle_initial,
          last_name,
          nickname,
          birthdate,
          gender,
          mobile_number,
          city,
          current_status,
          facebook,
          twitter,
          instagram,
          tiktok,
          profileId,
        ]
      );
    } else {
      // Insert new profile
      await pool.query(
        `INSERT INTO user_profiles 
         (user_id, first_name, middle_initial, last_name, nickname, birthdate, gender, 
          mobile_number, city, current_status, facebook, twitter, instagram, tiktok)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          first_name,
          middle_initial,
          last_name,
          nickname,
          birthdate,
          gender,
          mobile_number,
          city,
          current_status,
          facebook,
          twitter,
          instagram,
          tiktok,
        ]
      );
    }

    // Also update basic user info (name and email are in users table)
    if (first_name && last_name) {
      const fullName = middle_initial
        ? `${first_name} ${middle_initial}. ${last_name}`
        : `${first_name} ${last_name}`;
      await pool.query(`UPDATE users SET name = ? WHERE user_id = ?`, [
        fullName,
        userId,
      ]);
    }

    res.json({
      success: true,
      message: "Personal profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating personal profile:", error);
    res.status(500).json({ error: "Failed to update personal profile" });
  }
});

/**
 * @route   PUT /api/profile/:uid/work-profile
 * @desc    Update user work profile
 * @access  Private (Own profile only)
 */
router.put("/:uid/work-profile", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { position, industry, company, work_shift, work_other_skills } =
      req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    // Only allow users to edit their own work profile unless admin
    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES (?)`,
        [userId]
      );
      const profileId = insertResult.insertId;
      profileRows = [{ profile_id: profileId }];
    }

    const profileId = profileRows[0].profile_id;

    // Check if work profile exists
    const [existingWork] = await pool.query(
      `SELECT * FROM user_work_profile WHERE profile_id = ?`,
      [profileId]
    );

    if (existingWork.length > 0) {
      // Update existing work profile
      await pool.query(
        `UPDATE user_work_profile 
         SET position = ?, industry = ?, company = ?, work_shift = ?, work_other_skills = ?
         WHERE profile_id = ?`,
        [position, industry, company, work_shift, work_other_skills, profileId]
      );
    } else {
      // Insert new work profile
      await pool.query(
        `INSERT INTO user_work_profile (profile_id, position, industry, company, work_shift, work_other_skills)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [profileId, position, industry, company, work_shift, work_other_skills]
      );
    }

    res.json({ success: true, message: "Work profile updated successfully" });
  } catch (error) {
    console.error("Error updating work profile:", error);
    res.status(500).json({ error: "Failed to update work profile" });
  }
});

/**
 * @route   PUT /api/profile/:uid/student-profile
 * @desc    Update user student profile
 * @access  Private (Own profile only)
 */
router.put("/:uid/student-profile", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { school, course, graduation, student_other_skills } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    // Only allow users to edit their own student profile unless admin
    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES (?)`,
        [userId]
      );
      const profileId = insertResult.insertId;
      profileRows = [{ profile_id: profileId }];
    }

    const profileId = profileRows[0].profile_id;

    // Check if student profile exists
    const [existingStudent] = await pool.query(
      `SELECT * FROM user_student_profile WHERE profile_id = ?`,
      [profileId]
    );

    if (existingStudent.length > 0) {
      // Update existing student profile
      await pool.query(
        `UPDATE user_student_profile 
         SET school = ?, course = ?, graduation = ?, student_other_skills = ?
         WHERE profile_id = ?`,
        [school, course, graduation, student_other_skills, profileId]
      );
    } else {
      // Insert new student profile
      await pool.query(
        `INSERT INTO user_student_profile (profile_id, school, course, graduation, student_other_skills)
         VALUES (?, ?, ?, ?, ?)`,
        [profileId, school, course, graduation, student_other_skills]
      );
    }

    res.json({
      success: true,
      message: "Student profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ error: "Failed to update student profile" });
  }
});

/**
 * @route   PUT /api/profile/:uid/trainings
 * @desc    Update user trainings
 * @access  Private (Own profile only)
 */
router.put("/:uid/trainings", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { trainingIds } = req.body; // Accept trainingIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    // Only allow users to edit their own trainings unless admin
    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES (?)`,
        [userId]
      );
      const profileId = insertResult.insertId;
      profileRows = [{ profile_id: profileId }];
    }

    const profileId = profileRows[0].profile_id;

    // Delete existing trainings
    await pool.query(
      `DELETE FROM user_profile_trainings WHERE profile_id = ?`,
      [profileId]
    );

    // Insert new trainings
    if (trainingIds && trainingIds.length > 0) {
      const values = trainingIds.map((tid) => [profileId, tid]);
      await pool.query(
        `INSERT INTO user_profile_trainings (profile_id, training_id) VALUES ?`,
        [values]
      );
    }

    res.json({ success: true, message: "Trainings updated successfully" });
  } catch (error) {
    console.error("Error updating trainings:", error);
    res.status(500).json({ error: "Failed to update trainings" });
  }
});

/**
 * @route   GET /api/profile/:uid/certificates
 * @desc    List training certificates for a user (owner or admin/staff only)
 * @access  Private
 */
router.get("/:uid/certificates", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const canView =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canView) {
      return res.status(403).json({ error: "Unauthorized to view certificates" });
    }

    // Resolve applicant_id for this user (if any)
    const [[applicant]] = await pool.query(
      `SELECT applicant_id FROM applicants WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (!applicant) {
      return res.json({ success: true, data: [] });
    }

    const certs = await applicantRepository.getCertificatesForApplicant(applicant.applicant_id);

    // Do not return raw s3_key by default — return metadata only
    const publicCerts = (certs || []).map((c) => ({
      id: c.id,
      trainingName: c.training_name,
      filename: c.original_filename,
      mimetype: c.mimetype,
      size: c.size,
      uploadedBy: c.uploaded_by,
      uploadedAt: c.uploaded_at,
    }));

    res.json({ success: true, data: publicCerts });
  } catch (err) {
    console.error("Error listing certificates:", err);
    res.status(500).json({ error: "Failed to list certificates" });
  }
});

/**
 * @route   GET /api/profile/:uid/certificates/:certId/download
 * @desc    Return presigned download URL for a certificate (owner or admin/staff only)
 * @access  Private
 */
router.get("/:uid/certificates/:certId/download", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const certId = parseInt(req.params.certId, 10);

    if (Number.isNaN(certId)) {
      return res.status(400).json({ error: "Invalid certificate ID" });
    }

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const canView =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canView) {
      return res.status(403).json({ error: "Unauthorized to download this certificate" });
    }

    // Resolve applicant_id
    const [[applicant]] = await pool.query(
      `SELECT applicant_id FROM applicants WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (!applicant) {
      return res.status(404).json({ error: "Applicant record not found for this user" });
    }

    const cert = await applicantRepository.getCertificateById(certId);
    if (!cert || cert.applicant_id !== applicant.applicant_id) {
      return res.status(404).json({ error: "Certificate not found for this user" });
    }

    // Generate presigned download URL
    let downloadUrl;
    try {
      downloadUrl = await s3Service.getPresignedDownloadUrl(cert.s3_key);
    } catch (err) {
      if (err && err.code === 'PRESIGNER_MISSING') {
        return res.status(500).json({ error: 'S3 presigner not available on server', code: 'PRESIGNER_MISSING' });
      }
      throw err;
    }

    res.json({ success: true, downloadUrl });
  } catch (err) {
    console.error("Error generating certificate download URL:", err);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

/**
 * @route   PUT /api/profile/:uid/available-days
 * @desc    Update user available days
 * @access  Private (Own profile only)
 */
router.put("/:uid/available-days", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { dayIds } = req.body; // Accept dayIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    // Only allow users to edit their own available days unless admin
    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES (?)`,
        [userId]
      );
      const profileId = insertResult.insertId;
      profileRows = [{ profile_id: profileId }];
    }

    const profileId = profileRows[0].profile_id;

    // Delete existing available days
    await pool.query(`DELETE FROM user_available_days WHERE profile_id = ?`, [
      profileId,
    ]);

    // Insert new available days
    if (dayIds && dayIds.length > 0) {
      const values = dayIds.map((did) => [profileId, did]);
      await pool.query(
        `INSERT INTO user_available_days (profile_id, day_id) VALUES ?`,
        [values]
      );
    }

    res.json({ success: true, message: "Available days updated successfully" });
  } catch (error) {
    console.error("Error updating available days:", error);
    res.status(500).json({ error: "Failed to update available days" });
  }
});

/**
 * @route   PUT /api/profile/:uid/working-days
 * @desc    Update user working days
 * @access  Private (Own profile only)
 */
router.put("/:uid/working-days", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { dayIds } = req.body; // Accept dayIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    // Only allow users to edit their own working days unless admin
    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES (?)`,
        [userId]
      );
      const profileId = insertResult.insertId;
      profileRows = [{ profile_id: profileId }];
    }

    const profileId = profileRows[0].profile_id;

    // Delete existing working days
    await pool.query(`DELETE FROM user_working_days WHERE profile_id = ?`, [
      profileId,
    ]);

    // Insert new working days
    if (dayIds && dayIds.length > 0) {
      const values = dayIds.map((did) => [profileId, did]);
      await pool.query(
        `INSERT INTO user_working_days (profile_id, day_id) VALUES ?`,
        [values]
      );
    }

    res.json({ success: true, message: "Working days updated successfully" });
  } catch (error) {
    console.error("Error updating working days:", error);
    res.status(500).json({ error: "Failed to update working days" });
  }
});

/**
 * @route   PUT /api/profile/:uid/school-days
 * @desc    Update user school days
 * @access  Private (Own profile only)
 */
router.put("/:uid/school-days", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { dayIds } = req.body; // Accept dayIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const isAdmin = requestingUser.role === "admin";

    // Only allow users to edit their own school days unless admin
    if (!isEditingOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES (?)`,
        [userId]
      );
      const profileId = insertResult.insertId;
      profileRows = [{ profile_id: profileId }];
    }

    const profileId = profileRows[0].profile_id;

    // Delete existing school days
    await pool.query(`DELETE FROM user_school_days WHERE profile_id = ?`, [
      profileId,
    ]);

    // Insert new school days
    if (dayIds && dayIds.length > 0) {
      const values = dayIds.map((did) => [profileId, did]);
      await pool.query(
        `INSERT INTO user_school_days (profile_id, day_id) VALUES ?`,
        [values]
      );
    }

    res.json({ success: true, message: "School days updated successfully" });
  } catch (error) {
    console.error("Error updating school days:", error);
    res.status(500).json({ error: "Failed to update school days" });
  }
});

/**
 * @route   PUT /api/profile/:uid/volunteer-info
 * @desc    Update volunteer reason and frequency for applicants
 * @access  Private (Own profile or Admin/Staff)
 */
router.put("/:uid/volunteer-info", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { volunteer_reason, volunteer_frequency } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const canEdit =
      isEditingOwnProfile ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canEdit) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Update volunteer info in user_profiles
    const updates = [];
    const values = [];

    if (volunteer_reason !== undefined) {
      updates.push("volunteer_reason = ?");
      values.push(volunteer_reason);
    }

    if (volunteer_frequency !== undefined) {
      updates.push("volunteer_frequency = ?");
      values.push(volunteer_frequency);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(userId);

    await pool.query(
      `UPDATE user_profiles SET ${updates.join(", ")} WHERE user_id = ?`,
      values
    );

    res.json({ success: true, message: "Volunteer info updated successfully" });
  } catch (error) {
    console.error("Error updating volunteer info:", error);
    res.status(500).json({ error: "Failed to update volunteer info" });
  }
});

/**
 * @route   PUT /api/profile/:uid/volunteer-roles
 * @desc    Update volunteer roles for applicants
 * @access  Private (Own profile or Admin/Staff)
 */
router.put("/:uid/volunteer-roles", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { roleNames } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;
    const canEdit =
      isEditingOwnProfile ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canEdit) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this profile" });
    }

    // Get profile_id
    const [profileRows] = await pool.query(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileId = profileRows[0].profile_id;

    // Delete existing volunteer roles
    await pool.query(
      `DELETE FROM user_profile_roles WHERE profile_id = ?`,
      [profileId]
    );

    // Insert new volunteer roles
    if (roleNames && roleNames.length > 0) {
      for (const roleName of roleNames) {
        const [roleRows] = await pool.query(
          `SELECT role_id FROM user_roles WHERE role_name = ?`,
          [roleName]
        );
        
        if (roleRows.length > 0) {
          await pool.query(
            `INSERT INTO user_profile_roles (profile_id, role_id) VALUES (?, ?)`,
            [profileId, roleRows[0].role_id]
          );
        }
      }
    }

    res.json({ success: true, message: "Volunteer roles updated successfully" });
  } catch (error) {
    console.error("Error updating volunteer roles:", error);
    res.status(500).json({ error: "Failed to update volunteer roles" });
  }
});

/**
 * @route   PUT /api/profile/:uid/settings
 * @desc    Update user settings (theme, notifications, etc.)
 * @access  Private (Own profile only)
 */
router.put("/:uid/settings", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;
    const { settings } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own settings
    const isEditingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;

    if (!isEditingOwnProfile) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit settings for this profile" });
    }

    // Validate settings object
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        error: "Settings must be a valid object",
      });
    }

    // Get or create profile_id
    let [profileRows] = await pool.query(
      `SELECT profile_id, settings AS current_settings FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      // Create user_profiles entry if it doesn't exist
      const [insertResult] = await pool.query(
        `INSERT INTO user_profiles (user_id, settings) VALUES (?, ?)`,
        [userId, JSON.stringify(settings)]
      );
      const profileId = insertResult.insertId;

      return res.json({
        success: true,
        message: "Settings saved successfully",
        data: { settings },
      });
    }

    const profileId = profileRows[0].profile_id;
    const currentSettings = profileRows[0].current_settings
      ? JSON.parse(profileRows[0].current_settings)
      : {};

    // Merge new settings with existing settings
    const mergedSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update settings in user_profiles
    await pool.query(
      `UPDATE user_profiles SET settings = ? WHERE profile_id = ?`,
      [JSON.stringify(mergedSettings), profileId]
    );

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: { settings: mergedSettings },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

/**
 * @route   GET /api/profile/:uid/settings
 * @desc    Get user settings
 * @access  Private (Own profile only)
 */
router.get("/:uid/settings", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileUser = req.profileUser;
    const userId = profileUser.user_id;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to view their own settings
    const isViewingOwnProfile =
      requestingUser.user_id === userId ||
      requestingUser.uid === profileUser.uid;

    if (!isViewingOwnProfile) {
      return res
        .status(403)
        .json({ error: "Unauthorized to view settings for this profile" });
    }

    // Get settings from user_profiles
    const [profileRows] = await pool.query(
      `SELECT settings FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0 || !profileRows[0].settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          settings: {
            theme: "system",
            pushNotifications: {
              enabled: false,
            },
            emailNotifications: true,
          },
        },
      });
    }

    const settings = JSON.parse(profileRows[0].settings);

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// ============================================
// Valid ID Endpoints
// ============================================

// GET /api/profile/:uid/valid-id - Get Valid ID metadata
router.get("/:uid/valid-id", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const currentUser = await getUserFromFirebaseUid(req.firebaseUid);

    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profileUser = req.profileUser;

    // Only admin/staff can view other users' Valid IDs, or the user themselves
    const isOwner = currentUser.user_id === profileUser.user_id;
    const isPrivileged = ["admin", "staff"].includes(currentUser.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: "Not authorized to view this Valid ID" });
    }

    // Get Valid ID metadata from user_profiles
    const [rows] = await pool.query(
      `SELECT valid_id_s3_key, valid_id_filename, valid_id_mimetype, valid_id_size, valid_id_uploaded_at 
       FROM user_profiles 
       WHERE user_id = ?`,
      [profileUser.user_id]
    );

    if (rows.length === 0 || !rows[0].valid_id_s3_key) {
      return res.json({
        success: true,
        data: null,
        message: "No Valid ID uploaded"
      });
    }

    const validId = rows[0];
    res.json({
      success: true,
      data: {
        filename: validId.valid_id_filename,
        mimetype: validId.valid_id_mimetype,
        size: validId.valid_id_size,
        uploadedAt: validId.valid_id_uploaded_at,
        hasValidId: true
      }
    });
  } catch (error) {
    console.error("Error fetching Valid ID metadata:", error);
    res.status(500).json({ error: "Failed to fetch Valid ID" });
  }
});

// GET /api/profile/:uid/valid-id/download - Get presigned URL for Valid ID download
router.get("/:uid/valid-id/download", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const currentUser = await getUserFromFirebaseUid(req.firebaseUid);

    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profileUser = req.profileUser;

    // Only admin/staff can download other users' Valid IDs, or the user themselves
    const isOwner = currentUser.user_id === profileUser.user_id;
    const isPrivileged = ["admin", "staff"].includes(currentUser.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: "Not authorized to download this Valid ID" });
    }

    // Get Valid ID S3 key from user_profiles
    const [rows] = await pool.query(
      `SELECT valid_id_s3_key, valid_id_filename 
       FROM user_profiles 
       WHERE user_id = ?`,
      [profileUser.user_id]
    );

    if (rows.length === 0 || !rows[0].valid_id_s3_key) {
      return res.status(404).json({ error: "No Valid ID found" });
    }

    const s3Key = rows[0].valid_id_s3_key;
    const filename = rows[0].valid_id_filename;

    // Generate presigned URL for download
    const presignedUrl = await s3Service.getPresignedDownloadUrl(s3Key);

    res.json({
      success: true,
      data: {
        url: presignedUrl,
        filename: filename,
        expiresIn: 3600
      }
    });
  } catch (error) {
    console.error("Error generating Valid ID download URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

// DELETE /api/profile/:uid/valid-id - Remove Valid ID
router.delete("/:uid/valid-id", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const currentUser = await getUserFromFirebaseUid(req.firebaseUid);

    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profileUser = req.profileUser;

    // Only admin can delete other users' Valid IDs, or the user themselves
    const isOwner = currentUser.user_id === profileUser.user_id;
    const isAdmin = currentUser.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to delete this Valid ID" });
    }

    // Get current Valid ID S3 key
    const [rows] = await pool.query(
      `SELECT valid_id_s3_key FROM user_profiles WHERE user_id = ?`,
      [profileUser.user_id]
    );

    if (rows.length === 0 || !rows[0].valid_id_s3_key) {
      return res.status(404).json({ error: "No Valid ID found to delete" });
    }

    const s3Key = rows[0].valid_id_s3_key;

    // Delete from S3
    try {
      await s3Service.deleteImage(s3Key);
      console.log(`[DELETE Valid ID] Deleted from S3: ${s3Key}`);
    } catch (s3Error) {
      console.error(`[DELETE Valid ID] S3 delete failed:`, s3Error);
      // Continue to clear metadata even if S3 delete fails
    }

    // Clear metadata from user_profiles
    await pool.query(
      `UPDATE user_profiles 
       SET valid_id_s3_key = NULL, 
           valid_id_filename = NULL, 
           valid_id_mimetype = NULL, 
           valid_id_size = NULL, 
           valid_id_uploaded_at = NULL 
       WHERE user_id = ?`,
      [profileUser.user_id]
    );

    res.json({
      success: true,
      message: "Valid ID deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting Valid ID:", error);
    res.status(500).json({ error: "Failed to delete Valid ID" });
  }
});

module.exports = router;

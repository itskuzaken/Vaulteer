const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getPool } = require("../db/pool");

// Helper function to get user from Firebase UID
async function getUserFromFirebaseUid(firebaseUid) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, r.role
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.uid = ?`,
    [firebaseUid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * @route   GET /api/profile/:id
 * @desc    Get user profile by ID
 * @access  Private (Own profile or Admin/Staff)
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileId = parseInt(req.params.id);

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check authorization: Users can view their own profile, Admin/Staff can view all
    const canView =
      requestingUser.user_id === profileId ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canView) {
      return res.status(403).json({
        error: "Unauthorized to view this profile",
      });
    }

    // Fetch profile data
    const [profileRows] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, r.role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [profileId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = profileRows[0];

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * @route   PUT /api/profile/:id
 * @desc    Update user profile
 * @access  Private (Own profile only)
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const profileId = parseInt(req.params.id);
    const { name, email, phone, address } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check authorization: Users can only edit their own profile
    if (requestingUser.user_id !== profileId) {
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

    values.push(profileId);

    // Update user profile
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`,
      values
    );

    // Fetch updated profile
    const [updatedRows] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, r.role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [profileId]
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
 * @route   GET /api/profile/:id/comprehensive
 * @desc    Get comprehensive user profile with all related data
 * @access  Private (Own profile or Admin/Staff)
 */
router.get("/:id/comprehensive", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check authorization
    const canView =
      requestingUser.user_id === userId ||
      requestingUser.role === "admin" ||
      requestingUser.role === "staff";

    if (!canView) {
      return res.status(403).json({
        error: "Unauthorized to view this profile",
      });
    }

    // 1. Basic user info
    const [userRows] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.date_added, u.profile_picture, r.role
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
    };

    // 2. User profile (detailed personal info)
    const [profileRows] = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id = ?`,
      [userId]
    );
    if (profileRows.length > 0) {
      profileData.profile = profileRows[0];
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
 * @route   PUT /api/profile/:id/personal
 * @desc    Update user personal profile (user_profiles table)
 * @access  Private (Own profile only)
 */
router.put("/:id/personal", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
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

    // Only allow users to edit their own personal profile
    if (requestingUser.user_id !== userId) {
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
 * @route   PUT /api/profile/:id/work-profile
 * @desc    Update user work profile
 * @access  Private (Own profile only)
 */
router.put("/:id/work-profile", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { position, industry, company, work_shift, work_other_skills } =
      req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own work profile
    if (requestingUser.user_id !== userId) {
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
 * @route   PUT /api/profile/:id/student-profile
 * @desc    Update user student profile
 * @access  Private (Own profile only)
 */
router.put("/:id/student-profile", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { school, course, graduation, student_other_skills } = req.body;

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own student profile
    if (requestingUser.user_id !== userId) {
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
 * @route   PUT /api/profile/:id/trainings
 * @desc    Update user trainings
 * @access  Private (Own profile only)
 */
router.put("/:id/trainings", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { trainingIds } = req.body; // Accept trainingIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own trainings
    if (requestingUser.user_id !== userId) {
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
 * @route   PUT /api/profile/:id/available-days
 * @desc    Update user available days
 * @access  Private (Own profile only)
 */
router.put("/:id/available-days", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { dayIds } = req.body; // Accept dayIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own available days
    if (requestingUser.user_id !== userId) {
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
 * @route   PUT /api/profile/:id/working-days
 * @desc    Update user working days
 * @access  Private (Own profile only)
 */
router.put("/:id/working-days", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { dayIds } = req.body; // Accept dayIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own working days
    if (requestingUser.user_id !== userId) {
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
 * @route   PUT /api/profile/:id/school-days
 * @desc    Update user school days
 * @access  Private (Own profile only)
 */
router.put("/:id/school-days", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { dayIds } = req.body; // Accept dayIds (camelCase from frontend)

    // Get requesting user
    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow users to edit their own school days
    if (requestingUser.user_id !== userId) {
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

module.exports = router;

const { getPool } = require("../db/pool");
const {
  createLog,
  LOG_TYPES,
  SEVERITY_LEVELS,
} = require("../services/activityLogService");

async function getUserFromFirebaseUid(firebaseUid) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id, u.uid, u.name, u.email, u.status, r.role, u.last_login_at, u.updated_at
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.uid = ? LIMIT 1`,
    [firebaseUid]
  );
  return rows[0] || null;
}

async function getUserById(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id, u.uid, u.name, u.email, u.status, r.role, u.date_added, u.last_login_at, u.updated_at
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function resolveRoleId(role) {
  const normalizedRole = (role || "").toLowerCase().trim();
  if (!normalizedRole) return null;
  const pool = getPool();
  const [[roleRow]] = await pool.query(
    "SELECT role_id, role FROM roles WHERE role = ? LIMIT 1",
    [normalizedRole]
  );
  return roleRow || null;
}

// Get all users
const getUsers = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.uid AS uid, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// Get volunteers specifically
const getVolunteers = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.uid AS uid, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'volunteer'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching volunteers:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// Get all staffs specifically
const getStaffs = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.uid AS uid, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'staff'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// Get all applicants specifically
const getApplicants = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.uid AS uid, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'applicant'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching applicants:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// Get all admins specifically
const getAdmins = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.uid AS uid, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'admin'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// Add new user
const addUser = async (req, res) => {
  try {
    const pool = getPool();
    const { uid, name, email, role } = req.body;

    if (!uid || !name || !email || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [[roleRow]] = await pool.query(
      "SELECT role_id FROM roles WHERE role = ? LIMIT 1",
      [role]
    );

    if (!roleRow) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [result] = await pool.query(
      "INSERT INTO users (uid, name, email, role_id, status, date_added, last_login_at) VALUES (?, ?, ?, ?, 'active', CURDATE(), NOW())",
      [uid, name, email, roleRow.role_id]
    );

    res.status(201).json({
      id: result.insertId,
      uid,
      name,
      email,
      role,
      role_id: roleRow.role_id,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { status } = req.body || {};

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const allowedStatuses = ["active", "inactive", "deactivated"];
    const normalizedStatus = (status || "").toLowerCase().trim();

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: "Invalid status provided",
      });
    }

    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "Requesting user not found" });
    }

    if (requestingUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    if (
      requestingUser.user_id === targetUser.user_id &&
      normalizedStatus === "deactivated"
    ) {
      return res.status(400).json({
        error: "Administrators cannot deactivate their own account.",
      });
    }

    const previousStatus = (targetUser.status || "").toLowerCase();

    if (previousStatus === normalizedStatus) {
      const sameStatusMessages = {
        active: "User is already active.",
        inactive: "User is already inactive.",
        deactivated: "User is already deactivated.",
      };
      const message =
        sameStatusMessages[normalizedStatus] || "No status change required.";
      return res.json({
        success: true,
        message,
        data: { userId: targetUser.user_id, status: normalizedStatus },
      });
    }

    await pool.query(
      `UPDATE users
       SET status = ?,
           last_login_at = CASE WHEN ? = 'active' THEN NOW() ELSE last_login_at END
       WHERE user_id = ?`,
      [normalizedStatus, normalizedStatus, userId]
    );

    try {
      await createLog({
        type: LOG_TYPES.PROFILE,
        action: "STATUS_UPDATE",
        performedBy: {
          userId: requestingUser.user_id,
          name: requestingUser.name || requestingUser.email,
          role: requestingUser.role,
        },
        targetResource: {
          type: "user",
          id: targetUser.user_id,
        },
        changes: {
          field: "status",
          previous: previousStatus,
          next: normalizedStatus,
        },
        description: `Updated user status from ${previousStatus} to ${normalizedStatus}`,
        severity:
          normalizedStatus === "deactivated"
            ? SEVERITY_LEVELS.MEDIUM
            : SEVERITY_LEVELS.INFO,
        metadata: {
          timestamp: new Date().toISOString(),
          updatedBy: requestingUser.user_id,
        },
      });
    } catch (logError) {
      console.warn("Failed to log status update", logError);
    }

    const updatedAt = new Date().toISOString();
    const statusMessages = {
      active: "User activated successfully.",
      inactive: "User marked as inactive.",
      deactivated: "User deactivated successfully.",
    };
    const successMessage =
      statusMessages[normalizedStatus] || "User status updated.";

    res.json({
      success: true,
      message: successMessage,
      data: {
        userId: targetUser.user_id,
        status: normalizedStatus,
        updatedBy: requestingUser.user_id,
        updatedAt,
      },
    });
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ error: "Failed to update user status" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { role } = req.body || {};

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "Requesting user not found" });
    }

    if (requestingUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const roleRecord = await resolveRoleId(role);
    if (!roleRecord) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    if ((targetUser.role || "").toLowerCase() === roleRecord.role) {
      return res.json({
        success: true,
        data: { userId: targetUser.user_id, role: targetUser.role },
      });
    }

    await pool.query(`UPDATE users SET role_id = ? WHERE user_id = ?`, [
      roleRecord.role_id,
      userId,
    ]);

    try {
      await createLog({
        type: LOG_TYPES.SECURITY,
        action: "ROLE_UPDATE",
        performedBy: {
          userId: requestingUser.user_id,
          name: requestingUser.name || requestingUser.email,
          role: requestingUser.role,
        },
        targetResource: {
          type: "user",
          id: targetUser.user_id,
        },
        changes: {
          field: "role",
          previous: targetUser.role,
          next: roleRecord.role,
        },
        description: `Updated user role to ${roleRecord.role}`,
        severity: SEVERITY_LEVELS.MEDIUM,
        metadata: {
          timestamp: new Date().toISOString(),
          updatedBy: requestingUser.user_id,
        },
      });
    } catch (logError) {
      console.warn("Failed to log role update", logError);
    }

    const friendlyRole =
      roleRecord.role.charAt(0).toUpperCase() + roleRecord.role.slice(1);
    const updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: `User role updated to ${friendlyRole}.`,
      data: {
        userId: targetUser.user_id,
        role: roleRecord.role,
        updatedBy: requestingUser.user_id,
        updatedAt,
      },
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ error: "Failed to update user role" });
  }
};

const updateUserActivity = async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id, 10);
    const { occurredAt } = req.body || {};

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const requestingUser = await getUserFromFirebaseUid(req.firebaseUid);
    if (!requestingUser) {
      return res.status(404).json({ error: "Requesting user not found" });
    }

    const isSelfUpdate = requestingUser.user_id === userId;
    if (!isSelfUpdate && requestingUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const targetUser = isSelfUpdate
      ? requestingUser
      : await getUserById(userId);

    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const previousStatus = (targetUser.status || "").toLowerCase();

    let activityDate;
    if (occurredAt) {
      const parsed = new Date(occurredAt);
      if (!Number.isNaN(parsed.getTime())) {
        activityDate = parsed;
      }
    }

    if (!activityDate) {
      activityDate = new Date();
    }

    await pool.query(
      `UPDATE users
       SET status = 'active',
           last_login_at = ?
       WHERE user_id = ?`,
      [activityDate, userId]
    );

    if (previousStatus !== "active") {
      try {
        await createLog({
          type: LOG_TYPES.PROFILE,
          action: "STATUS_UPDATE",
          performedBy: {
            userId: requestingUser.user_id,
            name: requestingUser.name || requestingUser.email,
            role: requestingUser.role,
          },
          targetResource: {
            type: "user",
            id: userId,
          },
          changes: {
            field: "status",
            previous: previousStatus,
            next: "active",
          },
          description: "User reactivated via login",
          severity: SEVERITY_LEVELS.INFO,
          metadata: {
            timestamp: activityDate.toISOString(),
            localTime: activityDate.toLocaleString(),
            reactivatedBy: requestingUser.user_id,
            reactivationType: "login",
          },
          occurredAt: activityDate,
        });
      } catch (logError) {
        console.warn("Failed to log activity update", logError);
      }
    }

    const lastLoginAt = activityDate.toISOString();

    res.json({
      success: true,
      message: "User activity recorded.",
      data: {
        userId,
        status: "active",
        lastLoginAt,
        reactivated: previousStatus !== "active",
      },
    });
  } catch (err) {
    console.error("Error updating user activity:", err);
    res.status(500).json({ error: "Failed to update user activity" });
  }
};

module.exports = {
  getUsers,
  getVolunteers,
  getStaffs,
  getApplicants,
  getAdmins,
  addUser,
  updateUserStatus,
  updateUserRole,
  getUserFromFirebaseUid,
  getUserById,
  updateUserActivity,
};

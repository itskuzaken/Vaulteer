const { getPool } = require("../db/pool");

const APPLICATION_STATUSES = new Set([
  "pending",
  "under_review",
  "interview_scheduled",
  "approved",
  "rejected",
]);

async function getStatusId(connection, statusName) {
  const [[row]] = await connection.query(
    `SELECT status_id FROM application_statuses WHERE status_name = ? LIMIT 1`,
    [statusName]
  );
  if (!row) {
    throw new Error(`Application status '${statusName}' not found`);
  }
  return row.status_id;
}

// Get all application statuses
async function getAllApplicationStatuses() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT status_id, status_name FROM application_statuses ORDER BY status_id`
  );
  return rows;
}

// Update applicant status (generic function that replaces approve/reject)
async function updateApplicantStatus(
  userId,
  newStatusName,
  changedByUserId,
  notes = null
) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log(
      `[updateApplicantStatus] userId: ${userId}, newStatus: ${newStatusName}, changedBy: ${changedByUserId}`
    );

    // Get the new status ID
    const newStatusId = await getStatusId(connection, newStatusName);
    console.log(`[updateApplicantStatus] newStatusId: ${newStatusId}`);

    // Get current applicant data
    const [applicantRows] = await connection.query(
      `SELECT applicant_id, status_id FROM applicants WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (applicantRows.length === 0) {
      throw new Error("Applicant record not found");
    }

    const applicant = applicantRows[0];
    const oldStatusId = applicant.status_id;
    console.log(
      `[updateApplicantStatus] applicant found: ${applicant.applicant_id}, oldStatusId: ${oldStatusId}`
    );

    // Get old status name for logging
    const [[oldStatusRow]] = await connection.query(
      `SELECT status_name FROM application_statuses WHERE status_id = ? LIMIT 1`,
      [oldStatusId]
    );
    const oldStatusName = oldStatusRow?.status_name || "unknown";
    console.log(`[updateApplicantStatus] oldStatusName: ${oldStatusName}`);

    // Update applicant status
    await connection.query(
      `UPDATE applicants SET status_id = ? WHERE applicant_id = ?`,
      [newStatusId, applicant.applicant_id]
    );
    console.log(`[updateApplicantStatus] applicant status updated`);

    // Get admin user details for logging
    const [adminUserRows] = await connection.query(
      `SELECT name, role_id FROM users WHERE user_id = ? LIMIT 1`,
      [changedByUserId]
    );
    const adminUser = adminUserRows.length > 0 ? adminUserRows[0] : null;
    console.log(`[updateApplicantStatus] adminUser:`, adminUser);

    let adminRoleName = "admin";
    if (adminUser && adminUser.role_id) {
      const [adminRoleRows] = await connection.query(
        `SELECT role FROM roles WHERE role_id = ? LIMIT 1`,
        [adminUser.role_id]
      );
      if (adminRoleRows.length > 0) {
        adminRoleName = adminRoleRows[0].role;
      }
    }
    console.log(`[updateApplicantStatus] adminRoleName: ${adminRoleName}`);

    // Log the status change in activity_logs
    await connection.query(
      `INSERT INTO activity_logs 
        (type, action, severity, performed_by_user_id, performed_by_name, performed_by_role,
         target_resource_type, target_resource_id, changes, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        "application",
        "status_change",
        "MEDIUM",
        changedByUserId,
        adminUser?.name || "System",
        adminRoleName,
        "applicant",
        applicant.applicant_id.toString(),
        JSON.stringify({
          old_status: oldStatusName,
          new_status: newStatusName,
          notes: notes,
        }),
        `Application status changed from ${oldStatusName} to ${newStatusName}${
          notes ? ": " + notes : ""
        }`,
      ]
    );
    console.log(`[updateApplicantStatus] activity log created`);

    // If approved, update user role to volunteer and status to active
    if (newStatusName === "approved") {
      const [volRoleRows] = await connection.query(
        `SELECT role_id FROM roles WHERE role = 'volunteer' LIMIT 1`
      );
      if (volRoleRows.length > 0) {
        await connection.query(
          `UPDATE users SET role_id = ?, status = 'active', updated_at = NOW() WHERE user_id = ?`,
          [volRoleRows[0].role_id, userId]
        );
        console.log(`[updateApplicantStatus] user role updated to volunteer`);
      }
    }

    // If rejected, set user status to inactive
    if (newStatusName === "rejected") {
      await connection.query(
        `UPDATE users SET status = 'inactive', updated_at = NOW() WHERE user_id = ?`,
        [userId]
      );
      console.log(`[updateApplicantStatus] user status set to inactive`);
    }

    await connection.commit();
    console.log(`[updateApplicantStatus] transaction committed successfully`);

    return {
      userId,
      application_status: newStatusName,
      changed_by: changedByUserId,
      changed_at: new Date(),
    };
  } catch (error) {
    console.error(`[updateApplicantStatus] ERROR:`, error);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Get applicant status history
async function getApplicantStatusHistory(userId) {
  const pool = getPool();

  try {
    // First get the applicant_id for this user
    const [[applicant]] = await pool.query(
      `SELECT applicant_id FROM applicants WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (!applicant) {
      return [];
    }

    const [rows] = await pool.query(
      `SELECT 
         al.log_id,
         al.action,
         al.changes,
         al.description,
         al.created_at,
         al.performed_by_name,
         al.performed_by_user_id,
         u.uid as performed_by_uid
       FROM activity_logs al
       LEFT JOIN users u ON al.performed_by_user_id = u.user_id
       WHERE al.target_resource_type = 'applicant'
         AND al.target_resource_id = ?
         AND al.action = 'status_change'
       ORDER BY al.created_at DESC`,
      [applicant.applicant_id.toString()]
    );

    // If no rows, return empty array
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row) => {
      try {
        const changes =
          typeof row.changes === "string"
            ? JSON.parse(row.changes)
            : row.changes;

        return {
          id: row.log_id,
          status_name: changes?.new_status || "unknown",
          old_status: changes?.old_status,
          changed_at: row.created_at,
          changed_by_name: row.performed_by_name || "System",
          changed_by_uid: row.performed_by_uid,
          notes: changes?.notes,
          description: row.description,
        };
      } catch (parseErr) {
        console.error("Error parsing activity log row:", parseErr);
        // Return a safe fallback for corrupted data
        return {
          id: row.log_id,
          status_name: "unknown",
          changed_at: row.created_at,
          changed_by_name: row.performed_by_name || "System",
          changed_by_uid: row.performed_by_uid,
          notes: null,
          description: row.description,
        };
      }
    });
  } catch (queryErr) {
    console.error("Error fetching applicant status history:", queryErr);
    // Return empty array instead of throwing to prevent UI breakage
    return [];
  }
}

async function listApplicants() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       u.user_id   AS id,
       u.name,
       u.email,
       r.role,
       u.status,
       u.date_added,
       u.last_login_at,
       u.updated_at,
       a.status_id,
       s.status_name AS application_status,
       a.application_date
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     LEFT JOIN applicants a ON a.user_id = u.user_id
     LEFT JOIN application_statuses s ON s.status_id = a.status_id
     WHERE r.role = 'applicant'
     ORDER BY COALESCE(a.application_date, u.date_added) DESC`
  );
  return rows;
}

async function approveApplicant(id) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const approvedStatusId = await getStatusId(connection, "approved");

    const [[volRole]] = await connection.query(
      `SELECT role_id FROM roles WHERE role = 'volunteer' LIMIT 1`
    );
    if (!volRole) throw new Error("Volunteer role not found");

    const [applicantRows] = await connection.query(
      `SELECT applicant_id FROM applicants WHERE user_id = ? LIMIT 1`,
      [id]
    );
    if (applicantRows.length === 0) {
      throw new Error("Applicant record not found");
    }

    await connection.query(
      `UPDATE applicants
         SET status_id = ?,
             application_date = COALESCE(application_date, CURRENT_DATE)
       WHERE applicant_id = ?`,
      [approvedStatusId, applicantRows[0].applicant_id]
    );

    await connection.query(
      `UPDATE users
         SET role_id = ?,
             status = 'active',
             updated_at = NOW()
       WHERE user_id = ?`,
      [volRole.role_id, id]
    );

    await connection.commit();
    return { id, application_status: "approved" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rejectApplicant(id) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const rejectedStatusId = await getStatusId(connection, "rejected");

    const [result] = await connection.query(
      `UPDATE applicants
         SET status_id = ?
       WHERE user_id = ?`,
      [rejectedStatusId, id]
    );

    if (result.affectedRows === 0) {
      throw new Error("Applicant record not found");
    }

    await connection.query(
      `UPDATE users
         SET status = 'inactive',
             updated_at = NOW()
       WHERE user_id = ?`,
      [id]
    );

    await connection.commit();
    return { id, application_status: "rejected" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listApplicants,
  approveApplicant,
  rejectApplicant,
  APPLICATION_STATUSES,
  getStatusId,
  getAllApplicationStatuses,
  updateApplicantStatus,
  getApplicantStatusHistory,
};

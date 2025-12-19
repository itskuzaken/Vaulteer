const { getPool } = require("../db/pool");
const emailService = require("../services/emailService");
const notificationService = require("../services/notificationService");
const userRepository = require("./userRepository");
const userSettingsRepository = require("./userSettingsRepository");

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
  notes = null,
  options = {}
) {
  const pool = getPool();
  const connection = await pool.getConnection();

  const { interviewDetails = null } = options || {};

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

    const [[applicantUser]] = await connection.query(
      `SELECT u.name, u.email, up.position, up.current_status FROM users u LEFT JOIN user_profiles up ON up.user_id = u.user_id WHERE u.user_id = ? LIMIT 1`,
      [userId]
    );

    const changesPayload = {
      old_status: oldStatusName,
      new_status: newStatusName,
      notes: notes,
      interview_details: interviewDetails || undefined,
    };

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
        JSON.stringify(changesPayload),
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

    // Send applicant notifications (best-effort, do not block response)
    if (applicantUser?.email) {
      try {
        if (newStatusName === "approved" || newStatusName === "rejected") {
          const content = emailService.generateApplicantDecisionEmail({
            applicantName: applicantUser.name,
            status: newStatusName,
            notes,
          });

          await emailService.sendEmail(
            applicantUser.email,
            content.subject,
            content.html,
            content.text
          );
        } else if (newStatusName === "interview_scheduled" && interviewDetails) {
          const content = emailService.generateInterviewScheduleEmail({
            applicantName: applicantUser.name,
            interviewDetails,
            position: applicantUser.position || "Volunteer Position",
            organizationName: process.env.FRONTEND_ORGANIZATION_NAME || "Vaulteer",
          });

          await emailService.sendEmail(
            applicantUser.email,
            content.subject,
            content.html,
            content.text
          );
        }
      } catch (emailErr) {
        console.error("[updateApplicantStatus] Failed to send email:", emailErr);
      }
    }

    return {
      userId,
      application_status: newStatusName,
      changed_by: changedByUserId,
      changed_at: new Date(),
      interview_details: interviewDetails || null,
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
          interview_details: changes?.interview_details || null,
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
          interview_details: null,
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

// Create new applicant with complete profile data
async function createApplicantWithProfile(userData, formData) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get or create user
    let userId;
    const [[existingUser]] = await connection.query(
      `SELECT user_id FROM users WHERE uid = ? LIMIT 1`,
      [userData.uid]
    );

    if (existingUser) {
      userId = existingUser.user_id;
      // Update user info if needed
      await connection.query(
        `UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE user_id = ?`,
        [userData.name, userData.email, userId]
      );
    } else {
      // Get applicant role_id
      const [[applicantRole]] = await connection.query(
        `SELECT role_id FROM roles WHERE role = 'applicant' LIMIT 1`
      );
      if (!applicantRole) throw new Error("Applicant role not found");

      // Create new user
      const [userResult] = await connection.query(
        `INSERT INTO users (uid, name, email, role_id, status, date_added) 
         VALUES (?, ?, ?, ?, 'active', NOW())`,
        [userData.uid, userData.name, userData.email, applicantRole.role_id]
      );
      userId = userResult.insertId;
    }

    // 2. Check if applicant record already exists
    const [[existingApplicant]] = await connection.query(
      `SELECT applicant_id FROM applicants WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (existingApplicant) {
      throw new Error("Application already submitted for this user");
    }

    // 3. Create applicant record with pending status
    const pendingStatusId = await getStatusId(connection, "pending");
    const [applicantResult] = await connection.query(
      `INSERT INTO applicants (user_id, status_id, application_date) 
       VALUES (?, ?, CURDATE())`,
      [userId, pendingStatusId]
    );
    const applicantId = applicantResult.insertId;

    // 4. Create user_profiles record
    const [profileResult] = await connection.query(
      `INSERT INTO user_profiles (
        user_id, first_name, middle_initial, last_name, nickname,
        birthdate, gender, gender_other, consent, mobile_number, city,
        facebook, twitter, instagram, tiktok, current_status,
        declaration_commitment, volunteer_reason, volunteer_frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        formData.firstName,
        formData.middleInitial || null,
        formData.lastName,
        formData.nickname,
        formData.birthdate,
        formData.gender,
        formData.genderOther || null,
        formData.consent,
        formData.mobileNumber,
        formData.city,
        formData.facebook || null,
        formData.twitter || null,
        formData.instagram || null,
        formData.tiktok || null,
        formData.currentStatus,
        formData.declarationCommitment,
        formData.volunteerReason,
        formData.volunteerFrequency,
      ]
    );
    const profileId = profileResult.insertId;

    // 5. Create work profile if currentStatus is "Working Professional"
    if (formData.currentStatus === "Working Professional") {
      await connection.query(
        `INSERT INTO user_work_profile (
          profile_id, position, industry, company, work_shift, work_other_skills
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          profileId,
          formData.position,
          formData.industry,
          formData.company || null,
          formData.workShift,
          formData.workOtherSkills || "",
        ]
      );

      // Insert working days
      if (formData.workingDays && formData.workingDays.length > 0) {
        for (const dayName of formData.workingDays) {
          const [[day]] = await connection.query(
            `SELECT day_id FROM days WHERE day_name = ? LIMIT 1`,
            [dayName]
          );
          if (day) {
            await connection.query(
              `INSERT INTO user_working_days (profile_id, day_id) VALUES (?, ?)`,
              [profileId, day.day_id]
            );
          }
        }
      }
    }

    // 6. Create student profile if currentStatus is "Student"
    if (formData.currentStatus === "Student") {
      await connection.query(
        `INSERT INTO user_student_profile (
          profile_id, school, course, graduation, student_other_skills
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          profileId,
          formData.school,
          formData.course,
          formData.graduation,
          formData.studentOtherSkills || "",
        ]
      );

      // Insert school days
      if (formData.schoolDays && formData.schoolDays.length > 0) {
        for (const dayName of formData.schoolDays) {
          const [[day]] = await connection.query(
            `SELECT day_id FROM days WHERE day_name = ? LIMIT 1`,
            [dayName]
          );
          if (day) {
            await connection.query(
              `INSERT INTO user_school_days (profile_id, day_id) VALUES (?, ?)`,
              [profileId, day.day_id]
            );
          }
        }
      }
    }

    // 7. Insert volunteer available days
    if (formData.volunteerDays && formData.volunteerDays.length > 0) {
      for (const dayName of formData.volunteerDays) {
        const [[day]] = await connection.query(
          `SELECT day_id FROM days WHERE day_name = ? LIMIT 1`,
          [dayName]
        );
        if (day) {
          await connection.query(
            `INSERT INTO user_available_days (profile_id, day_id) VALUES (?, ?)`,
            [profileId, day.day_id]
          );
        }
      }
    }

    // 8. Insert volunteer roles
    if (formData.volunteerRoles && formData.volunteerRoles.length > 0) {
      for (const roleName of formData.volunteerRoles) {
        const [[role]] = await connection.query(
          `SELECT role_id FROM user_roles WHERE role_name = ? LIMIT 1`,
          [roleName]
        );
        if (role) {
          await connection.query(
            `INSERT INTO user_profile_roles (profile_id, role_id) VALUES (?, ?)`,
            [profileId, role.role_id]
          );
        }
      }
    }

    // 9. Insert trainings
    if (formData.volunteerTrainings && formData.volunteerTrainings.length > 0) {
      for (const trainingName of formData.volunteerTrainings) {
        const [[training]] = await connection.query(
          `SELECT training_id FROM user_trainings WHERE training_name = ? LIMIT 1`,
          [trainingName]
        );
        if (training) {
          await connection.query(
            `INSERT INTO user_profile_trainings (profile_id, training_id) VALUES (?, ?)`,
            [profileId, training.training_id]
          );
        }
      }
    }

    // 10. Persist uploaded certificate metadata (if provided)
    // Expected format: formData.trainingCertificates = [{ trainingName, s3Key, filename, mime, size }]
    // 10. Persist uploaded certificate metadata (if provided)
    if (formData.trainingCertificates && Array.isArray(formData.trainingCertificates) && formData.trainingCertificates.length > 0) {
      // Delegate validation + insertion to helper to allow easier testing and S3 verification
      await validateAndInsertCertificates({
        applicantId,
        profileId,
        formData,
        currentUserId: req.currentUserId || userId,
        connection
      });
    }

    await connection.commit();

    // Notify admins/staff about the new application (best-effort, non-blocking)
    (async () => {
      try {
        const [adminIds, staffIds] = await Promise.all([
          userRepository.getActiveUsersByRole("admin"),
          userRepository.getActiveUsersByRole("staff"),
        ]);

        console.log("[createApplicantWithProfile] adminIds:", adminIds, "staffIds:", staffIds);

        const recipients = Array.from(new Set([...(adminIds || []), ...(staffIds || [])]));

        if (recipients.length > 0) {
          const title = `📨 New Volunteer Application`;
          const message = `${userData.name} submitted a new application.`;
const actionUrl = `/dashboard?content=profile&userUid=${userData.uid}`;
          const metadata = {
            source_type: "application",
            applicantId,
            userId,
            applicantUid: userData.uid,
            notificationKind: "new_application",
          };

          // Create in-app notifications
          await notificationService.createBulkNotifications(recipients, {
            title,
            message,
            type: "info",
            actionUrl,
            metadata,
          });

          // Send push notifications to users who have push enabled (if any)
          try {
            const pushUsers = await userSettingsRepository.getUsersWithPushEnabled();
            const pushRecipients = (pushUsers || []).filter((u) => recipients.includes(u.user_id));
            if (pushRecipients.length > 0) {
              await notificationService.sendBulkPushNotifications(pushRecipients, {
                title,
                body: message,
                data: { actionUrl, ...metadata },
              });
            }
          } catch (err) {
            console.error("[createApplicantWithProfile] Error sending push notifications:", err);
          }
        }
      } catch (err) {
        console.error("[createApplicantWithProfile] Failed to notify admins/staff:", err);
      }
    })();

    return {
      success: true,
      userId,
      applicantId,
      profileId,
      message: "Application submitted successfully",
    };
  } catch (error) {
    await connection.rollback();
    console.error("[createApplicantWithProfile] ERROR:", error);
    throw error;
  } finally {
    connection.release();
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
  createApplicantWithProfile,
  // Certificate helpers
  createCertificateRecord,
  getCertificatesForApplicant,
  validateAndInsertCertificates,
};

const s3Service = require('../services/s3Service');

/**
 * Validate uploaded certificates, verify existence on S3, and insert records
 * Accepts connection to support transactional usage
 */
async function validateAndInsertCertificates({ applicantId, profileId, formData, currentUserId, connection = null }) {
  const pool = getPool();
  const conn = connection || pool;

  const requiredTrainings = (formData.volunteerTrainings || []).filter(t => t !== 'None in the list');
  const certs = Array.isArray(formData.trainingCertificates) ? formData.trainingCertificates : [];
  const certMap = {};
  for (const c of certs) {
    if (c && c.trainingName) certMap[c.trainingName] = c;
  }

  for (const reqTraining of requiredTrainings) {
    const cert = certMap[reqTraining];
    if (!cert || !cert.s3Key) {
      throw new Error(`Missing certificate for required training: ${reqTraining}`);
    }

    // Verify the object exists in S3
    try {
      const head = await s3Service.headObject(cert.s3Key);
      if (!head) {
        throw new Error(`Certificate file not found on S3 for training: ${reqTraining}`);
      }
    } catch (err) {
      // If underlying error is a not-found, convert to user friendly message
      throw new Error(`Certificate verification failed for ${reqTraining}: ${err.message}`);
    }

    // Insert certificate record
    await createCertificateRecord(applicantId, reqTraining, cert.s3Key, {
      original_filename: cert.filename || null,
      mimetype: cert.mime || null,
      size: cert.size || null,
      uploaded_by: currentUserId || null
    });
  }
}

async function createCertificateRecord(applicantId, trainingName, s3Key, meta = {}) {
  const pool = getPool();
  const { original_filename = null, mimetype = null, size = null, uploaded_by = null } = meta;
  const [result] = await pool.execute(
    `INSERT INTO user_training_certificates (applicant_id, training_name, s3_key, original_filename, mimetype, size, uploaded_by, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [applicantId, trainingName, s3Key, original_filename, mimetype, size, uploaded_by]
  );
  return { id: result.insertId };
}

async function getCertificatesForApplicant(applicantId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, training_name, s3_key, original_filename, mimetype, size, uploaded_by, uploaded_at
     FROM user_training_certificates WHERE applicant_id = ? ORDER BY uploaded_at ASC`,
    [applicantId]
  );
  return rows || [];
}

const express = require("express");
const router = express.Router();
const { initPool, getPool } = require("../db/pool");
const { APPLICATION_STATUSES } = require("../repositories/applicantRepository");

// Allow mapping string roles to numeric role_id (fallback if you don't want extra query)
const ROLE_MAP = { volunteer: 3, staff: 2, applicant: 4 };

// Helper to build ORDER BY safely
function buildOrder(sort, dateOrder, isApplicant) {
  const dateColumn = isApplicant
    ? "COALESCE(a.application_date, u.date_added)"
    : "u.date_added";

  if (dateOrder === "date_asc") {
    return `${dateColumn} ASC`;
  }

  if (dateOrder === "date_desc") {
    return `${dateColumn} DESC`;
  }

  if (sort === "name_desc") {
    return "u.name DESC";
  }

  return "u.name ASC";
}

router.get("/users/search", async (req, res) => {
  try {
    await initPool();
    const pool = getPool();

    // --- Extract & normalize params ---
    const roleRaw = (req.query.role || "").toString().trim();
    const nameRaw = (req.query.name || "").toString();
    const status = (req.query.status || "").toString().trim().toLowerCase();
    const sort = (req.query.sort || "name_asc").toString();
    const dateOrder = (req.query.date || "").toString();

    if (!roleRaw) return res.status(400).json({ error: "role is required" });

    // --- Resolve role_id ---
    let roleId = null;
    if (/^\d+$/.test(roleRaw)) {
      roleId = Number(roleRaw);
    } else if (ROLE_MAP[roleRaw.toLowerCase()]) {
      roleId = ROLE_MAP[roleRaw.toLowerCase()];
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (!roleId || isNaN(roleId)) {
      return res.status(400).json({ error: "Invalid role_id" });
    }

    const isApplicant = Number(roleId) === ROLE_MAP.applicant;

    const params = [roleId];
    let sql = `SELECT
         u.user_id AS id,
         u.uid,
         u.name,
         u.email,
         r.role,
         u.status,
         u.date_added,
         u.last_login_at,
         u.updated_at`;

    if (isApplicant) {
      sql += `,
                 a.status_id,
                 s.status_name AS application_status,
                 a.application_date`;
    }

    sql += `
               FROM users u
               JOIN roles r ON u.role_id = r.role_id`;

    if (isApplicant) {
      sql += `
               LEFT JOIN applicants a ON a.user_id = u.user_id
               LEFT JOIN application_statuses s ON s.status_id = a.status_id`;
    }

    sql += `
               WHERE u.role_id = ?`;

    if (isApplicant) {
      if (status && APPLICATION_STATUSES.has(status)) {
        sql += " AND s.status_name = ?";
        params.push(status);
      }
    } else if (["active", "inactive", "deactivated"].includes(status)) {
      sql += " AND u.status = ?";
      params.push(status);
    }

    if (nameRaw) {
      sql += " AND LOWER(u.name) LIKE LOWER(?)";
      params.push(`%${nameRaw}%`);
    }

    sql += ` ORDER BY ${buildOrder(sort, dateOrder, isApplicant)}`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

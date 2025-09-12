const express = require("express");
const router = express.Router();
const { initPool, getPool } = require("../src/db/pool");

// Allow mapping string roles to numeric role_id (fallback if you don't want extra query)
const ROLE_MAP = { volunteer: 3, staff: 2, applicant: 4 };

// Helper to build ORDER BY safely
function buildOrder(sort, dateOrder) {
  let orderBy = "u.name ASC"; // default
  if (sort === "name_desc") orderBy = "u.name DESC";
  if (dateOrder === "date_asc") orderBy = "u.date_added ASC";
  else if (dateOrder === "date_desc") orderBy = "u.date_added DESC";
  return orderBy;
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

    const params = [roleId];
    let sql = `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
               FROM users u
               JOIN roles r ON u.role_id = r.role_id
               WHERE u.role_id = ?`;

    if (status === "active" || status === "inactive") {
      sql += " AND u.status = ?";
      params.push(status);
    }

    if (nameRaw) {
      sql += " AND LOWER(u.name) LIKE LOWER(?)";
      params.push(`%${nameRaw}%`);
    }

    sql += ` ORDER BY ${buildOrder(sort, dateOrder)}`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

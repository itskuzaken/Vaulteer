// Replaced direct server import with modular pool
const { initPool, getPool } = require("../src/db/pool");

/**
 * Search users by (partial) name and role.
 * If name is empty, returns all users for the role.
 * @param {string} name
 * @param {string} role
 * @returns {Promise<Array>}
 */
async function searchUsersByName(name = "", role) {
  if (!role) throw new Error("role is required");
  await initPool();
  const pool = getPool();
  const trimmed = String(name || "").trim();
  const params = [role];
  let whereName = "";
  if (trimmed) {
    whereName = " AND LOWER(u.name) LIKE CONCAT('%', LOWER(?), '%')";
    params.push(trimmed);
  }
  const sql = `
    SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE r.role = ?${whereName}
    ORDER BY u.name ASC
  `;
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = { searchUsersByName };

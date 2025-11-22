const { getPool } = require("../db/pool");

async function getByUid(uid) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id AS id, u.uid, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
    FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.uid = ? LIMIT 1`,
    [uid]
  );
  return rows[0] || null;
}
async function listByRole(role) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at
    FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role = ?`,
    [role]
  );
  return rows;
}
async function create({ uid, name, email, role }) {
  const pool = getPool();
  const [[roleRow]] = await pool.query(
    `SELECT role_id FROM roles WHERE role = ? LIMIT 1`,
    [role]
  );
  if (!roleRow) throw new Error("Invalid role");
  const [result] = await pool.query(
    `INSERT INTO users (uid,name,email,role_id,status,date_added,last_login_at) VALUES (?,?,?,?, 'active', CURDATE(), NOW())`,
    [uid, name, email, roleRow.role_id]
  );
  return { id: result.insertId, uid, name, email, role };
}
async function update(id, { name, email, status }) {
  const pool = getPool();
  const fields = [];
  const params = [];
  if (name !== undefined) {
    fields.push("name = ?");
    params.push(name);
  }
  if (email !== undefined) {
    fields.push("email = ?");
    params.push(email);
  }
  if (status !== undefined) {
    fields.push("status = ?");
    params.push(
      ["active", "inactive", "deactivated"].includes(
        (status || "").toLowerCase()
      )
        ? status.toLowerCase()
        : "active"
    );
  }
  if (!fields.length) return null;
  params.push(id);
  await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`,
    params
  );
  const [rows] = await pool.query(
    `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added, u.last_login_at, u.updated_at FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?`,
    [id]
  );
  return rows[0] || null;
}
async function remove(id) {
  const pool = getPool();
  await pool.query(`DELETE FROM users WHERE user_id = ?`, [id]);
  return { id };
}
module.exports = { getByUid, listByRole, create, update, remove };

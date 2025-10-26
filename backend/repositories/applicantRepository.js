const { getPool } = require("../db/pool");

async function listApplicants() {
  const pool = getPool();
  const [rows] =
    await pool.query(`SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
    FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role='applicant'`);
  return rows;
}
async function approveApplicant(id) {
  const pool = getPool();
  const [[volRole]] = await pool.query(
    `SELECT role_id FROM roles WHERE role='volunteer' LIMIT 1`
  );
  if (!volRole) throw new Error("Volunteer role not found");
  await pool.query(
    `UPDATE users SET role_id = ?, status='active' WHERE user_id = ?`,
    [volRole.role_id, id]
  );
  return { id, status: "active" };
}
async function rejectApplicant(id) {
  const pool = getPool();
  await pool.query(`UPDATE users SET status='rejected' WHERE user_id = ?`, [
    id,
  ]);
  return { id, status: "rejected" };
}
module.exports = { listApplicants, approveApplicant, rejectApplicant };

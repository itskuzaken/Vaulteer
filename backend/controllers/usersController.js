const { getPool } = require("../db/pool");

// Get all users
const getUsers = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
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
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
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
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
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
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
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
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
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
      "INSERT INTO users (uid, name, email, role_id, status, date_added) VALUES (?, ?, ?, ?, 'active', CURDATE())",
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

module.exports = {
  getUsers,
  getVolunteers,
  getStaffs,
  getApplicants,
  getAdmins,
  addUser,
};

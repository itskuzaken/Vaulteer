const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { getPool } = require("../db/pool");
const admin = require("firebase-admin");

// Firebase token authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const idToken = authHeader.split(" ")[1];
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.firebaseUid = decodedToken.uid;
      next();
    })
    .catch((err) => {
      console.error("Token verification failed:", err.message);
      res.status(401).json({ error: "Invalid token" });
    });
}

// GET /api/me - Get current user info
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const [results] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, r.role, u.status
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.uid = ? LIMIT 1`,
      [req.firebaseUid]
    );
    
    if (!results.length) {
      return res.status(403).json({ error: "User not found in DB" });
    }
    
    const user = results[0];
    res.json({
      user_id: user.user_id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  })
);

module.exports = router;

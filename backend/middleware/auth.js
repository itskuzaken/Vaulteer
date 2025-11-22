const admin = require("firebase-admin");
const { getPool } = require("../db/pool");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.firebaseUid = decodedToken.uid;

    const pool = getPool();

    // Retry logic for connection errors
    let userRow = null;
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [[row]] = await pool.query(
          `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.last_login_at, u.updated_at, r.role
           FROM users u
           JOIN roles r ON u.role_id = r.role_id
           WHERE u.uid = ?
           LIMIT 1`,
          [decodedToken.uid]
        );
        userRow = row;
        break; // Success, exit retry loop
      } catch (dbError) {
        lastError = dbError;
        // Retry on connection errors
        if (
          dbError.code === "ECONNRESET" ||
          dbError.code === "PROTOCOL_CONNECTION_LOST"
        ) {
          console.warn(
            `[Auth] DB connection error (attempt ${attempt}/${maxRetries}):`,
            dbError.message
          );
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Exponential backoff
            continue;
          }
        }
        throw dbError; // Non-retryable error
      }
    }

    if (!userRow) {
      if (lastError) {
        console.error("[Auth] DB query failed after retries:", lastError);
        return res
          .status(503)
          .json({ error: "Service temporarily unavailable" });
      }
      return res.status(403).json({ error: "User not registered" });
    }

    if ((userRow.status || "").toLowerCase() === "deactivated") {
      return res
        .status(403)
        .json({ message: "Account is deactivated by admin." });
    }

    req.authenticatedUser = {
      userId: userRow.user_id,
      uid: userRow.uid,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      status: userRow.status,
      lastLoginAt: userRow.last_login_at,
      updatedAt: userRow.updated_at,
    };
    req.currentUserRole = userRow.role;
    req.currentUserId = userRow.user_id;

    next();
  } catch (error) {
    console.error("Authentication failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    // assumes role resolved earlier and attached to req.currentUserRole
    if (!roles.includes(req.currentUserRole))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
module.exports = { authenticate, requireRole };

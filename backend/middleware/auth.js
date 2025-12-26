const admin = require("firebase-admin");
const { getPool } = require("../db/pool");
const { CONFIG } = require("../config/env");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    // ===== Test-mode shortcuts =====
    // In the test environment, allow simple test tokens to avoid requiring
    // firebase-admin network calls and DB user setup for each test.
    if (CONFIG.NODE_ENV === 'test') {
      if (token === 'faketoken' || token === 'admin-token') {
        // Treat this as a fully authenticated admin
        req.firebaseUid = token === 'faketoken' ? 'test-fake-admin' : 'admin-uid';
        req.authenticatedUser = {
          userId: 1,
          uid: req.firebaseUid,
          name: 'Test Admin',
          email: `${req.firebaseUid}@example.com`,
          role: 'admin',
          status: 'active',
        };
        req.currentUserId = req.authenticatedUser.userId;
        req.currentUserRole = req.authenticatedUser.role;
        console.log(`[Auth:test] Bypassed firebase verification for token=${token}, uid=${req.firebaseUid}`);
        return next();
      }

      // Allow 'test-user-<id>' tokens to map to a numeric user id when tests need a specific user id
      const match = /^test-user-(\d+)$/.exec(token);
      if (match) {
        const numericId = Number(match[1]);
        req.firebaseUid = `test-user-${numericId}`;
        req.authenticatedUser = {
          userId: numericId,
          uid: req.firebaseUid,
          name: `Test User ${numericId}`,
          email: `${req.firebaseUid}@example.com`,
          role: 'volunteer',
          status: 'active',
        };
        req.currentUserId = numericId;
        req.currentUserRole = 'volunteer';
        console.log(`[Auth:test] Mapped test token to userId=${numericId}`);
        return next();
      }
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    req.firebaseUid = decodedToken.uid;
    
    console.log(`[Auth] Attempting authentication for UID: ${decodedToken.uid}, Email: ${decodedToken.email || 'N/A'}`);

    const pool = getPool();

    // Retry logic for connection errors
    let userRow = null;
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [[row]] = await pool.query(
          `SELECT u.user_id, u.uid, u.name, u.email, u.status, u.last_login_at, u.updated_at, u.profile_picture, r.role
           FROM users u
           JOIN roles r ON u.role_id = r.role_id
           WHERE u.uid = ?
           LIMIT 1`,
          [decodedToken.uid]
        );
        userRow = row;
        if (userRow) {
          console.log(`[Auth] Found user in DB: user_id=${userRow.user_id}, role=${userRow.role}, status=${userRow.status}`);
        } else {
          console.warn(`[Auth] No user found in DB for UID=${decodedToken.uid}`);
        }
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
      console.warn(`[Auth] No DB record found for UID=${decodedToken.uid}. Request path=${req?.path || 'unknown'}`);
      if (lastError) {
        console.error("[Auth] DB query failed after retries:", lastError);
        return res
          .status(503)
          .json({ error: "Service temporarily unavailable" });
      }
      
      // Additional debugging: Check if user exists with this email
      try {
        const [[emailCheck]] = await pool.query(
          `SELECT uid, email, status FROM users WHERE email = ? LIMIT 1`,
          [decodedToken.email]
        );
        if (emailCheck) {
          console.error(`[Auth] MISMATCH DETECTED! User exists with email ${decodedToken.email} but different UID. DB_UID=${emailCheck.uid}, Firebase_UID=${decodedToken.uid}`);
        }
      } catch (debugError) {
        console.warn(`[Auth] Debug query failed:`, debugError.message);
      }
      
      return res.status(403).json({ 
        code: "NOT_REGISTERED",
        message: "User not registered. Please complete the application form first.",
        error: "User not registered" 
      });
    }

    if ((userRow.status || "").toLowerCase() === "deactivated") {
      return res
        .status(403)
        .json({ 
          code: "DEACTIVATED",
          message: "Account is deactivated by admin."
        });
    }

    // Sync Firebase photoURL to database if profile_picture is null
    if (!userRow.profile_picture && decodedToken.picture) {
      try {
        await pool.query(
          `UPDATE users SET profile_picture = ? WHERE uid = ?`,
          [decodedToken.picture, decodedToken.uid]
        );
        userRow.profile_picture = decodedToken.picture;
        console.log(`[Auth] Synced Firebase photoURL to database for user ${decodedToken.uid}`);
      } catch (syncError) {
        // Don't block authentication if sync fails
        console.warn(`[Auth] Failed to sync photoURL for user ${decodedToken.uid}:`, syncError.message);
      }
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
  // Accept either multiple role args or a single array: requireRole('admin','staff') or requireRole(['admin'])
  const allowedRoles = roles.length === 1 && Array.isArray(roles[0]) ? roles[0] : roles;
  return (req, res, next) => {
    // assumes role resolved earlier and attached to req.currentUserRole
    const userRole = req.currentUserRole;
    console.log(`[RequireRole] Checking access: userRole="${userRole}", allowedRoles=${JSON.stringify(allowedRoles)}, path=${req.path}`);
    
    if (!userRole) {
      console.warn(`[RequireRole] No role found for user. Path: ${req.path}`);
      return res.status(403).json({ error: "Forbidden - No role assigned" });
    }
    
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[RequireRole] Access denied: userRole="${userRole}" not in ${JSON.stringify(allowedRoles)}. Path: ${req.path}`);
      return res.status(403).json({ 
        error: "Forbidden",
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole: userRole
      });
    }
    
    console.log(`[RequireRole] Access granted for role="${userRole}". Path: ${req.path}`);
    next();
  };
}
module.exports = { authenticate, requireRole };

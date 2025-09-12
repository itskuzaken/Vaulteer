const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");
const searchRoutes = require("./routes/searchRoutes");
const os = require("os");

const app = express();
const port = 5000;

// Determine LAN IP automatically if not provided
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}
const detectedLan = getLanIp();
// Replace hardcoded lanAddress fallback
const lanAddress = process.env.LAN_ADDRESS || detectedLan;

// Optional additional frontend origin (e.g., PROD URL)
const extraOrigin =
  process.env.FRONTEND_ORIGIN || process.env.ADDITIONAL_FRONTEND_ORIGIN;

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized");
}

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        "http://localhost:3000",
        `http://${lanAddress}:3000`,
        extraOrigin,
      ].filter(Boolean);
      if (!origin) return cb(null, true); // Allow non-browser or same-origin requests
      if (allowed.includes(origin)) return cb(null, true);
      // Reject others explicitly (change to cb(null, true) if you want permissive behavior)
      return cb(new Error("CORS not allowed for origin: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json());

let pool;
let poolReady = false;
(async () => {
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "vaulteer_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    module.exports.pool = pool;
    poolReady = true;
    console.log("MySQL pool created.");

    // --- Auto-migration: ensure users.name column exists ---
    try {
  const dbName = process.env.DB_NAME || "vaulteer_db";
      const [rows] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME='users' AND COLUMN_NAME='name'`,
        [dbName]
      );
      if (rows.length === 0) {
        console.log("[MIGRATION] Adding missing column users.name ...");
        await pool.query(
          "ALTER TABLE users ADD COLUMN name VARCHAR(128) NULL AFTER uid"
        );
        await pool.query(
          "UPDATE users SET name = SUBSTRING_INDEX(email,'@',1) WHERE name IS NULL OR name = ''"
        );
        await pool.query(
          "ALTER TABLE users MODIFY COLUMN name VARCHAR(128) NOT NULL"
        );
        console.log("[MIGRATION] users.name column added and backfilled.");
      } else {
        console.log("[MIGRATION] users.name column present.");
      }
    } catch (mErr) {
      console.error(
        "[MIGRATION] Failed to ensure users.name column:",
        mErr.message
      );
    }
    // --- End auto-migration ---

    const LAN_API_BASE = `http://${lanAddress}:${port}/api`;
    app.listen(port, "0.0.0.0", () => {
      console.log("Server is running on:");
      console.log(`- Local:   http://localhost:${port}`);
      console.log(`- Network: http://${lanAddress}:${port}`);
      console.log(`- API Base: ${LAN_API_BASE}`);
    });
  } catch (err) {
    console.error("Failed to create MySQL pool", err);
    process.exit(1);
  }
})();

app.get("/", (req, res) => {
  res.send("Hello from Express with MySQL!");
});

app.get("/api/test-cors", (req, res) => {
  res.json({ message: "CORS is working!" });
});

// Health & readiness endpoint
app.get("/api/health", (req, res) => {
  res.json({ ok: true, poolReady, lanAddress, time: new Date().toISOString() });
});

// --- Applicants Routes ---
app.get("/api/applicants", async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'applicant'`
    );
    res.json(results);
  } catch (err) {
    console.error("Error fetching applicants:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/applicants/:id", async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ? AND r.role = 'applicant'`,
      [req.params.id]
    );
    if (!results.length)
      return res.status(404).json({ error: "Applicant not found" });
    res.json(results[0]);
  } catch (err) {
    console.error("Error fetching applicant:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/applicants/:id/approve", async (req, res) => {
  try {
    const [[roleRow]] = await pool.query(
      "SELECT role_id FROM roles WHERE role = 'volunteer' LIMIT 1"
    );
    if (!roleRow)
      return res.status(400).json({ error: "Volunteer role not found" });
    const { id } = req.params;
    await pool.query(
      "UPDATE users SET role_id = ?, status = 'active' WHERE user_id = ?",
      [roleRow.role_id, id]
    );
    res.json({ id, role_id: roleRow.role_id, status: "active" });
  } catch (err) {
    console.error("Error approving applicant:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/applicants/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE users SET status = 'rejected' WHERE user_id = ?", [
      id,
    ]);
    res.json({ id, status: "rejected" });
  } catch (err) {
    console.error("Error rejecting applicant:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Volunteers & Staff Routes ---
app.get("/api/volunteers", async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'volunteer'`
    );
    res.json(results);
  } catch (err) {
    console.error("Error fetching volunteers:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/staff", async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT u.user_id AS id, u.name, u.email, r.role, u.status, u.date_added
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role = 'staff'`
    );
    res.json(results);
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- User CRUD ---
app.post("/api/users", async (req, res) => {
  try {
    const { uid, name, email, role } = req.body;
    if (!uid || !name || !email || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [[roleRow]] = await pool.query(
      "SELECT role_id FROM roles WHERE role = ? LIMIT 1",
      [role]
    );
    if (!roleRow) return res.status(400).json({ error: "Invalid role" });
    const [result] = await pool.query(
      "INSERT INTO users (uid, name, email, role_id, status, date_added) VALUES (?, ?, ?, ?, 'active', CURDATE())",
      [uid, name, email, roleRow.role_id]
    );
    res.json({
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
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status } = req.body;
    const [[roleRow]] = await pool.query(
      "SELECT role_id FROM roles WHERE role = 'volunteer' LIMIT 1"
    );
    if (!roleRow)
      return res.status(400).json({ error: "Volunteer role not found" });
    // Only allow "active" or "inactive" for status
    let safeStatus = undefined;
    if (typeof status !== "undefined") {
      safeStatus = status === "active" ? "active" : "inactive";
      await pool.query(
        "UPDATE users SET name = ?, email = ?, role_id = ?, status = ? WHERE user_id = ?",
        [name, email, roleRow.role_id, safeStatus, id]
      );
      res.json({
        id,
        name,
        email,
        role_id: roleRow.role_id,
        status: safeStatus,
      });
    } else {
      await pool.query(
        "UPDATE users SET name = ?, email = ?, role_id = ? WHERE user_id = ?",
        [name, email, roleRow.role_id, id]
      );
      res.json({ id, name, email, role_id: roleRow.role_id });
    }
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE user_id = ?", [id]);
    res.json({ id });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Auth Middleware ---
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
      console.error("Token verification failed", err.message);
      res.status(401).json({ error: "Invalid token" });
    });
}

// --- Get Current User Info ---
app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    if (!poolReady || !pool) {
      return res.status(503).json({ error: "Service warming up" });
    }
    const [results] = await pool.query(
      `SELECT u.user_id, u.uid, u.name, u.email, r.role, u.status
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.uid = ? LIMIT 1`,
      [req.firebaseUid]
    );
    if (!results.length)
      return res.status(403).json({ error: "User not found in DB" });
    const user = results[0];
    res.json({
      user_id: user.user_id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    console.error("/api/me error", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Utility/Health Endpoints ---
const LAN_API_BASE = `http://${lanAddress}:5000/api`;
app.get("/api/lan-api-base", (req, res) => {
  res.json({ apiBase: LAN_API_BASE });
});

// Mount search routes
app.use("/api", searchRoutes);

// --- API Root (eliminate 'Cannot GET /api') ---
app.get("/api", (req, res) => {
  res.json({
    message: "API root OK",
    health: "/api/health",
    applicants: "/api/applicants",
    volunteers: "/api/volunteers",
    staff: "/api/staff",
    me: "/api/me",
    searchUsers: "/api/users/search",
    time: new Date().toISOString(),
  });
});

// 404 handler for unknown /api/* paths (after all api routes)
app.use("/api", (req, res, next) => {
  if (req.path === "/") return next(); // already handled above
  return res.status(404).json({ error: "Not found" });
});

const express = require("express");
const admin = require("firebase-admin");
const path = require("path");
const { CONFIG } = require("./config/env");
const { initPool } = require("./db/pool");
const { corsMiddleware, lanAddress } = require("./middleware/cors");

const applicantsRoute = require("./routes/applicants");
const usersRoute = require("./routes/users");
const searchRoute = require("./routes/search");
const meRoute = require("./routes/me");
const activityLogsRoute = require("./routes/activityLogsRoutes");
const statsRoute = require("./routes/statsRoutes");
const notificationRoute = require("./routes/notificationRoutes");
const profileRoute = require("./routes/profileRoutes");

if (!admin.apps.length) {
  try {
    const svcPath =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      path.join(__dirname, "firebase-service-account.json");
    const serviceAccount = require(svcPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✓ Firebase Admin initialized");
  } catch (err) {
    console.warn("⚠ Firebase Admin init skipped:", err.message);
  }
}

const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: CONFIG.NODE_ENV,
    time: new Date().toISOString(),
  });
});

app.use("/api/applicants", applicantsRoute);
app.use("/api/users", usersRoute);
app.use("/api/me", meRoute);
app.use("/api", searchRoute);
app.use("/api/logs", activityLogsRoute);
app.use("/api/stats", statsRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/profile", profileRoute);

app.get("/api", (req, res) => {
  res.json({
    message: "Vaulteer API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      me: "/api/me",
      applicants: "/api/applicants",
      users: "/api/users",
      search: "/api/users/search",
      logs: "/api/logs",
      profile: "/api/profile",
      notifications: "/api/notifications",
    },
    time: new Date().toISOString(),
  });
});

// 404 handler for all unmatched /api routes (must be last)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

async function start() {
  try {
    await initPool();

    app.listen(CONFIG.PORT, "0.0.0.0", () => {
      console.log("\n🚀 Vaulteer Server");
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Local:   http://localhost:${CONFIG.PORT}`);
      console.log(`  Network: http://${lanAddress}:${CONFIG.PORT}`);
      console.log(`  API:     http://${lanAddress}:${CONFIG.PORT}/api`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (err) {
    console.error("✗ Server startup failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };

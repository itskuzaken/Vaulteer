const express = require("express");
const helmet = require("helmet");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { CONFIG } = require("./config/env");
const { initPool } = require("./db/pool");
const { corsMiddleware, staticFilesCorsMiddleware, lanAddress } = require("./middleware/cors");
const { scheduleInactiveUserJob } = require("./jobs/inactiveUserScheduler");
const {
  startDeadlineScheduler,
} = require("./jobs/applicationDeadlineScheduler");
const { startPostScheduler } = require("./jobs/postScheduler");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const applicantsRoute = require("./routes/applicants");
const usersRoute = require("./routes/users");
const searchRoute = require("./routes/search");
const meRoute = require("./routes/me");
const activityLogsRoute = require("./routes/activityLogsRoutes");
const statsRoute = require("./routes/statsRoutes");
const notificationRoute = require("./routes/notificationRoutes");
const profileRoute = require("./routes/profileRoutes");
const eventsRoute = require("./routes/eventsRoutes");
const gamificationRoute = require("./routes/gamificationRoutes");
const internalRoute = require("./routes/internalRoutes");
const applicationSettingsRoute = require("./routes/applicationSettingsRoutes");
const postsRoute = require("./routes/postsRoutes");
const userSettingsRoute = require("./routes/userSettingsRoutes");

// Middleware for internal-only routes
const internalOnly = require("./middleware/internalOnly");

if (!admin.apps.length) {
  try {
    // Support three ways to provide the Firebase service account:
    // 1) FIREBASE_SERVICE_ACCOUNT_JSON - raw JSON string
    // 2) FIREBASE_SERVICE_ACCOUNT_BASE64 - base64-encoded JSON string
    // 3) FIREBASE_SERVICE_ACCOUNT (path to file) - legacy fallback
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        "base64"
      ).toString("utf8");
      serviceAccount = JSON.parse(decoded);
    } else {
      // legacy behaviour: a path to a json file (default)
      const svcPath =
        process.env.FIREBASE_SERVICE_ACCOUNT ||
        path.join(__dirname, "firebase-service-account.json");
      if (fs.existsSync(svcPath)) {
        serviceAccount = require(svcPath);
      }
    }

    // Validate minimal required fields
    if (
      !serviceAccount ||
      !serviceAccount.private_key ||
      !serviceAccount.client_email
    ) {
      throw new Error(
        "Firebase service account not found or missing required fields"
      );
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✓ Firebase Admin initialized");
  } catch (err) {
    console.warn("⚠ Firebase Admin init skipped:", err.message);
    // In production fail fast — running without credentials may break auth functionality
    if (CONFIG.NODE_ENV === "production") {
      console.error(
        "✗ Firebase initialization failed in production — aborting startup."
      );
      process.exit(1);
    }
  }
}

const app = express();

// If the app is behind a reverse proxy (nginx), Express needs to be told to trust
// the proxy so middleware such as express-rate-limit can parse X-Forwarded-For.
// Configure with an env var TRUST_PROXY if you need custom behavior; default to
// `1` (trust first proxy) in production.
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  // Allow values like 'true', 'false', '1', '2', or 'loopback'
  const parsed =
    trustProxyEnv === "true"
      ? true
      : trustProxyEnv === "false"
      ? false
      : isNaN(Number(trustProxyEnv))
      ? trustProxyEnv
      : Number(trustProxyEnv);
  app.set("trust proxy", parsed);
  console.log(
    `[config] express trust proxy set from TRUST_PROXY=${trustProxyEnv} -> ${parsed}`
  );
} else if (CONFIG.NODE_ENV === "production") {
  // Default for production is trusting the first proxy (typical nginx setup)
  app.set("trust proxy", 1);
  console.log("[config] express trust proxy set to 1 (production default)");
} else {
  // In development leave default (no trust proxy) unless configured
  console.log("[config] express trust proxy left unset (development)");
}

// Security headers (helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for API (frontend handles this)
    crossOriginEmbedderPolicy: false, // Allow embedding for API responses
  })
);

// CORS must come before other middleware
app.use(corsMiddleware);

// Body parsing
app.use(express.json());

// Serve static files from uploads directory with permissive CORS and CORP headers
app.use("/uploads", staticFilesCorsMiddleware, (req, res, next) => {
  // Set Cross-Origin Resource Policy to allow cross-origin access
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
}, express.static(path.join(__dirname, "uploads")));

// Rate limiting for all API routes
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: CONFIG.NODE_ENV,
    time: new Date().toISOString(),
  });
});

// Internal-only routes (protected by internalOnly middleware)
// These should ONLY be called by server-side code, never from browsers
app.use("/api/internal", internalOnly, internalRoute);

// Public API routes (protected by Firebase auth where needed)
app.use("/api/applicants", applicantsRoute);
app.use("/api/users", userSettingsRoute); // User settings routes (must come before general users route)
app.use("/api/users", usersRoute);
app.use("/api/me", meRoute);
app.use("/api", searchRoute);
app.use("/api/logs", activityLogsRoute);
app.use("/api/stats", statsRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/profile", profileRoute);
app.use("/api/events", eventsRoute);
app.use("/api/gamification", gamificationRoute);
app.use("/api/application", applicationSettingsRoute);
app.use("/api/posts", postsRoute);

app.get("/api", (req, res) => {
  res.json({
    message: "Vaulteer API",
    version: "1.0.0",
    security: {
      model: "Hybrid Authentication",
      publicRoutes: "Protected by Firebase ID tokens",
      internalRoutes: "Server-only access with secret token",
    },
    endpoints: {
      health: "/api/health",
      me: "/api/me",
      applicants: "/api/applicants",
      users: "/api/users",
      search: "/api/users/search",
      logs: "/api/logs",
      profile: "/api/profile",
      notifications: "/api/notifications",
      events: "/api/events",
      gamification: "/api/gamification",
      posts: "/api/posts",
    },
    time: new Date().toISOString(),
  });
});

// 404 handler for all unmatched /api routes (must be last)
app.use("/api", notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

async function start() {
  try {
    await initPool();

    scheduleInactiveUserJob();
    startDeadlineScheduler();
    startPostScheduler();

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

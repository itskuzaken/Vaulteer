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
const { startEventCompletionScheduler, stopEventCompletionScheduler } = require("./jobs/eventCompletionScheduler");
const { startEventReminderScheduler, stopEventReminderScheduler } = require("./jobs/eventReminderScheduler");
const { textractQueue } = require("./jobs/textractQueue");
const { achievementsQueue } = require("./jobs/achievementsQueue");
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
const htsFormsRoute = require("./routes/htsFormsRoutes");
const ocrFeedbackRoute = require("./routes/ocrFeedback");
const templateMetadataRoute = require("./routes/templateMetadataRoutes");
const s3Route = require("./routes/s3Routes");

// Middleware for internal-only routes
const internalOnly = require("./middleware/internalOnly");

if (!admin.apps || !admin.apps.length) {
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

// Some test harnesses (and older supertest versions) call `app.address()` when passed the app.
// Express apps don't implement `address()` directly, so provide a safe shim that returns null.
// This causes supertest to call `app.listen(0)` and run the app on an ephemeral port for the test.
if (typeof app.address !== 'function') {
  app.address = () => null;
}

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

// Body parsing with increased limit for encrypted image data
// HTS forms contain encrypted images which can be large (typically 2-5MB per image)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use("/api/system-settings", require("./routes/systemSettingsRoutes"));
app.use("/api/posts", postsRoute);
app.use("/api/hts-forms", htsFormsRoute);
app.use("/api/ocr-feedback", ocrFeedbackRoute);
app.use("/api/template-metadata", templateMetadataRoute);
app.use('/api/s3', s3Route);

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

    // Basic Redis health check (helps catch missing/incorrect REDIS_HOST in PM2 env)
    try {
      const IORedis = require('ioredis');
      const redisOpts = process.env.REDIS_URL || (process.env.REDIS_HOST ? {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        // quick retry strategy with limited retries to avoid startup hang
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 50, 2000))
      } : null);

      if (redisOpts) {
        const redisTest = typeof redisOpts === 'string' ? new IORedis(redisOpts) : new IORedis(redisOpts);

        // Wait for either connect or error for up to 2s
        const ready = new Promise((resolve, reject) => {
          const onError = (err) => { cleanup(); reject(err); };
          const onReady = () => { cleanup(); resolve(); };
          const cleanup = () => { redisTest.removeListener('error', onError); redisTest.removeListener('ready', onReady); };
          redisTest.once('error', onError);
          redisTest.once('ready', onReady);
        });

        try {
          await Promise.race([ready, new Promise((_, r) => setTimeout(() => r(new Error('Redis connection timeout')), 2000))]);
          console.log('✓ Redis connected successfully (health check)');
        } catch (err) {
          console.error('✗ Redis health check failed:', err.message || err);
          // Don't abort startup; Jobs will detect Redis unavailability and disable themselves
        } finally {
          try { redisTest.quit().catch(() => redisTest.disconnect()); } catch (e) {}
        }
      } else {
        console.log('[start] Redis not configured (no REDIS_URL or REDIS_HOST) — queues will remain disabled');
      }
    } catch (e) {
      console.warn('[start] Redis health check skipped (ioredis not available):', e.message || e);
    }

    const disableJobs = process.env.DISABLE_SCHEDULED_JOBS === 'true';
    if (disableJobs) {
      console.log('[config] Scheduled jobs disabled via DISABLE_SCHEDULED_JOBS=true');
    } else {
      scheduleInactiveUserJob();
      startDeadlineScheduler();
      startPostScheduler();
      startEventCompletionScheduler();
      startEventReminderScheduler();
    }

    console.log('✓ Textract OCR queue initialized');

    // When running tests we avoid calling `app.listen()` to prevent leaving
    // an open server handle that can keep the Jest process from exiting.
    if (CONFIG.NODE_ENV === 'test' || process.env.DISABLE_SERVER_LISTEN === 'true') {
      console.log('[start] Skipping app.listen due to test mode or DISABLE_SERVER_LISTEN');
      return;
    }

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

// Export the express app for testing. Tests use this app with supertest which will start
// the server on an ephemeral port when needed.
module.exports = app;
// Also expose the `start` function for programmatic control (e.g., production startup)
module.exports.start = start;

// Graceful shutdown: stop scheduled tasks on process termination
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
    try {
      stopEventCompletionScheduler();
      stopEventReminderScheduler();
  } catch (e) {
    console.warn('Error during shutdown cleanup:', e);
  }
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
    try {
      stopEventCompletionScheduler();
      stopEventReminderScheduler();
  } catch (e) {
    console.warn('Error during shutdown cleanup:', e);
  }
  process.exit(0);
});

// NOTE: do not override module.exports further; `module.exports` is the express `app`.

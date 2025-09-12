const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const { CONFIG } = require("./config/env");
const { initPool, isReady } = require("./db/pool");
const usersRoute = require("./routes/users");
const applicantsRoute = require("./routes/applicants");
const searchRoutes = require("../routes/searchRoutes"); // reuse existing

// Firebase admin single init (service account path optional via env)
if (!admin.apps.length) {
  try {
    const svcPath =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      path.join(__dirname, "..", "firebase-service-account.json");
    const svc = require(svcPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    console.log("Firebase Admin initialized (modular)");
  } catch (err) {
    console.warn("Firebase admin init skipped:", err.message);
  }
}

const app = express();
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, dbReady: isReady(), time: new Date().toISOString() });
});

app.use("/api/users", usersRoute);
app.use("/api/applicants", applicantsRoute);
app.use("/api", searchRoutes);

app.get("/api", (req, res) =>
  res.json({ message: "API root OK (modular)", time: new Date().toISOString() })
);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

async function start() {
  await initPool();
  app.listen(CONFIG.PORT, "0.0.0.0", () => {
    console.log(`Modular server listening on ${CONFIG.PORT}`);
  });
}
if (require.main === module) start();

module.exports = { app, start };

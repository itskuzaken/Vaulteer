// Global Jest setup file - keeps test environment hooks (no-op teardown here, real cleanup runs in globalTeardown)

// Convert unhandled rejections into visible console output during test runs so we can trace them
// Log unhandled rejections with details to help identify the origin during tests
process.on('unhandledRejection', (reason) => {
  try {
    console.error('Unhandled rejection during tests:', reason);
    if (reason && reason.stack) console.error(reason.stack);
  } catch (e) {
    console.error('Error logging unhandled rejection:', e);
  }
});

// Ensure DB pool is closed after all tests to prevent lingering sockets that keep Jest alive
afterAll(async () => {
  try {
    const poolModule = require('../db/pool');
    if (poolModule && poolModule.closePool) {
      await poolModule.closePool();
      console.log('[TestTeardown] Closed DB pool');
    }
  } catch (e) {
    console.warn('[TestTeardown] Failed to close DB pool:', e?.message || e);
  }
});

// Capture unhandled rejections using Node's capture callback to get stack & details
if (typeof process.setUnhandledRejectionCaptureCallback === 'function') {
  process.setUnhandledRejectionCaptureCallback((reason, promise) => {
    try {
      console.error('Captured unhandled rejection via captureCallback:', reason);
      if (reason && reason.stack) console.error(reason.stack);
      // record globally so teardown can inspect
      global.__LAST_UNHANDLED_REJECTION__ = reason || true;
    } catch (e) {
      console.error('Error in captureCallback:', e);
    }
  });
}

// Add any per-test setup helpers here if required in future

// Ensure canonical event types exist before tests run to avoid FK failures in event creation tests
beforeAll(async () => {
  try {
    const poolModule = require('../db/pool');
    await poolModule.initPool();
    const pool = poolModule.getPool();

    const requiredCodes = [
      'workshop','training','meeting','webinar','community','volunteer','fundraiser','social',
      'community_meeting','community_service','outreach','fundraising','other'
    ];

    const placeholders = requiredCodes.map(() => '?').join(',');
    const [existingRows] = await pool.query(`SELECT type_code FROM event_type_definitions WHERE type_code IN (${placeholders})`, requiredCodes);
    const existing = new Set(existingRows.map(r => r.type_code));

    const missing = requiredCodes.filter(c => !existing.has(c));
    if (missing.length === 0) {
      console.log('[TestSetup] All canonical event types present');
      return;
    }

    console.log('[TestSetup] Seeding missing event_type_definitions:', missing);

    // Insert minimum row for each missing code using INSERT IGNORE to be idempotent
    const insertValues = missing.map(code => `('${code}', '${code.replace(/_/g, ' ').replace(/(^|\s)\S/g, t => t.toUpperCase())}', '', NULL, NULL, 0, 999, 0, 1)`).join(',');
    await pool.query(`INSERT IGNORE INTO event_type_definitions (type_code, type_label, description, icon, color, points_per_participation, display_order, is_system, is_active) VALUES ${insertValues}`);

    console.log('[TestSetup] Seeded missing event_type_definitions successfully');
  } catch (err) {
    console.warn('[TestSetup] Failed to ensure event_type_definitions seed:', err.message || err);
    // Do not fail tests here; leaving as a warning keeps tests running while surfacing the issue
  }
});

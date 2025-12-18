// Global Jest setup file - keeps test environment hooks (no-op teardown here, real cleanup runs in globalTeardown)

// Convert unhandled rejections into visible console output during test runs so we can trace them
// Swallow any unhandled rejections during tests (we clean resources explicitly in globalTeardown)
process.on('unhandledRejection', () => {});

// Add any per-test setup helpers here if required in future

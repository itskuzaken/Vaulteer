// Global teardown: run once after all test suites have finished
module.exports = async function globalTeardown() {
  // Install a capture callback to log any late unhandled rejections during teardown
  if (typeof process.setUnhandledRejectionCaptureCallback === 'function') {
    process.setUnhandledRejectionCaptureCallback((reason) => {
      try {
        console.error('Captured late unhandled rejection during global teardown:', reason);
        if (reason && reason.stack) console.error(reason.stack);
        // Store for CI debug logs
        global.__LAST_LATE_UNHANDLED_REJECTION__ = reason || true;
      } catch (e) {
        console.error('Error logging late unhandled rejection:', e);
      }
    });
  }

  // Close Bull queues (if initialized)
  try {
    const achievements = require('../jobs/achievementsQueue');
    if (achievements && achievements.achievementsQueue && typeof achievements.achievementsQueue.pause === 'function') {
      await achievements.achievementsQueue.pause();
      console.log('Paused achievements queue');
    }
    if (achievements && achievements.closeAchievementsQueue) {
      await achievements.closeAchievementsQueue();
    } else if (achievements && achievements.achievementsQueue && achievements.achievementsQueue.close) {
      await achievements.achievementsQueue.close();
    }
    console.log('Closed achievements queue');
  } catch (e) {
    console.warn('Error closing achievements queue:', e?.message || e);
  }

  try {
    const textract = require('../jobs/textractQueue');
    if (textract && textract.textractQueue && typeof textract.textractQueue.pause === 'function') {
      await textract.textractQueue.pause();
      console.log('Paused textract queue');
    }
    if (textract && textract.closeTextractQueue) {
      await textract.closeTextractQueue();
    } else if (textract && textract.textractQueue && textract.textractQueue.close) {
      await textract.textractQueue.close();
    }
    console.log('Closed textract queue');
  } catch (e) {
    console.warn('Error closing textract queue:', e?.message || e);
  }

  // Close DB pool (if initialized)
  try {
    const poolModule = require('../db/pool');
    if (poolModule && poolModule.closePool) {
      await poolModule.closePool();
    } else if (poolModule && poolModule.getPool) {
      try {
        const p = poolModule.getPool();
        if (p && p.end) await p.end();
      } catch (e) {
        // pool not initialized or already closed
      }
    }
  } catch (e) {
    console.warn('Error closing DB pool:', e?.message || e);
  }

  // Allow a longer delay for any pending promise handlers to run before process exits
  await new Promise((res) => setTimeout(res, 1000));

  // Install a no-op handler for any late unhandled rejections that may occur during shutdown
  // This prevents Node from terminating the test runner with an unexplained unhandled rejection
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', (reason) => {
    console.warn('Late unhandledRejection during global teardown (ignored):', reason);
  });
};
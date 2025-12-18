// Global teardown: run once after all test suites have finished
module.exports = async function globalTeardown() {
  // Close Bull queues (if initialized)
  try {
    const achievements = require('../jobs/achievementsQueue');
    if (achievements && achievements.closeAchievementsQueue) {
      await achievements.closeAchievementsQueue();
    } else if (achievements && achievements.achievementsQueue && achievements.achievementsQueue.close) {
      await achievements.achievementsQueue.close();
    }
  } catch (e) {
    // ignore
  }

  try {
    const textract = require('../jobs/textractQueue');
    if (textract && textract.closeTextractQueue) {
      await textract.closeTextractQueue();
    } else if (textract && textract.textractQueue && textract.textractQueue.close) {
      await textract.textractQueue.close();
    }
  } catch (e) {
    // ignore
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
    // ignore
  }

  // Allow a brief delay for any pending promise handlers to run before process exits
  await new Promise((res) => setTimeout(res, 250));

  // Install a no-op handler for any late unhandled rejections that may occur during shutdown
  // This prevents Node from terminating the test runner with an unexplained unhandled rejection
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', (reason) => {
    console.warn('Late unhandledRejection during global teardown (ignored):', reason);
  });
};
const cron = require("node-cron");
const { getPool } = require("../db/pool");
const {
  createLog,
  LOG_TYPES,
  SEVERITY_LEVELS,
} = require("../services/activityLogService");

const TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Manila";
const INACTIVITY_WINDOW_DAYS = parseInt(
  process.env.INACTIVE_AFTER_DAYS || "14",
  10
);

function buildCutoffDate() {
  const now = new Date();
  now.setDate(now.getDate() - INACTIVITY_WINDOW_DAYS);
  return now;
}

async function markInactiveUsers() {
  const pool = getPool();
  const cutoffDate = buildCutoffDate();

  const [result] = await pool.query(
    `UPDATE users
       SET status = 'inactive'
     WHERE status = 'active'
       AND (last_login_at IS NULL OR last_login_at < ?)`,
    [cutoffDate]
  );

  const affected = result?.affectedRows || 0;

  if (affected > 0) {
    try {
      await createLog({
        type: LOG_TYPES.PROFILE,
        action: "STATUS_UPDATE",
        performedBy: {
          userId: 0,
          name: "System Scheduler",
          role: "system",
        },
        targetResource: {
          type: "user_collection",
          id: "bulk",
        },
        changes: {
          field: "status",
          previous: "active",
          next: "inactive",
          affected,
          cutoffDate: cutoffDate.toISOString(),
        },
        description: `Auto-marked ${affected} user(s) as inactive after period of inactivity`,
        severity: SEVERITY_LEVELS.INFO,
        metadata: {
          job: "inactive-user-scheduler",
          executedAt: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.warn("[InactiveUserJob] Failed to log status update", logError);
    }
  }

  return affected;
}

function scheduleInactiveUserJob() {
  console.log(
    `⏰ Scheduling inactive user cleanup job (every midnight, timezone: ${TIMEZONE})`
  );

  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const affected = await markInactiveUsers();
        console.log(
          `✅ Inactive user cleanup job ran successfully. Users affected: ${affected}`
        );
      } catch (err) {
        console.error("❌ Inactive user cleanup job failed:", err);
      }
    },
    {
      timezone: TIMEZONE,
    }
  );
}

module.exports = {
  scheduleInactiveUserJob,
  markInactiveUsers,
};

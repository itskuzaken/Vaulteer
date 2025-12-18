const cron = require("node-cron");
const { getPool } = require("../db/pool");
const {
  createLog,
  LOG_TYPES,
  SEVERITY_LEVELS,
} = require("../services/activityLogService");

const TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Manila";

// Default fallback if setting not present
const DEFAULT_INACTIVITY_DAYS = parseInt(process.env.INACTIVE_AFTER_DAYS || "14", 10);

const { getSettingValue } = require('../repositories/systemSettingsRepository');

function buildCutoffDate(days) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now;
}

async function markInactiveUsers() {
  const pool = getPool();

  // Check if auto-deactivation is enabled
  try {
    const enabled = await getSettingValue('system', 'enable_auto_deactivate', true);
    if (!(String(enabled).toLowerCase() === 'true' || enabled === true)) {
      console.log('[InactiveUserJob] Auto-deactivate is disabled via system setting, skipping.');
      return 0;
    }
  } catch (err) {
    console.warn('[InactiveUserJob] Failed to read enable_auto_deactivate, defaulting to enabled', err);
  }

  // Retrieve configured inactivity window from system settings (category: system)
  let inactivityValue = DEFAULT_INACTIVITY_DAYS;
  let inactivityUnit = 'days';
  try {
    const configuredValue = await getSettingValue('system', 'inactive_after_days', DEFAULT_INACTIVITY_DAYS);
    inactivityValue = Number.isFinite(Number(configuredValue)) ? parseInt(configuredValue, 10) : DEFAULT_INACTIVITY_DAYS;
  } catch (err) {
    console.warn('[InactiveUserJob] Failed to read system setting inactive_after_days, using default', err);
    inactivityValue = DEFAULT_INACTIVITY_DAYS;
  }

  try {
    const configuredUnit = await getSettingValue('system', 'inactive_after_unit', 'days');
    inactivityUnit = String(configuredUnit || 'days').toLowerCase();
    if (!['days', 'weeks', 'months'].includes(inactivityUnit)) inactivityUnit = 'days';
  } catch (err) {
    console.warn('[InactiveUserJob] Failed to read system setting inactive_after_unit, defaulting to days', err);
    inactivityUnit = 'days';
  }

  // Convert value+unit to days
  const unitMultiplier = inactivityUnit === 'weeks' ? 7 : (inactivityUnit === 'months' ? 30 : 1);
  const inactivityDays = Math.max(1, Math.floor(inactivityValue * unitMultiplier));

  const cutoffDate = buildCutoffDate(inactivityDays);

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

const cron = require('node-cron');
const eventRepository = require('../repositories/eventRepository');
const { getPool } = require('../db/pool');
const { logHelpers } = require('../services/activityLogService');
const notificationService = require('../services/notificationService');

let _task = null;
let _started = false;

function startEventReminderScheduler() {
  if (_started) return;
  _started = true;

  // Run every hour to send reminders for events starting within the next 24 hours
  _task = cron.schedule('0 * * * *', async () => {
    try {
      const [events] = await getPool().execute(
        `SELECT uid, event_id, title, start_datetime FROM events
         WHERE start_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
           AND status IN ('published','ongoing')`
      );

      if (!events || events.length === 0) return;

      for (const e of events) {
        try {
          // Check if a reminder was already sent in the last 24 hours
          const [[exists]] = await getPool().execute(
            `SELECT 1 FROM event_updates WHERE event_id = ? AND update_type = 'reminder' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1`,
            [e.event_id]
          );
          if (exists) continue;

          const participants = await eventRepository.getEventParticipants(e.uid, 'registered');
          const participantIds = (participants || []).map((p) => p.user_id);
          if (participantIds.length === 0) continue;

          await notificationService.notifyEventReminder(e, participantIds);

          // Record reminder in event_updates (posted_by_user_id set to event creator)
          await getPool().execute(
            `INSERT INTO event_updates (event_id, posted_by_user_id, update_type, title, message) VALUES ((SELECT event_id FROM events WHERE uid = ?), (SELECT created_by_user_id FROM events WHERE uid = ?), 'reminder', ?, ?)`,
            [e.uid, e.uid, `Reminder: ${e.title}`, `Reminder: ${e.title} starts at ${e.start_datetime}`]
          );

          await logHelpers.logEventStatusChange({
            eventId: e.event_id,
            eventUid: e.uid,
            eventTitle: e.title,
            performedBy: { userId: 'system', name: 'system', role: 'system' },
            previousStatus: null,
            newStatus: 'reminder.sent',
          });
        } catch (err) {
          console.error('[EventReminderScheduler] Failed to send reminder for event', e.uid, err.message || err);
        }
      }
    } catch (err) {
      console.error('[EventReminderScheduler] Error scanning events for reminders:', err.message || err);
    }
  });

  console.log('⏰ Event reminder scheduler started (runs every hour)');
}

function stopEventReminderScheduler() {
  if (!_started) return;
  _started = false;
  if (_task) {
    try {
      _task.stop();
      _task = null;
      console.log('⏰ Event reminder scheduler stopped');
    } catch (err) {
      console.warn('⏰ Failed to stop event reminder scheduler', err.message || err);
    }
  }
}

module.exports = { startEventReminderScheduler, stopEventReminderScheduler };

const cron = require('node-cron');
const eventRepository = require('../repositories/eventRepository');
const { logHelpers } = require('../services/activityLogService');
const { getPool, isReady } = require('../db/pool');

let _task = null;
let _started = false;

async function runEventCompletionCheck() {
  try {
    if (!isReady()) {
      console.warn('[EventCompletionScheduler] DB pool not ready; skipping scheduled run');
      return;
    }

    // Mark events as ongoing if their start_datetime has passed
    try {
      const [ongoingRows] = await getPool().execute(
        `SELECT uid FROM events WHERE start_datetime <= NOW() AND status = 'published'`
      );
      for (const row of ongoingRows) {
        try {
          const existing = await eventRepository.getEventByUid(row.uid);
          const prevStatus = existing?.status || null;
          const updated = await eventRepository.markEventAsOngoing(row.uid);
          if (updated) {
            await logHelpers.logEventStatusChange({
              eventId: updated.event_id,
              eventUid: updated.uid,
              eventTitle: updated.title,
              performedBy: { userId: 'system', name: 'system', role: 'system' },
              previousStatus: prevStatus,
              newStatus: 'ongoing',
            });
          }
          console.log(`[EventCompletionScheduler] Marked event ${row.uid} as ongoing`);
        } catch (err) {
          console.error('[EventCompletionScheduler] Failed to mark event as ongoing', row.uid, err.message || err);
        }
      }
    } catch (err) {
      console.error('[EventCompletionScheduler] Error scanning events for ongoing:', err);
    }

    const [rows] = await getPool().execute(
      `SELECT uid FROM events WHERE end_datetime <= NOW() AND status NOT IN ('completed','cancelled','archived')`);
    if (!rows || rows.length === 0) return;

    for (const row of rows) {
      try {
        const existing = await eventRepository.getEventByUid(row.uid);
        const prevStatus = existing?.status || null;
        const updated = await eventRepository.markEventAsCompleted(row.uid);
        if (updated) {
          await logHelpers.logEventStatusChange({
            eventId: updated.event_id,
            eventUid: updated.uid,
            eventTitle: updated.title,
            performedBy: { userId: 'system', name: 'system', role: 'system' },
            previousStatus: prevStatus,
            newStatus: 'completed',
          });
          // Finalize attended participants (convert checked-in registered -> attended)
          try {
            const finalized = await eventRepository.finalizeAttendedParticipants(row.uid);
            console.log(`[EventCompletionScheduler] Finalized ${finalized} attended participants for event ${row.uid}`);
          } catch (e) {
            console.error('[EventCompletionScheduler] Finalize attended participants failed for', row.uid, e.message || e);
          }

          // Trigger auto-absencing to mark unknown participants as absent (idempotent)
          try {
            const attendanceService = require('../services/attendanceService');
            await attendanceService.autoFlagAbsences(row.uid);
            console.log(`[EventCompletionScheduler] Auto-absenced event ${row.uid}`);
          } catch (e) {
            console.error('[EventCompletionScheduler] Auto-absencing failed for', row.uid, e.message || e);
          }

          // Enqueue achievements processing for this event (MVP: punctual_pro)
          try {
            const achievementsQueue = require('../jobs/achievementsQueue');
            await achievementsQueue.enqueueEventCompleted(updated.event_id);
            console.log(`[EventCompletionScheduler] Enqueued achievements processing for event ${row.uid}`);
          } catch (err) {
            console.error('[EventCompletionScheduler] Failed to enqueue achievements job for', row.uid, err.message || err);
          }
        }
        console.log(`[EventCompletionScheduler] Marked event ${row.uid} as completed`);
      } catch (err) {
        console.error('[EventCompletionScheduler] Failed to mark event as completed', row.uid, err.message || err);
      }
    }
  } catch (err) {
    console.error('[EventCompletionScheduler] Error scanning events for completion:', err);
  }
}

function startEventCompletionScheduler() {
  if (_started) return;
  _started = true;

  // Run every minute to mark events as completed if their end_datetime has passed
  _task = cron.schedule('* * * * *', runEventCompletionCheck);

  console.log('⏰ Event completion scheduler started (runs every minute)');
}

function stopEventCompletionScheduler() {
  if (!_started) return;
  _started = false;
  if (_task) {
    try {
      _task.stop();
      _task = null;
      console.log('⏰ Event completion scheduler stopped');
    } catch (err) {
      console.warn('⏰ Failed to stop event completion scheduler', err.message || err);
    }
  }
}

module.exports = { startEventCompletionScheduler, stopEventCompletionScheduler };

const badgeService = require('../services/badgeService');
const achievementRepo = require('../repositories/achievementRepository');
const { getPool } = require('../db/pool');

async function processEventCompleted({ eventId }) {
  if (!eventId) throw new Error('Missing eventId');
  const pool = getPool();

  // Fetch participants for the event
  const res = await pool.execute(
    `SELECT ep.user_id, ep.status, ep.attendance_marked_at, e.start_datetime, e.event_type, e.event_id
     FROM event_participants ep
     JOIN events e ON e.event_id = ep.event_id
     WHERE ep.event_id = ?`,
    [eventId]
  );

  // Support different mysql2 return shapes: [rows] or rows
  const participants = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (Array.isArray(res) ? res : []);

  for (const p of participants) {
    try {
      // Normalize presence checks: some schemas use attendance_status (present/absent/late),
      // while others use status (attended/waitlisted/registered) — accept either.
      const isPresent = (p.attendance_status === 'present') || p.status === 'present' || p.status === 'attended';

      // Punctual Pro: award when participant is present
      if (isPresent) {
        console.log('[achievementsWorker] user appears present', p.user_id, 'event', eventId);
        const seen = await achievementRepo.auditExists(p.user_id, eventId, 'punctual_pro');
        console.log('[achievementsWorker] auditExists(punctual_pro)=', seen);
        if (!seen) {
          console.log('[achievementsWorker] awarding punctual_pro to', p.user_id);
          await badgeService.incrementProgress({ userId: p.user_id, achievementCode: 'punctual_pro', delta: 1, eventId });
        }
      }

      // Early Bird: attendance before start time
      if (p.attendance_marked_at && p.start_datetime) {
        const marked = new Date(p.attendance_marked_at);
        const start = new Date(p.start_datetime);
        if (marked.getTime() < start.getTime()) {
          const seen = await achievementRepo.auditExists(p.user_id, eventId, 'early_bird');
          if (!seen) {
            await badgeService.incrementProgress({ userId: p.user_id, achievementCode: 'early_bird', delta: 1, eventId });
          }
        }
      }

      // Community Staple: new event_type for the user. Use attendance_status or status equivalently.
      if (p.event_type) {
        const [rows] = await pool.execute(
          `SELECT COUNT(*) as c FROM event_participants ep
           JOIN events e ON ep.event_id = e.event_id
           WHERE ep.user_id = ? AND (ep.attendance_status IN ('present','late') OR ep.status IN ('present','attended','late')) AND e.event_type = ? AND e.event_id <> ?`,
          [p.user_id, p.event_type, p.event_id]
        );
        const previously = rows && rows[0] && rows[0].c > 0;
        if (!previously) {
          const seen = await achievementRepo.auditExists(p.user_id, eventId, 'community_staple');
          if (!seen) {
            await badgeService.incrementProgress({ userId: p.user_id, achievementCode: 'community_staple', delta: 1, eventId });
          }
        }
      }

      // Perfect Streak: maintain consecutive presents
      const streakSeen = await achievementRepo.auditExists(p.user_id, eventId, 'perfect_streak');
      if (!streakSeen) {
        if (isPresent) {
          // increment streak
          const existing = await achievementRepo.getProgress(p.user_id, 'perfect_streak');
          const current = existing ? existing.current_count : 0;
          const newCount = current + 1;
          await badgeService.setProgress(p.user_id, 'perfect_streak', newCount, null, eventId);
        } else if (['absent','no-show'].includes(p.attendance_status) || ['absent','no-show'].includes(p.status)) {
          // reset streak
          await badgeService.setProgress(p.user_id, 'perfect_streak', 0, null, eventId);
        }
      }

    } catch (err) {
      console.error('[achievementsWorker] Failed to process participant', p.user_id, err.message || err);
    }
  }

  return { processed: participants.length };
}

async function processOcrApproved({ submissionId, reviewerId, userId }) {
  if (!userId) throw new Error('Missing userId');

  // Increment OCR wizard progress for the reviewer or owner depending on requirement.
  await badgeService.incrementProgress({ userId, achievementCode: 'ocr_wizard', delta: 1, meta: { submissionId, reviewerId } });

  return { success: true };
}

module.exports = { processEventCompleted, processOcrApproved };

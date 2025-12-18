/**
 * reportWorker
 * Processes report generation jobs: collects data, builds CSV, uploads to S3, saves report metadata.
 * This is a skeleton: implement data gathering and S3 upload using existing utilities.
 */

const { reportQueue } = require('../jobs/reportGenerationQueue');
const reportRepository = require('../repositories/reportRepository');
const eventRepository = require('../repositories/eventRepository');
const s3Service = require('../services/s3Service'); // existing or to be added
const notificationService = require('../services/notificationService');
const userRepository = require('../repositories/userRepository');

async function generateAttendanceReport({ eventId, format = 'csv', includePii = false, dedupeKey = null, requestedBy = null }, context = {}) {
  const { attempts = 0, jobOpts = {} } = context || {};
  // 1. Fetch event and participants (authoritative data)
  // Support both eventId and UID based callers. Prefer ID lookup then participants via UID-based helper
  const event = await eventRepository.getEventById(eventId);
  if (!event) throw new Error('Event not found');

  // Reuse existing repository method that accepts event UID
  const participants = await eventRepository.getEventParticipants(event.uid);

  // 2. Compute metrics
  const registered = participants.length;
  const present = participants.filter(p => p.attendance_status === 'present').length;
  const absent = participants.filter(p => p.attendance_status === 'absent' || p.attendance_status === 'no_show').length;
  const late = participants.filter(p => p.attendance_status === 'late').length;
  const attendancePct = registered > 0 ? (present / registered) * 100 : null;

  // 3. Build absentees list (redact PII if includePii=false)
  const absentees = participants.filter(p => p.attendance_status !== 'present');
  const absenteesJson = absentees.map(p => ({ participant_id: p.participant_id, user_id: p.user_id || null, name: p.name || null, email: includePii ? p.email : (p.email ? 'REDACTED' : null), status: p.attendance_status }));

  // 4. Insert report row (s3_key set after upload)
  const row = await reportRepository.createReport({
    event_id: eventId,
    report_type: 'attendance',
    generated_by_user_id: requestedBy || null,
    registered_count: registered,
    present_count: present,
    absent_count: absent,
    late_count: late,
    attendance_pct: attendancePct ? Number(attendancePct.toFixed(2)) : null,
    absentees_json: absenteesJson,
    file_format: format,
    dedupe_key: dedupeKey
  });

  // 5. Generate CSV and upload to S3 using streaming for memory efficiency
  if (format === 'csv') {
    const { Readable } = require('stream');

    function* csvGenerator(items, includePiiFlag) {
      // Header
      yield 'participant_id,user_id,name,email,status\n';
      for (const p of items) {
        const email = includePiiFlag ? (p.email || '') : (p.email ? 'REDACTED' : '');
        // Escape double quotes in name
        const safeName = (p.name || '').replace(/"/g, '""');
        yield `${p.participant_id},${p.user_id || ''},"${safeName}",${email},${p.attendance_status}\n`;
      }
    }

    const stream = Readable.from(csvGenerator(participants, includePii));
    const s3Key = `events/${event.uid}/reports/${new Date().toISOString()}/attendance-${row.report_id}.csv`;
    try {
      await s3Service.uploadStream(s3Key, stream, 'text/csv');
      // Update report row with s3_key
      await reportRepository.updateReportS3Key(row.report_id, s3Key);
      return { report: row, s3_key: s3Key };
    } catch (err) {
      console.error('Failed to upload report to S3', err);
      // Record failure notes on report row for later inspection
      try {
        await reportRepository.updateReportNotes(row.report_id, `upload_failed: ${err.message || String(err)}`);
      } catch (noteErr) {
        console.error('Failed to save report failure note', noteErr);
      }
      // If this is the final attempt, notify admins
      const maxAttempts = (jobOpts && jobOpts.attempts) || 1;
      if (attempts >= maxAttempts) {
        try {
          const adminIds = await userRepository.getActiveUsersByRole('admin');
          const title = `Report generation failed for event ${event.uid}`;
          const message = `Report upload failed after ${attempts} attempts: ${err.message || String(err)}`;
          await notificationService.createBulkNotifications(adminIds, { title, message, type: 'alert', actionUrl: `/dashboard?content=event&eventUid=${event.uid}`, metadata: { eventId: event.event_id, reportId: row.report_id } });
        } catch (notifyErr) {
          console.error('Failed to notify admins about report failure', notifyErr);
        }
      }
      throw err;
    }
  }
  return { report: row };
}

// wire up queue processing
if (reportQueue && typeof reportQueue.process === 'function') {
  reportQueue.process(async (job) => {
    // Support both Bull job and in-memory job formats
    const isBullJob = job && job.data !== undefined && job.attemptsMade !== undefined;
    let data;
    let attempts = 0;
    let jobOpts = {};
    if (isBullJob) {
      data = job.data;
      attempts = job.attemptsMade || 0;
      jobOpts = job.opts || {};
    } else {
      // fallback in-memory wrapper stores { data, opts, _attempts }
      data = job.data || job;
      attempts = job._attempts || 0;
      jobOpts = job.opts || {};
    }
    try {
      await generateAttendanceReport(data, { attempts, jobOpts });
    } catch (err) {
      console.error('Report generation job failed', err);
      throw err;
    }
  });
}

module.exports = { generateAttendanceReport };

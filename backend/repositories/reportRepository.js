const { getPool } = require('../db/pool');

/**
 * reportRepository
 * CRUD operations for event_reports table
 */

async function createReport(data = {}) {
  const pool = getPool();
  const {
    event_id,
    report_type = 'attendance',
    generated_by_user_id = null,
    registered_count = 0,
    present_count = 0,
    absent_count = 0,
    late_count = 0,
    attendance_pct = null,
    absentees_json = null,
    operational_metrics_json = null,
    notes = null,
    file_format = 'csv',
    s3_key = null,
    dedupe_key = null,
  } = data;

  const [res] = await pool.execute(
    `INSERT INTO event_reports 
      (event_id, report_type, generated_by_user_id, registered_count, present_count, absent_count, late_count, attendance_pct, absentees_json, operational_metrics_json, notes, file_format, s3_key, dedupe_key, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [event_id, report_type, generated_by_user_id, registered_count, present_count, absent_count, late_count, attendance_pct, absentees_json ? JSON.stringify(absentees_json) : null, operational_metrics_json ? JSON.stringify(operational_metrics_json) : null, notes, file_format, s3_key, dedupe_key]
  );

  const id = res.insertId;
  const [rows] = await pool.execute('SELECT * FROM event_reports WHERE report_id = ? LIMIT 1', [id]);
  return rows && rows[0] ? rows[0] : null;
}

async function listReportsByEvent(eventId, limit = 20, offset = 0) {
  const pool = getPool();

  // Validate inputs to avoid prepared-statement runtime errors
  const eId = Number.isFinite(Number(eventId)) ? Number(eventId) : null;
  const lim = Number.isFinite(Number(limit)) ? Number(limit) : 20;
  const off = Number.isFinite(Number(offset)) ? Number(offset) : 0;

  if (eId === null) {
    const err = new Error('Invalid eventId provided to listReportsByEvent');
    err.code = 'INVALID_PARAMS';
    throw err;
  }

  try {
    // Note: MySQL prepared statements don't reliably support parameterized LIMIT/OFFSET
    // across all versions/drivers, so interpolate validated integers directly into SQL.
    const safeLim = Math.max(0, Math.floor(lim));
    const safeOff = Math.max(0, Math.floor(off));
    const sql = `SELECT * FROM event_reports WHERE event_id = ? ORDER BY generated_at DESC LIMIT ${safeLim} OFFSET ${safeOff}`;
    const [rows] = await pool.execute(sql, [eId]);
    return rows || [];
  } catch (err) {
    console.error('Error executing listReportsByEvent with params', { eventId: eId, limit: lim, offset: off }, err?.message || err);
    throw err;
  }
}

async function findById(reportId) {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM event_reports WHERE report_id = ? LIMIT 1', [reportId]);
  return rows && rows[0] ? rows[0] : null;
}

async function updateReportS3Key(reportId, s3Key) {
  const pool = getPool();
  await pool.execute('UPDATE event_reports SET s3_key = ? WHERE report_id = ?', [s3Key, reportId]);
  const [rows] = await pool.execute('SELECT * FROM event_reports WHERE report_id = ? LIMIT 1', [reportId]);
  return rows && rows[0] ? rows[0] : null;
}

async function updateReportNotes(reportId, notes) {
  const pool = getPool();
  await pool.execute('UPDATE event_reports SET notes = ? WHERE report_id = ?', [notes, reportId]);
  const [rows] = await pool.execute('SELECT * FROM event_reports WHERE report_id = ? LIMIT 1', [reportId]);
  return rows && rows[0] ? rows[0] : null;
}

async function findByDedupeKey(dedupeKey) {
  if (!dedupeKey) return null;
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM event_reports WHERE dedupe_key = ? LIMIT 1', [dedupeKey]);
  return rows && rows[0] ? rows[0] : null;
}

module.exports = {
  createReport,
  listReportsByEvent,
  findById,
  updateReportS3Key,
  findByDedupeKey,
  updateReportNotes,
};
const request = require('supertest');
const app = require('../server');
const { initPool, getPool } = require('../db/pool');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

// Stable mock function used by middleware
let volunteerUid = null;
let volunteer2Uid = null;
let adminUid = null;
const verifyFn = jest.fn((token) => {
  if (token === 'volunteer-token') return Promise.resolve({ uid: volunteerUid, email: `${volunteerUid}@example.com` });
  if (token === 'volunteer2-token') return Promise.resolve({ uid: volunteer2Uid, email: `${volunteer2Uid}@example.com` });
  if (token === 'admin-token') return Promise.resolve({ uid: adminUid, email: `${adminUid}@example.com` });
  return Promise.reject(new Error('Invalid token'));
});
admin.auth = jest.fn(() => ({ verifyIdToken: verifyFn }));

// increase timeout for integration tests (DB interactions + job processing)
jest.setTimeout(60000);

describe('Events controller auto-absencing integration', () => {
  let pool;
  let volunteerUserId;
  let volunteer2UserId;
  let adminUserId;
  let eventUid;
  let eventId;

  beforeAll(async () => {
    await initPool();
    pool = getPool();
  }, 20000);

  beforeEach(async () => {
    // Create volunteer users (use unique uids to avoid collisions with other tests)
    volunteerUid = `volunteer-uid-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
    volunteer2Uid = `volunteer2-uid-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
    adminUid = `admin-uid-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;

    const [[roleRow]] = await pool.query(`SELECT role_id FROM roles WHERE role = 'volunteer' LIMIT 1`);
    const volunteerRoleId = roleRow.role_id;
    const res = await pool.query(`INSERT INTO users (uid, email, name, role_id, status) VALUES (?, ?, ?, ?, 'active')`, [volunteerUid, `${volunteerUid}@example.com`, 'Volunteer Test', volunteerRoleId]);
    volunteerUserId = res[0].insertId;

    const res2 = await pool.query(`INSERT INTO users (uid, email, name, role_id, status) VALUES (?, ?, ?, ?, 'active')`, [volunteer2Uid, `${volunteer2Uid}@example.com`, 'Volunteer Test 2', volunteerRoleId]);
    volunteer2UserId = res2[0].insertId;

    const [[adminRoleRow]] = await pool.query(`SELECT role_id FROM roles WHERE role = 'admin' LIMIT 1`);
    const adminRoleId = adminRoleRow.role_id;
    const r3 = await pool.query(`INSERT INTO users (uid, email, name, role_id, status) VALUES (?, ?, ?, ?, 'active')`, [adminUid, `${adminUid}@example.com`, 'Admin Test', adminRoleId]);
    adminUserId = r3[0].insertId;

    // Create event (start as 'published' so volunteers can register)
    eventUid = `event-auto-${Date.now()}`;
    const [eRes] = await pool.query(`INSERT INTO events (uid, title, event_type, status, created_by_user_id) VALUES (?, ?, ?, 'published', ?)`, [eventUid, 'Auto Absence Event', 'community_meeting', adminUserId]);
    eventId = eRes.insertId;

    // Ensure participants tables clean
    await pool.query(`DELETE FROM event_participants WHERE event_id = ?`, [eventId]);
  });

  afterEach(async () => {
    // Clean test rows
    await pool.query(`DELETE FROM event_participants WHERE event_id = ?`, [eventId]);
    await pool.query(`DELETE FROM events WHERE event_id = ?`, [eventId]);
    await pool.query(`DELETE FROM users WHERE user_id IN (?, ?, ?)`, [volunteerUserId, volunteer2UserId, adminUserId]);
    await pool.query(`DELETE FROM event_attendance_audit WHERE event_id = ?`, [eventId]);
  });

  test('auto-flag marks unmarked registered participants as absent and creates audit rows', async () => {
    // Create registrations directly to avoid intermittent external side-effects
    await pool.query(`INSERT INTO event_participants (event_id, user_id, status, registration_date) VALUES (?, ?, 'registered', NOW())`, [eventId, volunteerUserId]);
    await pool.query(`INSERT INTO event_participants (event_id, user_id, status, registration_date) VALUES (?, ?, 'registered', NOW())`, [eventId, volunteer2UserId]);

    // Confirm participants are registered and attendance_status is unknown/null
    const [rowsBefore] = await pool.query(`SELECT participant_id, attendance_status FROM event_participants WHERE event_id = ? ORDER BY participant_id ASC`, [eventId]);
    expect(rowsBefore.length).toBe(2);
    expect(rowsBefore[0].attendance_status === null || rowsBefore[0].attendance_status === 'unknown').toBeTruthy();

    // Simulate event end by setting status to 'completed' then call auto-flag as admin
    await pool.query(`UPDATE events SET status = 'completed' WHERE event_id = ?`, [eventId]);

    const res = await request(app)
      .post(`/api/events/${eventUid}/attendance/auto-flag`)
      .set('Authorization', 'Bearer admin-token')
      .send();

    expect(res.status).toBe(200);

    // Verify participants now marked absent
    const [rowsAfter] = await pool.query(`SELECT participant_id, attendance_status FROM event_participants WHERE event_id = ? ORDER BY participant_id ASC`, [eventId]);
    expect(rowsAfter.length).toBe(2);
    expect(rowsAfter[0].attendance_status).toBe('absent');
    expect(rowsAfter[1].attendance_status).toBe('absent');

    // Verify audit entries exist (one per participant with action mark_absent)
    const [audits] = await pool.query(`SELECT * FROM event_attendance_audit WHERE event_id = ? AND action = 'mark_absent'`, [eventId]);
    expect(audits.length).toBe(2);

    // Fetch attendance report and assert summary
    const r = await request(app).get(`/api/events/${eventUid}/attendance/report`).set('Authorization', 'Bearer admin-token');
    expect(r.status).toBe(200);
    expect(Number(r.body.data.counts.registered)).toBe(2);
    expect(Number(r.body.data.counts.present)).toBe(0);
    expect(Number(r.body.data.counts.absent)).toBe(2);
    expect(Number(r.body.data.counts.attendancePct)).toBe(0);
  });

  test('concurrent auto-flag calls are idempotent and do not create duplicate audit rows', async () => {
    // Create registrations directly to avoid intermittent external side-effects
    await pool.query(`INSERT INTO event_participants (event_id, user_id, status, registration_date) VALUES (?, ?, 'registered', NOW())`, [eventId, volunteerUserId]);
    await pool.query(`INSERT INTO event_participants (event_id, user_id, status, registration_date) VALUES (?, ?, 'registered', NOW())`, [eventId, volunteer2UserId]);

    // Simulate event end and fire two auto-flag requests in parallel
    await pool.query(`UPDATE events SET status = 'completed' WHERE event_id = ?`, [eventId]);

    const p1 = request(app).post(`/api/events/${eventUid}/attendance/auto-flag`).set('Authorization', 'Bearer admin-token').send();
    const p2 = request(app).post(`/api/events/${eventUid}/attendance/auto-flag`).set('Authorization', 'Bearer admin-token').send();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    // Verify participants marked absent
    const [rowsAfter] = await pool.query(`SELECT participant_id, attendance_status FROM event_participants WHERE event_id = ? ORDER BY participant_id ASC`, [eventId]);
    expect(rowsAfter.length).toBe(2);
    expect(rowsAfter[0].attendance_status).toBe('absent');
    expect(rowsAfter[1].attendance_status).toBe('absent');

    // Ensure only one audit row per participant
    const [audits] = await pool.query(`SELECT participant_id, COUNT(*) as c FROM event_attendance_audit WHERE event_id = ? AND action = 'mark_absent' GROUP BY participant_id`, [eventId]);
    expect(audits.every(a => a.c === 1)).toBeTruthy();
  });
});

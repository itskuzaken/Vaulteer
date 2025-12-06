/**
 * Simple concurrency test for registerParticipant using repository methods.
 * Usage: node scripts/test-registration-concurrency.js
 * Ensure the backend DB is accessible and you have created test users.
 */
const eventRepository = require('../repositories/eventRepository');
const userRepository = require('../repositories/userRepository');
const { getPool, initPool } = require('../db/pool');

async function createTestEvent(maxParticipants = 2) {
  const pool = getPool();
  // Insert a test event with limited capacity
  const [result] = await pool.execute(
    `INSERT INTO events (uid, title, description, start_datetime, end_datetime, status, max_participants, created_by_user_id)
     VALUES (UUID(), 'CONCURRENCY TEST EVENT', 'Test event for concurrency', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 1 HOUR), 'published', ?, 1)`,
    [maxParticipants]
  );
  const [[row]] = await pool.execute(`SELECT uid FROM events WHERE event_id = ?`, [result.insertId]);
  return row.uid;
}

async function createTestUser(name) {
  const pool = getPool();
  const uid = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Lookup volunteer role_id
  const [[roleRow]] = await pool.execute(`SELECT role_id FROM roles WHERE role = 'volunteer' LIMIT 1`);
  const roleId = roleRow ? roleRow.role_id : 3;
  const [result] = await pool.execute(`INSERT INTO users (uid, name, email, role_id, status) VALUES (?, ?, ?, ?, 'active')`, [uid, name, `${uid}@example.test`, roleId]);
  return result.insertId;
}

async function cleanupTestData(pool, eventUid) {
  try {
    if (!eventUid) return;
    const [[eventRow]] = await pool.execute(`SELECT event_id FROM events WHERE uid = ? LIMIT 1`, [eventUid]);
    if (!eventRow) return;
    const eventId = eventRow.event_id;
    console.log('Cleaning up test data...');
    await pool.execute(`DELETE FROM event_participants WHERE event_id = ?`, [eventId]);
    await pool.execute(`DELETE FROM events WHERE event_id = ?`, [eventId]);
    await pool.execute(`DELETE FROM users WHERE uid LIKE 'test-%'`);
    console.log('Cleanup complete.');
  } catch (err) {
    console.warn('Cleanup failed:', err.message || err);
  }
}

async function runTest() {
  try {
    console.log('Starting concurrency test...');
    const pool = await initPool();
    if (!pool) throw new Error('Failed to initialize DB pool');
    await pool.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');

    const eventUid = await createTestEvent(2);
    console.log('Created test event:', eventUid);

    // Create 10 test users
    const users = [];
    for (let i = 0; i < 10; i++) {
      const id = await createTestUser(`Tester ${i}`);
      users.push(id);
    }

    // Attempt to register them concurrently
    const promises = users.map((uid) => eventRepository.registerParticipant(eventUid, uid).catch((err) => ({ error: err.message })));
    const results = await Promise.all(promises);
    console.log('Registration results:', results.map((r) => r.status || r.error));

    // Count registered vs waitlisted
    const [counts] = await pool.execute(`SELECT ep.status, COUNT(*) AS c FROM event_participants ep JOIN events e ON ep.event_id = e.event_id WHERE e.uid = ? GROUP BY ep.status`, [eventUid]);
    console.log('Counts:', counts);
    console.log('Test completed');
    // Cleanup created test data
    await cleanupTestData(pool, eventUid);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    try {
      const pool = getPool();
      if (pool) {
        await cleanupTestData(pool, null); // best effort cleanup, event may not exist
        await pool.end();
      }
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

runTest();

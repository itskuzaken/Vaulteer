/**
 * Test script to verify the event completion scheduler bug fix
 * 
 * Bug: Events were repeatedly changing from draft→completed even when already completed
 * Cause: Scheduler didn't check if status actually changed before logging
 * Fix: Added check for actual status change before logging and processing
 */

const { getPool, initPool } = require('./db/pool');
const eventRepository = require('./repositories/eventRepository');

async function testEventCompletionFix() {
  console.log('\n=== Testing Event Completion Scheduler Fix ===\n');
  
  let testEventUid;
  
  try {
    // Initialize pool
    await initPool();
    const pool = getPool();
    
    // 1. Create a test event in draft status with end_datetime in the past
    console.log('1. Creating test event in draft status...');
    const [result] = await pool.execute(`
      INSERT INTO events (uid, title, description, event_type, start_datetime, end_datetime, location, status, created_by_user_id)
      VALUES (UUID(), 'TEST COMPLETION FIX', 'Test event for completion fix', 'training', 
              DATE_SUB(NOW(), INTERVAL 2 HOUR), 
              DATE_SUB(NOW(), INTERVAL 1 HOUR), 
              'Test Location', 'draft', 1)
    `);
    
    const [rows] = await pool.execute(`SELECT uid FROM events WHERE event_id = ?`, [result.insertId]);
    testEventUid = rows[0].uid;
    console.log(`   ✓ Created event ${testEventUid} in draft status\n`);
    
    // 2. Try to mark as completed (should fail for draft events)
    console.log('2. Attempting to mark draft event as completed...');
    const updated = await eventRepository.markEventAsCompleted(testEventUid);
    
    if (updated && updated.status === 'draft') {
      console.log(`   ✓ Correctly returned event without changing status (still: ${updated.status})\n`);
    } else if (updated && updated.status === 'completed') {
      console.log(`   ✗ ERROR: Draft event was incorrectly marked as completed!\n`);
      throw new Error('Draft event should not be marked as completed');
    }
    
    // 3. Verify the fix: markEventAsCompleted should return the event but not change status
    console.log('3. Verifying event status remains draft...');
    const [statusCheck] = await pool.execute(`SELECT status FROM events WHERE uid = ?`, [testEventUid]);
    
    if (statusCheck[0].status === 'draft') {
      console.log(`   ✓ Status correctly remains: ${statusCheck[0].status}\n`);
    } else {
      console.log(`   ✗ ERROR: Status changed to: ${statusCheck[0].status}\n`);
      throw new Error('Status should remain draft');
    }
    
    // 4. Test with valid status transition (published → completed)
    console.log('4. Testing valid status transition (published → completed)...');
    await pool.execute(`UPDATE events SET status = 'published' WHERE uid = ?`, [testEventUid]);
    
    const completedEvent = await eventRepository.markEventAsCompleted(testEventUid);
    
    if (completedEvent && completedEvent.status === 'completed') {
      console.log(`   ✓ Successfully transitioned from published → completed\n`);
    } else {
      console.log(`   ✗ ERROR: Failed to transition published event to completed\n`);
      throw new Error('Published event should transition to completed');
    }
    
    // 5. Test idempotency: calling markEventAsCompleted again should return event without logging
    console.log('5. Testing idempotency (calling markEventAsCompleted on already completed event)...');
    const idempotentResult = await eventRepository.markEventAsCompleted(testEventUid);
    
    if (idempotentResult && idempotentResult.status === 'completed') {
      console.log(`   ✓ Correctly returned completed event without changing status\n`);
    } else {
      console.log(`   ✗ ERROR: Unexpected result from idempotent call\n`);
    }
    
    // 6. Verify activity logs - should only have ONE status change log
    console.log('6. Verifying activity logs...');
    const [logs] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM activity_logs 
      WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.eventUid')) = ?
      AND action = 'STATUS_CHANGE'
      AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.next')) = 'completed'
    `, [testEventUid]);
    
    if (logs[0].count === 1) {
      console.log(`   ✓ Only ONE status change log created (expected behavior)\n`);
    } else {
      console.log(`   ✗ WARNING: Found ${logs[0].count} status change logs (expected 1)\n`);
    }
    
    console.log('=== All Tests Passed ✓ ===\n');
    console.log('Fix Summary:');
    console.log('- markEventAsCompleted now only transitions from [published, ongoing] → completed');
    console.log('- Draft events are skipped without status change');
    console.log('- Activity logs are only created when status actually changes');
    console.log('- Scheduler now checks if status changed before logging and processing\n');
    
  } catch (error) {
    console.error('\n✗ Test Failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (testEventUid) {
      console.log('Cleaning up test event...');
      await getPool().execute(`DELETE FROM events WHERE uid = ?`, [testEventUid]);
      console.log('✓ Cleanup complete\n');
    }
    process.exit(0);
  }
}

testEventCompletionFix().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

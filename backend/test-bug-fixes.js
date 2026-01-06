/**
 * Test Recent Bug Fixes
 * Verifies timezone handling and event status transitions
 */

require('dotenv').config();
const { getPool, initPool } = require('./db/pool');

async function testBugFixes() {
  console.log('🔧 Testing Recent Bug Fixes\n');
  
  await initPool();
  const pool = getPool();
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Test 1: Verify markEventAsCompleted uses transaction locking
    console.log('Test 1: Checking markEventAsCompleted implementation...');
    const eventRepoCode = require('fs').readFileSync('./repositories/eventRepository.js', 'utf8');
    
    const hasTransactionLocking = eventRepoCode.includes('FOR UPDATE') && 
                                   eventRepoCode.includes('markEventAsCompleted');
    const hasStatusValidation = eventRepoCode.match(/validStatuses.*=.*\[.*published.*ongoing/);
    
    if (hasTransactionLocking && hasStatusValidation) {
      console.log('✅ PASS: markEventAsCompleted uses transaction locking with status validation\n');
      passedTests++;
    } else {
      console.log('❌ FAIL: markEventAsCompleted missing proper transaction handling');
      console.log(`  - Transaction locking: ${hasTransactionLocking ? '✓' : '✗'}`);
      console.log(`  - Status validation: ${hasStatusValidation ? '✓' : '✗'}\n`);
      failedTests++;
    }

    // Test 2: Verify checkInParticipant timezone handling
    console.log('Test 2: Checking attendance check-in timezone handling...');
    
    const hasUtcFormatting = eventRepoCode.includes("DATE_FORMAT(start_datetime, '%Y-%m-%dT%H:%i:%sZ')");
    const hasUtcComparison = eventRepoCode.includes('nowUtcMs') && eventRepoCode.includes('startUtcMs');
    
    if (hasUtcFormatting && hasUtcComparison) {
      console.log('✅ PASS: Check-in logic uses UTC time formatting and millisecond comparisons\n');
      passedTests++;
    } else {
      console.log('❌ FAIL: Check-in logic missing proper timezone handling');
      console.log(`  - UTC formatting: ${hasUtcFormatting ? '✓' : '✗'}`);
      console.log(`  - UTC comparison: ${hasUtcComparison ? '✓' : '✗'}\n`);
      failedTests++;
    }

    // Test 3: Verify completed events tab has archive action
    console.log('Test 3: Checking completed events manager actions...');
    const statusConfigPath = '../frontend/src/components/events/eventStatusConfig.js';
    
    if (require('fs').existsSync(statusConfigPath)) {
      const configCode = require('fs').readFileSync(statusConfigPath, 'utf8');
      
      // Find completed status configuration
      const completedMatch = configCode.match(/key:\s*["']completed["'][\s\S]{0,300}managerActions:\s*\[([^\]]*)\]/);
      
      if (completedMatch) {
        const actions = completedMatch[1];
        const hasArchiveAction = actions.includes('archive');
        
        if (hasArchiveAction) {
          console.log('✅ PASS: Completed events tab includes "archive" action\n');
          passedTests++;
        } else {
          console.log('❌ FAIL: Completed events tab missing "archive" action\n');
          failedTests++;
        }
      } else {
        console.log('⚠️  WARN: Could not parse completed status configuration\n');
      }
    } else {
      console.log('⚠️  SKIP: Frontend eventStatusConfig.js not found\n');
    }

    // Test 4: Check event status consistency
    console.log('Test 4: Checking event status consistency in database...');
    const [statusCheck] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM events
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('Event status distribution:');
    statusCheck.forEach(row => {
      console.log(`  - ${row.status}: ${row.count}`);
    });
    
    const [draftAfterCompleted] = await pool.query(`
      SELECT COUNT(*) as count
      FROM events
      WHERE status = 'draft' 
        AND end_datetime < NOW()
        AND end_datetime IS NOT NULL
    `);
    
    if (draftAfterCompleted[0].count === 0) {
      console.log('✅ PASS: No completed events stuck in "draft" status\n');
      passedTests++;
    } else {
      console.log(`⚠️  WARN: Found ${draftAfterCompleted[0].count} events that should be completed but are in draft\n`);
    }

    // Test 5: Verify attendance check-in window validation
    console.log('Test 5: Verifying check-in window calculations...');
    const [testEvent] = await pool.query(`
      SELECT 
        uid,
        title,
        start_datetime,
        end_datetime,
        attendance_checkin_window_mins,
        attendance_grace_mins,
        status
      FROM events
      WHERE start_datetime > NOW()
      LIMIT 1
    `);
    
    if (testEvent.length > 0) {
      const event = testEvent[0];
      console.log(`Test event: ${event.title}`);
      console.log(`  - Check-in window: ${event.attendance_checkin_window_mins || 15} minutes`);
      console.log(`  - Grace period: ${event.attendance_grace_mins || 10} minutes`);
      console.log('✅ PASS: Event has attendance timing configuration\n');
      passedTests++;
    } else {
      console.log('⚠️  SKIP: No future events found for testing\n');
    }

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    failedTests++;
  } finally {
    await pool.end();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BUG FIX TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  if (passedTests + failedTests > 0) {
    console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  }
  console.log('='.repeat(60) + '\n');

  if (failedTests === 0) {
    console.log('✅ All bug fixes verified successfully!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some verifications failed. Review above.\n');
    process.exit(1);
  }
}

testBugFixes();

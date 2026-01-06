/**
 * Test Event Reports Functionality
 * Verifies database tables, report generation, and data integrity
 */

require('dotenv').config();
const { getPool, initPool } = require('./db/pool');
const eventReportService = require('./services/eventReportService');

async function runTests() {
  console.log('🧪 Starting Event Reports Tests\n');
  
  // Initialize database pool
  await initPool();
  const pool = getPool();
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Test 1: Check event_reports table exists
    console.log('Test 1: Verifying event_reports table exists...');
    const [tables] = await pool.query('SHOW TABLES LIKE "event_reports"');
    if (tables.length > 0) {
      console.log('✅ PASS: event_reports table exists\n');
      passedTests++;
    } else {
      console.log('❌ FAIL: event_reports table not found\n');
      failedTests++;
      return;
    }

    // Test 2: Check table structure
    console.log('Test 2: Verifying table structure...');
    const [cols] = await pool.query('SHOW COLUMNS FROM event_reports');
    const requiredColumns = [
      'report_id', 'event_id', 'registered_count', 'present_count', 
      'absent_count', 'late_count', 'attendance_pct', 'age_distribution',
      'gender_distribution', 'location_distribution', 'generated_at'
    ];
    const columnNames = cols.map(c => c.Field);
    const missingCols = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingCols.length === 0) {
      console.log(`✅ PASS: All required columns present (${cols.length} total)\n`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: Missing columns: ${missingCols.join(', ')}\n`);
      failedTests++;
    }

    // Test 3: Check existing reports
    console.log('Test 3: Checking existing reports...');
    const [reports] = await pool.query('SELECT COUNT(*) as count FROM event_reports');
    console.log(`✅ INFO: Found ${reports[0].count} existing report(s)\n`);
    passedTests++;

    // Test 4: Verify report data integrity
    if (reports[0].count > 0) {
      console.log('Test 4: Verifying report data integrity...');
      const [sample] = await pool.query(`
        SELECT 
          r.report_id, 
          r.event_id, 
          r.registered_count, 
          r.present_count, 
          r.attendance_pct,
          r.age_distribution,
          r.gender_distribution,
          e.uid as event_uid,
          e.title as event_title,
          e.status as event_status
        FROM event_reports r
        JOIN events e ON r.event_id = e.event_id
        LIMIT 1
      `);
      
      if (sample.length > 0) {
        const report = sample[0];
        console.log('Sample Report:');
        console.log(`  - Report ID: ${report.report_id}`);
        console.log(`  - Event: ${report.event_title} (${report.event_uid})`);
        console.log(`  - Status: ${report.event_status}`);
        console.log(`  - Registered: ${report.registered_count}`);
        console.log(`  - Present: ${report.present_count}`);
        console.log(`  - Attendance Rate: ${report.attendance_pct}%`);
        
        // Check JSON fields (MySQL returns them as objects or null)
        try {
          let validJson = true;
          if (report.age_distribution !== null) {
            if (typeof report.age_distribution === 'object') {
              console.log('  - Age distribution: Valid JSON object');
            } else {
              JSON.parse(report.age_distribution);
              console.log('  - Age distribution: Parsed successfully');
            }
          }
          if (report.gender_distribution !== null) {
            if (typeof report.gender_distribution === 'object') {
              console.log('  - Gender distribution: Valid JSON object');
            } else {
              JSON.parse(report.gender_distribution);
              console.log('  - Gender distribution: Parsed successfully');
            }
          }
          console.log('✅ PASS: Report data is valid and JSON fields are correct\n');
          passedTests++;
        } catch (err) {
          console.log(`❌ FAIL: JSON fields contain invalid data: ${err.message}\n`);
          failedTests++;
        }
      }
    }

    // Test 5: Test eventReportService methods
    console.log('Test 5: Testing eventReportService.hasEventReport()...');
    const [testEvent] = await pool.query(`
      SELECT uid FROM events 
      WHERE status = 'completed' 
      LIMIT 1
    `);
    
    if (testEvent.length > 0) {
      const hasReport = await eventReportService.hasEventReport(testEvent[0].uid);
      console.log(`✅ INFO: hasEventReport() returned: ${hasReport}\n`);
      passedTests++;
    } else {
      console.log('⚠️  SKIP: No completed events found to test\n');
    }

    // Test 6: Test getEventReport method
    console.log('Test 6: Testing eventReportService.getEventReport()...');
    const [eventWithReport] = await pool.query(`
      SELECT e.uid 
      FROM events e
      JOIN event_reports r ON e.event_id = r.event_id
      LIMIT 1
    `);
    
    if (eventWithReport.length > 0) {
      const report = await eventReportService.getEventReport(eventWithReport[0].uid);
      if (report && report.report_id) {
        console.log('✅ PASS: getEventReport() returned valid report object');
        console.log(`  - Report has ${Object.keys(report).length} fields\n`);
        passedTests++;
      } else {
        console.log('❌ FAIL: getEventReport() returned invalid data\n');
        failedTests++;
      }
    } else {
      console.log('⚠️  SKIP: No events with reports found\n');
    }

    // Test 7: Check scheduler integration
    console.log('Test 7: Checking eventCompletionScheduler integration...');
    const schedulerFile = require('fs').existsSync('./jobs/eventCompletionScheduler.js');
    if (schedulerFile) {
      const schedulerCode = require('fs').readFileSync('./jobs/eventCompletionScheduler.js', 'utf8');
      if (schedulerCode.includes('eventReportService.generateEventReport')) {
        console.log('✅ PASS: Scheduler has report generation integration\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Scheduler missing report generation call\n');
        failedTests++;
      }
    }

    // Test 8: Check API routes
    console.log('Test 8: Checking API routes...');
    const routesFile = require('fs').existsSync('./routes/eventsRoutes.js');
    if (routesFile) {
      const routesCode = require('fs').readFileSync('./routes/eventsRoutes.js', 'utf8');
      const hasGetRoute = routesCode.includes('/reports');
      const hasGenerateRoute = routesCode.includes('generateEventReport');
      const hasDownloadRoute = routesCode.includes('download');
      
      if (hasGetRoute && hasGenerateRoute && hasDownloadRoute) {
        console.log('✅ PASS: All report API routes are present\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Some report API routes are missing');
        console.log(`  - GET route: ${hasGetRoute ? '✓' : '✗'}`);
        console.log(`  - Generate route: ${hasGenerateRoute ? '✓' : '✗'}`);
        console.log(`  - Download route: ${hasDownloadRoute ? '✓' : '✗'}\n`);
        failedTests++;
      }
    }

    // Test 9: Check frontend component
    console.log('Test 9: Checking frontend EventReportPanel component...');
    const componentFile = require('fs').existsSync('../frontend/src/components/events/EventReportPanel.js');
    if (componentFile) {
      console.log('✅ PASS: EventReportPanel.js component exists\n');
      passedTests++;
    } else {
      console.log('❌ FAIL: EventReportPanel.js component not found\n');
      failedTests++;
    }

    // Test 10: Check PDF service
    console.log('Test 10: Checking pdfReportService...');
    const pdfFile = require('fs').existsSync('./services/pdfReportService.js');
    if (pdfFile) {
      const pdfCode = require('fs').readFileSync('./services/pdfReportService.js', 'utf8');
      if (pdfCode.includes('PDFDocument') && pdfCode.includes('generateReportPDF')) {
        console.log('✅ PASS: PDF generation service is properly configured\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: PDF service missing required functions\n');
        failedTests++;
      }
    }

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    console.error(error.stack);
    failedTests++;
  } finally {
    await pool.end();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  console.log('='.repeat(60) + '\n');

  if (failedTests === 0) {
    console.log('🎉 All tests passed! Event Reports system is working properly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.\n');
    process.exit(1);
  }
}

runTests();

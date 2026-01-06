/**
 * Test Achievement Fetching for Gamification Settings
 * Tests the admin achievements endpoint used by the AchievementMappingForm
 */
require('dotenv').config();
const { getPool, initPool } = require('./db/pool');
const gamificationService = require('./services/gamificationService');

async function testAchievementFetching() {
  console.log('\n🧪 Testing Achievement Fetching for Gamification Settings\n');

  await initPool();
  const pool = await getPool();

  try {
    // Test 1: Direct database query
    console.log('📊 Test 1: Direct database query');
    const [rows] = await pool.query(
      'SELECT achievement_id, badge_code, achievement_name, is_active FROM achievements WHERE is_active = 1 LIMIT 10'
    );
    console.log(`✅ Found ${rows.length} active achievements in database`);
    if (rows.length > 0) {
      console.log('Sample achievements:');
      rows.slice(0, 3).forEach(a => {
        console.log(`  - ${a.achievement_name} (${a.badge_code})`);
      });
    }

    // Test 2: Service layer
    console.log('\n📊 Test 2: Service layer (listAchievements)');
    const serviceData = await gamificationService.listAchievements();
    console.log(`✅ Service returned ${serviceData.length} achievements`);
    if (serviceData.length > 0) {
      console.log('Sample achievements:');
      serviceData.slice(0, 3).forEach(a => {
        console.log(`  - ${a.achievement_name} (${a.badge_code})`);
      });
    }

    // Test 3: Check if there are inactive achievements
    console.log('\n📊 Test 3: Check for inactive achievements');
    const [inactiveRows] = await pool.query(
      'SELECT COUNT(*) as count FROM achievements WHERE is_active = 0'
    );
    console.log(`Found ${inactiveRows[0].count} inactive achievements`);

    // Test 4: Total achievements count
    console.log('\n📊 Test 4: Total achievements');
    const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM achievements');
    console.log(`Total achievements in database: ${totalRows[0].count}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`✅ Database connection: Working`);
    console.log(`✅ Achievement table: ${totalRows[0].count} total records`);
    console.log(`✅ Active achievements: ${rows.length}`);
    console.log(`✅ Service layer: ${serviceData.length} achievements returned`);

    if (serviceData.length === 0) {
      console.log('\n⚠️  WARNING: No achievements found!');
      console.log('Possible causes:');
      console.log('  1. Achievements table is empty');
      console.log('  2. All achievements are inactive (is_active = 0)');
      console.log('  3. Database connection issue');
      console.log('\nTo fix: Run achievement seeding or check is_active flags');
    } else {
      console.log('\n✅ Achievement fetching is working correctly!');
    }

    console.log('='.repeat(60) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAchievementFetching();

#!/usr/bin/env node
/**
 * Initialize User Settings for All Active Users
 * This ensures every active user has notification preferences
 */

const { initPool } = require("./db/pool");

async function initializeUserSettings() {
  const pool = await initPool();

  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔧 INITIALIZING USER SETTINGS");
    console.log("=".repeat(60) + "\n");

    // Check how many users need settings
    console.log("1️⃣  Checking for users without settings...");
    const [usersWithoutSettings] = await pool.query(`
      SELECT u.user_id, u.name, u.email
      FROM users u
      WHERE u.status = 'active'
        AND u.user_id NOT IN (SELECT user_id FROM user_settings)
      ORDER BY u.user_id
    `);

    console.log(`   Found ${usersWithoutSettings.length} users without settings`);

    if (usersWithoutSettings.length === 0) {
      console.log("   ✅ All active users already have settings!\n");
      await pool.end();
      return;
    }

    console.log("\n2️⃣  Creating default settings for these users:");
    usersWithoutSettings.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.name} (ID: ${user.user_id})`);
    });

    console.log("\n3️⃣  Inserting default settings...");
    const [result] = await pool.query(`
      INSERT IGNORE INTO user_settings 
        (user_id, theme, push_notifications_enabled, email_notifications_enabled, language, timezone)
      SELECT 
        user_id, 
        'system', 
        FALSE, 
        TRUE, 
        'en', 
        'UTC'
      FROM users
      WHERE status = 'active'
        AND user_id NOT IN (SELECT user_id FROM user_settings)
    `);

    console.log(`   ✅ Created ${result.affectedRows} user settings\n`);

    // Verify
    console.log("4️⃣  Verification:");
    const [totalSettings] = await pool.query(
      "SELECT COUNT(*) as count FROM user_settings"
    );
    const [activeUsers] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active'"
    );
    const [remaining] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users u
      WHERE u.status = 'active'
        AND u.user_id NOT IN (SELECT user_id FROM user_settings)
    `);

    console.log(`   Total user settings: ${totalSettings[0].count}`);
    console.log(`   Total active users: ${activeUsers[0].count}`);
    console.log(`   Users still without settings: ${remaining[0].count}`);

    console.log("\n" + "=".repeat(60));
    if (remaining[0].count === 0) {
      console.log("✅ ALL USERS NOW HAVE NOTIFICATION SETTINGS!");
    } else {
      console.log("⚠️  Some users still missing settings");
    }
    console.log("=".repeat(60) + "\n");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error initializing user settings:", error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

initializeUserSettings();

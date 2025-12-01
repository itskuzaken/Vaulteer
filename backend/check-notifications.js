#!/usr/bin/env node
/**
 * Notification System Status Checker
 * Verifies that all notification tables and settings are properly configured
 */

const { initPool } = require("./db/pool");

async function checkNotificationSystem() {
  const pool = await initPool();

  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔔 NOTIFICATION SYSTEM STATUS CHECK");
    console.log("=".repeat(60) + "\n");

    // Check 1: Notifications table
    console.log("1️⃣  Checking notifications table...");
    const [notifTableCheck] = await pool.query(
      'SHOW TABLES LIKE "notifications"'
    );

    if (notifTableCheck.length === 0) {
      console.log("   ❌ notifications table does NOT exist");
      console.log("   👉 Run: node migrate.js migrations/20251201_initialize_notification_system.sql\n");
    } else {
      console.log("   ✅ notifications table exists");

      const [notifCount] = await pool.query(
        "SELECT COUNT(*) as count FROM notifications"
      );
      const [unreadCount] = await pool.query(
        "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0"
      );

      console.log(`   📊 Total notifications: ${notifCount[0].count}`);
      console.log(`   📬 Unread notifications: ${unreadCount[0].count}\n`);
    }

    // Check 2: User settings table
    console.log("2️⃣  Checking user_settings table...");
    const [settingsTableCheck] = await pool.query(
      'SHOW TABLES LIKE "user_settings"'
    );

    if (settingsTableCheck.length === 0) {
      console.log("   ❌ user_settings table does NOT exist");
      console.log("   👉 Run: node migrate.js migrations/20251201_initialize_notification_system.sql\n");
    } else {
      console.log("   ✅ user_settings table exists");

      const [settingsCount] = await pool.query(
        "SELECT COUNT(*) as count FROM user_settings"
      );
      const [pushEnabled] = await pool.query(
        "SELECT COUNT(*) as count FROM user_settings WHERE push_notifications_enabled = 1"
      );
      const [emailEnabled] = await pool.query(
        "SELECT COUNT(*) as count FROM user_settings WHERE email_notifications_enabled = 1"
      );
      const [fcmTokens] = await pool.query(
        "SELECT COUNT(*) as count FROM user_settings WHERE fcm_token IS NOT NULL"
      );

      console.log(`   📊 Total user settings: ${settingsCount[0].count}`);
      console.log(
        `   📱 Push notifications enabled: ${pushEnabled[0].count}`
      );
      console.log(
        `   📧 Email notifications enabled: ${emailEnabled[0].count}`
      );
      console.log(`   🔑 Users with FCM tokens: ${fcmTokens[0].count}\n`);
    }

    // Check 3: Users without settings
    console.log("3️⃣  Checking for users without settings...");
    const [activeUsers] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active'"
    );
    const [usersWithoutSettings] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users u
      WHERE u.status = 'active'
        AND u.user_id NOT IN (SELECT user_id FROM user_settings)
    `);

    console.log(`   👥 Total active users: ${activeUsers[0].count}`);

    if (usersWithoutSettings[0].count > 0) {
      console.log(
        `   ⚠️  Users without settings: ${usersWithoutSettings[0].count}`
      );
      console.log(
        "   👉 Run: node migrate.js migrations/20251201_initialize_notification_system.sql\n"
      );
    } else {
      console.log(`   ✅ All active users have settings\n`);
    }

    // Check 4: Required indexes
    console.log("4️⃣  Checking database indexes...");
    const [indexes] = await pool.query(`
      SELECT 
        table_name,
        index_name,
        GROUP_CONCAT(column_name ORDER BY seq_in_index) as columns
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name IN ('notifications', 'user_settings')
        AND index_name != 'PRIMARY'
      GROUP BY table_name, index_name
      ORDER BY table_name, index_name
    `);

    if (indexes.length > 0) {
      console.log("   ✅ Indexes found:");
      indexes.forEach((idx) => {
        console.log(`   - ${idx.table_name}.${idx.index_name} (${idx.columns})`);
      });
      console.log("");
    } else {
      console.log("   ⚠️  No indexes found (this might affect performance)\n");
    }

    // Check 5: Sample data
    console.log("5️⃣  Sample user settings (top 5)...");
    const [sampleSettings] = await pool.query(`
      SELECT 
        us.user_id,
        u.name,
        us.push_notifications_enabled as push_enabled,
        us.email_notifications_enabled as email_enabled,
        CASE WHEN us.fcm_token IS NOT NULL THEN 'Yes' ELSE 'No' END as has_token
      FROM user_settings us
      JOIN users u ON us.user_id = u.user_id
      WHERE u.status = 'active'
      ORDER BY us.updated_at DESC
      LIMIT 5
    `);

    if (sampleSettings.length > 0) {
      console.table(sampleSettings);
    } else {
      console.log("   ℹ️  No user settings found\n");
    }

    // Final summary
    console.log("=".repeat(60));

    const allGood =
      notifTableCheck.length > 0 &&
      settingsTableCheck.length > 0 &&
      usersWithoutSettings[0].count === 0;

    if (allGood) {
      console.log("✅ NOTIFICATION SYSTEM IS FULLY CONFIGURED");
      console.log("\n🎉 You can now:");
      console.log("   1. Publish events/announcements to test notifications");
      console.log("   2. Enable push notifications in user settings");
      console.log("   3. Configure email provider (SendGrid/SES/SMTP)");
      console.log("   4. Monitor notification delivery in server logs");
    } else {
      console.log("⚠️  NOTIFICATION SYSTEM NEEDS SETUP");
      console.log("\n📝 To fix:");
      console.log("   1. Run: cd backend");
      console.log("   2. Run: node migrate.js migrations/20251201_initialize_notification_system.sql");
      console.log("   3. Run: node check-notifications.js");
    }

    console.log("=".repeat(60) + "\n");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error checking notification system:", error.message);
    await pool.end();
    process.exit(1);
  }
}

checkNotificationSystem();

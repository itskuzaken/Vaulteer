const { initPool } = require("./db/pool");

async function checkTable() {
  try {
    console.log("Initializing database pool...");
    const pool = await initPool();

    console.log("Checking if notifications table exists...");
    const [rows] = await pool.query('SHOW TABLES LIKE "notifications"');

    if (rows.length === 0) {
      console.log("❌ ERROR: notifications table does NOT exist");
      console.log("\n📋 To fix this:");
      console.log(
        "1. Open the SQL file: backend/migrations/create_notifications_table.sql"
      );
      console.log("2. Copy the SQL content");
      console.log("3. Execute it in your DB client");
    } else {
      console.log("✅ SUCCESS: notifications table exists");
      const [count] = await pool.query(
        "SELECT COUNT(*) as count FROM notifications"
      );
      console.log(`📊 Current notifications: ${count[0].count}`);

      // Show table structure
      const [structure] = await pool.query("DESCRIBE notifications");
      console.log("\n📋 Table structure:");
      structure.forEach((col) => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkTable();

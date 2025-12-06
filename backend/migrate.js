#!/usr/bin/env node
/**
 * Database Migration Runner
 * Usage: node migrate.js <migration-file.sql>
 * Example: node migrate.js migrations/20251201_initialize_notification_system.sql
 */

const fs = require("fs");
const path = require("path");
const { initPool } = require("./db/pool");
const { CONFIG } = require('./config/env');
const net = require('net');

async function runMigration(sqlFilePath) {
  console.log(`[migration] Connecting to DB host=${process.env.DB_HOST || CONFIG.DB_HOST} user=${process.env.DB_USER || CONFIG.DB_USER} db=${process.env.DB_NAME || CONFIG.DB_NAME}`);
  console.log(`[migration] Connection attempts will use DB_CONN_RETRIES=${process.env.DB_CONN_RETRIES || 3}`);

  // Quick TCP check to see if DB host:port is reachable before pool init
  const host = process.env.DB_HOST || CONFIG.DB_HOST;
  const port = process.env.DB_PORT || 3306;
  const testPortOpen = (host, port, timeout = 3000) => {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      setTimeout(() => resolve(false), timeout);
    });
  };
  const reachable = await testPortOpen(host, port, 3000);
  if (!reachable) {
    console.error(`✗ Could not connect to database at ${host}:${port}. Verify host:port and that DB is running and reachable`);
    process.exit(1);
  }

  const pool = await initPool();

  try {
    // Resolve the file path
    const fullPath = path.resolve(__dirname, sqlFilePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Migration file not found: ${fullPath}`);
    }

    console.log(`\n📄 Reading migration file: ${sqlFilePath}`);
    const sql = fs.readFileSync(fullPath, "utf8");

    // Robustly split SQL into statements while ignoring semicolons inside quotes/backticks
    function splitStatements(sqlText) {
      const statements = [];
      let cur = "";
      let inSingle = false;
      let inDouble = false;
      let inBacktick = false;
      for (let i = 0; i < sqlText.length; i++) {
        const ch = sqlText[i];
        const prev = i > 0 ? sqlText[i - 1] : null;
        if (ch === "'" && prev !== "\\" && !inDouble && !inBacktick) {
          inSingle = !inSingle;
          cur += ch;
          continue;
        }
        if (ch === '"' && prev !== "\\" && !inSingle && !inBacktick) {
          inDouble = !inDouble;
          cur += ch;
          continue;
        }
        if (ch === "`" && prev !== "\\" && !inSingle && !inDouble) {
          inBacktick = !inBacktick;
          cur += ch;
          continue;
        }

        if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
          const stmt = cur.trim();
          if (stmt.length > 0) statements.push(stmt);
          cur = "";
          continue;
        }

        cur += ch;
      }
      const last = cur.trim();
      if (last.length > 0) statements.push(last);
      return statements;
    }

    const statements = splitStatements(sql).filter((stmt) => {
      // Remove empty statements and SQL comments as well as USE statements
      const s = stmt.trim();
      return (
        s.length > 0 && !s.startsWith("--") && !s.startsWith("/*") && !s.match(/^USE\s+/i)
      );
    });

    console.log(`\n🔄 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip if it's just a comment
      if (!statement || statement.startsWith("--")) {
        continue;
      }

      try {
        // Show first 100 chars of statement
        const preview =
          statement.length > 100
            ? statement.substring(0, 100) + "..."
            : statement;
        console.log(`[${i + 1}/${statements.length}] ${preview}`);

        const [result] = await pool.query(statement);

        // Handle different types of results
        if (Array.isArray(result) && result.length > 0) {
          // SELECT query - show results
          try {
            if (result.length <= 10) {
              console.table(result);
            } else {
              console.log(`✅ Returned ${result.length} rows`);
              console.table(result.slice(0, 5));
              console.log(`... and ${result.length - 5} more rows`);
            }
          } catch (e) {
            // Fallback to JSON if console.table fails for unexpected data shapes
            console.log(`✅ Returned ${result.length} rows`);
            console.log(JSON.stringify(result.slice(0, 5), null, 2));
          }
        } else if (result.affectedRows !== undefined) {
          // INSERT/UPDATE/DELETE query
          console.log(`✅ Affected ${result.affectedRows} rows`);
        } else {
          console.log(`✅ Success`);
        }

        successCount++;
        console.log(""); // Empty line for readability
      } catch (error) {
        // Some errors are expected (like "table already exists" or "duplicate entry")
        const isExpectedError =
          error.code === "ER_TABLE_EXISTS_ERROR" ||
          error.code === "ER_DUP_ENTRY" ||
          error.message.includes("already exists") ||
          error.message.includes("Duplicate entry");

        if (isExpectedError) {
          console.log(`⚠️  Expected: ${error.message}`);
          successCount++;
        } else {
          console.error(`❌ Error: ${error.message}`);
          errorCount++;
        }
        console.log("");
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ Migration complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`${"=".repeat(60)}\n`);

    await pool.end();
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("\n❌ Error: No migration file specified");
  console.log("\nUsage: node migrate.js <migration-file.sql>");
  console.log("\nExamples:");
  console.log(
    "  node migrate.js migrations/20251201_initialize_notification_system.sql"
  );
  console.log("  node migrate.js migrations/20251130_create_user_settings.sql");
  console.log("\nAvailable migrations:");

  // List available migrations
  const migrationsDir = path.join(__dirname, "migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    files.forEach((file) => {
      console.log(`  - ${file}`);
    });
  }

  process.exit(1);
}

const migrationFile = args[0];
runMigration(migrationFile);

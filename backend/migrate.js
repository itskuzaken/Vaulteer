#!/usr/bin/env node
/**
 * Database Migration Runner
 * Usage: node migrate.js <migration-file.sql>
 * Example: node migrate.js migrations/20251201_initialize_notification_system.sql
 */

    // Robustly split SQL into statements while handling semicolons inside quotes/backticks
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

    const statements = splitStatements(sql).map((stmt) => {
      // Clean each statement by removing comment lines and trimming
      const lines = stmt.split(/\r?\n/);
      const cleanedLines = lines.filter((line) => {
        const t = line.trim();
        return (
          t.length > 0 &&
          !t.startsWith("--") &&
          !t.startsWith("/*") &&
          !t.startsWith("*") &&
          !t.endsWith("*/")
        );
      });
      return cleanedLines.join("\n").trim();
    }).filter((stmt) => {
      // Remove empty statements and SQL statements that should be skipped
      return (
        stmt.length > 0 &&
        !stmt.match(/^USE\s+/i) && // Skip USE statements (pool already connected)
        !stmt.match(/^SET\s+@/i) // Skip variable declarations that aren't queries
      );
    });
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
>>>>>>> origin/branch-alyana

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
          error.message.includes("Duplicate entry") ||
          // Common duplicate/exists errors
          error.message.includes("Duplicate key name") ||
          error.message.includes("Duplicate column name") ||
          // Common 'object doesn't exist' errors that are non-fatal for idempotent migrations
          error.message.includes("doesn't exist") ||
          error.message.includes("does not exist");

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

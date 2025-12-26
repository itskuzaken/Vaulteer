# Attendance Migration Runbook

## Purpose
This runbook describes the steps to safely apply the attendance schema changes to staging/production, verify the migration, and optionally add DB-level append-only triggers for the `event_attendance_audit` table.

## Scope
- Add `attendance_status`, `attendance_marked_at`, `attendance_marked_by`, `attendance_notes`, `attendance_updated_at` to `event_participants` (migration provided).
- Create `event_attendance_audit` table (migration provided).
- Backfill existing participants to `attendance_status = 'unknown'`.
- Optional: create DB triggers to enforce append-only behavior on `event_attendance_audit`.

---

## Pre-requisites
- Take a full logical backup of the database (mysqldump) and a snapshot if available.
- Ensure application nodes and worker actors are healthy and no long-running migrations are in progress.
- Coordinate maintenance window with on-call & product owners for a soft launch (not strictly required but recommended).

Example backup commands (adjust to your environment):

```bash
# Logical dump (recommended before schema changes)
mysqldump -h $DB_HOST -u $DB_USER -p --databases $DB_NAME > vaulteer_pre_attendance_$(date +%F).sql

# Optional: create DB snapshot via cloud console
```

---

## Migration steps
1. Pull latest `main` branch that contains:
   - `backend/migrations/20251217_add_attendance_columns_and_audit_table.sql`
   - `backend/migrations/20251217_backfill_attendance_status.sql`
   - (idempotent safety checks included in the migration SQL)

2. Deploy the backend image containing the migration scripts.

3. Apply migrations (example using `npm` script or your migration runner):

```bash
cd backend
npm run migrate
```

4. Verify migration applied successfully:

```sql
-- Check table exists
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_attendance_audit';

-- Check columns
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND COLUMN_NAME IN ('attendance_status','attendance_marked_at','attendance_marked_by','attendance_notes','attendance_updated_at');

-- Check indexes
SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND INDEX_NAME = 'idx_participants_event_attendance';
```

5. Verify backfill ran (if included):

```sql
SELECT COUNT(*) FROM event_participants WHERE status = 'registered' AND (attendance_status IS NULL OR attendance_status = 'unknown');
```

6. Run smoke/integration tests in staging (or locally against a copy of production database if possible). Run the attendance integration tests:

```bash
# From repo root
npx jest backend/__tests__/eventsController.autoAbsence.integration.test.js -i
```

---

## Optional: Create DB triggers to enforce append-only audit table
Note: Some MySQL/MariaDB setups may reject `SIGNAL` or require `DELIMITER` handling. Run the following in a SQL client that supports `DELIMITER` (e.g., `mysql` CLI).

```sql
DELIMITER $$
CREATE TRIGGER trg_event_attendance_audit_no_update
BEFORE UPDATE ON event_attendance_audit FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='event_attendance_audit is append-only';
END$$

CREATE TRIGGER trg_event_attendance_audit_no_delete
BEFORE DELETE ON event_attendance_audit FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='event_attendance_audit is append-only and cannot be deleted';
END$$
DELIMITER ;
```

If your DB does not support SIGNAL in triggers, you can instead use a scheduled job to scan and alert on deletes/updates to the audit table.

---

## Post-migration validation
- Confirm `event_participants` new columns exist and that auto-absencing behaves as expected (run manual job on a small event).
- Confirm `event_attendance_audit` is append-only in behavior (no updates to existing rows).
- Confirm integration tests (attendance, gamification mapping) pass.
- Verify structured observability: the scheduler now emits JSON logs for auto-absencing summary and per-batch events. Example (run locally against staging DB):

```bash
# Run single scheduler check and watch logs for structured summary
node -e "require('./jobs/eventCompletionScheduler').runEventCompletionCheck()" | jq -r 'select(.op=="EventCompletionScheduler.autoAbsenceSummary")'
```

- Monitor error logs and alert on spikes for 24–48 hours.

---

## Rollback guidance
- The migration is additive. To undo, you must:
  1. Backup any new audit data if needed.
  2. Remove triggers if applied.
  3. Drop `event_attendance_audit` table.
  4. Drop attendance columns from `event_participants`.

Note: Rolling back schema changes will remove historical audit data — prefer exporting critical audit rows before rollback.

---

## Notes for reviewers
- The application contains transactional repository methods to update `event_participants` and write audit rows atomically (`eventRepository.checkInParticipant`, `patchAttendance`, `autoFlagAbsences`).
- The `eventCompletionScheduler` triggers auto-absencing when events transition to `completed`.
- Controllers and routes are protected via `authorizeRoles` (admin/staff where appropriate).

---

If you'd like, I can prepare a short PR description and checklist and open the PR for review once you approve the runbook text.

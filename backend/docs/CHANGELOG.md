# Changelog

## 2025-12-17 - Attendance tracking & audit

- Added database migration `20251217_add_attendance_columns_and_audit_table.sql` to add `attendance_status`, `attendance_marked_at`, `attendance_marked_by`, `attendance_notes`, `attendance_updated_at` to `event_participants` and create `event_attendance_audit` table (idempotent checks included).
- Implemented repository methods: `checkInParticipant`, `patchAttendance`, `autoFlagAbsences` with transaction-safe updates and audit insertion.
- Exposed controller endpoints and routes for attendance management (protected by admin/staff roles):
  - `POST /api/events/:uid/attendance` (bulk mark)
  - `POST /api/events/:uid/attendance/checkin` (single check-in)
  - `PATCH /api/events/:uid/attendance/:participantId` (corrections)
  - `POST /api/events/:uid/attendance/auto-flag` (manual trigger)
  - `GET /api/events/:uid/attendance/audit` (audit log)
  - `GET /api/events/:uid/attendance/report` (summary snapshot)
- Added `eventCompletionScheduler` hook to automatically run `autoFlagAbsences` when events are marked completed.
- Added integration tests for auto-absencing and concurrency. Fixed various edge cases in gamification handling so attendance marking remains resilient.
- Added runbook `backend/docs/ATTENDANCE_MIGRATION_RUNBOOK.md` with backup, verification, and optional trigger SQL to enforce append-only audits.

---

Please include this changelog entry in the PR description and attach the runbook for ops review.
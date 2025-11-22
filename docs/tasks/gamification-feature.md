# Gamification Feature Implementation Plan

This document is the working task list for delivering gamification across the Vaulteer platform. It breaks the work into concrete steps spanning database, backend, and frontend layers. Use this file as the single source of truth while implementing and tracking progress.

---

## 1. Discovery & Design

- [x] **Confirm requirements**: Points (positive + occasional penalties), badge tiers, 7-day streaks, volunteer leaderboard, toast + inbox notifications, admin backfill/recalc, and API surfacing via `/api/me` + dedicated endpoints.
- [x] **Inventory existing schema**: confirmed leverage points for `achievements`, `user_achievements`, `activity_logs`, `event_participants`, `events`, `users`, `notifications`, `roles`; no conflicting FKs detected.
- [x] **Define reward rules**:
  - `EVENT_REGISTER` +10 (waitlist +5), `EVENT_ATTEND` +40, `EVENT_HOST_PUBLISHED` +25, `EVENT_CANCEL` -5 (only when user cancels late), `WAITLIST_PROMOTION` +8, `STREAK_DAY` +5 for consecutive attendance week, `BADGE_EARNED` uses badge metadata bonus.
  - Level curve: `level = floor(total_points / 100) + 1`, streak resets if no reward for 48h.
- [x] **Map user touchpoints**: Dashboard hero widget (all roles), `MyEvents` card footer, Event Details reward hint, Notifications drawer, Admin leaderboard tab, `/api/me` gamification block for hydration.

## 2. Database Layer

- [x] **Create `user_gamification_stats` table** (`backend/migrations/20251119_gamification_tables.sql`, reflected in `backend/schema.sql`).
- [x] **Create `gamification_events` ledger** with JSON metadata + dedupe key for idempotency.
- [x] **Normalize badge catalog** by extending `achievements` (badge codes, thresholds, ordering, active flag).
- [x] **Create `view_user_badges`** over `user_achievements` ↔︎ `achievements` for quick joins.
- [x] **Seed core badges** (First Steps, Steady Hands, Community Pillar, Momentum Starter, Weeklong Warrior) via the migration.

## 3. Backend Services

- [x] **Repository layer**
  - `backend/repositories/gamificationRepository.js` handles transactions, streaks, stats, badges.
  - `eventRepository` now reports promotions so controllers can trigger rewards.
- [x] **Domain service** (`backend/services/gamificationService.js`): centralized `awardAction`, badge evaluation, summary helpers.
- [x] **API endpoints**
  - New `/api/gamification` router exposes summary, leaderboard, admin recalc; `/api/me` response now embeds `gamification` data.
- [ ] **Notifications/integration**
  - Activity logs fire with `GAMIFICATION` type (done); toast/inbox notifications still pending implementation.

## 4. Frontend Integration

- [ ] **Service layer** (`gamificationService.js`)
  - Methods: `getSummary()`, `getLeaderboard(period)`, `recalculate(userId)` (admin only).
- [ ] **State wiring**
  - Extend `useDashboardUser` (or create a new hook) to fetch gamification summary once per session and expose to dashboards.
- [ ] **UI components**
  - `MyImpactWidget`: displays total points, level, progress bar to next badge, quick actions.
  - `BadgeCarousel` / `BadgeGallery`: show earned badges with tooltips, filter by category.
  - `LeaderboardCard`: optional component for admin/staff dashboards.
  - Toasts/snackbars for “+50 points” or “New Badge: Community Builder”.
- [ ] **Event flows**
  - Update `EventDetailsPage` / `JoinEventButton` success handlers to refresh gamification summary after joining/leaving/completing events.
  - Show reward hints (e.g., “Attend this event to earn +40 points”).

## 5. Testing & QA

- [ ] **Unit tests** for `gamificationService`, repository methods, and badge logic.
- [ ] **Integration tests** for API endpoints (happy path + idempotency).
- [ ] **Frontend tests** (React Testing Library) covering `MyImpactWidget` rendering and updating.
- [ ] **Manual verification checklist**
  - Register/attend event → points increase.
  - Badge awarded when threshold met.
  - Leaderboard updates after multiple users gain points.
  - Notifications logged in `activity_logs`.

## 6. Deployment & Rollout

- [ ] **Database migration plan** (run in maintenance window, back up `users`, `user_achievements`).
- [ ] **Feature flag** to gradually roll out UI and backend awards.
- [ ] **Backfill script** to seed historical points from `event_participants` and `activity_logs`.
- [ ] **Documentation update** (README, admin handbook describing new metrics and badge policies).

---

> **Reference:** See `backend/schema.sql` for existing tables (`achievements`, `user_achievements`, `event_participants`, `activity_logs`, `users`). Reuse these relationships where possible to minimize duplication.

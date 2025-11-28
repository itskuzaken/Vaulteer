# User Settings Refactor Plan (Appearance & Push Notifications)

TL;DR: Refactor `UserSettings` into a modern, accessible settings UI that supports Light/Dark/System appearance, push notification opt-in via FCM, and per-user persistence. Add small UI primitives (toggle, section components), persist settings to user profile, and integrate push subscription/unsubscribe flows.

## Goal
Refactor `frontend/src/components/navigation/Settings/UserSettings.js` so it provides:
- Appearance controls: Light / Dark / System (auto) theme
- Push Notification toggle with FCM integration (subscribe/unsubscribe)
- Accessible, responsive layout, and persistent user preferences (backend)
- Clean separation of UI primitives and cohesive tests

## Summary of Findings
- There's an existing minimal `UserSettings` file used in settings navigation.
- The codebase already contains a `Proflie`/`profileRoutes` API and `notificationRoutes` server-side endpoints for notifications that we can extend.
- FCM push flow plan exists (we will wire to it later). The repo contains a notifications table and routes to fetch and mark notifications.
- There are hints of `Appearance` sub-component usage but not necessarily present; `Appearance` might be missing on the file tree.

## Implementation Plan

### 1) UI Primitives and hooks
- Add `frontend/src/components/ui/ToggleSwitch.js` - accessible toggle used across settings.
- Add `frontend/src/components/navigation/Settings/SettingSection.js` - a wrapper with heading and description.
- Add `frontend/src/hooks/useTheme.js` - provide theme handling for Light/Dark/System and updates to `document.documentElement`.
- Add `frontend/src/services/notificationService.js` (if not already) to provide methods to subscribe/unsubscribe using FCM (see FCM Plan file).

### 2) Appearance Component
- Create `frontend/src/components/navigation/Settings/Appearance.js`:
  - Provide three radio toggles or segmented control: Light / Dark / System.
  - Use `useTheme` to apply changes immediately.
  - Persist to backend using `PUT /api/profile/:uid` (we'll update API if needed) or `POST /api/profile/preferences`.
  - Provide a small preview box that demonstrates the chosen theme.

### 3) Push Notification Toggle
- Create `frontend/src/components/navigation/Settings/PushNotificationsToggle.js`:
  - Query current permission (Notification.permission or via `messaging.getToken()` if using FCM).
  - Implement `subscribeToFCM()` and `unsubscribeFromFCM()` behaviors that register/unregister the token and call backend endpoints.
  - Add helper copy that communicates what the toggle does and how to re-enable if blocked by the browser.
  - Add small test button for admins to send a test notification (`/api/notifications/test` endpoint).

### 4) UserSettings Layout & Integration
- Rework `UserSettings` into a two-column layout:
  - Left: Sidebar list of settings (General, Appearance, Notifications, Account, Privacy)
  - Right: Content — `SettingSection` components with the UI for each setting
- For `Appearance` and `PushNotificationsToggle`, allow toggle only when feature is enabled and browser supports push.
- Use `notify?.push()` to show success/failure messages.

### 5) Backend Persistence & API
- If `user_profiles` has a `settings` JSON field (or similar), persist theme and notification preference there; if not, add `settings JSON` column via migration:
  - `backend/migrations/xxxx_add_user_profile_settings_column.sql` (create or update `user_profiles.settings` JSON or `profile_settings` table)
- Persist theme: `PUT /api/profile/:uid` or a new endpoint to update `profile.settings`.
- Persist push preference: set a boolean `settings.push_notifications_enabled` and use `notifications` table for tokens.

### 6) Tests & QA
- Frontend:
  - Unit tests for `ToggleSwitch`, `Appearance`, and `PushNotificationsToggle`.
  - Mock `notificationService` for subscription flows and assert appropriate API calls are made.
  - E2E flow to toggle theme, refresh, and confirm theme persisted.
- Backend:
  - Add migration tests and API tests to `profileRoutes` that store and return `settings` properly.
  - Tests for subscribe/unsubscribe endpoints (auth required) to ensure token insertion/deletion works.

### 7) Accessibility & UX
- `ToggleSwitch` uses `role="switch"`, `aria-checked` and supports keyboard interaction.
- Use `aria-describedby` to include helper copy and `aria-live` for confirmations.
- Provide fallback messaging for browsers that do not support push. Provide links on how to reenable browser permissions if blocked.

### 8) Files to Add/Modify
- Add:
  - `frontend/src/components/ui/ToggleSwitch.js` (new)
  - `frontend/src/components/navigation/Settings/SettingSection.js` (new)
  - `frontend/src/components/navigation/Settings/Appearance.js` (new)
  - `frontend/src/components/navigation/Settings/PushNotificationsToggle.js` (new)
  - `frontend/src/hooks/useTheme.js` (new)
  - `frontend/src/services/notificationService.js` (or update existing)
- Modify:
  - `frontend/src/components/navigation/Settings/UserSettings.js` (refactor)
  - `backend/routes/profileRoutes.js` (persist `settings` in `user_profiles`)
  - `PRODUCTION_DEPLOYMENT_GUIDE.md` (document FCM keys / theme changes if necessary)

### 9) Acceptance Criteria
- The `User Settings` page includes `Appearance` and `Notifications` sections that function and are accessible.
- Theme can be set to Light, Dark, System, and persists between sessions across devices.
- Push toggle subscribes/unsubscribes tokens to backend; subscribing must call the FCM flow to register a token.
- Admin test notification endpoint is available and works for a `testNotification` flow.
- Tests are included and pass; documentation is updated.

## Sanity Checklist & Next Steps
- Which is preferred for storing theme: (A) `user_profiles.settings` as JSON or (B) localStorage only? (A recommended for cross-device). Please confirm.
- I can start with the frontend changes first (UI + toggle + theme hook) and then add backend persist and token flow, or do both incrementally in a single PR.

---

Would you like me to implement the frontend refactor (components & UI) first or the full stack integration (frontend + backend migrations + token repository + fcm service) in a single PR?

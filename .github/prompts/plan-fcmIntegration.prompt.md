# FCM Web Push Integration Plan

TL;DR: Add Firebase Cloud Messaging to the web application (service worker + subscription UI) and backend support (token DB, FCM service, endpoints) to deliver push notifications for events such as waitlist promotions, event cancellations, and updates.

## Goal
Implement web push notifications for Vaulteer using Firebase Cloud Messaging. Provide a frontend toggle for users to opt-in/out, a service worker, and server-side handling to persist and send FCM tokens. Integrate notifications with event flows (e.g., waitlist promotion) and provide admin/test endpoints for QA.

## Summary of Current Findings
- The repository already contains event flows that determine promotions from the waitlist (`registerParticipant`, `promoteFromWaitlist`, `cancelParticipation`). These are good integration points to send notifications.
- The backend includes middleware for authentication (`authenticate`) and role authorization; these will be used to protect subscription endpoints.
- There's already a `gamificationService` and `notify` hooks in frontend; we can complement these with push notifications.

## Implementation Plan

### 1) Database & Repository (backend)
- Add migration `backend/migrations/xxxx_create_notification_tokens_table.sql` with:
  - fields: `id`, `user_id`, `token`, `platform` (web/android/ios), `created_at`, `last_active_at`, `is_active`
  - unique index on `token`.
- Create `backend/repositories/notificationRepository.js` with methods:
  - `saveToken(userId, token, platform)`
  - `removeToken(userId, token)`
  - `getTokensByUser(userId)`
  - `deactivateToken(token)`
  - `cleanupInvalidTokens()`

### 2) Backend FCM Service
- Add `backend/services/fcmService.js` to initialize Firebase Admin and send messages:
  - Initialize admin with service account env vars.
  - `sendToUser(userId, payload)` — fetch tokens from repository, call `sendMulticast`.
  - `cleanInvalidTokens(response, userId)` — remove invalid tokens based on response errors.
  - `sendToTokens(tokens, message)` helper.

### 3) Backend Controller & Routes
- Add `backend/controllers/notificationsController.js`:
  - `subscribe(req, res)`: save token tied to `req.currentUserId`.
  - `unsubscribe(req, res)`: remove token.
  - `testNotification(req, res)`: admin route for testing.
- Add `backend/routes/notificationsRoutes.js` and register in `server.js`/router.
- Use `authenticate` to link tokens to authenticated users.

### 4) Integrate Notifications into Event Flows
- In `backend/controllers/eventsController.js` or `eventRepository.promoteFromWaitlist`:
  - When `promotedParticipant` is returned, call `fcmService.sendToUser(promotedParticipant.user_id, payload)` with payload containing title, body, and `url` to event details.
  - Keep existing gamification and in-app notifications as well.

### 5) Frontend Service Worker & Client
- Add `public/firebase-messaging-sw.js` to handle background messages and clicks. Example behaviors:
  - `onBackgroundMessage()` to show notifications.
  - `notificationclick` opens event URL or routes accordingly.
- Create `frontend/src/services/notificationService.js`:
  - `subscribeToFCM()` registers SW, asks permission, calls `messaging.getToken({ vapidKey })`, posts token to backend.
  - `unsubscribeFromFCM()` calls backend to remove token and `messaging.deleteToken()`.
  - Helpers: check permission, get current token, refresh token.

### 6) Frontend UI: Toggle & Settings
- Add `frontend/src/components/settings/PushNotificationsToggle.js` UI component:
  - Show current subscription / permission state.
  - On toggle, call `subscribeToFCM()` / `unsubscribeFromFCM()`.
  - Show friendly text: "Notifications: Waitlist promotions and event updates" and provide link to Notification Settings.
- Integrate toggle into existing settings page or `AccountSettings` route.

### 7) Config & Env Variables
- Add env vars to `backend/config/env.js` and frontend `frontend/config/config.js`:
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_VAPID_KEY`.
- Document how to obtain service account and VAPID keys in `PRODUCTION_DEPLOYMENT_GUIDE.md`.

### 8) Tests & QA
- Backend tests:
  - Repository tests for saving/removing/getting tokens.
  - Unit tests for `fcmService.sendToUser()` and handling failure/error responses.
  - Integration test for subscribe/unsubscribe endpoints requiring auth.
- Frontend tests:
  - Mock firebase messaging SDK to test subscribe/unsubscribe flows.
  - Ensure service worker registration occurs successfully.
- Manual QA checklist:
  - Subscribe from browser; token appears in DB with correct user.
  - Simulate promotion: send test notification to user or use admin `testNotification` endpoint.
  - Confirm notification is delivered while browser is closed and click opens event details.
  - Confirm unsubscribing removes token from DB.

### 9) Security & Privacy
- Only authenticated users can subscribe and manage tokens.
- Tokens are tied to `user_id` and are unique; multiple tokens allowed for multi-device support.
- Protect private keys and service account credentials; load from environment variables.
- Provide UI and messaging for users about what notifications they will receive; provide opt-out.
- Clean up invalid tokens returned by FCM; do not spam.

### 10) Acceptance Criteria
- Users can enable/disable push in Settings; tokens saved in DB.
- Waitlist promotion triggers an FCM message to promoted user.
- Service worker displays background notifications, and click routes to event details.
- Backend cleans up invalid tokens and handles failure responses gracefully.
- Subscribe/unsubscribe endpoints are protected and validated.

### Files to Add/Modify
- Add:
  - `backend/migrations/xxxx_create_notification_tokens_table.sql`
  - `backend/repositories/notificationRepository.js`
  - `backend/services/fcmService.js`
  - `backend/controllers/notificationsController.js`
  - `backend/routes/notificationsRoutes.js`
  - `public/firebase-messaging-sw.js`
  - `frontend/src/services/notificationService.js`
  - `frontend/src/components/settings/PushNotificationsToggle.js`
- Modify:
  - `backend/controllers/eventsController.js` (call `fcmService` on promotion)
  - `backend/server.js` (register notifications route)
  - `frontend/config/config.js` (add FCM-related env entries)
  - `PRODUCTION_DEPLOYMENT_GUIDE.md` and `INSTALL.md` (document credentials and migration steps)

## Timeline & PR plan
1. Phase 1 (1–2 days): create DB migration, repository, and basic fcmService, plus routes & basic tests.
2. Phase 2 (1–2 days): integrate `sendToUser` on event promotion; add cleanup logic & unit tests.
3. Phase 3 (1–2 days): frontend SW + `notificationService` and `PushNotificationsToggle` UI.
4. Phase 4 (0.5 day): finalize tests, docs, and PR; add admin `testNotification` endpoint for QA.

PR details
- Branch: `feature/fcm-push` or similar
- PR description: Summary, screenshot of toggle UI, env changes, migration, and test instructions
- CI: run tests and build steps; verify in demo/staging environment

---

Would you like me to start with Phase 1 (backend migration + repository + service + routes), Phase 3 (frontend SW + subscription UI), or create a complete PR covering all phases incrementally?

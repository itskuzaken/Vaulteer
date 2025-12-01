## Plan: Notify All Users When Events or Announcements Are Published (In-App + Push Notifications)

Add automatic notifications to all active users when an event is published or a new announcement is posted. Users will receive:
1. **In-app notifications** in their NotificationBell dropdown with clickable links
2. **Push notifications** (FCM) if enabled in their user settings

### Steps

#### Backend: Database & Repository

1. **Create new `user_settings` table** (new migration: `20251130_create_user_settings.sql`)
   - Create dedicated table for user settings instead of JSON column:
     ```sql
     CREATE TABLE user_settings (
       setting_id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL UNIQUE,
       theme ENUM('light', 'dark', 'system') DEFAULT 'system',
       push_notifications_enabled BOOLEAN DEFAULT FALSE,
       fcm_token VARCHAR(500) DEFAULT NULL,
       email_notifications_enabled BOOLEAN DEFAULT TRUE,
       language VARCHAR(10) DEFAULT 'en',
       timezone VARCHAR(50) DEFAULT 'UTC',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
       INDEX idx_user_id (user_id),
       INDEX idx_push_enabled (push_notifications_enabled),
       INDEX idx_fcm_token (fcm_token(255))
     );
     ```
   - Benefits: Better indexing, easier querying, type safety, no JSON parsing overhead

2. **Create user settings repository** [`backend/repositories/userSettingsRepository.js`]
   - Create `getUserSettings(userId)` - Fetch settings for a user
   - Create `updateUserSettings(userId, settings)` - Update settings
   - Create `upsertUserSettings(userId, settings)` - Create or update settings
   - Create `saveFcmToken(userId, fcmToken)` - Save FCM token
   - Create `removeFcmToken(userId)` - Remove invalid/expired token
   - Create `getUsersWithPushEnabled()` - Fetch users with push enabled and valid FCM tokens
     - Returns array: `[{ user_id, fcm_token, theme, language }, ...]`
   - Create `initializeDefaultSettings(userId)` - Create default settings for new users

3. **Add user fetching methods in [`backend/repositories/userRepository.js`](c:\Users\Kuzaken\RedVault\backend\repositories\userRepository.js)**
   - Create `getAllActiveUsers()` to fetch `user_id` for all users with `status = 'active'`
   - Optionally add `getActiveUsersByRole(role)` for role-specific targeting
   - Return array of user IDs for bulk operations

#### Backend: Notification Service

4. **Add Firebase Cloud Messaging (FCM) integration in [`backend/services/notificationService.js`](c:\Users\Kuzaken\RedVault\backend\services\notificationService.js)**
   - Import Firebase Admin SDK and initialize with service account
   - Create `sendPushNotification(fcmToken, { title, body, data })` helper function
   - Create `sendBulkPushNotifications(tokens, notification)` using FCM `sendEachForMulticast()` for batches
   - Handle invalid tokens:
     - On error, call `userSettingsRepository.removeFcmToken(userId)` to clear invalid token
     - Log failed tokens for monitoring

5. **Add bulk notification functions in [`backend/services/notificationService.js`](c:\Users\Kuzaken\RedVault\backend\services\notificationService.js)**
   - Create `createBulkNotifications(userIds, { title, message, type, actionUrl, metadata })` function
     - Use batched INSERT queries for performance (chunks of 100-500)
     - Insert in-app notifications to database
   - Create `notifyEventPublished(event)` specialized helper:
     - Fetch all active users via `userRepository.getAllActiveUsers()` for in-app notifications
     - Fetch push-enabled users via `userSettingsRepository.getUsersWithPushEnabled()` for FCM
     - Create in-app notifications for all active users
     - Send push notifications to users with FCM tokens
     - Run FCM in parallel with in-app creation using `Promise.allSettled()`
   - Create `notifyAnnouncementPublished(post)` specialized helper:
     - Same pattern as events
     - Differentiate message based on `post_type`
   - Export new functions in module.exports

#### Backend: Settings API Routes

6. **Create/Update user settings API routes** [`backend/routes/userSettingsRoutes.js`]
   - `GET /api/users/:uid/settings` - Get user settings (return defaults if not exists)
   - `PUT /api/users/:uid/settings` - Update user settings (upsert)
   - `POST /api/users/:uid/settings/fcm-token` - Save FCM token
   - `DELETE /api/users/:uid/settings/fcm-token` - Remove FCM token
   - Integrate with existing profile routes or create new settings routes
   - Ensure authentication middleware protects all routes

#### Backend: Controller Integration

7. **Integrate notifications in [`backend/controllers/eventsController.js`](c:\Users\Kuzaken\RedVault\backend\controllers\eventsController.js)**
   - In `publishEvent()` after successful event publishing
   - Call `notificationService.notifyEventPublished()` with event details
   - Include `actionUrl` pointing to `/dashboard?content=event&eventUid=${event.uid}`
   - Use try-catch to prevent notification failures from blocking event publication

8. **Integrate notifications in [`backend/controllers/postsController.js`](c:\Users\Kuzaken\RedVault\backend\controllers\postsController.js)**
   - In `publishPost()` after successful post publishing (line ~340)
   - Call `notificationService.notifyAnnouncementPublished()` with post details
   - Differentiate notification based on `post_type` (news_update vs announcement)
   - Include `actionUrl` pointing to `/dashboard?content=post&postUid=${post.uid}`
   - Use try-catch to prevent notification failures from blocking post publication

#### Frontend: Settings Service

9. **Create user settings service** [`frontend/src/services/userSettingsService.js`]
   - `getUserSettings(uid)` - Fetch user settings from API
   - `updateUserSettings(uid, settings)` - Update settings via API
   - `saveFcmToken(uid, token)` - POST FCM token to backend
   - `removeFcmToken(uid)` - DELETE FCM token from backend
   - Use Firebase auth to get ID token for authenticated requests

#### Frontend: FCM Token Management

10. **Create Firebase Messaging service** [`frontend/src/services/firebaseMessaging.js`]
    - Initialize Firebase Messaging SDK
    - Create `requestNotificationPermission()` to request browser permission
    - Create `getDeviceToken()` to retrieve FCM token
    - Create `registerFcmToken()` to save token via `userSettingsService.saveFcmToken()`
    - Handle token refresh with `onTokenRefresh()` listener (auto-update backend)
    - Handle foreground messages with `onMessage()` listener (show toast using NotificationProvider)

11. **Add FCM token registration in user settings page**
    - When user enables push notifications in settings:
      - Request browser notification permission
      - Retrieve FCM token
      - Call `userSettingsService.saveFcmToken()` to save to `user_settings.fcm_token`
      - Update local settings state
    - When user disables push notifications:
      - Call `userSettingsService.updateUserSettings()` with `push_notifications_enabled: false`
      - Optionally call `userSettingsService.removeFcmToken()` to delete token

12. **Create service worker for background push notifications**
    - Create `public/firebase-messaging-sw.js` service worker
    - Handle background messages when app is not in focus
    - Show notification using `registration.showNotification()`
    - Handle notification click to open app at `actionUrl`
    - Register service worker in app initialization

#### Frontend: Settings UI

13. **Update settings UI to include push notification toggle**
    - Add toggle switch for "Push Notifications"
    - Show permission status (granted/denied/default)
    - Show helpful message if permission denied (how to re-enable in browser)
    - Add "Test Notification" button for debugging (calls backend test endpoint)
    - Display FCM token registration status indicator
    - Show error states clearly (token fetch failed, API save failed)
    - Handle re-prompting gracefully if permission was previously denied

### Further Considerations

1. **Performance optimization** 
   - For user bases > 500, should bulk notifications run as a background job or remain synchronous? 
   - FCM supports sending to 500 tokens per batch - implement chunking
   - (Recommend: start synchronous with batched inserts/sends, migrate to job queue if needed)

2. **Target audience filtering** 
   - Should events notify all users or only specific roles (e.g., volunteers only)? 
   - Should announcements always notify everyone? 
   - (Recommend: both notify all active users initially, add role filtering as enhancement)

3. **Notification deduplication** 
   - Should we track which users already received notifications about a specific event/post to prevent re-notification if republished? 
   - (Recommend: not needed for MVP, add `broadcast_id` or `source_type/source_id` columns later for tracking)

4. **Push notification error handling**
   - Invalid/expired FCM tokens should be automatically removed from user settings
   - Track delivery failures for analytics
   - Implement retry logic for transient failures
   - Handle permission denied gracefully in frontend

5. **Browser compatibility & fallbacks**
   - Push notifications only work in supported browsers (Chrome, Firefox, Edge, Safari 16+)
   - Show clear messaging if browser doesn't support push
   - Fallback to in-app notifications always available
   - Service worker requires HTTPS (except localhost)

6. **Testing strategy**
   - Test with multiple devices/browsers
   - Test foreground vs background message handling
   - Test token refresh scenarios
   - Test with notifications disabled/enabled
   - Test with large user counts (performance)

7. **Firebase Admin SDK setup**
   - Ensure `backend/firebase-service-account.json` has Cloud Messaging permissions
   - Initialize Firebase Admin SDK once at app startup
   - Use singleton pattern to avoid multiple initializations

8. **Privacy & compliance**
   - Add notification permission explanation to users
   - Allow users to easily disable push notifications
   - Consider GDPR compliance for storing FCM tokens
   - Add privacy policy section about push notifications

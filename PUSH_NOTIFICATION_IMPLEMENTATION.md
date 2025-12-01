# Push Notification Implementation Guide

## Overview
This document describes the complete implementation of push notifications for events and announcements in the Vaulteer application. The system uses Firebase Cloud Messaging (FCM) to send push notifications to users who have enabled them in their settings.

## Architecture

### Components
1. **Backend**: Node.js/Express with Firebase Admin SDK for sending notifications
2. **Frontend**: Next.js with Firebase Client SDK for receiving notifications
3. **Database**: MySQL with `user_settings` table for storing user preferences and FCM tokens
4. **Service Worker**: `firebase-messaging-sw.js` for handling background notifications

### Notification Flow
```
Event/Post Published
    ↓
Controller (eventsController/postsController)
    ↓
notificationService.notifyEventPublished/notifyAnnouncementPublished()
    ↓
Parallel Execution:
    ├─ createBulkNotifications() → Database (in-app notifications)
    └─ sendBulkPushNotifications() → FCM → User devices
```

## Database Schema

### user_settings Table
Created by migration: `backend/migrations/20251130_create_user_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT PRIMARY KEY,
  theme ENUM('light', 'dark', 'system') DEFAULT 'system',
  push_notifications_enabled BOOLEAN DEFAULT FALSE,
  fcm_token VARCHAR(500) DEFAULT NULL,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_settings_push_enabled ON user_settings(push_notifications_enabled);
CREATE INDEX idx_user_settings_fcm_token ON user_settings(fcm_token);
```

## Backend Implementation

### 1. User Settings Repository
**File**: `backend/repositories/userSettingsRepository.js`

**Functions**:
- `getUserSettings(userId)` - Get user settings by user ID
- `updateUserSettings(userId, settings)` - Update existing settings
- `upsertUserSettings(userId, settings)` - Create or update settings
- `saveFcmToken(userId, fcmToken)` - Save FCM token and enable push
- `removeFcmToken(userId)` - Remove FCM token and disable push
- `getUsersWithPushEnabled()` - Get all users with push enabled
- `initializeDefaultSettings(userId)` - Create default settings for new user
- `removeFcmTokenByValue(fcmToken)` - Remove specific FCM token (cleanup)

### 2. User Repository Enhancements
**File**: `backend/repositories/userRepository.js`

**New Functions**:
- `getAllActiveUsers()` - Get all active user IDs
- `getActiveUsersByRole(role)` - Get active users filtered by role

### 3. Notification Service
**File**: `backend/services/notificationService.js`

**Firebase Admin SDK Integration**:
```javascript
const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();
```

**Key Functions**:
- `sendPushNotification(fcmToken, notification)` - Send single push notification
- `sendBulkPushNotifications(tokens, notification)` - Send to multiple users (batched)
- `createBulkNotifications(notifications)` - Insert in-app notifications (batched)
- `notifyEventPublished(event)` - Notify all users about new event
- `notifyAnnouncementPublished(post)` - Notify all users about new announcement

**Batching Strategy**:
- Both database inserts and FCM sends use 500-item chunks
- Invalid FCM tokens are automatically removed from database
- Errors don't block event/post publishing

### 4. API Routes
**File**: `backend/routes/userSettingsRoutes.js`

**Endpoints**:
- `GET /api/users/:uid/settings` - Get user settings
- `PUT /api/users/:uid/settings` - Update user settings
- `POST /api/users/:uid/settings/fcm-token` - Save FCM token (enables push)
- `DELETE /api/users/:uid/settings/fcm-token` - Remove FCM token (disables push)

### 5. Controller Integration

**Events Controller** (`backend/controllers/eventsController.js`):
```javascript
async function publishEvent(req, res) {
  // ... publish event logic ...
  
  try {
    await notificationService.notifyEventPublished(event);
  } catch (error) {
    console.error("Error sending notifications:", error);
    // Don't block publishing on notification failure
  }
}
```

**Posts Controller** (`backend/controllers/postsController.js`):
```javascript
async function publishPost(req, res) {
  // ... publish post logic ...
  
  try {
    await notificationService.notifyAnnouncementPublished(updatedPost);
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
}
```

## Frontend Implementation

### 1. User Settings Service
**File**: `frontend/src/services/userSettingsService.js`

**Functions**:
- `getUserSettings(uid)` - Fetch user settings from API
- `updateUserSettings(uid, settings)` - Update settings via API
- `saveFcmToken(uid, fcmToken)` - Register FCM token with backend
- `removeFcmToken(uid)` - Remove FCM token from backend

### 2. Firebase Messaging Service
**File**: `frontend/src/services/firebaseMessaging.js`

**Key Functions**:
- `initializeMessaging()` - Initialize Firebase Messaging SDK
- `isPushNotificationSupported()` - Check browser support
- `requestNotificationPermission()` - Request browser permission
- `getDeviceToken()` - Get FCM token from service worker
- `registerFcmToken(uid)` - Complete registration flow
- `enablePushNotifications(uid)` - Full enable flow
- `setupForegroundMessageHandler(callback)` - Handle foreground notifications
- `handleTokenRefresh(uid)` - Re-register on token refresh
- `testPushNotification()` - Send test notification

**Token Retrieval**:
```javascript
const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
const token = await getToken(messaging, {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  serviceWorkerRegistration: registration,
});
```

### 3. Service Worker
**File**: `frontend/public/firebase-messaging-sw.js`

**Functionality**:
- Loads Firebase config from `/api/firebase-config` endpoint
- Handles background push notifications when app not in focus
- Shows native browser notifications
- Handles notification clicks (opens/focuses app window)
- Navigates to appropriate page based on notification data

**Configuration Loading**:
```javascript
importScripts('/api/firebase-config');
const firebaseConfig = self.firebaseConfig;
firebase.initializeApp(firebaseConfig);
```

### 4. Firebase Config API
**File**: `frontend/src/app/api/firebase-config/route.js`

Generates JavaScript file with Firebase config from environment variables for service worker consumption.

### 5. Settings UI Component
**File**: `frontend/src/components/navigation/Settings/PushNotificationsToggle.js`

**Features**:
- Toggle switch for enabling/disabling push notifications
- Permission status display (granted/denied/default)
- Test notification button
- Error messages and instructions
- Help text for re-enabling blocked permissions
- Real-time status updates

**User Flow**:
1. User toggles push notifications ON
2. Browser permission prompt appears
3. If granted: Get FCM token from service worker
4. Register token with backend
5. Setup foreground message handler
6. Show success message

### 6. Dashboard Integration

**Volunteer Dashboard** (`frontend/src/app/dashboard/volunteer/_components/VolunteerDashboardPage.js`):
- Added UserSettings to main routes
- Configured settingsRoute for navigation

**Admin & Staff Dashboards**:
- Already have UserSettings integrated
- Available via user menu → Settings

## Environment Variables

### Backend
```env
# Firebase Admin SDK uses service account JSON file
# Located at: backend/firebase-service-account.json
```

### Frontend
```env
# Firebase Client SDK configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# VAPID key for web push (from Firebase Console > Project Settings > Cloud Messaging)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

## Setup Instructions

### 1. Backend Setup

1. **Run Database Migration**:
   ```bash
   cd backend
   node run-migration.js migrations/20251130_create_user_settings.sql
   ```

2. **Configure Firebase Admin SDK**:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate new private key
   - Save as `backend/firebase-service-account.json`

3. **Install Dependencies** (if needed):
   ```bash
   npm install firebase-admin
   ```

### 2. Frontend Setup

1. **Set Environment Variables**:
   Create or update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
   ```

2. **Generate VAPID Key** (if you don't have one):
   - Go to Firebase Console
   - Project Settings > Cloud Messaging
   - Under "Web Push certificates", click "Generate key pair"
   - Copy the key to NEXT_PUBLIC_FIREBASE_VAPID_KEY

3. **Install Dependencies** (if needed):
   ```bash
   npm install firebase
   ```

### 3. Testing

1. **Test Event Notification**:
   - Login as admin/staff
   - Create and publish an event
   - All users with push enabled should receive notification

2. **Test Announcement Notification**:
   - Login as admin/staff
   - Create and publish an announcement
   - All users with push enabled should receive notification

3. **Test User Settings**:
   - Login as any user
   - Go to Settings (user menu → Settings)
   - Toggle push notifications
   - Grant browser permission when prompted
   - Click "Send Test Notification"
   - Verify notification appears

## Notification Types

### Event Notification
- **Title**: 📅 New Event: {event_title}
- **Body**: {event_description}
- **Icon**: Event icon
- **Action**: Navigate to event details
- **Source Type**: `event_published`

### Announcement Notification
- **Title**: 📢 New Announcement: {post_title}
- **Body**: {post_excerpt}
- **Icon**: Announcement icon
- **Action**: Navigate to announcement
- **Source Type**: `announcement_published`

### News Update Notification
- **Title**: 📰 News Update: {post_title}
- **Body**: {post_excerpt}
- **Icon**: News icon
- **Action**: Navigate to news article
- **Source Type**: `news_update_published`

## Error Handling

### Invalid FCM Tokens
- Automatically detected on send failure
- Removed from database via `removeFcmTokenByValue()`
- Error codes handled: `messaging/invalid-registration-token`, `messaging/registration-token-not-registered`

### Permission Denied
- UI shows instructions for re-enabling
- Toggle remains disabled
- Status message explains the issue

### Service Worker Errors
- Fallback config used if API fails
- Clear error messages in console
- Service worker installation retried automatically

## Performance Considerations

### Batching
- Database inserts: 500 notifications per batch
- FCM sends: 500 tokens per multicast batch
- Prevents memory issues with large user bases

### Parallel Execution
- In-app and push notifications created in parallel
- Uses `Promise.allSettled()` to prevent blocking

### Non-Blocking
- Notification failures don't block event/post publishing
- Wrapped in try-catch with error logging

## Browser Compatibility

### Supported Browsers
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: iOS 16.4+, macOS 13+ only
- Opera: Full support

### Requirements
- HTTPS (or localhost for development)
- Service Worker support
- Notification API support
- Push API support

## Security Considerations

### FCM Tokens
- Stored securely in database
- Removed on user logout
- Automatically cleaned up on errors
- Associated with user ID for access control

### API Endpoints
- Require Firebase authentication
- User can only modify own settings
- UID from Firebase token used for authorization

### Service Worker
- Served over HTTPS in production
- Config loaded from secure API endpoint
- No sensitive data in service worker code

## Troubleshooting

### Push Notifications Not Received
1. Check browser permission status
2. Verify FCM token registered in database
3. Check Firebase Admin SDK credentials
4. Verify VAPID key is correct
5. Check browser console for errors

### Service Worker Not Loading
1. Verify file at `/firebase-messaging-sw.js`
2. Check for JavaScript errors
3. Ensure HTTPS or localhost
4. Clear service worker cache
5. Check `/api/firebase-config` returns valid config

### Notifications Blocked
1. User must manually enable in browser settings
2. Cannot be programmatically re-enabled
3. UI shows instructions for manual re-enable

## Future Enhancements

### Planned Features
- [ ] Notification preferences per type (events, announcements, etc.)
- [ ] Quiet hours / Do Not Disturb schedule
- [ ] Email notifications (already has backend support)
- [ ] Notification history page
- [ ] Mark all as read functionality
- [ ] Rich notifications with action buttons

### Potential Improvements
- [ ] Web Push Protocol fallback for Safari
- [ ] Progressive Web App (PWA) manifest
- [ ] Background sync for offline notification delivery
- [ ] Analytics for notification delivery rates
- [ ] A/B testing for notification content

## References

### Documentation
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### Related Files
- Backend: `backend/services/notificationService.js`
- Frontend: `frontend/src/services/firebaseMessaging.js`
- UI: `frontend/src/components/navigation/Settings/PushNotificationsToggle.js`
- Service Worker: `frontend/public/firebase-messaging-sw.js`

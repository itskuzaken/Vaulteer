# User Settings Database Integration

## Overview

The User Settings feature is now fully integrated with the database. All user preferences are automatically synced to the backend and persist across devices and sessions.

## Architecture

### Database Schema

Table: `user_settings`

```sql
CREATE TABLE `user_settings` (
  `setting_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `theme` enum('light','dark','system') DEFAULT 'system',
  `push_notifications_enabled` tinyint(1) DEFAULT '0',
  `fcm_token` varchar(500) DEFAULT NULL,
  `email_notifications_enabled` tinyint(1) DEFAULT '1',
  `language` varchar(10) DEFAULT 'en',
  `timezone` varchar(50) DEFAULT 'UTC',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);
```

### Backend API Endpoints

**Base URL**: `/api/users/:uid/settings`

#### 1. Get User Settings
```
GET /api/users/:uid/settings
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settings": {
      "theme": "dark",
      "pushNotificationsEnabled": true,
      "emailNotificationsEnabled": true,
      "language": "en",
      "timezone": "UTC"
    }
  }
}
```

#### 2. Update User Settings
```
PUT /api/users/:uid/settings
```

**Request Body**:
```json
{
  "theme": "dark",
  "pushNotificationsEnabled": true,
  "emailNotificationsEnabled": false,
  "language": "es",
  "timezone": "America/New_York"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": { /* updated settings */ }
  }
}
```

#### 3. Save FCM Token
```
POST /api/users/:uid/settings/fcm-token
```

**Request Body**:
```json
{
  "fcmToken": "firebase-device-token-here"
}
```

#### 4. Remove FCM Token
```
DELETE /api/users/:uid/settings/fcm-token
```

### Frontend Components

#### 1. **Appearance.js**
- **Purpose**: Theme selection (light/dark/system)
- **Database Field**: `theme`
- **Features**:
  - Syncs theme preference to database on change
  - Loads saved theme on mount
  - Shows loading states during sync
  - Falls back to localStorage if user not logged in

#### 2. **PushNotificationsToggle.js**
- **Purpose**: Enable/disable browser push notifications
- **Database Fields**: `push_notifications_enabled`, `fcm_token`
- **Features**:
  - Requests browser notification permission
  - Registers device FCM token with backend
  - Sends test notifications
  - Handles permission denied scenarios

#### 3. **EmailNotificationsToggle.js**
- **Purpose**: Enable/disable email notifications
- **Database Field**: `email_notifications_enabled`
- **Features**:
  - Simple toggle for email preferences
  - Updates database on change
  - Shows success/error feedback

#### 4. **LanguageAndRegion.js**
- **Purpose**: Language and timezone preferences
- **Database Fields**: `language`, `timezone`
- **Features**:
  - Language selection (8 languages supported)
  - Timezone selection (15 major timezones)
  - Auto-saves on change

### Services

#### userSettingsService.js

```javascript
// Get user settings
await getUserSettings(uid);

// Update settings
await updateUserSettings(uid, {
  theme: 'dark',
  language: 'en',
  timezone: 'UTC'
});

// Save FCM token
await saveFcmToken(uid, token);

// Remove FCM token
await removeFcmToken(uid);
```

## Data Flow

### 1. Settings Load on Page Mount
```
User logs in 
  → Component mounts
  → Checks Firebase auth state
  → Fetches settings from `/api/users/:uid/settings`
  → Updates local state
  → Applies settings (theme, etc.)
```

### 2. Settings Update
```
User changes setting
  → Update local state immediately (responsive UI)
  → Send PUT request to backend
  → Backend updates database
  → Backend returns updated settings
  → Show success feedback
```

### 3. Cross-Device Sync
```
User changes settings on Device A
  → Database updated
User logs in on Device B
  → Settings loaded from database
  → Device B shows same settings as Device A
```

## Default Values

If a user has no settings record in the database, the following defaults are used:

```json
{
  "theme": "system",
  "pushNotificationsEnabled": false,
  "emailNotificationsEnabled": true,
  "language": "en",
  "timezone": "UTC"
}
```

## Error Handling

### 1. Database Errors
- Settings fail to load → Use local defaults
- Settings fail to save → Show error message, keep local state
- User not found → Return 404 error

### 2. Authentication Errors
- User not logged in → Settings stored only in localStorage (not synced)
- Invalid Firebase token → Return 401 error

### 3. Browser Compatibility
- Push notifications not supported → Hide toggle, show message
- Notification permission denied → Show instructions to enable

## Testing the Integration

### Manual Testing Checklist

1. **Theme Settings**:
   - [ ] Change theme to light, verify it saves to database
   - [ ] Change theme to dark, verify it saves to database
   - [ ] Change theme to system, verify it saves to database
   - [ ] Logout and login, verify theme persists
   - [ ] Login from different device, verify theme syncs

2. **Push Notifications**:
   - [ ] Enable push notifications, verify FCM token saved
   - [ ] Send test notification, verify it appears
   - [ ] Disable push notifications, verify token removed
   - [ ] Login from different device, verify push state syncs

3. **Email Notifications**:
   - [ ] Enable email notifications, verify database update
   - [ ] Disable email notifications, verify database update
   - [ ] Login from different device, verify email state syncs

4. **Language & Region**:
   - [ ] Change language, verify database update
   - [ ] Change timezone, verify database update
   - [ ] Login from different device, verify settings sync

### Database Verification

Check the `user_settings` table after making changes:

```sql
SELECT * FROM user_settings WHERE user_id = YOUR_USER_ID;
```

Expected output after changing settings:
```
+------------+---------+--------+----------------------------+-----------+-----------------------------+----------+------------------+
| setting_id | user_id | theme  | push_notifications_enabled | fcm_token | email_notifications_enabled | language | timezone         |
+------------+---------+--------+----------------------------+-----------+-----------------------------+----------+------------------+
| 1          | 123     | dark   | 1                          | abc...xyz | 1                           | en       | America/New_York |
+------------+---------+--------+----------------------------+-----------+-----------------------------+----------+------------------+
```

## Benefits

✅ **Persistent Settings**: Settings saved across sessions and devices
✅ **Automatic Sync**: Changes immediately reflected in database
✅ **Fallback Support**: Works without login using localStorage
✅ **User Experience**: Loading states and success feedback
✅ **Error Handling**: Graceful degradation on failures
✅ **Type Safety**: Database constraints ensure data integrity

## Migration Notes

If you have existing users with settings only in localStorage:

1. Settings will be created in database on first change
2. Old localStorage settings can coexist temporarily
3. Database settings take precedence once created
4. No data loss during migration

## Security

- All endpoints require Firebase authentication
- Users can only access their own settings
- FCM tokens are encrypted in transit
- Database uses foreign key constraints to ensure data integrity

## Performance

- Settings cached in component state to reduce API calls
- Only modified fields sent in update requests
- Database indexes on `user_id` for fast lookups
- Connection pooling for efficient database access

## Future Enhancements

Potential improvements:
- Real-time settings sync using WebSockets
- Settings history/audit log
- Import/export settings functionality
- Settings presets/templates
- Bulk settings management for admins

# Notification System Database Setup

## Quick Setup (2 Commands)

### Option 1: Using npm scripts (Recommended)
```bash
cd backend
npm run migrate:notifications
npm run check:notifications
```

### Option 2: Direct node commands
```bash
cd backend
node migrate.js migrations/20251201_initialize_notification_system.sql
node check-notifications.js
```

### Windows PowerShell
```powershell
cd backend
npm run migrate:notifications
npm run check:notifications
```

## What This Migration Does

### ✅ Creates/Verifies Tables

1. **`notifications` table** - Stores in-app notifications
   - notification_id, user_id, title, message, type
   - is_read, action_url, metadata
   - created_at, read_at
   - Indexes for efficient querying

2. **`user_settings` table** - Stores user preferences
   - setting_id, user_id (unique)
   - theme, language, timezone
   - push_notifications_enabled, fcm_token
   - email_notifications_enabled
   - Indexes for push and email queries

### ✅ Initializes Default Settings

- Creates `user_settings` entries for all existing active users
- Default values:
  - Theme: `system`
  - Push notifications: `FALSE` (disabled by default)
  - Email notifications: `TRUE` (enabled by default)
  - Language: `en`
  - Timezone: `UTC`

### ✅ Adds Missing Indexes

- Ensures all performance indexes exist
- Special indexes for:
  - Push-enabled users lookup
  - Email-enabled users lookup
  - FCM token lookup
  - Unread notifications

### ✅ Verification Queries

The migration runs verification queries to show:
- Total notifications and unread count
- Users with push/email enabled
- Users with FCM tokens
- Sample user settings
- Users without settings (should be 0)

## Expected Output

After running the migration, you should see:

```
✅ Notification system initialized successfully!
Total notifications: X
Total user settings: X
Users with push enabled: X
Users with email enabled: X
```

## Manual Verification

You can manually verify the setup with these queries:

```sql
-- Check notifications table
DESCRIBE notifications;
SELECT COUNT(*) FROM notifications;

-- Check user_settings table
DESCRIBE user_settings;
SELECT COUNT(*) FROM user_settings;

-- Check users with notification preferences
SELECT 
  u.name,
  u.email,
  us.push_notifications_enabled,
  us.email_notifications_enabled,
  CASE WHEN us.fcm_token IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_fcm_token
FROM user_settings us
JOIN users u ON us.user_id = u.user_id
WHERE u.status = 'active'
LIMIT 10;

-- Check for users missing settings
SELECT COUNT(*) as missing_count
FROM users u
WHERE u.status = 'active'
  AND u.user_id NOT IN (SELECT user_id FROM user_settings);
```

## Troubleshooting

### Issue: "Table already exists"
✅ **This is fine!** The migration uses `CREATE TABLE IF NOT EXISTS`, so it won't fail if tables already exist.

### Issue: "Duplicate entry for key 'user_id'"
✅ **This is fine!** The migration uses `INSERT IGNORE`, so it won't fail if user settings already exist.

### Issue: Users missing settings after migration
Run this to add settings for specific users:

```sql
INSERT IGNORE INTO user_settings (user_id, theme, push_notifications_enabled, email_notifications_enabled)
VALUES 
  (YOUR_USER_ID, 'system', FALSE, TRUE);
```

Or for all active users:

```sql
INSERT IGNORE INTO user_settings (user_id, theme, push_notifications_enabled, email_notifications_enabled)
SELECT user_id, 'system', FALSE, TRUE
FROM users
WHERE status = 'active'
  AND user_id NOT IN (SELECT user_id FROM user_settings);
```

## After Setup

Once the migration is complete, the notification system will be fully functional:

### In-App Notifications (Bell Icon)
- All users will receive in-app notifications
- Stored in `notifications` table
- Visible in the bell icon dropdown

### Push Notifications (FCM)
- Users can enable in Settings
- Requires FCM token registration
- Stored in `user_settings.fcm_token`
- Controlled by `push_notifications_enabled` flag

### Email Notifications
- Enabled by default for all users
- Users can disable in Settings
- Controlled by `email_notifications_enabled` flag
- Requires email provider configuration (SendGrid/SES/SMTP)

## Next Steps

1. ✅ Run the migration (above)
2. 🔧 Configure Firebase Admin SDK (for push notifications)
3. 📧 Configure email provider (SendGrid/SES/SMTP)
4. 🧪 Test by publishing an event or announcement
5. 📊 Monitor logs for notification delivery results

See `EMAIL_NOTIFICATION_SETUP.md` for email configuration details.

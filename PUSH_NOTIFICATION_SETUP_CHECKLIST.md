# Push Notification Setup Checklist

## Prerequisites
- [ ] Firebase project created
- [ ] Node.js and npm installed
- [ ] MySQL database running

## Backend Setup

### 1. Database Migration
- [ ] Navigate to backend directory: `cd backend`
- [ ] Run migration: `node run-migration.js migrations/20251130_create_user_settings.sql`
- [ ] Verify table created: `DESCRIBE user_settings;`

### 2. Firebase Admin SDK
- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Navigate to Project Settings > Service Accounts
- [ ] Click "Generate new private key"
- [ ] Save file as `backend/firebase-service-account.json`
- [ ] Verify file exists and is valid JSON

### 3. Backend Dependencies
- [ ] Check firebase-admin installed: `npm list firebase-admin`
- [ ] If not installed: `npm install firebase-admin`

### 4. Test Backend
- [ ] Start backend server: `npm start` or `node server.js`
- [ ] Check for Firebase initialization message in logs
- [ ] Verify no errors related to firebase-service-account.json

## Frontend Setup

### 1. Firebase Configuration
- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Navigate to Project Settings > General
- [ ] Scroll to "Your apps" section
- [ ] Copy Firebase config values

### 2. Environment Variables
Create or update `frontend/.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

- [ ] All Firebase config values added to `.env.local`

### 3. VAPID Key
- [ ] Go to Firebase Console > Project Settings > Cloud Messaging
- [ ] Scroll to "Web Push certificates" section
- [ ] If no key exists, click "Generate key pair"
- [ ] Copy the key value
- [ ] Add to `.env.local`:
  ```env
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
  ```

### 4. Frontend Dependencies
- [ ] Navigate to frontend: `cd frontend`
- [ ] Check firebase installed: `npm list firebase`
- [ ] If not installed: `npm install firebase`

### 5. Build and Start
- [ ] Build frontend: `npm run build`
- [ ] Start frontend: `npm run dev` (development) or `npm start` (production)
- [ ] Verify no build errors

## Verification

### 1. Service Worker
- [ ] Open browser to your app URL
- [ ] Open DevTools > Application > Service Workers
- [ ] Verify `firebase-messaging-sw.js` is registered
- [ ] Check for any errors in the service worker

### 2. Firebase Config API
- [ ] Navigate to: `http://localhost:3000/api/firebase-config` (or your URL)
- [ ] Verify it returns JavaScript with `self.firebaseConfig = {...}`
- [ ] Verify all config values are present (not empty)

### 3. Settings Page
- [ ] Login to application
- [ ] Click user menu (top right)
- [ ] Click "Settings"
- [ ] Verify Settings page loads
- [ ] Locate "Push Notifications" section

### 4. Enable Push Notifications
- [ ] In Settings, toggle "Push Notifications" ON
- [ ] Browser should prompt for permission
- [ ] Click "Allow" in permission prompt
- [ ] Toggle should remain ON
- [ ] Success message should appear

### 5. Test Notification
- [ ] On Settings page, click "Send Test Notification"
- [ ] Notification should appear on your device
- [ ] Verify notification title and body
- [ ] Click notification to verify it opens/focuses the app

### 6. Event Notification Test
- [ ] Login as admin or staff user
- [ ] Navigate to "Manage Events"
- [ ] Create a new event
- [ ] Publish the event
- [ ] Check for notification (may take a few seconds)
- [ ] Verify notification appears for all users with push enabled

### 7. Announcement Notification Test
- [ ] Login as admin or staff user
- [ ] Navigate to "Manage Posts"
- [ ] Create a new announcement
- [ ] Publish the announcement
- [ ] Verify notification appears

## Troubleshooting

### Service Worker Not Found
- [ ] Verify `frontend/public/firebase-messaging-sw.js` exists
- [ ] Check file is being served correctly
- [ ] Clear browser cache and hard reload (Ctrl+Shift+R)

### Permission Denied
- [ ] Check browser notification settings
- [ ] If blocked, provide instructions to user:
  1. Click lock icon in address bar
  2. Find "Notifications" in permissions
  3. Change to "Allow"
  4. Refresh page and try again

### No Notifications Received
- [ ] Check FCM token saved in database:
  ```sql
  SELECT user_id, fcm_token, push_notifications_enabled 
  FROM user_settings 
  WHERE push_notifications_enabled = TRUE;
  ```
- [ ] Verify backend logs for FCM send attempts
- [ ] Check Firebase Console > Cloud Messaging for delivery stats
- [ ] Verify VAPID key is correct

### Firebase Config Not Loading
- [ ] Check `/api/firebase-config` endpoint returns valid JavaScript
- [ ] Verify environment variables are set correctly
- [ ] Restart Next.js dev server after changing .env.local
- [ ] Check browser console for errors

### Database Errors
- [ ] Verify user_settings table exists
- [ ] Check foreign key constraint on user_id
- [ ] Ensure users table has required user records
- [ ] Check database connection in backend

## Production Deployment

### Additional Steps for Production
- [ ] Set environment variables in production hosting (Vercel, AWS, etc.)
- [ ] Ensure HTTPS is enabled (required for push notifications)
- [ ] Update Firebase authorized domains in Firebase Console
- [ ] Test service worker on production domain
- [ ] Monitor Firebase Cloud Messaging quota and usage
- [ ] Set up error logging/monitoring (e.g., Sentry)

### Security Checklist
- [ ] Firebase service account JSON not committed to git
- [ ] Environment variables not exposed in client code
- [ ] API endpoints require authentication
- [ ] FCM tokens secured in database
- [ ] HTTPS enforced for all pages

## Success Criteria
- [ ] Users can enable push notifications from Settings
- [ ] Browser permission prompt appears
- [ ] FCM token saved to database
- [ ] Test notification successfully delivered
- [ ] Event publish triggers notifications to all enabled users
- [ ] Announcement publish triggers notifications to all enabled users
- [ ] Notification click opens/focuses app
- [ ] No console errors during normal operation
- [ ] Settings UI shows correct permission status

## Support Resources

### Documentation
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

### Common Issues
- "Permission denied": User must manually enable in browser settings
- "Service worker not found": Check HTTPS and file location
- "Invalid VAPID key": Regenerate in Firebase Console
- "Token registration failed": Check backend API is running and reachable

---

**Last Updated**: December 2024
**Version**: 1.0

# Plan: Complete Multi-Channel Notification System Integration

Integrate bell notifications (in-app), push notifications (FCM), and email notifications for posts (news & announcements) and events, with full user settings control. Currently, in-app and push are working; email infrastructure needs to be built.

## Steps

### 1. Create email service infrastructure
Build `backend/services/emailService.js` with SendGrid/Nodemailer integration, including initialization, single/bulk email functions, and HTML email templates for event-published and announcement-published notifications.

**Details:**
- Initialize email client (SendGrid or Nodemailer)
- Implement `sendEmail(to, subject, html, text)` for single emails
- Implement `sendBulkEmails(recipients, subject, html, text)` with batching (500/chunk)
- Create email templates:
  - Event published template (HTML + text fallback)
  - Announcement published template (HTML + text fallback)
  - News update published template (HTML + text fallback)
- Include proper error handling and logging
- Support both HTML and plain text versions

### 2. Enhance user settings repository
Add `getUsersWithEmailEnabled()` function to `backend/repositories/userSettingsRepository.js` to fetch users with `email_notifications_enabled=true`, similar to existing `getUsersWithPushEnabled()`.

**Details:**
- Query user_settings table for email_notifications_enabled=true
- Join with users table to get email addresses
- Only return active users
- Return array of objects: `{ user_id, email, name }`
- Add proper error handling

### 3. Integrate email into notification service
Modify `notifyEventPublished()` and `notifyAnnouncementPublished()` in `backend/services/notificationService.js` to execute email sending in parallel with existing in-app and push notifications using `Promise.allSettled()`.

**Details:**
- Import emailService
- Fetch email-enabled users via `getUsersWithEmailEnabled()`
- Prepare email payload (subject, HTML, text)
- Execute three notifications in parallel:
  - `createBulkNotifications()` (in-app)
  - `sendBulkPushNotifications()` (push)
  - `emailService.sendBulkEmails()` (email)
- Use `Promise.allSettled()` to prevent one failure from blocking others
- Return comprehensive results with counts for all three channels
- Log errors for each channel separately

### 4. Add email environment configuration
Set up SMTP or SendGrid API credentials in `backend/.env` (e.g., `SENDGRID_API_KEY`, `FROM_EMAIL`, `FROM_NAME`) and expose via `backend/config/env.js`.

**Details:**
- Add environment variables:
  - `EMAIL_PROVIDER` (sendgrid or smtp)
  - `SENDGRID_API_KEY` (if using SendGrid)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (if using SMTP)
  - `FROM_EMAIL` (sender email address)
  - `FROM_NAME` (sender display name)
- Update `backend/config/env.js` to expose these variables
- Add validation to ensure required env vars are present
- Document in `.env.example` or setup guide

### 5. Test multi-channel notification flow
Verify that publishing an event or post triggers all three notification types (in-app bell, push to devices, email) respecting user preferences in `user_settings` table, with proper error handling and logging.

**Details:**
- Test event publishing:
  - Create and publish a test event
  - Verify in-app notification appears in bell icon
  - Verify push notification sent to devices with push enabled
  - Verify email sent to users with email enabled
  - Check database for notification records
- Test post publishing (both news and announcements):
  - Create and publish test posts
  - Verify all three channels triggered
  - Verify correct templates used for each post type
- Test user preference filtering:
  - User with all notifications disabled receives nothing
  - User with only email enabled receives only email
  - User with only push enabled receives only push + in-app
  - User with all enabled receives all three channels
- Test error scenarios:
  - Invalid email addresses handled gracefully
  - Invalid FCM tokens cleaned up
  - Notification failures don't block publishing
- Verify logs show proper success/failure counts

## Further Considerations

### 1. Email queue implementation?
For large user bases (1000+ users), consider adding Bull or BullMQ for async email processing to prevent blocking event/post publishing. Current batch approach (500/chunk) may suffice initially.

**Analysis needed:**
- Expected user count and notification frequency
- Acceptable email delivery delay
- Server resource constraints
- Trade-off between immediate delivery and scalability

### 2. Email template customization?
Should templates support user language preference from `user_settings.language`? Should they include unsubscribe links or preference management links? Consider adding an email template engine like Handlebars or EJS.

**Questions to address:**
- Multi-language support required?
- Unsubscribe link mandatory?
- Link to notification preferences in every email?
- Template engine needed (Handlebars, EJS, Pug)?
- Dynamic content based on user data?
- Brand colors and styling requirements?

### 3. Notification audit logging?
Add tracking for email delivery success/failure rates? Store email send history in a `notification_logs` table for debugging and analytics? Current implementation only logs errors to console.

**Potential enhancements:**
- Create `notification_logs` table to track:
  - notification_id, user_id, channel (email/push/in-app)
  - status (sent/failed/pending)
  - error_message if failed
  - sent_at timestamp
- Dashboard for notification analytics
- Monitoring alerts for high failure rates
- Retention policy for old logs

## Current System Status

### ✅ Working (100%)
- **In-app notifications:** Full CRUD, bell icon UI, polling, mark as read, delete
- **Push notifications:** FCM integration, multicast batching, auto-cleanup, user toggle
- **User settings:** Database table, API endpoints, UI toggles for all notification types
- **Event publishing:** Triggers in-app + push notifications
- **Post publishing:** Triggers in-app + push notifications

### ❌ Missing (0%)
- **Email service:** No SMTP/SendGrid integration
- **Email templates:** No HTML/text templates
- **Email sending logic:** No integration in notification service
- **Email user filtering:** No repository function to get email-enabled users

## Architecture Overview

### Current Flow (In-App + Push)
```
Event/Post Published
    ↓
Controller (eventsController/postsController)
    ↓
notificationService.notifyEventPublished/notifyAnnouncementPublished()
    ↓
Promise.allSettled([
    createBulkNotifications(allActiveUsers),      // In-app → notifications table
    sendBulkPushNotifications(pushEnabledUsers)   // Push → FCM
])
    ↓
Frontend NotificationBell polls & displays in-app notifications
```

### Proposed Flow (In-App + Push + Email)
```
Event/Post Published
    ↓
Controller (eventsController/postsController)
    ↓
notificationService.notifyEventPublished/notifyAnnouncementPublished()
    ↓
Fetch users in parallel:
    ├─ getAllActiveUsers() → in-app recipients
    ├─ getUsersWithPushEnabled() → push recipients
    └─ getUsersWithEmailEnabled() → email recipients (NEW)
    ↓
Promise.allSettled([
    createBulkNotifications(allActiveUsers),        // In-app → notifications table
    sendBulkPushNotifications(pushEnabledUsers),    // Push → FCM
    emailService.sendBulkEmails(emailEnabledUsers)  // Email → SMTP/SendGrid (NEW)
])
    ↓
Return comprehensive results:
    {
        inAppNotifications: { count },
        pushNotifications: { successCount, failureCount },
        emailNotifications: { successCount, failureCount },  // NEW
        totalUsers, pushEnabledUsers, emailEnabledUsers      // NEW
    }
```

## Technical Specifications

### Database Schema (Existing)
```sql
-- user_settings table (already exists)
user_id INT PRIMARY KEY
email_notifications_enabled BOOLEAN DEFAULT TRUE
push_notifications_enabled BOOLEAN DEFAULT FALSE
fcm_token VARCHAR(500)
-- ... other fields ...

-- users table (already exists)
user_id INT
email VARCHAR(255)
name VARCHAR(100)
-- ... other fields ...

-- notifications table (already exists)
notification_id INT PRIMARY KEY
user_id INT
title VARCHAR(255)
message TEXT
type ENUM('info', 'alert', 'success', 'warning', 'message', 'task', 'system')
is_read BOOLEAN DEFAULT FALSE
action_url VARCHAR(500)
-- ... other fields ...
```

### New Email Service API
```javascript
// backend/services/emailService.js

class EmailService {
    constructor() {
        this.client = null;
        this.fromEmail = process.env.FROM_EMAIL;
        this.fromName = process.env.FROM_NAME;
    }

    async initialize() {
        // Initialize SendGrid or Nodemailer
    }

    async sendEmail(to, subject, html, text) {
        // Send single email
        // Returns: { success: boolean, messageId?: string, error?: string }
    }

    async sendBulkEmails(recipients, subject, html, text) {
        // Send to multiple recipients in batches of 500
        // Returns: { successCount, failureCount, errors: [] }
    }

    generateEventPublishedEmail(event, recipientName) {
        // Returns: { subject, html, text }
    }

    generateAnnouncementPublishedEmail(post, recipientName) {
        // Returns: { subject, html, text }
    }
}
```

### Email Templates Structure
```
Event Published Email:
- Subject: 📅 New Event: {event_title}
- Preview: A new {event_type} has been published
- Body:
  - Event title
  - Event description
  - Event type
  - Start date/time
  - Location (if applicable)
  - CTA button: "View Event Details"
  - Footer with unsubscribe link

Announcement Published Email:
- Subject: 📢 New Announcement: {post_title}
- Preview: An important announcement from Vaulteer
- Body:
  - Post title
  - Post excerpt (first 200 chars)
  - Author name
  - Published date
  - CTA button: "Read Full Announcement"
  - Footer with unsubscribe link

News Update Email:
- Subject: 📰 News Update: {post_title}
- Preview: Check out the latest news from Vaulteer
- Body:
  - Post title
  - Post excerpt (first 200 chars)
  - Published date
  - CTA button: "Read Article"
  - Footer with unsubscribe link
```

## Implementation Checklist

### Backend
- [ ] Create `backend/services/emailService.js`
- [ ] Install email library (SendGrid SDK or Nodemailer)
- [ ] Add email environment variables to `.env`
- [ ] Expose email config in `backend/config/env.js`
- [ ] Add `getUsersWithEmailEnabled()` to `userSettingsRepository.js`
- [ ] Create email templates (HTML + text)
- [ ] Integrate email into `notificationService.notifyEventPublished()`
- [ ] Integrate email into `notificationService.notifyAnnouncementPublished()`
- [ ] Add comprehensive error handling
- [ ] Add logging for email delivery results

### Testing
- [ ] Test event publishing with email notifications
- [ ] Test announcement publishing with email notifications
- [ ] Test news publishing with email notifications
- [ ] Test user preference filtering (email enabled/disabled)
- [ ] Test with invalid email addresses
- [ ] Test with large user counts (batching)
- [ ] Test error scenarios (SMTP down, invalid credentials)
- [ ] Verify emails don't block publishing on failure
- [ ] Check email delivery rates
- [ ] Verify unsubscribe links work (if implemented)

### Documentation
- [ ] Update `PUSH_NOTIFICATION_IMPLEMENTATION.md` with email integration
- [ ] Create email setup guide (SMTP/SendGrid configuration)
- [ ] Document environment variables
- [ ] Add troubleshooting section for email issues
- [ ] Document email template customization

### Optional Enhancements
- [ ] Implement email queue (Bull/BullMQ)
- [ ] Add multi-language email template support
- [ ] Create notification audit logging
- [ ] Build notification analytics dashboard
- [ ] Add email preview functionality
- [ ] Implement email open/click tracking
- [ ] Add rate limiting for email sends
- [ ] Create email testing endpoint for admins

# Email Notification Setup Guide

## Overview
This guide explains how to set up email notifications for events and announcements in the Vaulteer application. The system supports three email providers: SendGrid, SMTP, and Amazon SES (recommended for AWS environments).

## Prerequisites
- Completed installation of backend and frontend
- Access to environment variables configuration
- Either a SendGrid account OR SMTP credentials

## Option 1: SendGrid Setup (Recommended)

### Why SendGrid?
- Simple API integration
- High deliverability rates
- Free tier: 100 emails/day
- No SMTP configuration needed
- Detailed analytics and tracking

### Steps

1. **Create SendGrid Account**
   - Go to https://sendgrid.com/
   - Sign up for a free account
   - Verify your email address

2. **Create API Key**
   - Log in to SendGrid dashboard
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Name it (e.g., "Vaulteer Production")
   - Select "Full Access" or "Restricted Access" (Mail Send only)
   - Copy the API key (you'll only see it once!)

3. **Verify Sender Identity**
   - Go to Settings > Sender Authentication
   - Click "Verify a Single Sender"
   - Fill in your details:
     - From Name: `Vaulteer` (or your app name)
     - From Email: `noreply@yourdomain.com`
     - Reply To: `support@yourdomain.com` (optional)
   - Verify via email confirmation link

4. **Configure Environment Variables**
   
   Add to `backend/.env`:
   ```env
   # Email Configuration
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Vaulteer
   
   # Frontend URL (for email links)
   FRONTEND_URL=https://yourdomain.com
   ```

5. **Install SendGrid Package**
   ```bash
   cd backend
   npm install @sendgrid/mail
   ```

6. **Test Email Sending**
   - Restart your backend server
   - Publish an event or announcement
   - Check logs for: `✅ Email service initialized with SendGrid`
   - Check SendGrid dashboard for sent emails

## Option 2: Amazon SES Setup (Recommended for AWS)

### Why Amazon SES?
- Cost-effective: $0.10 per 1,000 emails (vs SendGrid free tier limit)
- High deliverability rates
- Integrated with AWS ecosystem
- Scalable for production workloads
- Built-in bounce and complaint handling

### Steps

1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Sign up for an AWS account (free tier available)
   - Navigate to Amazon SES console

2. **Verify Sender Email/Domain**
   
   **Single Email Verification (Quick Start):**
   - Go to SES Console > Verified Identities
   - Click "Create Identity"
   - Choose "Email address"
   - Enter your sender email (e.g., `noreply@yourdomain.com`)
   - Check email for verification link
   - Click to verify

   **Domain Verification (Production):**
   - Go to SES Console > Verified Identities
   - Click "Create Identity"
   - Choose "Domain"
   - Enter your domain (e.g., `yourdomain.com`)
   - Add DNS records (TXT, CNAME) to your DNS provider
   - Wait for verification (can take up to 72 hours)

3. **Request Production Access**
   
   By default, SES is in "Sandbox" mode (can only send to verified addresses).
   
   **To move to production:**
   - Go to SES Console > Account Dashboard
   - Click "Request production access"
   - Fill out the form:
     - Use case: Transactional emails
     - Website URL: Your application URL
     - Description: "Sending event and announcement notifications to registered users"
     - Expected sending volume
   - Submit request
   - Wait for approval (usually 24-48 hours)

4. **Create IAM User with SES Permissions**
   
   **Create IAM User:**
   - Go to IAM Console > Users > Create User
   - Username: `vaulteer-ses-sender`
   - Select "Access key - Programmatic access"
   - Click "Next: Permissions"

   **Attach SES Policy:**
   - Choose "Attach policies directly"
   - Search for "AmazonSESFullAccess" OR create custom policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
   - Click "Next" → "Create user"

   **Save Access Keys:**
   - Copy the Access Key ID
   - Copy the Secret Access Key
   - Store them securely (you won't see the secret again!)

5. **Choose AWS Region**
   
   SES is available in specific regions. Common choices:
   - `us-east-1` (N. Virginia) - Most features, lowest latency US East
   - `us-west-2` (Oregon) - US West
   - `eu-west-1` (Ireland) - Europe
   - `ap-southeast-1` (Singapore) - Asia Pacific
   
   Choose the region closest to your application servers.

6. **Configure Environment Variables**
   
   Add to `backend/.env`:
   ```env
   # Email Configuration
   EMAIL_PROVIDER=ses
   AWS_SES_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Vaulteer
   
   # Frontend URL (for email links)
   FRONTEND_URL=https://yourdomain.com
   ```

7. **Install AWS SDK**
   ```bash
   cd backend
   npm install @aws-sdk/client-ses
   ```

8. **Test Email Sending**
   - Restart your backend server
   - Check logs for: `✅ Email service initialized with Amazon SES`
   - Publish an event or announcement
   - Check SES dashboard for sent emails
   - Monitor sending statistics in AWS Console

### SES Sandbox vs Production

**Sandbox Mode (Default):**
- Can only send TO verified email addresses
- 200 emails per 24 hours
- 1 email per second
- Good for testing

**Production Mode (After Approval):**
- Can send to any email address
- 50,000 emails per 24 hours (can request increase)
- 14 emails per second (can request increase)
- Required for live applications

### Cost Estimate

**SES Pricing:**
- $0.10 per 1,000 emails sent
- $0.12 per 1,000 emails received (if using)
- Free tier: 62,000 emails/month for 12 months (if sent from EC2)

**Example:**
- 10,000 emails/month = $1.00/month
- 100,000 emails/month = $10.00/month
- Much cheaper than SendGrid paid tiers at scale

## Option 3: SMTP Setup (Alternative)

### Use Cases
- You have existing SMTP credentials
- Using Gmail, Outlook, or custom email server
- Need more control over email infrastructure

### Steps

1. **Get SMTP Credentials**

   **For Gmail:**
   - Enable 2-Factor Authentication in your Google Account
   - Go to Security > App Passwords
   - Generate an app password for "Mail"
   - Save the 16-character password

   **For Outlook/Office365:**
   - Use: smtp.office365.com, port 587
   - Username: your full email address
   - Password: your account password

   **For Custom Server:**
   - Get SMTP host, port, username, password from your hosting provider

2. **Configure Environment Variables**
   
   Add to `backend/.env`:
   ```env
   # Email Configuration
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Vaulteer
   
   # Frontend URL (for email links)
   FRONTEND_URL=https://yourdomain.com
   ```

   **Common SMTP Settings:**
   - Gmail: `smtp.gmail.com:587`
   - Outlook: `smtp.office365.com:587`
   - Yahoo: `smtp.mail.yahoo.com:465`
   - Custom: Check with your host

3. **Install Nodemailer Package**
   ```bash
   cd backend
   npm install nodemailer
   ```

4. **Test Email Sending**
   - Restart your backend server
   - Publish an event or announcement
   - Check logs for: `✅ Email service initialized with SMTP`
   - Check your email client's sent folder

## Environment Variables Reference

### Required Variables

```env
# Choose provider: 'sendgrid', 'ses', or 'smtp'
EMAIL_PROVIDER=ses

# SendGrid (if EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=SG.your_api_key_here

# Amazon SES (if EMAIL_PROVIDER=ses)
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# SMTP (if EMAIL_PROVIDER=smtp)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password-or-app-password

# Sender Information (required for all providers)
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Vaulteer

# Frontend URL (for links in emails)
FRONTEND_URL=https://yourdomain.com
```

### Optional Variables

```env
# If not set, defaults are used
FROM_EMAIL=noreply@vaulteer.com  # Default if not provided
FROM_NAME=Vaulteer               # Default if not provided
```

## Testing Email Notifications

### 1. Enable Email Notifications for Test User

1. Log in as a test user
2. Go to Settings (user menu → Settings)
3. Enable "Email notifications" toggle
4. Verify your email address is correct in user profile

### 2. Test Event Notification

1. Log in as admin or staff
2. Create a new event
3. Publish the event
4. Check server logs for email sending results
5. Check test user's email inbox
6. Verify email content and links work

### 3. Test Announcement Notification

1. Log in as admin or staff
2. Create a new announcement post
3. Publish the announcement
4. Check server logs for email sending results
5. Check test user's email inbox
6. Verify email content and links work

### 4. Test News Notification

1. Log in as admin or staff
2. Create a new news post
3. Publish the news
4. Check server logs for email sending results
5. Check test user's email inbox
6. Verify email content and links work

## Email Templates

### Event Published Email
- Subject: `📅 New Event: {event_title}`
- Includes: Event title, description, date/time, location, view button
- Link: Directs to event details page

### Announcement Published Email
- Subject: `📢 New Announcement: {post_title}`
- Includes: Post title, excerpt, read button
- Link: Directs to announcement page

### News Update Email
- Subject: `📰 News Update: {post_title}`
- Includes: Post title, excerpt, read button
- Link: Directs to news article page

All emails include:
- Responsive HTML design
- Plain text fallback
- Footer with notification preferences link
- Dark/light theme compatible

## Monitoring and Debugging

### Check Email Service Initialization

Look for these log messages on server startup:

**Success (SendGrid):**
```
✅ Email service initialized with SendGrid
```

**Success (SMTP):**
```
✅ Email service initialized with SMTP
```

**Success (SES):**
```
✅ Email service initialized with Amazon SES
```

**Failure:**
```
❌ Failed to initialize email service: [error message]
```

### Check Email Sending Results

When publishing an event or post, look for:

```
Event published notifications: {
  inAppNotifications: 10,
  pushNotifications: { successCount: 5, failureCount: 0 },
  emailNotifications: { successCount: 8, failureCount: 2 },
  totalUsers: 10,
  pushEnabledUsers: 5,
  emailEnabledUsers: 10
}
```

### Common Issues

**Issue: "SendGrid API key not configured"**
- Solution: Set `SENDGRID_API_KEY` in `.env` file
- Verify the API key is valid and has Mail Send permission

**Issue: "AWS SES configuration incomplete"**
- Solution: Ensure all SES variables are set: `AWS_SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Verify IAM user has SES send permissions
- Check the region matches where you verified your sender identity

**Issue: "SMTP configuration incomplete"**
- Solution: Ensure all SMTP variables are set: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Check credentials are correct

**Issue: "Email address not verified" (SES Sandbox)**
- Solution: Verify recipient email addresses in SES Console
- OR request production access to send to any address
- Check SES dashboard > Verified Identities

**Issue: "MessageRejected: Email address is not verified" (SES)**
- Solution: Verify the FROM_EMAIL address in SES Console
- Ensure sender identity is verified before sending
- Wait for domain verification if using domain verification

**Issue: Emails not being sent**
- Check `email_notifications_enabled` in user_settings table
- Verify user has valid email address
- Check email provider dashboard/logs
- Look for error messages in server logs

**Issue: Emails going to spam**
- For SendGrid: Complete Sender Authentication (SPF/DKIM)
- For SMTP: Use authenticated email addresses
- Avoid spam trigger words in email content
- Add "from" address to email contacts

**Issue: Invalid email addresses**
- Emails are skipped silently for invalid addresses
- Check `emailNotifications.errors` array in logs
- Verify email format in users table

## Production Recommendations

### Security
1. **Never commit credentials** - Use environment variables only
2. **Rotate API keys** - Change SendGrid API keys periodically
3. **Use app passwords** - For Gmail/Outlook, never use main password
4. **Restrict API permissions** - SendGrid: Use "Mail Send" only

### Deliverability
1. **Verify sender domain** - Complete SPF/DKIM setup
2. **Use dedicated email domain** - e.g., `noreply@mail.yourdomain.com`
3. **Monitor bounce rates** - Check SendGrid analytics
4. **Implement unsubscribe** - Allow users to opt-out easily

### Performance
1. **Batching is handled** - 500 emails per batch automatically
2. **Parallel execution** - Emails don't block in-app/push notifications
3. **Error handling** - Failed emails don't crash the app
4. **Rate limits** - SendGrid free tier: 100/day, paid: higher

### Monitoring
1. **Enable logging** - Check email send results in logs
2. **Track metrics** - Monitor successCount/failureCount
3. **Set up alerts** - For high failure rates
4. **Regular testing** - Send test notifications weekly

## Email Service API Reference

### emailService.sendEmail(to, subject, html, text)
Sends a single email.

**Parameters:**
- `to` (string): Recipient email address
- `subject` (string): Email subject
- `html` (string): HTML email content
- `text` (string): Plain text fallback

**Returns:**
```javascript
{
  success: boolean,
  messageId?: string,
  error?: string
}
```

### emailService.sendBulkEmails(recipients, subject, htmlGenerator, textGenerator)
Sends emails to multiple recipients in batches.

**Parameters:**
- `recipients` (Array): Array of `{email, name}` objects
- `subject` (string): Email subject
- `htmlGenerator` (Function): `(recipient) => html`
- `textGenerator` (Function): `(recipient) => text`

**Returns:**
```javascript
{
  successCount: number,
  failureCount: number,
  errors: Array<{email, error}>
}
```

### emailService.generateEventPublishedEmailHTML(event, recipientName)
Generates HTML for event notification email.

### emailService.generateEventPublishedEmailText(event, recipientName)
Generates plain text for event notification email.

### emailService.generateAnnouncementPublishedEmailHTML(post, recipientName)
Generates HTML for announcement/news email.

### emailService.generateAnnouncementPublishedEmailText(post, recipientName)
Generates plain text for announcement/news email.

## User Settings Integration

Email notifications are controlled via user settings:

### Database Field
```sql
email_notifications_enabled BOOLEAN DEFAULT TRUE
```

### API Endpoint
```
PUT /api/users/:uid/settings
{
  "emailNotificationsEnabled": true
}
```

### Frontend Component
`frontend/src/components/navigation/Settings/EmailNotificationsToggle.js`

Users can enable/disable email notifications in their settings page.

## Support

### SendGrid Resources
- Documentation: https://docs.sendgrid.com/
- API Reference: https://docs.sendgrid.com/api-reference
- Status Page: https://status.sendgrid.com/

### Amazon SES Resources
- Documentation: https://docs.aws.amazon.com/ses/
- Getting Started: https://docs.aws.amazon.com/ses/latest/dg/getting-started.html
- SDK Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ses/
- Pricing: https://aws.amazon.com/ses/pricing/
- Status Dashboard: https://status.aws.amazon.com/

### SMTP Resources
- Nodemailer Docs: https://nodemailer.com/
- Gmail Setup: https://support.google.com/mail/answer/7126229
- Outlook Setup: https://support.microsoft.com/en-us/office/

### Troubleshooting
- Check server logs for detailed error messages
- Verify environment variables are loaded correctly
- Test with curl or Postman first
- Check email provider dashboard for send history

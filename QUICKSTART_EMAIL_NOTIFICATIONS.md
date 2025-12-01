# Multi-Channel Notification System - Quick Start

## 🚀 Quick Installation (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install @sendgrid/mail nodemailer
```

Or use the PowerShell script:
```powershell
cd backend
.\install-email-notifications.ps1
```

### Step 2: Choose Your Email Provider

#### Option A: SendGrid (Recommended - Easier)
1. Sign up at https://sendgrid.com/ (Free: 100 emails/day)
2. Create API key: Settings > API Keys > Create API Key
3. Verify sender: Settings > Sender Authentication > Verify a Single Sender

#### Option B: SMTP (Gmail/Outlook)
1. For Gmail: Enable 2FA, then create App Password
2. For Outlook: Use your account credentials

### Step 3: Configure Environment Variables

Add to `backend/.env`:

**For SendGrid:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Vaulteer
FRONTEND_URL=http://localhost:3000
```

**For Gmail:**
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Vaulteer
FRONTEND_URL=http://localhost:3000
```

### Step 4: Restart Backend
```bash
npm run dev
```

Look for: `✅ Email service initialized with SendGrid` or `✅ Email service initialized with SMTP`

### Step 5: Test It!
1. Log in as admin
2. Create and publish an event or announcement
3. Check logs for notification results
4. Check your email inbox!

## 📧 What You Get

When you publish an event or announcement, the system automatically:

✅ **Creates in-app notification** → Bell icon for all users  
✅ **Sends push notification** → To users with push enabled  
✅ **Sends email** → To users with email enabled  

## 🎯 User Controls

Users can enable/disable each notification type in Settings:
- **Appearance** → Theme (light/dark/system)
- **Notifications** → Push notifications toggle
- **Notifications** → Email notifications toggle
- **Language & Region** → Language and timezone

## 📊 Monitoring

Check server logs after publishing:
```
Event published notifications: {
  inAppNotifications: 10,
  pushNotifications: { successCount: 5, failureCount: 0 },
  emailNotifications: { successCount: 8, failureCount: 0 },
  totalUsers: 10,
  pushEnabledUsers: 5,
  emailEnabledUsers: 8
}
```

## 🔧 Troubleshooting

**No emails sent?**
- Check `EMAIL_PROVIDER` is set correctly
- Verify API key or SMTP credentials
- Check user has `email_notifications_enabled=true`
- Look for error messages in server logs

**Emails go to spam?**
- Complete sender authentication (SPF/DKIM)
- Use verified sender address
- Avoid spam trigger words

## 📚 Full Documentation

- **EMAIL_NOTIFICATION_SETUP.md** - Complete setup guide
- **MULTI_CHANNEL_NOTIFICATION_IMPLEMENTATION.md** - Technical details
- **PUSH_NOTIFICATION_IMPLEMENTATION.md** - Push notification docs

## 🎉 That's It!

You now have a complete multi-channel notification system with:
- In-app notifications (bell icon)
- Push notifications (FCM)
- Email notifications (SendGrid/SMTP)

All working together seamlessly! 🚀

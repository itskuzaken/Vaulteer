# AWS SES Quick Start Guide

## Overview
You've successfully integrated Amazon SES as your email provider for the Vaulteer multi-channel notification system. This guide will help you configure and test it.

## What Was Installed

### 1. Dependencies
- ✅ `@aws-sdk/client-ses` - AWS SDK for SES

### 2. Code Changes
- ✅ `backend/services/emailService.js` - Added SES support
- ✅ `backend/config/env.js` - Added SES configuration
- ✅ All documentation updated with SES instructions

## Setup Steps

### 1. Configure Environment Variables

Edit your `backend/.env` file:

```env
# Email Provider Configuration
EMAIL_PROVIDER=ses

# Amazon SES Configuration
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# Email Sender Information
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Vaulteer

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### 2. Set Up AWS SES

#### A. Create AWS Account (if you don't have one)
- Go to https://aws.amazon.com/
- Sign up for an account

#### B. Verify Your Sender Email
1. Go to AWS Console > Amazon SES
2. Click "Verified Identities"
3. Click "Create Identity"
4. Choose "Email address"
5. Enter the same email as `FROM_EMAIL` above
6. Check your email for verification link
7. Click to verify

#### C. Create IAM User for Sending
1. Go to AWS Console > IAM > Users
2. Click "Create User"
3. Name: `vaulteer-ses-sender`
4. Enable "Programmatic access"
5. Attach policy: `AmazonSESFullAccess` (or create custom policy with only `ses:SendEmail`)
6. Click "Create"
7. **Save the Access Key ID and Secret Access Key** (you won't see them again!)
8. Add these to your `.env` file

### 3. Understand Sandbox Mode

**By default, SES is in "Sandbox" mode:**
- ✅ Can send emails
- ❌ Can only send TO verified email addresses
- ❌ Limited to 200 emails per 24 hours

**For testing:**
1. Verify your own email address as a recipient
2. Send test notifications to yourself
3. Verify emails are delivered

**For production:**
- Request production access (see below)

### 4. Request Production Access

When ready for real users:

1. Go to SES Console > Account Dashboard
2. Click "Request production access"
3. Fill out the form:
   - **Use case**: Transactional emails
   - **Website URL**: Your application URL
   - **Description**: "Sending event and announcement notifications to registered users"
   - **How do you plan to comply with AWS policies?**: Describe your user registration and opt-in process
   - **Expected sending volume**: Estimate (e.g., 1,000 emails/day)
4. Submit request
5. Wait for approval (usually 24-48 hours)

## Testing

### 1. Start Your Backend
```bash
cd backend
npm run dev
```

### 2. Check Logs
Look for:
```
✅ Email service initialized with Amazon SES
```

### 3. Verify in Sandbox (Development)

**Option A: Verify Your Test Email**
1. Go to SES Console > Verified Identities
2. Add your personal email address
3. Verify it via email link

**Option B: Enable User Settings and Test**
1. Log in to your Vaulteer app
2. Go to Settings
3. Enable "Email notifications"
4. Publish a test event or announcement
5. Check your email inbox

### 4. Check SES Dashboard
1. Go to SES Console > Home
2. View "Sending Statistics"
3. Verify emails were sent successfully

## Monitoring

### AWS SES Console
- **Sending Statistics**: View sent emails, bounces, complaints
- **Reputation Dashboard**: Monitor sending reputation
- **Configuration Sets**: Set up advanced tracking

### Application Logs
When publishing events/announcements, look for:
```javascript
{
  inAppNotifications: 10,
  pushNotifications: { successCount: 5, failureCount: 0 },
  emailNotifications: { successCount: 8, failureCount: 2 },
  totalUsers: 10,
  pushEnabledUsers: 5,
  emailEnabledUsers: 10
}
```

## Cost Estimate

### SES Pricing
- **$0.10 per 1,000 emails** sent
- **Free Tier**: 62,000 emails/month for first 12 months (if sent from EC2)

### Examples
- 1,000 emails/month = $0.10/month
- 10,000 emails/month = $1.00/month
- 100,000 emails/month = $10.00/month

**Much cheaper than SendGrid at scale!**

## Common Issues

### "Email address is not verified"
- **Cause**: SES is in sandbox mode, recipient not verified
- **Solution**: Verify recipient email OR request production access

### "InvalidParameterValue: Missing credentials"
- **Cause**: AWS credentials not configured
- **Solution**: Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`

### "MessageRejected: Email address not verified"
- **Cause**: Sender email not verified in SES
- **Solution**: Verify `FROM_EMAIL` in SES Console > Verified Identities

### "Request has expired"
- **Cause**: System clock is incorrect
- **Solution**: Sync your system clock

## Production Recommendations

### 1. Use Domain Verification
Instead of single email, verify your entire domain:
- Better deliverability
- Can send from any address at that domain
- Professional appearance

### 2. Configure SPF and DKIM
- Improves email deliverability
- Prevents spoofing
- Automatic when you verify domain

### 3. Set Up Bounce and Complaint Handling
- Configure SNS notifications for bounces
- Remove invalid emails from your list
- Monitor reputation dashboard

### 4. Use Configuration Sets
- Track email opens and clicks
- Monitor delivery metrics
- Set up event publishing to CloudWatch

### 5. Request Sending Limit Increases
Default production limits:
- 50,000 emails per 24 hours
- 14 emails per second

If you need more, request increase in SES Console.

## Resources

- **AWS SES Documentation**: https://docs.aws.amazon.com/ses/
- **Getting Started Guide**: https://docs.aws.amazon.com/ses/latest/dg/getting-started.html
- **SDK Reference**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ses/
- **Pricing**: https://aws.amazon.com/ses/pricing/
- **Best Practices**: https://docs.aws.amazon.com/ses/latest/dg/best-practices.html

## Support

For more detailed setup instructions, see:
- `EMAIL_NOTIFICATION_SETUP.md` - Complete setup guide for all providers
- `MULTI_CHANNEL_NOTIFICATION_IMPLEMENTATION.md` - Technical implementation details

## Summary

✅ AWS SES is now integrated and ready to use!

**Next Steps:**
1. Configure `.env` with your AWS credentials
2. Verify your sender email in SES Console
3. Test with sandbox mode (verify recipient emails)
4. Request production access when ready
5. Monitor sending statistics in AWS Console

**Benefits of SES:**
- 💰 Cost-effective at scale
- 🚀 High deliverability
- 🔧 Integrated with AWS ecosystem
- 📊 Built-in analytics and monitoring

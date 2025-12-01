# Multi-Channel Notification System - Installation Script
# Run this from the backend directory

Write-Host "Installing email notification dependencies..." -ForegroundColor Green

# Install SendGrid, Nodemailer, and AWS SES
npm install @sendgrid/mail nodemailer @aws-sdk/client-ses

Write-Host ""
Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.email.example to your .env file"
Write-Host "2. Choose your email provider (sendgrid, ses, or smtp)"
Write-Host "3. Add your email credentials"
Write-Host "4. Restart your backend server"
Write-Host ""
Write-Host "For detailed setup instructions, see EMAIL_NOTIFICATION_SETUP.md" -ForegroundColor Cyan

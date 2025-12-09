#!/usr/bin/env node
/**
 * Send test applicant decision and interview emails using the configured provider (SMTP/SendGrid/SES).
 * When SMTP is used and credentials are not provided, fallback to Ethereal test account.
 * Usage: node scripts/test-email-flows.js recipient@example.com
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const emailService = require('../services/emailService');
const { CONFIG } = require('../config/env');

async function ensureSmtpEnv() {
  if ((process.env.EMAIL_PROVIDER || CONFIG.email.provider || '').toLowerCase() !== 'smtp') {
    console.log('Provider is not smtp; no SMTP setup required.');
    return null;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return null;
  }

  console.log('Creating Ethereal account for SMTP test...');
  const testAccount = await nodemailer.createTestAccount();
  process.env.SMTP_HOST = 'smtp.ethereal.email';
  process.env.SMTP_PORT = String(testAccount.smtp.port || 587);
  process.env.SMTP_USER = testAccount.user;
  process.env.SMTP_PASS = testAccount.pass;
  process.env.FROM_EMAIL = process.env.FROM_EMAIL || testAccount.user;
  process.env.FROM_NAME = process.env.FROM_NAME || 'Vaulteer';
  return testAccount;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.log('Usage: node scripts/test-email-flows.js recipient@example.com');
    process.exit(1);
  }
  const to = argv[0];
  const testAccount = await ensureSmtpEnv();

  await emailService.initialize();

  // 1) Interview schedule
  const interviewDetails = {
    atUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    display: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (UTC+8)',
    timeZone: 'UTC+8',
    mode: 'online',
    link: 'https://meet.example/123',
    duration: '45 minutes',
    focus: 'technical background and problem-solving abilities'
  };
  const interviewContent = emailService.generateInterviewScheduleEmail({
    applicantName: 'Test Recipient', interviewDetails, position: 'Volunteer Position', organizationName: 'Vaulteer'
  });

  console.log('Sending interview scheduled email via emailService...');
  const sendResult1 = await emailService.sendEmail(to, interviewContent.subject, interviewContent.html, interviewContent.text);
  console.log('Result:', sendResult1);

  // If using Ethereal, show preview URL via nodemailer
  if (testAccount) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const info = await transport.sendMail({
      from: `${process.env.FROM_NAME || 'Vaulteer'} <${process.env.FROM_EMAIL}>`,
      to,
      subject: interviewContent.subject,
      text: interviewContent.text,
      html: interviewContent.html
    });
    console.log('Ethereal preview URL:', nodemailer.getTestMessageUrl(info));
  }

  // 2) Approved email
  const approvedContent = emailService.generateApplicantDecisionEmail({ applicantName: 'Test Recipient', status: 'approved', notes: 'Congrats!' });
  console.log('Sending approved email via emailService...');
  const sendResult2 = await emailService.sendEmail(to, approvedContent.subject, approvedContent.html, approvedContent.text);
  console.log('Result:', sendResult2);

  // 3) Rejected email
  const rejectedContent = emailService.generateApplicantDecisionEmail({ applicantName: 'Test Recipient', status: 'rejected', notes: 'We appreciate your application.' });
  console.log('Sending rejected email via emailService...');
  const sendResult3 = await emailService.sendEmail(to, rejectedContent.subject, rejectedContent.html, rejectedContent.text);
  console.log('Result:', sendResult3);

  console.log('Test emails persisted/sent. If using Ethereal, view sent emails via the preview URL above.');
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

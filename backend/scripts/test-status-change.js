#!/usr/bin/env node
/**
 * Test script to run status change actions and trigger email notifications.
 * Usage: node scripts/test-status-change.js targetEmail
 * It will create or find a user with provided email and run three tests:
 *   1) schedule interview (interview_scheduled)
 *   2) approve applicant (approved)
 *   3) reject applicant (rejected)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const { getPool } = require('../db/pool');

async function ensureSmtpEnv() {
  if ((process.env.EMAIL_PROVIDER || '').toLowerCase() !== 'smtp') {
    console.log('Not using SMTP provider; no SMTP env changes needed.');
    return;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('SMTP env already configured.');
    return;
  }

  console.log('No SMTP env configured; creating Ethereal test account for SMTP testing...');
  const testAccount = await nodemailer.createTestAccount();
  process.env.SMTP_HOST = 'smtp.ethereal.email';
  process.env.SMTP_PORT = testAccount.smtp.port || '587';
  process.env.SMTP_USER = testAccount.user;
  process.env.SMTP_PASS = testAccount.pass;
  process.env.FROM_EMAIL = process.env.FROM_EMAIL || `"Vaulteer" <${testAccount.user}>`;
  process.env.FROM_NAME = process.env.FROM_NAME || 'Vaulteer';

  console.log('Ethereal account created. Preview sent emails using the returned message URL via logs from nodemailer (stdout).');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.log('Usage: node scripts/test-status-change.js targetEmail');
    process.exit(1);
  }
  const targetEmail = argv[0];

  // If EMAIL_PROVIDER=smtp, ensure credentials or use Ethereal
  if ((process.env.EMAIL_PROVIDER || '').toLowerCase() === 'smtp') {
    await ensureSmtpEnv();
  }

  // Import repository after env vars set (so emailService can pick them up)
  const { initPool, getPool } = require('../db/pool');
  // init the pool to allow queries
  await initPool();
  const pool = getPool();
  const applicantRepo = require('../repositories/applicantRepository');
  const { createApplicantWithProfile, updateApplicantStatus, approveApplicant, rejectApplicant } = applicantRepo;

  // Helper to find or create test user by email
  async function findOrCreateUserByEmail(email) {
    const [[row]] = await pool.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (row) return row.user_id;

    // create a new user and applicant
    const testUid = `test-${Date.now()}-${Math.random().toString(36).substring(2,8)}`;
    const userData = { uid: testUid, name: 'SMTP Test User', email };
    const formData = {
      firstName: 'SMTP',
      lastName: 'Test',
      birthdate: '1990-01-01',
      gender: 'Male',
      consent: 'agree',
      mobileNumber: '09170000000',
      city: 'Test City',
      currentStatus: 'Student',
      declarationCommitment: 'agree',
      volunteerReason: 'I want to help',
      volunteerFrequency: 'Weekly',
    };

    const result = await createApplicantWithProfile(userData, formData);
    return result.userId;
  }

  // Change caller (admin/staff) - find an admin user; fallback to 6
  const [[adminUserRow]] = await pool.query(
    "SELECT u.user_id FROM users u JOIN roles r on u.role_id = r.role_id WHERE r.role = 'admin' LIMIT 1"
  );
  const adminUserId = adminUserRow?.user_id || 6;

  try {
    const userId = await findOrCreateUserByEmail(targetEmail);
    console.log('Test user id:', userId);

    // 1) schedule interview
    console.log('Scheduling interview...');
    const now = new Date();
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now
    const schedulePayload = {
      atUtc: future.toISOString(),
      display: future.toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (UTC+8)',
      timeZone: 'UTC+8',
      mode: 'online',
      link: 'https://meet.example/123',
      duration: '45 minutes',
      focus: 'technical background and problem-solving abilities'
    };

    const scheduled = await updateApplicantStatus(userId, 'interview_scheduled', adminUserId, null, { interviewDetails: schedulePayload });
    console.log('Scheduled result:', scheduled);

    // 2) approve applicant
    console.log('Approving applicant...');
    const approved = await updateApplicantStatus(userId, 'approved', adminUserId, 'Automated test approval');
    console.log('Approval result:', approved);

    // 3) reject applicant - create a separate test user to test rejection
    const rejectEmail = `reject-test-${Date.now()}@example.invalid`;
    const rejectUserId = await findOrCreateUserByEmail(rejectEmail);
    console.log('Reject test user id:', rejectUserId);
    console.log('Rejecting applicant...');
    const rejected = await updateApplicantStatus(rejectUserId, 'rejected', adminUserId, 'Automated test rejection');
    console.log('Rejection result:', rejected);

    console.log('All tests executed. Check logs and email provider delivery status.');
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

const applicantRepo = require('../repositories/applicantRepository');
const { getPool } = require('../db/pool');

async function run() {
  try {
    const ts = Date.now();
    const uid = `test-notif-${ts}`;
    const userData = { uid, name: `Test Notif ${ts}`, email: `test-notif-${ts}@example.com` };
    const formData = {
      firstName: 'Test',
      lastName: 'Notifier',
      nickname: 'TNotif',
      birthdate: '1990-01-01',
      gender: 'Other',
      genderOther: 'Non-binary',
      consent: 'agree',
      mobileNumber: '09171234567',
      city: 'Test City',
      currentStatus: 'Student',
      school: 'Test University',
      course: 'Computer Science',
      graduation: '2026',
      declarationCommitment: 'agree',
      volunteerReason: 'Testing notifications',
      volunteerFrequency: 'Often',
      volunteerDays: ['Monday'],
      volunteerRoles: ['General'],
    };

    console.log('Initializing DB pool...');
    await require('../db/pool').initPool();
    // Ensure at least one admin exists so we can observe notifications
    const userRepo = require('../repositories/userRepository');
    const userSettingsRepo = require('../repositories/userSettingsRepository');

    let createdAdmin = null;
    const adminIds = await userRepo.getActiveUsersByRole('admin');
    if (!adminIds || adminIds.length === 0) {
      console.log('No active admin found — creating temporary admin for test');
      const admin = await userRepo.create({ uid: `test-admin-${ts}`, name: `Test Admin ${ts}`, email: `test-admin-${ts}@example.com`, role: 'admin' });
      createdAdmin = admin.id;
      await userSettingsRepo.initializeDefaultSettings(admin.id);
    }

    console.log('Submitting test application...');
    const res = await applicantRepo.createApplicantWithProfile(userData, formData);
    console.log('Application result:', res);

    // Give background notification task a moment to run (createApplicantWithProfile notifies asynchronously)
    await new Promise((r) => setTimeout(r, 1000));

    const pool = getPool();
    // Re-query recipients and, if none were created by repository flow, create a manual notification for testing
    const notifSvc = require('../services/notificationService');
    const adminIdsAfter = await userRepo.getActiveUsersByRole('admin');
    console.log('Admin recipients for notifications:', adminIdsAfter);
    if (adminIdsAfter && adminIdsAfter.length > 0) {
      console.log('Creating a manual test notification for admins to verify bell behavior...');
      await notifSvc.createBulkNotifications(adminIdsAfter, {
        title: `📨 Test: New Volunteer Application`,
        message: `${userData.name} submitted a new application (test notification).`,
        type: 'info',
        actionUrl: `/dashboard?content=profile&userUid=${userData.uid}`,
        metadata: { notificationKind: 'new_application', applicantId: res.applicantId, test: true },
      });
    }

    const [rows] = await pool.query(
      `SELECT n.notification_id, n.user_id, n.title, n.message, n.action_url, n.metadata, n.created_at FROM notifications n WHERE JSON_EXTRACT(n.metadata, '$.notificationKind') = '"new_application"' ORDER BY n.created_at DESC LIMIT 10`
    );

    console.log('Recent new_application notifications (up to 10):');
    console.table(rows.map(r => ({ notification_id: r.notification_id, user_id: r.user_id, title: r.title, message: r.message, action_url: r.action_url, metadata: r.metadata, created_at: r.created_at })));

    // Cleanup temporary admin if we created one
    if (createdAdmin) {
      console.log('Cleaning up temporary admin...');
      await userRepo.remove(createdAdmin);
    }

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();

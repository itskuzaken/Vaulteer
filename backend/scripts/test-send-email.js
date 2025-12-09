#!/usr/bin/env node
/**
 * Script to test sending an email via the configured email provider
 * Usage:
 *   node scripts/test-send-email.js recipient@example.com "Subject" "Plain text body" "<p>HTML</p>"
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const emailService = require('../services/emailService');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 3) {
    console.log('Usage: node scripts/test-send-email.js to@example.com "Subject" "Text body" "<p>HTML</p>"');
    process.exit(1);
  }
  const [to, subject, text, html] = argv;
  try {
    const result = await emailService.sendEmail(to, subject, html || text, text);
    console.log('Send result:', result);
  } catch (err) {
    console.error('Send failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

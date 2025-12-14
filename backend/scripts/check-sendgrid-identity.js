#!/usr/bin/env node
// Check whether the configured FROM_EMAIL is a verified SendGrid sender
const https = require('https');
const { CONFIG } = require('../config/env');

async function getVerifiedSenders(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/verified_senders',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed || {});
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function main() {
  const apiKey = CONFIG.email.sendgridApiKey;
  if (!apiKey) {
    console.error('SendGrid API key not configured in env');
    process.exit(2);
  }

  try {
    const senders = await getVerifiedSenders(apiKey);
    const fromEmail = CONFIG.email.fromEmail;

    console.log(`Configured FROM_EMAIL: ${fromEmail}`);

    if (!senders || !senders.verified_senders) {
      console.log('No verified_senders list returned. Full response:', senders);
      process.exit(0);
    }

    const matched = senders.verified_senders.find((s) => s.from_email && s.from_email.toLowerCase() === fromEmail.toLowerCase());

    if (matched) {
      console.log('✅ FROM_EMAIL is verified by SendGrid:', matched);
      process.exit(0);
    } else {
      console.log('❌ FROM_EMAIL not found in verified senders. Verified senders:');
      console.log(senders.verified_senders.map((s) => s.from_email));
      process.exit(1);
    }
  } catch (err) {
    console.error('Error querying SendGrid:', err.message || err);
    process.exit(3);
  }
}

if (require.main === module) main();

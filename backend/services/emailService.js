const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");
const aws = require("@aws-sdk/client-ses");
const { CONFIG } = require("../config/env");

const emailConfig = CONFIG.email;

class EmailService {
  constructor() {
    this.provider = emailConfig.provider;
    this.fromEmail = emailConfig.fromEmail;
    this.fromName = emailConfig.fromName;
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize email service (SendGrid, SMTP, or AWS SES)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      if (this.provider === "sendgrid") {
        if (!emailConfig.sendgridApiKey) {
          throw new Error("SendGrid API key not configured");
        }
        sgMail.setApiKey(emailConfig.sendgridApiKey);
        this.client = sgMail;
        console.log("✅ Email service initialized with SendGrid");
      } else if (this.provider === "smtp") {
        if (
          !emailConfig.smtp.host ||
          !emailConfig.smtp.port ||
          !emailConfig.smtp.user ||
          !emailConfig.smtp.pass
        ) {
          throw new Error("SMTP configuration incomplete");
        }
        this.client = nodemailer.createTransport({
          host: emailConfig.smtp.host,
          port: emailConfig.smtp.port,
          secure: emailConfig.smtp.port === 465,
          auth: {
            user: emailConfig.smtp.user,
            pass: emailConfig.smtp.pass,
          },
        });
        // Verify SMTP connection
        await this.client.verify();
        console.log("✅ Email service initialized with SMTP");
      } else if (this.provider === "ses") {
        if (
          !emailConfig.ses.region ||
          !emailConfig.ses.accessKeyId ||
          !emailConfig.ses.secretAccessKey
        ) {
          throw new Error("AWS SES configuration incomplete");
        }
        this.client = new aws.SESClient({
          region: emailConfig.ses.region,
          credentials: {
            accessKeyId: emailConfig.ses.accessKeyId,
            secretAccessKey: emailConfig.ses.secretAccessKey,
          },
        });
        console.log("✅ Email service initialized with AWS SES");
      } else {
        throw new Error(`Unknown email provider: ${this.provider}`);
      }

      this.initialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize email service:", error.message);
      throw error;
    }
  }

  /**
   * Send a single email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {string} text - Plain text content
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendEmail(to, subject, html, text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.provider === "sendgrid") {
        const msg = {
          to,
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          subject,
          text,
          html,
        };
        const response = await this.client.send(msg);
        return {
          success: true,
          messageId: response[0]?.headers?.["x-message-id"],
        };
      } else if (this.provider === "smtp") {
        const info = await this.client.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          text,
          html,
        });
        return {
          success: true,
          messageId: info.messageId,
        };
      } else if (this.provider === "ses") {
        const command = new aws.SendEmailCommand({
          Source: `"${this.fromName}" <${this.fromEmail}>`,
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: html,
                Charset: "UTF-8",
              },
              Text: {
                Data: text,
                Charset: "UTF-8",
              },
            },
          },
        });
        const response = await this.client.send(command);
        return {
          success: true,
          messageId: response.MessageId,
        };
      }
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk emails in batches
   * @param {Array<{email: string, name: string}>} recipients - Array of recipient objects
   * @param {string} subject - Email subject
   * @param {Function} htmlGenerator - Function to generate HTML per recipient (recipient) => html
   * @param {Function} textGenerator - Function to generate text per recipient (recipient) => text
   * @returns {Promise<{successCount: number, failureCount: number, errors: Array}>}
   */
  async sendBulkEmails(recipients, subject, htmlGenerator, textGenerator) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!recipients || recipients.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    const BATCH_SIZE = 500;
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Send emails in parallel within batch
      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const html = htmlGenerator(recipient);
          const text = textGenerator(recipient);
          return this.sendEmail(recipient.email, subject, html, text);
        })
      );

      // Count results
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          successCount++;
        } else {
          failureCount++;
          errors.push({
            email: batch[index].email,
            error:
              result.status === "rejected"
                ? result.reason.message
                : result.value.error,
          });
        }
      });
    }

    console.log(
      `📧 Email batch complete: ${successCount} sent, ${failureCount} failed`
    );

    return { successCount, failureCount, errors };
  }

  /**
   * Generate event published email HTML
   * @param {Object} event - Event object
   * @param {string} recipientName - Recipient's name
   * @returns {string} HTML content
   */
  generateEventPublishedEmailHTML(event, recipientName) {
    const eventDate = new Date(event.start_datetime).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Event: ${event.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📅 New Event Published</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
                Hi ${recipientName || "there"},
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 30px;">
                A new <strong>${event.event_type || "event"}</strong> has been published on Vaulteer!
              </p>
              
              <!-- Event Details Card -->
              <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 22px;">${event.title}</h2>
                
                ${
                  event.description
                    ? `<p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">${event.description}</p>`
                    : ""
                }
                
                <div style="margin-top: 20px;">
                  <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                    <strong>📍 Date:</strong> ${eventDate}
                  </p>
                  ${
                    event.location
                      ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                      <strong>🏢 Location:</strong> ${event.location}
                    </p>`
                      : ""
                  }
                  <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                    <strong>📋 Type:</strong> ${event.event_type || "Event"}
                  </p>
                </div>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/events/${event.event_uid}" 
                       style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 10px 0;">
                      View Event Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 10px; text-align: center;">
                You received this email because you have email notifications enabled in your Vaulteer settings.
              </p>
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/settings" style="color: #dc2626; text-decoration: none;">Manage your notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Generate event published email plain text
   * @param {Object} event - Event object
   * @param {string} recipientName - Recipient's name
   * @returns {string} Plain text content
   */
  generateEventPublishedEmailText(event, recipientName) {
    const eventDate = new Date(event.start_datetime).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return `
New Event Published on Vaulteer

Hi ${recipientName || "there"},

A new ${event.event_type || "event"} has been published on Vaulteer!

EVENT: ${event.title}

${event.description || ""}

Date: ${eventDate}
${event.location ? `Location: ${event.location}` : ""}
Type: ${event.event_type || "Event"}

View event details: ${process.env.FRONTEND_URL || "http://localhost:3000"}/events/${event.event_uid}

---
You received this email because you have email notifications enabled in your Vaulteer settings.
Manage your notification preferences: ${process.env.FRONTEND_URL || "http://localhost:3000"}/settings
`;
  }

  /**
   * Generate event cancelled email HTML
   * @param {Object} event
   * @param {string} recipientName
   * @returns {string}
   */
  generateEventCancelledEmailHTML(event, recipientName) {
    const eventDate = new Date(event.start_datetime).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Cancelled: ${event.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">❌ Event Cancelled</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Hi ${recipientName || "there"},</p>
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 30px;">We regret to inform you that the following event has been cancelled:</p>
              <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 22px;">${event.title}</h2>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  <strong>📍 Date:</strong> ${eventDate}
                </p>
                ${event.location ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>🏢 Location:</strong> ${event.location}</p>` : ''}
              </div>
              <p style="color: #333333; font-size: 15px; line-height: 1.6;">If you were registered, the refund/credit process (if any) will be handled according to the organizer's policy. For clarification contact the event organizer.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 10px; text-align: center;">You received this email because you have email notifications enabled in your Vaulteer settings.</p>
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" style="color: #dc2626; text-decoration: none;">Manage your notification preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  generateEventCancelledEmailText(event, recipientName) {
    const eventDate = new Date(event.start_datetime).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `
Event Cancelled: ${event.title}

Hi ${recipientName || 'there'},

We regret to inform you that the following event has been cancelled:

${event.title}
Date: ${eventDate}
${event.location ? `Location: ${event.location}\n` : ''}

If you were registered, the refund/credit process (if any) will be handled according to the organizer's policy.

View settings: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings
`;
  }

  /**
   * Generate announcement published email HTML
   * @param {Object} post - Post object
   * @param {string} recipientName - Recipient's name
   * @returns {string} HTML content
   */
  generateAnnouncementPublishedEmailHTML(post, recipientName) {
    const isNews = post.post_type === "news";
    const icon = isNews ? "📰" : "📢";
    const title = isNews ? "News Update" : "New Announcement";
    const bgColor = isNews ? "#2563eb" : "#dc2626";

    const excerpt =
      post.content?.substring(0, 200).replace(/<[^>]*>/g, "") || "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}: ${post.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${bgColor}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${icon} ${title}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
                Hi ${recipientName || "there"},
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 0 0 30px;">
                ${isNews ? "Check out the latest news from Vaulteer!" : "An important announcement has been posted on Vaulteer!"}
              </p>
              
              <!-- Post Details Card -->
              <div style="background-color: #f9fafb; border-left: 4px solid ${bgColor}; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 22px;">${post.title}</h2>
                
                ${
                  excerpt
                    ? `<p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">${excerpt}${post.content?.length > 200 ? "..." : ""}</p>`
                    : ""
                }
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/posts/${post.post_uid}" 
                       style="display: inline-block; background-color: ${bgColor}; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 10px 0;">
                      ${isNews ? "Read Full Article" : "Read Full Announcement"}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 10px; text-align: center;">
                You received this email because you have email notifications enabled in your Vaulteer settings.
              </p>
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/settings" style="color: ${bgColor}; text-decoration: none;">Manage your notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Generate announcement published email plain text
   * @param {Object} post - Post object
   * @param {string} recipientName - Recipient's name
   * @returns {string} Plain text content
   */
  generateAnnouncementPublishedEmailText(post, recipientName) {
    const isNews = post.post_type === "news";
    const title = isNews ? "News Update" : "New Announcement";
    const excerpt =
      post.content?.substring(0, 200).replace(/<[^>]*>/g, "") || "";

    return `
${title} on Vaulteer

Hi ${recipientName || "there"},

${isNews ? "Check out the latest news from Vaulteer!" : "An important announcement has been posted on Vaulteer!"}

${post.title.toUpperCase()}

${excerpt}${post.content?.length > 200 ? "..." : ""}

${isNews ? "Read full article" : "Read full announcement"}: ${process.env.FRONTEND_URL || "http://localhost:3000"}/posts/${post.post_uid}

---
You received this email because you have email notifications enabled in your Vaulteer settings.
Manage your notification preferences: ${process.env.FRONTEND_URL || "http://localhost:3000"}/settings
`;
  }
}

// Email template helpers for event promotions & reminders
EmailService.prototype.generateEventPromotedEmailHTML = function (event, recipientName) {
  return `Hi ${recipientName || 'Volunteer'},\n\n` +
    `<p>You're now registered for <strong>${event.title}</strong>!</p>` +
    `<p>Start: ${event.start_datetime}</p>` +
    `<p>Thank you for participating.</p>`;
};

EmailService.prototype.generateEventPromotedEmailText = function (event, recipientName) {
  return `Hi ${recipientName || 'Volunteer'},\n\nYou're now registered for ${event.title}!\nStart: ${event.start_datetime}\n\nThank you for participating.`;
};

EmailService.prototype.generateEventReminderEmailHTML = function (event, recipientName) {
  return `Hi ${recipientName || 'Volunteer'},\n\n` +
    `<p>This is a reminder that <strong>${event.title}</strong> will start at ${event.start_datetime}.</p>` +
    `<p>We hope to see you there!</p>`;
};

EmailService.prototype.generateEventReminderEmailText = function (event, recipientName) {
  return `Hi ${recipientName || 'Volunteer'},\n\nThis is a reminder that ${event.title} will start at ${event.start_datetime}.\n\nWe hope to see you there!`;
};

EmailService.prototype.generateApplicantDecisionEmail = function ({
  applicantName,
  status,
  notes,
}) {
  const isApproved = status === "approved";
  const subject = isApproved
    ? "Your Vaulteer application was approved"
    : "Update on your Vaulteer application";

  const decisionText = isApproved
    ? "Congratulations! Your application has been approved. We are excited to welcome you as a volunteer."
    : "Thank you for your interest in Vaulteer. After careful review, we are unable to move forward with your application at this time.";

  const nextStepText = isApproved
    ? "You can now sign in to view available opportunities and complete any onboarding tasks."
    : "You are welcome to apply again in the future or reach out if you have questions.";

  const notesHtml = notes
    ? `<p style="margin: 12px 0; padding: 12px; background: #f9fafb; border-left: 4px solid #dc2626; color: #374151;">Note from the team: ${notes}</p>`
    : "";

  const notesText = notes ? `\nNote from the team: ${notes}\n` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0; background: #f4f4f4;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: #dc2626; color: #ffffff; padding: 24px 28px; border-radius: 8px 8px 0 0; font-size: 20px; font-weight: 600;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 28px; color: #111827; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 14px;">Hi ${applicantName || "there"},</p>
              <p style="margin: 0 0 12px;">${decisionText}</p>
              <p style="margin: 0 0 16px;">${nextStepText}</p>
              ${notesHtml}
              <p style="margin: 20px 0 8px; color: #6b7280; font-size: 13px;">If you have questions, reply to this email and our team will assist.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${applicantName || "there"},\n\n${decisionText}\n\n${nextStepText}${notesText}\nIf you have questions, reply to this email and our team will assist.`;

  return { subject, html, text };
};

EmailService.prototype.generateInterviewScheduleEmail = function ({
  applicantName,
  interviewDetails,
  position = "Volunteer Position",
  organizationName = "Vaulteer",
}) {
  const subject = "Interview scheduled for your Vaulteer application";

  const formatDisplay = () => {
    if (interviewDetails?.display) return interviewDetails.display;
    if (!interviewDetails?.atUtc) return "TBD";
    try {
      return new Date(interviewDetails.atUtc).toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return interviewDetails.atUtc;
    }
  };

  const whenText = formatDisplay();
  // try to map a duration if provided
  const durationNormalized = interviewDetails?.duration
    ? interviewDetails.duration.replace(/minutes?/i, "minute")
    : null;
  const durationText = durationNormalized
    ? `This will be a ${durationNormalized} ${interviewDetails.mode === 'online' ? 'virtual' : 'in-person'} interview.`
    : "This interview is expected to last approximately 45 minutes.";
  const focusText = interviewDetails?.focus
    ? `We will focus on your ${interviewDetails.focus}.`
    : "We will focus on your relevant background and problem-solving abilities.";
  const mode = interviewDetails?.mode || "onsite";
  const locationLine = mode === "onsite"
    ? interviewDetails?.location || "Onsite venue to be confirmed"
    : interviewDetails?.link || "Link to follow";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0; background: #f4f4f4;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: #2563eb; color: #ffffff; padding: 24px 28px; border-radius: 8px 8px 0 0; font-size: 20px; font-weight: 600;">Interview Scheduled</td>
          </tr>
          <tr>
            <td style="padding: 28px; color: #111827; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 14px;">Hi ${applicantName || "there"},</p>
              <p style="margin: 0 0 16px;">Thank you again for your interest in the ${position} position at ${organizationName}. We were impressed with your application and would like to invite you to interview with our team.</p>
              <p style="margin: 0 0 16px;">${durationText} ${focusText}</p>
              <div style="margin: 0 0 16px; padding: 14px; background: #f9fafb; border-left: 4px solid #2563eb;">
                <p style="margin: 0 0 8px; font-weight: 600;">When: <span style="font-weight: 500;">${whenText} (${interviewDetails?.timeZone || "UTC+8"})</span></p>
                <p style="margin: 0; font-weight: 600;">Mode: <span style="font-weight: 500;">${mode === "online" ? "Online" : "Onsite"}</span></p>
                <p style="margin: 8px 0 0; color: #374151;">${locationLine}</p>
              </div>
              <p style="margin: 0 0 10px;">If you need to reschedule, reply to this email and our team will help you pick a new time.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${applicantName || "there"},\n\nThank you again for your interest in the ${position} position at ${organizationName}. We were impressed with your application and would like to invite you to interview with our team.\n\n${durationText} ${focusText}\n\nWhen: ${whenText} (${interviewDetails?.timeZone || "UTC+8"})\nMode: ${mode === "online" ? "Online" : "Onsite"}\nDetails: ${locationLine}\n\nIf you need to reschedule, reply to this email and our team will help you pick a new time.`;

  const fullSubject = `Interview Invitation: ${position} Position at ${organizationName}`;

  return { subject: fullSubject, html, text };
};

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;

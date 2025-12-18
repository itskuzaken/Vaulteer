/**
 * Achievement definitions and thresholds (MVP)
 * Keys:
 *  - punctual_pro: increment on event completion when participant.status === 'present'
 *  - ocr_wizard: increment on OCR approval (admin action)
 */

module.exports = {
  punctual_pro: {
    code: 'punctual_pro',
    name: 'Punctual Pro',
    description: 'Be on time for events',
    thresholds: { bronze: 1, silver: 10, gold: 25 },
    trigger: 'event_completed'
  },
  ocr_wizard: {
    code: 'ocr_wizard',
    name: 'The Data Wizard',
    description: 'Approve OCR extractions',
    thresholds: { bronze: 1, silver: 5, gold: 15 },
    trigger: 'ocr_approved'
  },
  early_bird: {
    code: 'early_bird',
    name: 'Early Bird',
    description: 'Check-in before event start',
    thresholds: { bronze: 1, silver: 5, gold: 10 },
    trigger: 'event_completed'
  },
  community_staple: {
    code: 'community_staple',
    name: 'Community Staple',
    description: 'Attend events across multiple categories',
    thresholds: { bronze: 2, silver: 5, gold: 10 },
    trigger: 'event_completed'
  },
  perfect_streak: {
    code: 'perfect_streak',
    name: 'Perfect Streak',
    description: 'Consecutive presents without absence',
    thresholds: { bronze: 3, silver: 7, gold: 15 },
    trigger: 'event_completed'
  }
};

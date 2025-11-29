const cron = require('node-cron');
const applicationSettingsRepository = require('../repositories/applicationSettingsRepository');
const activityLogService = require('../services/activityLogService');

/**
 * Cron job to automatically close applications when deadline passes
 * Runs every minute to check if deadline has been reached
 */
function startDeadlineScheduler() {
  // Run every minute
  const job = cron.schedule('* * * * *', async () => {
    try {
      const settings = await applicationSettingsRepository.getSettings();
      
      // Skip if no settings or applications are already closed
      if (!settings || !settings.is_open) {
        return;
      }
      
      // Skip if no deadline is set
      if (!settings.deadline) {
        return;
      }
      
      // Check if deadline has passed
      const now = new Date();
      const deadline = new Date(settings.deadline);
      
      if (deadline <= now) {
        console.log('[ApplicationDeadlineScheduler] Deadline reached, auto-closing applications...');
        
        // Close applications automatically
        await applicationSettingsRepository.closeApplications(
          'system', // System user for auto-close
          true // Mark as auto-closed
        );
        
        // Log the auto-close event
        await activityLogService.logActivity({
          user_uid: 'system',
          action_type: 'APPLICATION_AUTO_CLOSED',
          action_category: 'application_management',
          target_type: 'application_settings',
          target_id: settings.id.toString(),
          metadata: JSON.stringify({
            deadline: settings.deadline,
            closed_at: new Date().toISOString(),
            reason: 'Deadline reached'
          })
        });
        
        console.log('[ApplicationDeadlineScheduler] Applications auto-closed successfully');
      }
    } catch (error) {
      console.error('[ApplicationDeadlineScheduler] Error in deadline check:', error);
    }
  });
  
  console.log('⏰ Application deadline scheduler started (runs every minute)');
  
  return job;
}

module.exports = { startDeadlineScheduler };

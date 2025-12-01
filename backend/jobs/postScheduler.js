const cron = require('node-cron');
const postRepository = require('../repositories/postRepository');

function startPostScheduler() {
  // Run every minute to check for posts to publish
  cron.schedule('* * * * *', async () => {
    try {
      const publishedCount = await postRepository.publishScheduledPosts();
      if (publishedCount > 0) {
        console.log(`[PostScheduler] Published ${publishedCount} scheduled post(s)`);
      }
    } catch (error) {
      console.error('[PostScheduler] Error publishing scheduled posts:', error);
    }
  });
  console.log('⏰ Post scheduler started (runs every minute)');
}

module.exports = { startPostScheduler };

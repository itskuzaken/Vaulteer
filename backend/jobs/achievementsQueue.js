const Bull = require('bull');
const achievementsWorker = require('../workers/achievementsWorker');

let achievementsQueue;
try {
  achievementsQueue = new Bull('achievements-queue', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  });
  console.log('✓ Achievements queue connected to Redis');
} catch (err) {
  console.warn('⚠️ Redis not available - achievements jobs disabled');
  achievementsQueue = null;
}

if (achievementsQueue) {
  achievementsQueue.process(async (job) => {
    const { type } = job.data;
    if (type === 'eventCompleted') {
      return achievementsWorker.processEventCompleted(job.data);
    }
    if (type === 'ocrApproved') {
      return achievementsWorker.processOcrApproved(job.data);
    }
    return null;
  });

  achievementsQueue.on('completed', (job) => {
    console.log(`Achievements job completed: ${job.id}`);
  });

  achievementsQueue.on('failed', (job, err) => {
    console.error(`Achievements job ${job.id} failed:`, err.message || err);
  });
}

async function enqueueEventCompleted(eventId) {
  if (!achievementsQueue) {
    console.warn('Achievements job skipped - Redis not available');
    return null;
  }
  return achievementsQueue.add({ type: 'eventCompleted', eventId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}

async function enqueueOcrApproved({ submissionId, reviewerId, userId }) {
  if (!achievementsQueue) return null;
  return achievementsQueue.add({ type: 'ocrApproved', submissionId, reviewerId, userId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}
async function closeAchievementsQueue() {
  if (!achievementsQueue) return;
  try {
    await achievementsQueue.close();
    console.log('✓ Achievements queue closed');
  } catch (e) {
    console.warn('Failed to close achievements queue', e?.message || e);
  }
}

module.exports = { achievementsQueue, enqueueEventCompleted, enqueueOcrApproved, closeAchievementsQueue };

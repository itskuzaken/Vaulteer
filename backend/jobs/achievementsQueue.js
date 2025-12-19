const Bull = require('bull');
const achievementsWorker = require('../workers/achievementsWorker');

let achievementsQueue;

// Do not attempt to connect to Redis unless explicitly configured
const achievementsRedisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
if (process.env.NODE_ENV === 'test' && process.env.ENABLE_QUEUES_IN_TEST !== 'true') {
  console.log('ℹ️ Achievements queue disabled in test environment');
  achievementsQueue = null;
} else if (!achievementsRedisConfigured) {
  console.log('ℹ️ Achievements queue disabled - no Redis configured (set REDIS_URL or REDIS_HOST to enable)');
  achievementsQueue = null;
} else {
  try {
    achievementsQueue = new Bull('achievements-queue', {
      redis: {
        host: process.env.REDIS_HOST || undefined,
        port: process.env.REDIS_PORT || 6379
      }
    });
    console.log('ℹ️ Achievements queue client created (waiting for Redis connection)');
  } catch (err) {
    console.warn('⚠️ Redis not available - achievements jobs disabled');
    achievementsQueue = null;
  }
}

let _achievementsQueueErrorLogged = false;

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
    console.error(`Achievements job ${job.id} failed:`, err?.message || err);
  });

  // Helper to detect connection refused errors
  function _isConnRefused(err) {
    if (!err) return false;
    if (err.code === 'ECONNREFUSED') return true;
    if (Array.isArray(err.errors) && err.errors.length && err.errors.every(e => e && e.code === 'ECONNREFUSED')) return true;
    if (typeof err.message === 'string' && err.message.includes('ECONNREFUSED')) return true;
    return false;
  }

  // Catch queue-level errors (throttled)
  achievementsQueue.on('error', (err) => {
    if (_isConnRefused(err)) {
      if (!_achievementsQueueErrorLogged) {
        console.warn('⚠️ Redis connection refused for achievements queue. Achievements jobs will be disabled until Redis is available.');
        _achievementsQueueErrorLogged = true;
      }
      achievementsQueue = null; // disable queue
      return;
    }

    if (!_achievementsQueueErrorLogged) {
      console.error('Achievements queue error event:', err?.message || err);
      _achievementsQueueErrorLogged = true;
    }
  });

  // Reset throttle on client ready/connect
  if (typeof achievementsQueue?.client === 'object' && achievementsQueue.client && typeof achievementsQueue.client.on === 'function') {
    achievementsQueue.client.on('ready', () => { _achievementsQueueErrorLogged = false; console.log('Achievements queue client ready'); });
    achievementsQueue.client.on('connect', () => { _achievementsQueueErrorLogged = false; console.log('Achievements queue client connected'); });
  }
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

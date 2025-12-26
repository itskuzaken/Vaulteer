const Bull = require('bull');
const achievementsWorker = require('../workers/achievementsWorker');

let achievementsQueue;

const achievementsRedisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);

if (process.env.NODE_ENV === 'test' && process.env.ENABLE_QUEUES_IN_TEST !== 'true') {
  console.log('ℹ️ Achievements queue disabled in test environment');
  achievementsQueue = null;
} else if (!achievementsRedisConfigured) {
  console.log('ℹ️ Achievements queue disabled - no Redis configured');
  achievementsQueue = null;
} else {
  const _create = () => {
    try {
      const redisOptions = process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      };

      const q = new Bull('achievements-queue', typeof redisOptions === 'string' ? redisOptions : { redis: redisOptions });

      if (typeof q.client === 'object' && q.client && typeof q.client.on === 'function') {
        q.client.on('ready', () => { _achievementsQueueErrorLogged = false; console.log('✅ Achievements queue client ready'); });
        q.client.on('connect', () => { _achievementsQueueErrorLogged = false; console.log('✅ Achievements queue client connected'); });
      }

      q.on('ready', () => { _achievementsQueueErrorLogged = false; console.log('✅ Achievements queue client ready'); });
      q.on('connect', () => { _achievementsQueueErrorLogged = false; console.log('✅ Achievements queue client connected'); });

      achievementsQueue = q;
      console.log('ℹ️ Achievements queue client created (waiting for Redis connection)');
      return true;
    } catch (err) {
      console.warn('⚠️ Redis not available - achievements jobs disabled (will retry):', err.message);
      achievementsQueue = null;
      return false;
    }
  };

  // Try immediately; if it fails, fall back to an in-memory queue and schedule retries
  if (!_create()) {
    achievementsQueue = {
      jobs: [],
      _processor: null,
      add: async (data, opts = {}) => {
        const job = { data, opts, _attempts: 0 };
        achievementsQueue.jobs.push(job);
        return job;
      },
      process: (handler) => { achievementsQueue._processor = handler; if (achievementsQueue.jobs.length > 0) achievementsQueue.drain(); },
      async drain() {
        if (!achievementsQueue._processor) return;
        while (achievementsQueue.jobs.length) {
          const job = achievementsQueue.jobs.shift();
          try { await achievementsQueue._processor(job); } catch (err) {
            job._attempts = (job._attempts || 0) + 1;
            const maxAttempts = (job.opts && job.opts.attempts) || 1;
            if (job._attempts < maxAttempts) {
              const delay = (job.opts && job.opts.backoff && job.opts.backoff.delay) || 1000;
              await new Promise((r) => setTimeout(r, delay));
              achievementsQueue.jobs.push(job);
            } else {
              console.error('Achievements job permanently failed:', err);
            }
          }
        }
      }
    };

    const retryInterval = Number(process.env.QUEUES_RETRY_INTERVAL_MS) || 30000;
    const iv = setInterval(() => {
      if (_create()) {
        clearInterval(iv);
        console.log('✅ Achievements queue reinitialized after Redis became available');

        // Migrate in-memory jobs to the real queue
        try {
          if (achievementsQueue && achievementsQueue.jobs && Array.isArray(achievementsQueue.jobs) && achievementsQueue.jobs.length) {
            const memJobs = achievementsQueue.jobs.slice();
            achievementsQueue.jobs = [];
            memJobs.forEach((j) => achievementsQueue.add(j.data, j.opts).catch(e => console.error('Failed to re-enqueue job during migration', e)));
          }
        } catch (e) {
          console.warn('Failed to migrate in-memory achievements jobs to Redis achievementsQueue:', e.message || e);
        }
      }
    }, retryInterval);
  }
}

let _achievementsQueueErrorLogged = false;

if (achievementsQueue) {
  achievementsQueue.process(async (job) => {
    const { type } = job.data;
    if (type === 'eventCompleted') return achievementsWorker.processEventCompleted(job.data);
    if (type === 'ocrApproved') return achievementsWorker.processOcrApproved(job.data);
    return null;
  });

  achievementsQueue.on('completed', (job) => {
    console.log(`Achievements job completed: ${job.id}`);
  });

  achievementsQueue.on('failed', (job, err) => {
    console.error(`Achievements job ${job.id} failed:`, err?.message || err);
  });

  function _isConnRefused(err) {
    if (!err) return false;
    const msg = typeof err.message === 'string' ? err.message : '';
    return err.code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED');
  }

  achievementsQueue.on('error', (err) => {
    if (_isConnRefused(err)) {
      if (!_achievementsQueueErrorLogged) {
        console.warn('⚠️ Redis connection refused for achievements queue. Bull will keep retrying...');
        _achievementsQueueErrorLogged = true;
      }
      return;
    }
    if (!_achievementsQueueErrorLogged) {
      console.error('Achievements queue error event:', err?.message || err);
      _achievementsQueueErrorLogged = true;
    }
  });

  achievementsQueue.on('ready', () => { 
    _achievementsQueueErrorLogged = false; 
    console.log('✅ Achievements queue client ready'); 
  });

  achievementsQueue.on('connect', () => { 
    _achievementsQueueErrorLogged = false; 
    console.log('✅ Achievements queue client connected'); 
  });
}

async function enqueueEventCompleted(eventId) {
  if (!achievementsQueue) return null;
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
/**
 * reportGenerationQueue
 * Lightweight queue wrapper to enqueue report generation tasks.
 * Uses Bull (if available) or a simple in-memory fallback for dev/test.
 */

let reportQueue = null;

// Don't attempt to connect to Redis during tests unless explicitly enabled
if (process.env.NODE_ENV === 'test' && process.env.ENABLE_QUEUES_IN_TEST !== 'true') {
  console.log('ℹ️ Report generation queue disabled in test environment');
  reportQueue = {
    jobs: [],
    add: async (data, opts = {}) => {
      reportQueue.jobs.push({ data, opts, _attempts: 0 });
      return { data, opts };
    },
    process: (handler) => {
      reportQueue._processor = handler;
    },
    async drain() {
      if (!reportQueue._processor) return;
      while (reportQueue.jobs.length) {
        const job = reportQueue.jobs.shift();
        try {
          await reportQueue._processor(job);
        } catch (err) {
          job._attempts = (job._attempts || 0) + 1;
          const maxAttempts = (job.opts && job.opts.attempts) || 1;
          if (job._attempts < maxAttempts) {
            const delay = (job.opts && job.opts.backoff && job.opts.backoff.delay) || 1000;
            await new Promise((r) => setTimeout(r, delay));
            reportQueue.jobs.push(job);
          } else {
            console.error('Report job failed after max attempts:', err);
          }
        }
      }
    }
  };
} else {
  // Only attempt to use Bull if Redis is explicitly configured
  const redisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (!redisConfigured) {
    console.log('ℹ️ Report generation queue disabled - no Redis configured (set REDIS_URL or REDIS_HOST to enable)');
    // In-memory fallback (same behavior as earlier)
    reportQueue = {
      jobs: [],
      _processor: null,
      add: async (data, opts = {}) => {
        const job = { data, opts, _attempts: 0 };
        reportQueue.jobs.push(job);
        if (reportQueue._processor) {
          reportQueue.drain().catch(e => console.error("Queue drain error:", e));
        }
        return job;
      },
      process: (handler) => {
        reportQueue._processor = handler;
        if (reportQueue.jobs.length > 0) reportQueue.drain();
      },
      async drain() {
        if (!reportQueue._processor) return;
        while (reportQueue.jobs.length) {
          const job = reportQueue.jobs.shift();
          try {
            await reportQueue._processor(job);
          } catch (err) {
            console.error("Job processing error:", err);
            job._attempts = (job._attempts || 0) + 1;
            const maxAttempts = (job.opts && job.opts.attempts) || 1;
            if (job._attempts < maxAttempts) {
              const delay = (job.opts && job.opts.backoff && job.opts.backoff.delay) || 1000;
              await new Promise((r) => setTimeout(r, delay));
              reportQueue.jobs.push(job);
            } else {
              console.error('Report job permanently failed:', err);
            }
          }
        }
      }
    };
  } else {
    try {
      const Bull = require('bull');
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
      reportQueue = new Bull('report-generation-queue', redisUrl);

      // Throttle error logs for this queue
      let _reportQueueErrorLogged = false;
      reportQueue.on('error', (err) => {
        if (!_reportQueueErrorLogged) {
          console.error('Report queue error event:', err?.message || err);
          _reportQueueErrorLogged = true;
        }
      });

      if (typeof reportQueue.client === 'object' && reportQueue.client && typeof reportQueue.client.on === 'function') {
        reportQueue.client.on('ready', () => { _reportQueueErrorLogged = false; console.log('Report queue client ready'); });
        reportQueue.client.on('connect', () => { _reportQueueErrorLogged = false; console.log('Report queue client connected'); });
      }

    } catch (err) {
      console.warn('Bull/Redis not available - falling back to in-memory report queue', err?.message || err);
      // Fallback to in-memory as above
      reportQueue = {
        jobs: [],
        _processor: null,
        add: async (data, opts = {}) => {
          const job = { data, opts, _attempts: 0 };
          reportQueue.jobs.push(job);
          if (reportQueue._processor) reportQueue.drain().catch(e => console.error("Queue drain error:", e));
          return job;
        },
        process: (handler) => { reportQueue._processor = handler; if (reportQueue.jobs.length > 0) reportQueue.drain(); },
        async drain() {
          if (!reportQueue._processor) return;
          while (reportQueue.jobs.length) {
            const job = reportQueue.jobs.shift();
            try { await reportQueue._processor(job); } catch (err) {
              job._attempts = (job._attempts || 0) + 1;
              const maxAttempts = (job.opts && job.opts.attempts) || 1;
              if (job._attempts < maxAttempts) {
                const delay = (job.opts && job.opts.backoff && job.opts.backoff.delay) || 1000;
                await new Promise((r) => setTimeout(r, delay));
                reportQueue.jobs.push(job);
              } else {
                console.error('Report job permanently failed:', err);
              }
            }
          }
        }
      };
    }
  }
} // <--- THIS CLOSING BRACE WAS MISSING

module.exports = { reportQueue };
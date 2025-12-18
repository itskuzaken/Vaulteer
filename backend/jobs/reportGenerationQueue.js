/**
 * reportGenerationQueue
 * Lightweight queue wrapper to enqueue report generation tasks.
 * Uses Bull (if available) or a simple in-memory fallback for dev/test.
 */

let reportQueue = null;

try {
  const Bull = require('bull');
  reportQueue = new Bull('report-generation-queue');
} catch (err) {
  console.warn('Bull not available - using in-memory report queue fallback');
  reportQueue = {
    jobs: [],
    // Accept optional job options for attempts/backoff to mimic Bull semantics
    add: async (data, opts = {}) => { reportQueue.jobs.push({ data, opts, _attempts: 0 }); return { data, opts }; },
    process: (handler) => { reportQueue._processor = handler; },
    async drain() {
      while (reportQueue.jobs.length) {
        const job = reportQueue.jobs.shift();
        try {
          await reportQueue._processor(job);
        } catch (err) {
          // Handle retries with simple backoff logic based on opts
          job._attempts = (job._attempts || 0) + 1;
          const maxAttempts = (job.opts && job.opts.attempts) || 1;
          if (job._attempts < maxAttempts) {
            const delay = (job.opts && job.opts.backoff && job.opts.backoff.delay) || 1000;
            await new Promise((r) => setTimeout(r, delay));
            reportQueue.jobs.push(job);
          } else {
            console.error('Report job failed after max attempts:', err);
            // leave job failed; the worker/process should handle recording failure
          }
        }
      }
    }
  };
}

module.exports = { reportQueue };

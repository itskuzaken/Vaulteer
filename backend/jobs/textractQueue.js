const Bull = require('bull');
const { processEncryptedHTSForm } = require('../services/textractService');

// Create queue with error handling
let textractQueue;

// Do not attempt to connect to Redis unless explicitly configured (avoid noisy ECONNREFUSED logs)
const redisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
if (process.env.NODE_ENV === 'test' && process.env.ENABLE_QUEUES_IN_TEST !== 'true') {
  console.log('ℹ️ Textract queue disabled in test environment');
  textractQueue = null;
} else if (!redisConfigured) {
  console.log('ℹ️ Textract queue disabled - no Redis configured (set REDIS_URL or REDIS_HOST to enable)');
  textractQueue = null;
} else {
  try {
    textractQueue = new Bull('textract-ocr', {
      redis: {
        host: process.env.REDIS_HOST || undefined,
        port: process.env.REDIS_PORT || 6379
      }
    });
    console.log('ℹ️ Textract queue client created (waiting for Redis connection)');
  } catch (error) {
    console.warn('⚠️ Redis client creation failed - OCR jobs will be disabled', error?.message || error);
    textractQueue = null;
  }
}

// Throttle repeated error logs to avoid noise when Redis is unreachable
let _textractQueueErrorLogged = false;

// Process jobs (only if queue is available)
if (textractQueue) {
  textractQueue.process(async (job) => {
    const { formId } = job.data;
    
    console.log(`Processing OCR for form ${formId}...`);
    
    try {
      const result = await processEncryptedHTSForm(formId);
      return result;
    } catch (error) {
      console.error(`OCR job failed for form ${formId}:`, error);
      throw error;
    }
  });

  // Event listeners
  textractQueue.on('completed', (job, result) => {
    console.log(`OCR completed for form ${result.formId} with confidence ${result.confidence}%`);
  });

  textractQueue.on('failed', (job, err) => {
    console.error(`OCR job ${job.id} failed:`, err?.message || err);
  });

  // Log runtime errors from the queue client (throttled)
  textractQueue.on('error', (err) => {
    if (!_textractQueueErrorLogged) {
      console.error('Textract queue error event:', err?.message || err);
      _textractQueueErrorLogged = true;
    }
  });

  // Reset the error throttle if the queue becomes ready/connected
  if (typeof textractQueue.client === 'object' && textractQueue.client && typeof textractQueue.client.on === 'function') {
    textractQueue.client.on('ready', () => { _textractQueueErrorLogged = false; console.log('Textract queue client ready'); });
    textractQueue.client.on('connect', () => { _textractQueueErrorLogged = false; console.log('Textract queue client connected'); });
  }
}

/**
 * Add OCR job to queue
 */
async function enqueueOCRJob(formId) {
  if (!textractQueue) {
    console.warn(`OCR job skipped for form ${formId} - Redis not available`);
    return null;
  }
  
  const job = await textractQueue.add(
    { formId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );
  
  return job;
}

module.exports = {
  textractQueue,
  enqueueOCRJob
};

async function closeTextractQueue() {
  if (!textractQueue) return;
  try {
    await textractQueue.close();
    console.log('✓ Textract queue closed');
  } catch (e) {
    console.warn('Failed to close textract queue', e?.message || e);
  }
}

module.exports.closeTextractQueue = closeTextractQueue;

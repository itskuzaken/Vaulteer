const Bull = require('bull');
const { processEncryptedHTSForm } = require('../services/textractService');

// Create queue with error handling
let textractQueue;

const redisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);

if (process.env.NODE_ENV === 'test' && process.env.ENABLE_QUEUES_IN_TEST !== 'true') {
  console.log('ℹ️ Textract queue disabled in test environment');
  textractQueue = null;
} else if (!redisConfigured) {
  console.log('ℹ️ Textract queue disabled - no Redis configured (set REDIS_URL or REDIS_HOST to enable)');
  textractQueue = null;
} else {
  const _create = () => {
    try {
      const redisOptions = process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        // Prevents the client from giving up on the first failed connection attempt
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      };

      textractQueue = new Bull('textract-ocr', typeof redisOptions === 'string' ? redisOptions : { redis: redisOptions });
      console.log('ℹ️ Textract queue client created (waiting for Redis connection)');
      return true;
    } catch (error) {
      console.warn('⚠️ Redis client creation failed - OCR jobs disabled (will retry):', error?.message || error);
      textractQueue = null;
      return false;
    }
  };

  if (!_create()) {
    const retryInterval = Number(process.env.QUEUES_RETRY_INTERVAL_MS) || 30000;
    const iv = setInterval(() => {
      if (_create()) {
        clearInterval(iv);
        console.log('✅ Textract queue reinitialized after Redis became available');
      }
    }, retryInterval);
  }
}

let _textractQueueErrorLogged = false;

if (textractQueue) {
  textractQueue.process(async (job) => {
    const { formId } = job.data;
    console.log(`Processing OCR for form ${formId}...`);
    try {
      return await processEncryptedHTSForm(formId);
    } catch (error) {
      console.error(`OCR job failed for form ${formId}:`, error);
      throw error;
    }
  });

  textractQueue.on('completed', (job, result) => {
    console.log(`OCR completed for form ${result.formId} with confidence ${result.confidence}%`);
  });

  textractQueue.on('failed', (job, err) => {
    console.error(`OCR job ${job.id} failed:`, err?.message || err);
  });

  function _isConnectionRefusedError(err) {
    if (!err) return false;
    const msg = typeof err.message === 'string' ? err.message : '';
    return err.code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED');
  }

  // Handle errors without disabling the queue
  textractQueue.on('error', (err) => {
    if (_isConnectionRefusedError(err)) {
      if (!_textractQueueErrorLogged) {
        console.warn('⚠️ Redis connection refused for textract queue. Bull will keep retrying...');
        _textractQueueErrorLogged = true;
      }
      return;
    }

    if (!_textractQueueErrorLogged) {
      console.error('Textract queue error event:', err?.message || err);
      _textractQueueErrorLogged = true;
    }
  });

  // Success listeners
  textractQueue.on('ready', () => { 
    _textractQueueErrorLogged = false; 
    console.log('✅ Textract queue client ready'); 
  });

  textractQueue.on('connect', () => { 
    _textractQueueErrorLogged = false; 
    console.log('✅ Textract queue client connected'); 
  });
}

async function enqueueOCRJob(formId) {
  if (!textractQueue) {
    console.warn(`OCR job skipped for form ${formId} - Queue not initialized`);
    return null;
  }
  return await textractQueue.add({ formId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true
  });
}

async function closeTextractQueue() {
  if (!textractQueue) return;
  try {
    await textractQueue.close();
    console.log('✓ Textract queue closed');
  } catch (e) {
    console.warn('Failed to close textract queue', e?.message || e);
  }
}

module.exports = { textractQueue, enqueueOCRJob, closeTextractQueue };
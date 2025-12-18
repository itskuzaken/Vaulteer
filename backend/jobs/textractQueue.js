const Bull = require('bull');
const { processEncryptedHTSForm } = require('../services/textractService');

// Create queue with error handling
let textractQueue;
try {
  textractQueue = new Bull('textract-ocr', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  });
  
  console.log('✓ Textract queue connected to Redis');
} catch (error) {
  console.warn('⚠️  Redis not available - OCR jobs will be disabled');
  console.warn('   To enable OCR: Install Redis or start Docker container');
  textractQueue = null;
}

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
    console.error(`OCR job ${job.id} failed:`, err.message);
  });
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

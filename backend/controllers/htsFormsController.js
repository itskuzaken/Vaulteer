const htsFormsRepository = require('../repositories/htsFormsRepository');
const asyncHandler = require('../middleware/asyncHandler');
const { enqueueOCRJob } = require('../jobs/textractQueue');

const htsFormsController = {
  submitForm: asyncHandler(async (req, res) => {
    const { 
      frontImageBase64, 
      backImageBase64, 
      frontImageIV,
      backImageIV,
      encryptionKey,
      testResult 
    } = req.body;

    // Get user_id from authenticated user (set by auth middleware)
    const userId = req.currentUserId;

    if (!userId || !frontImageBase64 || !backImageBase64 || !testResult) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['reactive', 'non-reactive'].includes(testResult)) {
      return res.status(400).json({ error: 'Invalid test result. Must be "reactive" or "non-reactive"' });
    }

    // Require encryption fields
    if (!frontImageIV || !backImageIV || !encryptionKey) {
      return res.status(400).json({ error: 'Encryption data is required' });
    }

    // Generate control number
    const controlNumber = await htsFormsRepository.generateControlNumber();

    // Store encrypted images (base64 format)
    // Images are encrypted client-side before transmission
    const frontImageUrl = frontImageBase64;
    const backImageUrl = backImageBase64;

    // Create submission
    const formId = await htsFormsRepository.createSubmission({
      controlNumber,
      userId,
      frontImageUrl,
      backImageUrl,
      frontImageIV,
      backImageIV,
      encryptionKey,
      testResult
    });

    // Enqueue OCR job (non-blocking)
    try {
      await enqueueOCRJob(formId);
      console.log(`OCR job queued for form ${formId}`);
    } catch (error) {
      console.error('Failed to enqueue OCR job:', error);
      // Don't fail the submission if OCR queue fails
    }

    res.status(201).json({
      success: true,
      formId,
      controlNumber,
      message: 'Form submitted successfully',
      ocrQueued: true
    });
  }),

  getMySubmissions: asyncHandler(async (req, res) => {
    // Get user_id from authenticated user
    const userId = req.currentUserId;

    const submissions = await htsFormsRepository.getSubmissionsByUserId(userId);

    res.json({
      success: true,
      submissions
    });
  }),

  getAllSubmissions: asyncHandler(async (req, res) => {
    // Verify admin role (should be done in middleware)
    const submissions = await htsFormsRepository.getAllSubmissions();

    res.json({
      success: true,
      submissions
    });
  }),

  getSubmissionDetails: asyncHandler(async (req, res) => {
    const { formId } = req.params;

    const submission = await htsFormsRepository.getSubmissionById(formId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({
      success: true,
      submission
    });
  }),

  updateSubmissionStatus: asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const { status, adminNotes, reviewedBy } = req.body;

    await htsFormsRepository.updateSubmissionStatus(
      formId,
      status,
      adminNotes,
      reviewedBy
    );

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  })
};

module.exports = htsFormsController;

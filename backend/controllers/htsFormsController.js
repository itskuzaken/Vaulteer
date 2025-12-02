const htsFormsRepository = require('../repositories/htsFormsRepository');
const asyncHandler = require('../middleware/asyncHandler');
const { enqueueOCRJob } = require('../jobs/textractQueue');
const textractService = require('../services/textractService');

const htsFormsController = {
  /**
   * Analyze HTS form images using OCR (before encryption and submission)
   * POST /api/hts-forms/analyze-ocr
   * Requires: multipart/form-data with frontImage and backImage files
   */
  analyzeOCR: asyncHandler(async (req, res) => {
    // Extract uploaded files from multer
    const frontImage = req.files?.frontImage?.[0];
    const backImage = req.files?.backImage?.[0];

    // Validate both images are present
    if (!frontImage || !backImage) {
      return res.status(400).json({ 
        error: 'Both front and back images are required',
        received: {
          frontImage: !!frontImage,
          backImage: !!backImage
        }
      });
    }

    // Validate file sizes (should be caught by multer, but double-check)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (frontImage.size > maxSize || backImage.size > maxSize) {
      return res.status(400).json({ 
        error: 'Image files must be less than 10MB each' 
      });
    }

    console.log(`[OCR Analysis] Processing images: front=${frontImage.size} bytes, back=${backImage.size} bytes`);

    try {
      // Process raw images with Textract (OCR-first workflow)
      const extractedData = await textractService.analyzeHTSForm(
        frontImage.buffer,
        backImage.buffer
      );

      console.log(`[OCR Analysis] Extraction completed with ${extractedData.confidence}% confidence`);

      res.json({
        success: true,
        data: extractedData,
        message: 'OCR analysis completed successfully'
      });

    } catch (error) {
      console.error('[OCR Analysis] Textract error:', error);

      // Return user-friendly error message
      res.status(500).json({
        error: 'Failed to analyze images',
        details: error.message,
        suggestion: 'Please ensure images are clear and properly oriented'
      });
    }
  }),

  submitForm: asyncHandler(async (req, res) => {
    const { 
      frontImageBase64, 
      backImageBase64, 
      frontImageIV,
      backImageIV,
      encryptionKey,
      testResult,
      extractedData,
      extractionConfidence
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

    // Require pre-extracted OCR data (OCR-first workflow)
    if (!extractedData || extractionConfidence === undefined) {
      return res.status(400).json({ error: 'OCR data is required. Please analyze images before submission.' });
    }

    // Generate control number
    const controlNumber = await htsFormsRepository.generateControlNumber();
    const formId = await htsFormsRepository.generateControlNumber(); // Temporary ID for S3 keys

    try {
      // Convert base64 to buffer
      const frontImageBuffer = Buffer.from(frontImageBase64, 'base64');
      const backImageBuffer = Buffer.from(backImageBase64, 'base64');

      // Upload encrypted images to S3
      const s3Service = require('../services/s3Service');
      const [frontImageS3Key, backImageS3Key] = await Promise.all([
        s3Service.uploadEncryptedImage(frontImageBuffer, formId, 'front'),
        s3Service.uploadEncryptedImage(backImageBuffer, formId, 'back')
      ]);

      console.log(`[Submit Form] Uploaded images to S3: ${frontImageS3Key}, ${backImageS3Key}`);

      // Create submission with S3 keys and pre-extracted OCR data
      const actualFormId = await htsFormsRepository.createSubmission({
        controlNumber,
        userId,
        frontImageS3Key,
        backImageS3Key,
        frontImageIV,
        backImageIV,
        encryptionKey,
        testResult,
        extractedData,
        extractionConfidence
      });

      console.log(`[Submit Form] Form ${actualFormId} created with pre-extracted OCR data (confidence: ${extractionConfidence}%)`);

      res.status(201).json({
        success: true,
        formId: actualFormId,
        controlNumber,
        message: 'Form submitted successfully',
        ocrCompleted: true,
        confidence: extractionConfidence
      });

    } catch (error) {
      console.error('[Submit Form] Error:', error);
      res.status(500).json({
        error: 'Failed to submit form',
        details: error.message
      });
    }
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
  }),

  /**
   * Get encrypted image from S3 for admin review
   * GET /api/hts-forms/:formId/image/:side
   */
  getFormImage: asyncHandler(async (req, res) => {
    const { formId, side } = req.params;

    if (!['front', 'back'].includes(side)) {
      return res.status(400).json({ error: 'Invalid side. Must be "front" or "back"' });
    }

    // Get submission details
    const submission = await htsFormsRepository.getSubmissionById(formId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Get S3 key
    const s3Key = side === 'front' ? submission.front_image_s3_key : submission.back_image_s3_key;

    if (!s3Key) {
      return res.status(404).json({ error: 'Image not found in S3' });
    }

    try {
      // Download encrypted image from S3
      const s3Service = require('../services/s3Service');
      const imageBuffer = await s3Service.downloadImage(s3Key);

      // Convert buffer to base64 for frontend
      const base64Image = imageBuffer.toString('base64');

      res.json({
        success: true,
        encryptedImage: base64Image
      });

    } catch (error) {
      console.error(`[Get Form Image] Error fetching ${side} image:`, error);
      res.status(500).json({
        error: 'Failed to fetch image from S3',
        details: error.message
      });
    }
  })
};

module.exports = htsFormsController;

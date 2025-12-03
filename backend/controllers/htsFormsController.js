const htsFormsRepository = require('../repositories/htsFormsRepository');
const asyncHandler = require('../middleware/asyncHandler');
const { enqueueOCRJob } = require('../jobs/textractQueue');
const textractService = require('../services/textractService');
const imageProcessor = require('../services/imageProcessor');

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

    console.log(`[OCR Analysis] Processing images with server-side enhancement...`);
    console.log(`[OCR Analysis] Original sizes: front=${frontImage.size} bytes, back=${backImage.size} bytes`);

    try {
      // Validate images
      const [frontValidation, backValidation] = await Promise.all([
        imageProcessor.validateImage(frontImage.buffer),
        imageProcessor.validateImage(backImage.buffer)
      ]);

      if (!frontValidation.valid || !backValidation.valid) {
        return res.status(400).json({
          error: 'Invalid images',
          details: {
            front: frontValidation.issues,
            back: backValidation.issues
          }
        });
      }

      // Process images for optimal OCR
      const [processedFront, processedBack] = await Promise.all([
        imageProcessor.processForOCR(frontImage.buffer),
        imageProcessor.processForOCR(backImage.buffer)
      ]);

      console.log(`[OCR Analysis] Processed sizes: front=${processedFront.length} bytes, back=${processedBack.length} bytes`);

      // Send processed images to Textract
      const extractedData = await textractService.analyzeHTSForm(
        processedFront,
        processedBack
      );

      console.log(`[OCR Analysis] Extraction completed with ${extractedData.confidence}% confidence`);

      res.json({
        success: true,
        data: extractedData,
        message: 'OCR analysis completed successfully'
      });

    } catch (error) {
      console.error('[OCR Analysis] Error:', error);

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
      extractedDataEncrypted,
      extractedDataIV,
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

    // Require encrypted OCR data (OCR-first workflow with encryption)
    if (!extractedDataEncrypted || !extractedDataIV || extractionConfidence === undefined) {
      return res.status(400).json({ error: 'Encrypted OCR data is required. Please analyze images before submission.' });
    }

    // Validate data types for debugging
    console.log('[Submit Form] Validating request data types...');
    console.log('[Submit Form] - extractedDataEncrypted type:', typeof extractedDataEncrypted, 'length:', extractedDataEncrypted?.length);
    console.log('[Submit Form] - extractedDataIV type:', typeof extractedDataIV, 'length:', extractedDataIV?.length);
    console.log('[Submit Form] - encryptionKey type:', typeof encryptionKey, 'length:', encryptionKey?.length);
    console.log('[Submit Form] - frontImageBase64 length:', frontImageBase64?.length);
    console.log('[Submit Form] - backImageBase64 length:', backImageBase64?.length);

    // Generate control number
    const controlNumber = await htsFormsRepository.generateControlNumber();
    const formId = await htsFormsRepository.generateControlNumber(); // Temporary ID for S3 keys

    try {
      // Convert base64 to buffer with error handling
      let frontImageBuffer, backImageBuffer;
      try {
        frontImageBuffer = Buffer.from(frontImageBase64, 'base64');
        backImageBuffer = Buffer.from(backImageBase64, 'base64');
        console.log(`[Submit Form] Converted images to buffers: front=${frontImageBuffer.length} bytes, back=${backImageBuffer.length} bytes`);
      } catch (bufferError) {
        console.error('[Submit Form] Base64 conversion error:', bufferError);
        throw new Error(`Invalid base64 image data: ${bufferError.message}`);
      }

      // Upload encrypted images to S3
      const s3Service = require('../services/s3Service');
      console.log('[Submit Form] Uploading images to S3...');
      const [frontImageS3Key, backImageS3Key] = await Promise.all([
        s3Service.uploadEncryptedImage(frontImageBuffer, formId, 'front'),
        s3Service.uploadEncryptedImage(backImageBuffer, formId, 'back')
      ]);

      console.log(`[Submit Form] Uploaded images to S3: ${frontImageS3Key}, ${backImageS3Key}`);

      // Validate extracted data encryption before storing
      if (typeof extractedDataEncrypted !== 'string') {
        throw new Error(`extractedDataEncrypted must be a string (base64), got: ${typeof extractedDataEncrypted}`);
      }
      if (typeof extractedDataIV !== 'string') {
        throw new Error(`extractedDataIV must be a string (base64), got: ${typeof extractedDataIV}`);
      }

      // Create submission with S3 keys and encrypted OCR data
      console.log('[Submit Form] Saving to database...');
      const actualFormId = await htsFormsRepository.createSubmission({
        controlNumber,
        userId,
        frontImageS3Key,
        backImageS3Key,
        frontImageIV,
        backImageIV,
        encryptionKey,
        testResult,
        extractedDataEncrypted,
        extractedDataIV,
        extractionConfidence
      });

      console.log(`[Submit Form] Form ${actualFormId} created with encrypted OCR data (confidence: ${extractionConfidence}%)`);

      res.status(201).json({
        success: true,
        formId: actualFormId,
        controlNumber,
        message: 'Form submitted successfully with encrypted data',
        ocrCompleted: true,
        confidence: extractionConfidence
      });

    } catch (error) {
      console.error('[Submit Form] Error:', error);
      console.error('[Submit Form] Error stack:', error.stack);
      res.status(500).json({
        error: 'Failed to submit form',
        details: error.message,
        type: error.constructor.name
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
    console.log('[getAllSubmissions] Fetching all submissions for admin...');
    const submissions = await htsFormsRepository.getAllSubmissions();
    console.log(`[getAllSubmissions] Found ${submissions.length} submissions`);
    
    // Log first submission for debugging
    if (submissions.length > 0) {
      console.log('[getAllSubmissions] Sample submission:', {
        form_id: submissions[0].form_id,
        control_number: submissions[0].control_number,
        user_id: submissions[0].user_id,
        username: submissions[0].username,
        status: submissions[0].status,
        has_s3_keys: !!(submissions[0].front_image_s3_key && submissions[0].back_image_s3_key)
      });
    }

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

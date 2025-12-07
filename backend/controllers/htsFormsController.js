const htsFormsRepository = require('../repositories/htsFormsRepository');
const asyncHandler = require('../middleware/asyncHandler');
const { enqueueOCRJob } = require('../jobs/textractQueue');
const textractService = require('../services/textractService');
const imageProcessor = require('../services/imageProcessor');
const { getExtractionOptions } = require('../config/ocrConfig');

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
    const maxSize = 20 * 1024 * 1024; // 20MB (increased for high-resolution test images)
    if (frontImage.size > maxSize || backImage.size > maxSize) {
      return res.status(400).json({ 
        error: 'Image files must be less than 20MB each' 
      });
    }

    console.log(`🔍 [OCR] Processing images (front: ${(frontImage.size/1024).toFixed(0)}KB, back: ${(backImage.size/1024).toFixed(0)}KB)`);

    try {
      // Validate images with enhanced quality checks
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
      
      // Enhanced quality checks to prevent poor OCR results
      const qualityIssues = [];
      
      // Check if images are too small for reliable OCR
      if (frontValidation.metadata.width < 1200 || frontValidation.metadata.height < 1500) {
        qualityIssues.push('Front image resolution too low for optimal OCR (recommended: 1200x1500+)');
      }
      if (backValidation.metadata.width < 1200 || backValidation.metadata.height < 1500) {
        qualityIssues.push('Back image resolution too low for optimal OCR (recommended: 1200x1500+)');
      }
      
      // Check if images are suspiciously small in file size (likely poor quality/compression)
      const minFileSize = 100 * 1024; // 100KB
      if (frontImage.size < minFileSize) {
        qualityIssues.push('Front image file size too small - may be over-compressed or poor quality');
      }
      if (backImage.size < minFileSize) {
        qualityIssues.push('Back image file size too small - may be over-compressed or poor quality');
      }
      
      // If quality issues found, return warning (but don't block - let client-side validation handle it)
      if (qualityIssues.length > 0) {
        console.log(`⚠️  [OCR] Quality issues detected: ${qualityIssues.join(', ')}`);
        // Log but continue - preprocessing may improve quality
      }

      // Process images for optimal OCR
      const [processedFront, processedBack] = await Promise.all([
        imageProcessor.processForOCR(frontImage.buffer),
        imageProcessor.processForOCR(backImage.buffer)
      ]);

      console.log(`✓ [OCR] Enhanced (front: ${(processedFront.length/1024).toFixed(0)}KB, back: ${(processedBack.length/1024).toFixed(0)}KB)`);

      // Use FORMS+LAYOUT approach with nested structure
      const useLayout = process.env.OCR_USE_LAYOUT !== 'false'; // Default: true
      
      console.log(`🚀 [OCR] Using ${useLayout ? 'FORMS+LAYOUT' : 'FORMS-only'} (nested structure)`);
      const extractedData = await textractService.analyzeHTSFormWithForms(
        processedFront,
        processedBack,
        { 
          preprocessImages: false, // Already preprocessed above
          useLayout: useLayout
        }
      );

      // Consolidated completion summary
      const stats = extractedData.stats || {};
      console.log(`✅ [OCR] Extraction complete: ${extractedData.confidence.toFixed(1)}% confidence`);
      console.log(`   ├─ Fields: ${stats.highConfidence || 0}H/${stats.mediumConfidence || 0}M/${stats.lowConfidence || 0}L confidence`);
      if (stats.extractionMethods) {
        console.log(`   └─ Methods: ${stats.extractionMethods.query || 0} query, ${stats.extractionMethods.coordinate || 0} coordinate`);
      }

      res.json({
        success: true,
        data: extractedData,
        message: 'Enhanced OCR analysis completed successfully',
        extractionMethod: extractedData.extractionMethod || 'coordinate-based'
      });

    } catch (error) {
      console.error('[OCR Analysis] Error:', error);

      // Handle specific AWS Textract errors
      let errorMessage = 'Failed to analyze images';
      let statusCode = 500;
      let suggestion = 'Please ensure images are clear and properly oriented';

      if (error.name === 'InvalidParameterException' || error.__type === 'InvalidParameterException') {
        errorMessage = 'Invalid image format or size';
        statusCode = 400;
        suggestion = 'Ensure images are JPEG/PNG format and under 10MB each. Try capturing with lower quality settings.';
      } else if (error.message && error.message.includes('size')) {
        errorMessage = 'Image size exceeds limits';
        statusCode = 400;
        suggestion = 'Images must be under 10MB each. Please reduce image quality or resolution.';
      }

      // Return user-friendly error message
      res.status(statusCode).json({
        error: errorMessage,
        details: error.message,
        suggestion: suggestion
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
      extractionConfidence,
      extractedDataStructuredEncrypted,
      extractedDataStructuredIV,
      fieldComponents,
      checkboxStates,
      fieldRegions
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

    let frontImageS3Key, backImageS3Key;
    
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

      // Validate extracted data encryption before storing
      if (typeof extractedDataEncrypted !== 'string') {
        throw new Error(`extractedDataEncrypted must be a string (base64), got: ${typeof extractedDataEncrypted}`);
      }
      if (typeof extractedDataIV !== 'string') {
        throw new Error(`extractedDataIV must be a string (base64), got: ${typeof extractedDataIV}`);
      }

      // Upload encrypted images to S3
      const s3Service = require('../services/s3Service');
      console.log('[Submit Form] Uploading images to S3...');
      [frontImageS3Key, backImageS3Key] = await Promise.all([
        s3Service.uploadEncryptedImage(frontImageBuffer, formId, 'front'),
        s3Service.uploadEncryptedImage(backImageBuffer, formId, 'back')
      ]);

      console.log(`[Submit Form] Uploaded images to S3: ${frontImageS3Key}, ${backImageS3Key}`);

      // Parse nested data structures if provided (v2 format)
      let fieldComponentsJson = null;
      let checkboxStatesJson = null;
      let fieldRegionsJson = null;
      
      if (fieldComponents) {
        try {
          fieldComponentsJson = typeof fieldComponents === 'string' ? fieldComponents : JSON.stringify(fieldComponents);
          console.log('[Submit Form] fieldComponents length:', fieldComponentsJson?.length);
        } catch (err) {
          console.warn('[Submit Form] Failed to parse fieldComponents:', err.message);
        }
      }
      
      if (checkboxStates) {
        try {
          checkboxStatesJson = typeof checkboxStates === 'string' ? checkboxStates : JSON.stringify(checkboxStates);
          console.log('[Submit Form] checkboxStates length:', checkboxStatesJson?.length);
        } catch (err) {
          console.warn('[Submit Form] Failed to parse checkboxStates:', err.message);
        }
      }
      
      if (fieldRegions) {
        try {
          fieldRegionsJson = typeof fieldRegions === 'string' ? fieldRegions : JSON.stringify(fieldRegions);
          console.log('[Submit Form] fieldRegions length:', fieldRegionsJson?.length);
        } catch (err) {
          console.warn('[Submit Form] Failed to parse fieldRegions:', err.message);
        }
      }
      
      // Determine structure version based on nested data availability
      const structureVersion = (extractedDataStructuredEncrypted || fieldComponentsJson) ? 'v2' : 'v1';
      console.log(`[Submit Form] Using structure version: ${structureVersion}`);

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
        extractionConfidence,
        extractedDataStructuredEncrypted: extractedDataStructuredEncrypted || null,
        extractedDataStructuredIV: extractedDataStructuredIV || null,
        fieldComponents: fieldComponentsJson,
        checkboxStates: checkboxStatesJson,
        fieldRegions: fieldRegionsJson,
        structureVersion
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
      
      // Rollback: Delete S3 objects if database insertion failed
      if (frontImageS3Key || backImageS3Key) {
        console.log('[Submit Form] Rolling back S3 uploads due to error...');
        const s3Service = require('../services/s3Service');
        try {
          const deletePromises = [];
          if (frontImageS3Key) deletePromises.push(s3Service.deleteImage(frontImageS3Key));
          if (backImageS3Key) deletePromises.push(s3Service.deleteImage(backImageS3Key));
          await Promise.all(deletePromises);
          console.log('[Submit Form] S3 rollback complete');
        } catch (rollbackError) {
          console.error('[Submit Form] Failed to rollback S3 uploads:', rollbackError);
          // Log but don't throw - original error is more important
        }
      }
      
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
  }),

  /**
   * Update extracted data for a submission (user editing after OCR)
   * PUT /api/hts-forms/:formId/extracted-data
   */
  updateExtractedData: asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const { extractedDataEncrypted, extractedDataIV, extractionConfidence } = req.body;
    const userId = req.currentUserId;

    if (!extractedDataEncrypted || !extractedDataIV || extractionConfidence === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: extractedDataEncrypted, extractedDataIV, extractionConfidence' 
      });
    }

    try {
      // Verify the submission belongs to the user
      const submission = await htsFormsRepository.getSubmissionById(formId);
      
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (submission.user_id !== userId) {
        return res.status(403).json({ error: 'You can only update your own submissions' });
      }

      // Update the extracted data
      await htsFormsRepository.updateExtractedData(
        formId,
        extractedDataEncrypted,
        extractedDataIV,
        extractionConfidence
      );

      console.log(`[Update Extracted Data] Form ${formId} updated with new OCR data (confidence: ${extractionConfidence}%)`);

      res.json({
        success: true,
        message: 'Extracted data updated successfully',
        confidence: extractionConfidence
      });

    } catch (error) {
      console.error('[Update Extracted Data] Error:', error);
      res.status(500).json({
        error: 'Failed to update extracted data',
        details: error.message
      });
    }
  })
};

module.exports = htsFormsController;

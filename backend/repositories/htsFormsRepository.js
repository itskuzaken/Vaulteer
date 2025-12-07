const { getPool } = require('../db/pool');

const htsFormsRepository = {
  async createSubmission(data) {
    const { 
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
      extractedDataStructured,
      extractedDataStructuredEncrypted,
      extractedDataStructuredIV,
      fieldComponents,
      checkboxStates,
      fieldRegions,
      structureVersion = 'v2'
    } = data;
    
    // Validate required fields
    console.log('[Repository] Creating submission with data:', {
      controlNumber,
      userId,
      frontImageS3Key: frontImageS3Key?.substring(0, 50) + '...',
      backImageS3Key: backImageS3Key?.substring(0, 50) + '...',
      testResult,
      extractedDataEncrypted_length: extractedDataEncrypted?.length,
      extractedDataIV_length: extractedDataIV?.length,
      extractionConfidence,
      structureVersion,
      hasStructuredData: !!extractedDataStructured,
      hasEncryptedStructuredData: !!extractedDataStructuredEncrypted,
      hasFieldComponents: !!fieldComponents,
      hasCheckboxStates: !!checkboxStates,
      hasFieldRegions: !!fieldRegions
    });

    const pool = getPool();
    
    try {
      const [result] = await pool.query(
        `INSERT INTO hts_forms (
          control_number, 
          user_id, 
          front_image_s3_key, 
          back_image_s3_key, 
          front_image_iv, 
          back_image_iv, 
          encryption_key, 
          test_result,
          extracted_data_encrypted,
          extracted_data_iv,
          extraction_confidence,
          extracted_data_structured,
          extracted_data_structured_encrypted,
          extracted_data_structured_iv,
          field_components,
          checkbox_states,
          field_regions,
          structure_version,
          ocr_completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
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
          extractedDataStructured ? JSON.stringify(extractedDataStructured) : null,
          extractedDataStructuredEncrypted,
          extractedDataStructuredIV,
          fieldComponents ? JSON.stringify(fieldComponents) : null,
          checkboxStates ? JSON.stringify(checkboxStates) : null,
          fieldRegions ? JSON.stringify(fieldRegions) : null,
          structureVersion
        ]
      );
      
      console.log('[Repository] Successfully inserted form with ID:', result.insertId);
      return result.insertId;
      
    } catch (dbError) {
      console.error('[Repository] Database insert error:', dbError);
      console.error('[Repository] SQL Error code:', dbError.code);
      console.error('[Repository] SQL Error message:', dbError.message);
      throw dbError;
    }
  },

  async getSubmissionsByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT form_id, control_number, status, created_at
       FROM hts_forms
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  },

  async getAllSubmissions() {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT f.*, u.name as username, u.email
       FROM hts_forms f
       JOIN users u ON f.user_id = u.user_id
       ORDER BY f.created_at DESC`
    );
    
    // Process each submission to handle encrypted/plaintext data
    return rows.map(submission => {
      // Handle both encrypted (new) and plaintext (legacy) extracted_data
      if (submission.extracted_data_encrypted && submission.extracted_data_iv) {
        // New format: encrypted data (will be decrypted in frontend)
        submission.isExtractedDataEncrypted = true;
      } else if (submission.extracted_data) {
        // Legacy format: plaintext JSON (parse for backward compatibility)
        try {
          submission.extracted_data = JSON.parse(submission.extracted_data);
          submission.isExtractedDataEncrypted = false;
        } catch (error) {
          console.error('Failed to parse extracted_data for form_id:', submission.form_id, error);
          submission.extracted_data = null;
          submission.isExtractedDataEncrypted = false;
        }
      }
      
      return submission;
    });
  },

  async getSubmissionById(formId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 
        hf.*,
        u.name as username,
        u.email,
        reviewer.name as reviewer_name
      FROM hts_forms hf
      LEFT JOIN users u ON hf.user_id = u.user_id
      LEFT JOIN users reviewer ON hf.reviewed_by = reviewer.user_id
      WHERE hf.form_id = ?`,
      [formId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const submission = rows[0];
    
    // Handle both encrypted (new) and plaintext (legacy) extracted_data
    if (submission.extracted_data_encrypted && submission.extracted_data_iv) {
      // New format: encrypted data (will be decrypted in frontend)
      submission.isExtractedDataEncrypted = true;
    } else if (submission.extracted_data) {
      // Legacy format: plaintext JSON (parse for backward compatibility)
      try {
        submission.extracted_data = JSON.parse(submission.extracted_data);
        submission.isExtractedDataEncrypted = false;
      } catch (error) {
        console.error('Failed to parse extracted_data:', error);
        submission.extracted_data = null;
        submission.isExtractedDataEncrypted = false;
      }
    }
    
    return submission;
  },

  async updateSubmissionStatus(formId, status, adminNotes, reviewedBy) {
    const pool = getPool();
    await pool.query(
      `UPDATE hts_forms
       SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE form_id = ?`,
      [status, adminNotes, reviewedBy, formId]
    );
  },

  async updateExtractedData(formId, extractedDataEncrypted, extractedDataIV, extractionConfidence) {
    const pool = getPool();
    await pool.query(
      `UPDATE hts_forms 
       SET extracted_data_encrypted = ?, 
           extracted_data_iv = ?, 
           extraction_confidence = ?,
           ocr_completed_at = NOW()
       WHERE form_id = ?`,
      [extractedDataEncrypted, extractedDataIV, extractionConfidence, formId]
    );
  },

  async generateControlNumber() {
    const prefix = 'HTS';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }
};

module.exports = htsFormsRepository;

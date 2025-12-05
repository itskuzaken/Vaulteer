/**
 * OCR Feedback and Analytics Routes
 * Provides endpoints for tracking unmapped keys, user feedback, and processing analytics
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

/**
 * Submit OCR correction feedback
 * POST /api/ocr-feedback/correction
 */
router.post('/correction', async (req, res) => {
  try {
    const { 
      sessionId, 
      fieldName, 
      originalValue, 
      correctedValue, 
      userId, 
      confidenceBefore,
      originalKey 
    } = req.body;
    
    if (!sessionId || !fieldName || !correctedValue) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, fieldName, correctedValue' 
      });
    }
    
    const pool = getPool();
    await pool.execute(`
      INSERT INTO ocr_user_feedback 
      (session_id, field_name, original_value, corrected_value, feedback_type, user_id, confidence_before, original_key)
      VALUES (?, ?, ?, ?, 'correction', ?, ?, ?)`,
      [sessionId, fieldName, originalValue, correctedValue, userId, confidenceBefore, originalKey]
    );
    
    console.log(`📝 OCR feedback recorded: ${fieldName} "${originalValue}" → "${correctedValue}"`);
    
    res.json({ 
      success: true, 
      message: 'OCR correction feedback recorded successfully' 
    });
  } catch (error) {
    console.error('Error saving OCR feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * Submit field confirmation (user verified field is correct)
 * POST /api/ocr-feedback/confirmation
 */
router.post('/confirmation', async (req, res) => {
  try {
    const { sessionId, fieldName, value, userId, confidence } = req.body;
    
    if (!sessionId || !fieldName) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, fieldName' 
      });
    }
    
    const pool = getPool();
    await pool.execute(`
      INSERT INTO ocr_user_feedback 
      (session_id, field_name, original_value, feedback_type, user_id, confidence_before)
      VALUES (?, ?, ?, 'confirmation', ?, ?)`,
      [sessionId, fieldName, value, userId, confidence]
    );
    
    res.json({ 
      success: true, 
      message: 'Field confirmation recorded successfully' 
    });
  } catch (error) {
    console.error('Error saving field confirmation:', error);
    res.status(500).json({ error: 'Failed to save confirmation' });
  }
});

/**
 * Get unmapped keys analytics
 * GET /api/ocr-feedback/unmapped-keys
 */
router.get('/unmapped-keys', async (req, res) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      pageType = null, 
      minFrequency = 1,
      status = 'unmapped'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE mapping_status = ?';
    let queryParams = [status];
    
    if (pageType) {
      whereClause += ' AND page_type = ?';
      queryParams.push(pageType);
    }
    
    if (minFrequency > 1) {
      whereClause += ' AND frequency_count >= ?';
      queryParams.push(minFrequency);
    }
    
    queryParams.push(parseInt(limit), offset);
    
    const pool = getPool();
    
    // Get unmapped keys with pagination
    const [unmappedKeys] = await pool.execute(`
      SELECT 
        id,
        original_key,
        normalized_key,
        frequency_count,
        mapping_status,
        suggested_mapping,
        page_type,
        last_seen,
        AVG(confidence_score) as avg_confidence,
        COUNT(*) as occurrence_count
      FROM ocr_unmapped_keys 
      ${whereClause}
      GROUP BY normalized_key, page_type
      ORDER BY frequency_count DESC, last_seen DESC 
      LIMIT ? OFFSET ?
    `, queryParams);
    
    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(DISTINCT CONCAT(normalized_key, '_', page_type)) as total
      FROM ocr_unmapped_keys 
      ${whereClause.replace('LIMIT ? OFFSET ?', '')}
    `, queryParams.slice(0, -2));
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({ 
      unmappedKeys,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching unmapped keys:', error);
    res.status(500).json({ error: 'Failed to fetch unmapped keys' });
  }
});

/**
 * Get OCR processing statistics dashboard
 * GET /api/ocr-feedback/analytics/dashboard
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { 
      startDate = null, 
      endDate = null,
      timeframe = '7d' // 1d, 7d, 30d, 90d
    } = req.query;
    
    const pool = getPool();
    
    // Calculate date range
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      const days = timeframe === '1d' ? 1 : 
                   timeframe === '7d' ? 7 : 
                   timeframe === '30d' ? 30 : 90;
      dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(days);
    }
    
    // Get overall statistics
    const [overallStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_sessions,
        AVG(mapping_rate) as avg_mapping_rate,
        AVG(overall_confidence) as avg_confidence,
        SUM(total_fields) as total_fields_processed,
        SUM(mapped_fields) as total_mapped_fields,
        SUM(unmapped_fields) as total_unmapped_fields
      FROM ocr_processing_logs 
      ${dateFilter}
    `, params);
    
    // Get daily trends
    const [dailyTrends] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sessions,
        AVG(mapping_rate) as mapping_rate,
        AVG(overall_confidence) as confidence,
        SUM(total_fields) as total_fields
      FROM ocr_processing_logs 
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);
    
    // Get top unmapped keys
    const [topUnmappedKeys] = await pool.execute(`
      SELECT 
        original_key,
        normalized_key,
        frequency_count,
        page_type,
        AVG(confidence_score) as avg_confidence
      FROM ocr_unmapped_keys 
      WHERE mapping_status = 'unmapped'
        ${startDate ? 'AND last_seen >= ?' : ''}
        ${endDate ? 'AND last_seen <= ?' : ''}
      GROUP BY normalized_key, page_type
      ORDER BY frequency_count DESC 
      LIMIT 20
    `, startDate && endDate ? [startDate, endDate] : []);
    
    // Get user feedback stats
    const [feedbackStats] = await pool.execute(`
      SELECT 
        feedback_type,
        COUNT(*) as count
      FROM ocr_user_feedback 
      ${dateFilter.replace('ocr_processing_logs', 'ocr_user_feedback')}
      GROUP BY feedback_type
    `, params);
    
    const stats = overallStats[0];
    const mappingRate = parseFloat(stats.avg_mapping_rate || 0);
    const confidence = parseFloat(stats.avg_confidence || 0);
    
    res.json({
      summary: {
        totalSessions: stats.total_sessions || 0,
        averageMappingRate: mappingRate.toFixed(1),
        averageConfidence: confidence.toFixed(1),
        totalFieldsProcessed: stats.total_fields_processed || 0,
        improvementRate: mappingRate > 70 ? '+12%' : 'baseline' // Placeholder calculation
      },
      dailyTrends: dailyTrends.map(day => ({
        ...day,
        mapping_rate: parseFloat(day.mapping_rate || 0).toFixed(1),
        confidence: parseFloat(day.confidence || 0).toFixed(1)
      })),
      topUnmappedKeys: topUnmappedKeys.slice(0, 10),
      feedbackBreakdown: feedbackStats.reduce((acc, item) => {
        acc[item.feedback_type] = item.count;
        return acc;
      }, {}),
      timeframe
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Suggest mapping for unmapped key
 * POST /api/ocr-feedback/suggest-mapping
 */
router.post('/suggest-mapping', async (req, res) => {
  try {
    const { unmappedKeyId, suggestedField, userId } = req.body;
    
    if (!unmappedKeyId || !suggestedField) {
      return res.status(400).json({ 
        error: 'Missing required fields: unmappedKeyId, suggestedField' 
      });
    }
    
    const pool = getPool();
    await pool.execute(`
      UPDATE ocr_unmapped_keys 
      SET suggested_mapping = ?, mapping_status = 'suggested'
      WHERE id = ?`,
      [suggestedField, unmappedKeyId]
    );
    
    res.json({ 
      success: true, 
      message: 'Mapping suggestion recorded successfully' 
    });
  } catch (error) {
    console.error('Error saving mapping suggestion:', error);
    res.status(500).json({ error: 'Failed to save suggestion' });
  }
});

/**
 * Get mapping improvement recommendations
 * GET /api/ocr-feedback/recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const pool = getPool();
    
    // Get frequent corrections that could improve the mapping dictionary
    const [frequentCorrections] = await pool.execute(`
      SELECT 
        original_key,
        field_name,
        COUNT(*) as correction_frequency,
        GROUP_CONCAT(DISTINCT corrected_value ORDER BY corrected_value SEPARATOR ', ') as common_values
      FROM ocr_user_feedback 
      WHERE feedback_type = 'correction'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY original_key, field_name
      HAVING correction_frequency >= 3
      ORDER BY correction_frequency DESC
      LIMIT 20
    `);
    
    // Get low confidence fields that need attention
    const [lowConfidenceFields] = await pool.execute(`
      SELECT 
        original_key,
        normalized_key,
        AVG(confidence_score) as avg_confidence,
        frequency_count
      FROM ocr_unmapped_keys
      WHERE confidence_score < 70
        AND frequency_count >= 2
      ORDER BY frequency_count DESC, avg_confidence ASC
      LIMIT 15
    `);
    
    res.json({
      recommendations: {
        mappingImprovements: frequentCorrections.map(item => ({
          originalKey: item.original_key,
          suggestedMapping: item.field_name,
          frequency: item.correction_frequency,
          commonValues: item.common_values.split(', '),
          priority: item.correction_frequency >= 10 ? 'high' : 
                   item.correction_frequency >= 5 ? 'medium' : 'low'
        })),
        lowConfidenceKeys: lowConfidenceFields.map(item => ({
          originalKey: item.original_key,
          normalizedKey: item.normalized_key,
          averageConfidence: parseFloat(item.avg_confidence).toFixed(1),
          frequency: item.frequency_count,
          recommendedAction: item.avg_confidence < 50 ? 'review_ocr_preprocessing' : 'improve_field_mapping'
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

module.exports = router;
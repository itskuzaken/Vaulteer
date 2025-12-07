const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * GET /api/template-metadata/hts
 * Returns the HTS form template metadata
 * Public endpoint - no auth required as this is just form structure
 */
router.get('/hts', (req, res) => {
  try {
    const metadataPath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
    
    // Check if file exists
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({
        error: 'Template metadata not found',
        message: 'HTS form template metadata file does not exist'
      });
    }
    
    // Read and parse metadata
    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // Return metadata
    res.json(metadata);
  } catch (error) {
    console.error('[templateMetadataRoutes] Error loading template metadata:', error);
    res.status(500).json({
      error: 'Failed to load template metadata',
      message: error.message
    });
  }
});

module.exports = router;

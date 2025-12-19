const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const s3Controller = require('../controllers/s3Controller');

// Generate presigned upload URLs for client-side uploads
router.post('/presign', authenticate, s3Controller.presignUpload);

module.exports = router;

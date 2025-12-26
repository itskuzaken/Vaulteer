const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const s3Controller = require('../controllers/s3Controller');

// Generate presigned upload URLs for client-side uploads
router.post('/presign', (req, res, next) => auth.authenticate(req, res, next), s3Controller.presignUpload);

module.exports = router;

const express = require('express');
const router = express.Router();
const htsFormsController = require('../controllers/htsFormsController');
const { authenticate, requireRole } = require('../middleware/auth');

// Staff/Volunteer routes
router.post('/submit', authenticate, htsFormsController.submitForm);
router.get('/my-submissions', authenticate, htsFormsController.getMySubmissions);

// Admin routes
router.get('/all', authenticate, requireRole(['admin']), htsFormsController.getAllSubmissions);
router.get('/:formId', authenticate, requireRole(['admin']), htsFormsController.getSubmissionDetails);
router.put('/:formId/status', authenticate, requireRole(['admin']), htsFormsController.updateSubmissionStatus);

module.exports = router;

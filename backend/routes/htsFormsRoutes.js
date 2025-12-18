const express = require('express');
const router = express.Router();
const multer = require('multer');
const htsFormsController = require('../controllers/htsFormsController');
const authMiddleware = require('../middleware/auth');
const authenticate = authMiddleware.authenticate || ((req,res,next)=>next());
const requireRole = authMiddleware.requireRole || ((roles) => (req, res, next) => next());

// Configure multer for in-memory storage (no disk writes for security)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 2 // front and back images only
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Staff/Volunteer routes
router.post('/analyze-ocr', 
  authenticate, 
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]),
  htsFormsController.analyzeOCR
);
router.post('/submit', authenticate, htsFormsController.submitForm);
router.put('/:formId/extracted-data', authenticate, htsFormsController.updateExtractedData);
router.get('/my-submissions', authenticate, htsFormsController.getMySubmissions);

// Admin routes
router.get('/all', authenticate, requireRole(['admin']), htsFormsController.getAllSubmissions);
router.get('/:formId', authenticate, requireRole(['admin']), htsFormsController.getSubmissionDetails);
router.get('/:formId/image/:side', authenticate, requireRole(['admin']), htsFormsController.getFormImage);
router.put('/:formId/status', authenticate, requireRole(['admin']), htsFormsController.updateSubmissionStatus);

module.exports = router;

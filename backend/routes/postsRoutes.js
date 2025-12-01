const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate } = require("../middleware/auth");
const postsController = require("../controllers/postsController");

const router = express.Router();

// Authorization middleware - same pattern as events
const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    const userRole = req.authenticatedUser.role?.toLowerCase();
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

// Configure Multer for file uploads
const uploadsDir = path.join(__dirname, "../uploads/posts");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Routes
// Public routes (read-only, authenticated users)
router.get("/", authenticate, postsController.getPosts);
router.get("/:uid", authenticate, postsController.getPost);

// Admin and Staff only routes (create, update, delete)
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "staff"),
  postsController.createPost
);

router.put(
  "/:uid",
  authenticate,
  authorizeRoles("admin", "staff"),
  postsController.updatePost
);

router.post(
  "/:uid/publish",
  authenticate,
  authorizeRoles("admin", "staff"),
  postsController.publishPost
);

router.post(
  "/:uid/archive",
  authenticate,
  authorizeRoles("admin", "staff"),
  postsController.archivePost
);

router.put(
  "/:uid/unarchive",
  authenticate,
  authorizeRoles("admin", "staff"),
  postsController.unarchivePost
);

router.delete(
  "/:uid",
  authenticate,
  authorizeRoles("admin", "staff"),
  postsController.deletePost
);

// File upload endpoint (for news_update posts only)
router.post(
  "/upload-attachment",
  authenticate,
  authorizeRoles("admin", "staff"),
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Construct full URL for the uploaded file
      const protocol = req.protocol;
      const host = req.get('host');
      const fileUrl = `${protocol}://${host}/uploads/posts/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload file",
        error: error.message,
      });
    }
  }
);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File is too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

module.exports = router;

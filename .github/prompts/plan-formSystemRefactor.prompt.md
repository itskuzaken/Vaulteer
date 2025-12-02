# HTS Form System Refactor Plan

## Overview
Restructure the HTS form submission system to separate staff/volunteer views from admin views, remove the dropdown pattern, and prepare for AWS Textract integration.

## Current State
- **FormSubmission.js**: Empty placeholder component
- **SubmitForm.js**: Camera capture implementation with manual submit
- **ViewSubmitted.js**: Grid display showing demo data
- **Integration**: Used in both StaffDashboardPage and AdminDashboardPage via dropdown pattern
- **Issues**: 
  - No role-based separation
  - Not connected to backend
  - Shows same view for all users
  - Nested dropdown structure instead of direct routing

## Target Architecture

### User Roles & Access
- **Staff/Volunteer**: 
  - Can capture and submit forms
  - Can view own submissions (control number, timestamp, status only)
  - Cannot see images or extracted data
- **Admin**:
  - Can view all submissions from all users
  - Can see full details including images and extracted data
  - Can approve/reject submissions
  - Can trigger re-extraction with Textract (future)

### Component Structure
```
frontend/src/components/navigation/Form/
├── HTSFormManagement.js    (Staff/Volunteer - Combined: Submit & View submissions with tabs)
└── AdminFormReview.js      (Admin - View all submissions with details)
```

### Database Schema
```sql
CREATE TABLE hts_forms (
  form_id INT PRIMARY KEY AUTO_INCREMENT,
  control_number VARCHAR(50) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  submitter_name VARCHAR(255) NOT NULL,
  form_image_url VARCHAR(500) NOT NULL,
  extracted_data JSON NULL,
  status ENUM('pending', 'processing', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Backend Structure
```
backend/
├── routes/
│   └── htsFormsRoutes.js
├── controllers/
│   └── htsFormsController.js
├── repositories/
│   └── htsFormsRepository.js
└── services/
    └── textractService.js (future)
```

## Implementation Plan (8 hours)

### Phase 1: Backend Setup (2 hours)

#### Step 1.1: Database Migration (15 min)
Create `backend/migrations/20251202_create_hts_forms.sql`

#### Step 1.2: Repository Layer (30 min)
Create `backend/repositories/htsFormsRepository.js`:
```javascript
const pool = require('../db/pool');

const htsFormsRepository = {
  async createSubmission(data) {
    const { controlNumber, userId, submitterName, imageUrl } = data;
    const [result] = await pool.query(
      `INSERT INTO hts_forms (control_number, user_id, submitter_name, form_image_url)
       VALUES (?, ?, ?, ?)`,
      [controlNumber, userId, submitterName, imageUrl]
    );
    return result.insertId;
  },

  async getSubmissionsByUserId(userId) {
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
    const [rows] = await pool.query(
      `SELECT f.*, u.username, u.email
       FROM hts_forms f
       JOIN users u ON f.user_id = u.user_id
       ORDER BY f.created_at DESC`
    );
    return rows;
  },

  async getSubmissionById(formId) {
    const [rows] = await pool.query(
      `SELECT f.*, u.username, u.email
       FROM hts_forms f
       JOIN users u ON f.user_id = u.user_id
       WHERE f.form_id = ?`,
      [formId]
    );
    return rows[0];
  },

  async updateSubmissionStatus(formId, status, adminNotes, reviewedBy) {
    await pool.query(
      `UPDATE hts_forms
       SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE form_id = ?`,
      [status, adminNotes, reviewedBy, formId]
    );
  },

  async updateExtractedData(formId, extractedData) {
    await pool.query(
      `UPDATE hts_forms SET extracted_data = ? WHERE form_id = ?`,
      [JSON.stringify(extractedData), formId]
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
```

#### Step 1.3: Controller Layer (45 min)
Create `backend/controllers/htsFormsController.js`:
```javascript
const htsFormsRepository = require('../repositories/htsFormsRepository');
const asyncHandler = require('../middleware/asyncHandler');

const htsFormsController = {
  submitForm: asyncHandler(async (req, res) => {
    const { userId, submitterName, imageBase64 } = req.body;

    if (!userId || !submitterName || !imageBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate control number
    const controlNumber = await htsFormsRepository.generateControlNumber();

    // TODO: Upload image to Firebase Storage or S3
    // For now, store base64 directly (not recommended for production)
    const imageUrl = imageBase64; // Replace with actual upload URL

    // Create submission
    const formId = await htsFormsRepository.createSubmission({
      controlNumber,
      userId,
      submitterName,
      imageUrl
    });

    res.status(201).json({
      success: true,
      formId,
      controlNumber,
      message: 'Form submitted successfully'
    });
  }),

  getMySubmissions: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const submissions = await htsFormsRepository.getSubmissionsByUserId(userId);

    res.json({
      success: true,
      submissions
    });
  }),

  getAllSubmissions: asyncHandler(async (req, res) => {
    // Verify admin role (should be done in middleware)
    const submissions = await htsFormsRepository.getAllSubmissions();

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
  })
};

module.exports = htsFormsController;
```

#### Step 1.4: Routes (30 min)
Create `backend/routes/htsFormsRoutes.js`:
```javascript
const express = require('express');
const router = express.Router();
const htsFormsController = require('../controllers/htsFormsController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles'); // Create this middleware

// Staff/Volunteer routes
router.post('/submit', authenticateToken, htsFormsController.submitForm);
router.get('/my-submissions/:userId', authenticateToken, htsFormsController.getMySubmissions);

// Admin routes
router.get('/all', authenticateToken, isAdmin, htsFormsController.getAllSubmissions);
router.get('/:formId', authenticateToken, isAdmin, htsFormsController.getSubmissionDetails);
router.put('/:formId/status', authenticateToken, isAdmin, htsFormsController.updateSubmissionStatus);

module.exports = router;
```

Add to `backend/server.js`:
```javascript
const htsFormsRoutes = require('./routes/htsFormsRoutes');
app.use('/api/hts-forms', htsFormsRoutes);
```

### Phase 2: Frontend Components (4 hours)

#### Step 2.1: HTSFormManagement Component (Combined - 2 hours)
Create `frontend/src/components/navigation/Form/HTSFormManagement.js`:
```javascript
"use client";
import { useState, useRef, useEffect } from "react";
import { IoCamera, IoClose, IoCheckmark, IoCloudUploadOutline, IoDocumentText, IoTime, IoCheckmarkCircle, IoAlertCircle, IoHourglassOutline, IoAddCircle, IoListOutline } from "react-icons/io5";
import { getAuth } from "firebase/auth";
import Button from "../../ui/Button";

export default function HTSFormManagement() {
  const [activeTab, setActiveTab] = useState("submit"); // 'submit' or 'history'
  // Submit form state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [controlNumber, setControlNumber] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Submissions history state
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsCameraOpen(true);
      setCapturedImage(null);
      setSubmitSuccess(false);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    startCamera();
  };

  const submitForm = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in to submit a form.");
      return;
    }

    if (!capturedImage) {
      alert("Please capture an image first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hts-forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userId: user.uid,
          submitterName: user.displayName || user.email,
          imageBase64: capturedImage
        })
      });

      const data = await response.json();

      if (data.success) {
        setControlNumber(data.controlNumber);
        setSubmitSuccess(true);
        setCapturedImage(null);
      } else {
        alert("Failed to submit form. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setControlNumber(null);
    setCapturedImage(null);
    // Switch to history tab and refresh
    setActiveTab("history");
    fetchSubmissions();
  };

  const fetchSubmissions = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError("You must be logged in to view submissions.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/hts-forms/my-submissions/${user.uid}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSubmissions(data.submissions);
      } else {
        setError("Failed to load submissions.");
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setError("An error occurred while loading submissions.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <IoCheckmarkCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <IoAlertCircle className="w-5 h-5 text-red-600" />;
      case "processing":
        return <IoHourglassOutline className="w-5 h-5 text-blue-600" />;
      default:
        return <IoHourglassOutline className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium uppercase";
    switch (status) {
      case "approved":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`;
      case "processing":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchSubmissions();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoCheckmark className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Form Submitted Successfully
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your HTS form has been submitted for review.
          </p>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Control Number</p>
            <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
              {controlNumber}
            </p>
          </div>
          <Button onClick={resetForm} variant="primary">
            Submit Another Form
          </Button>
        </div>
      </div>
    );
  }

  // Render Submit Form Content
  const renderSubmitForm = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Submit HTS Form
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Capture a clear photo of your completed HTS form for submission.
        </p>

        {!isCameraOpen && !capturedImage && (
          <div className="text-center">
            <Button onClick={startCamera} variant="primary" className="gap-2">
              <IoCamera className="w-5 h-5" />
              Open Camera
            </Button>
          </div>
        )}

        {isCameraOpen && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex justify-center gap-4">
                <Button onClick={stopCamera} variant="ghost" className="gap-2">
                  <IoClose className="w-5 h-5" />
                  Cancel
                </Button>
                <Button onClick={captureImage} variant="primary" className="gap-2">
                  <IoCamera className="w-5 h-5" />
                  Capture
                </Button>
              </div>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img src={capturedImage} alt="Captured form" className="w-full h-auto" />
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={retakeImage} variant="secondary">
                Retake Photo
              </Button>
              <Button
                onClick={submitForm}
                variant="primary"
                disabled={isSubmitting}
                className="gap-2"
              >
                <IoCloudUploadOutline className="w-5 h-5" />
                {isSubmitting ? "Submitting..." : "Submit Form"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📸 Photo Guidelines
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Ensure all form fields are clearly visible</li>
          <li>• Use good lighting conditions</li>
          <li>• Keep the form flat and avoid shadows</li>
          <li>• Make sure text is readable</li>
        </ul>
      </div>
    </div>
  );

  // Render Submissions History Content
  const renderSubmissionsHistory = () => {

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      );
    }

    if (submissions.length === 0) {
      return (
        <div className="text-center py-12">
          <IoDocumentText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Submissions Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You haven't submitted any HTS forms yet.
          </p>
          <div className="mt-6">
            <Button onClick={() => setActiveTab("submit")} variant="primary" className="gap-2">
              <IoAddCircle className="w-5 h-5" />
              Submit Your First Form
            </Button>
          </div>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          My Form Submissions
        </h2>

        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.form_id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-red dark:hover:border-primary-red transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <IoDocumentText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {submission.control_number}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <IoTime className="w-4 h-4" />
                      {formatDate(submission.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(submission.status)}
                  <span className={getStatusBadge(submission.status)}>
                    {submission.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Only control numbers, timestamps, and status are visible to you.
            Admins will review your submissions and update their status accordingly.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("submit")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "submit"
                ? "bg-primary-red text-white border-b-2 border-primary-red"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <IoCamera className="w-5 h-5" />
            Submit Form
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "history"
                ? "bg-primary-red text-white border-b-2 border-primary-red"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <IoListOutline className="w-5 h-5" />
            My Submissions
            {submissions.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                {submissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "submit" ? renderSubmitForm() : renderSubmissionsHistory()}
    </div>
  );
}
```

#### Step 2.2: AdminFormReview Component (90 min)
Create `frontend/src/components/navigation/Form/AdminFormReview.js`:
```javascript
"use client";
import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import Image from "next/image";
import { IoSearchOutline, IoImageOutline, IoPersonOutline, IoCalendarOutline, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import Button from "../../ui/Button";

export default function AdminFormReview() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [searchTerm, statusFilter, submissions]);

  const fetchAllSubmissions = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/hts-forms/all`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.control_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.submitter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  };

  const handleStatusUpdate = async (formId, newStatus, adminNotes = "") => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/hts-forms/${formId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({
            status: newStatus,
            adminNotes,
            reviewedBy: user.uid
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchAllSubmissions();
        setSelectedSubmission(null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by control number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-red focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-red focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Submissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSubmissions.map((submission) => (
          <div
            key={submission.form_id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedSubmission(submission)}
          >
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 relative overflow-hidden">
              <Image
                src={submission.form_image_url}
                alt={submission.control_number}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h3 className="font-mono font-semibold text-sm text-gray-900 dark:text-white mb-2">
              {submission.control_number}
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <IoPersonOutline className="w-4 h-4" />
                {submission.submitter_name}
              </div>
              <div className="flex items-center gap-2">
                <IoCalendarOutline className="w-4 h-4" />
                {formatDate(submission.created_at)}
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  submission.status === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : submission.status === "rejected"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {submission.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No submissions found.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Form Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                  <Image
                    src={selectedSubmission.form_image_url}
                    alt={selectedSubmission.control_number}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Control Number</label>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {selectedSubmission.control_number}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Submitter</label>
                    <p className="text-gray-900 dark:text-white">{selectedSubmission.submitter_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Username</label>
                    <p className="text-gray-900 dark:text-white">{selectedSubmission.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Submitted</label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(selectedSubmission.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                    <p className="text-gray-900 dark:text-white capitalize">{selectedSubmission.status}</p>
                  </div>

                  {selectedSubmission.extracted_data && (
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">
                        Extracted Data
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-sm">
                        <pre className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {JSON.stringify(selectedSubmission.extracted_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={() => setSelectedSubmission(null)} variant="secondary">
                  Close
                </Button>
                {selectedSubmission.status === "pending" && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate(selectedSubmission.form_id, "rejected")}
                      variant="danger"
                      className="gap-2"
                    >
                      <IoCloseCircle className="w-5 h-5" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(selectedSubmission.form_id, "approved")}
                      variant="primary"
                      className="gap-2"
                    >
                      <IoCheckmarkCircle className="w-5 h-5" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Phase 3: Dashboard Integration (30 minutes)

#### Step 3.1: Update Staff/Volunteer Dashboards (15 min)
Modify `frontend/src/components/dashboards/StaffDashboardPage.js` and `VolunteerDashboardPage.js`:
```javascript
// Remove FormSubmission from imports
// Add new combined component
import HTSFormManagement from "../navigation/Form/HTSFormManagement";

// Update mainRoutes array - Single navigation item for HTS Forms
const mainRoutes = [
  {
    id: "hts-forms",
    label: "HTS Forms",
    icon: IoDocumentText,
    component: HTSFormManagement
  }
  // ... other routes
];
```

#### Step 3.2: Update Admin Dashboard (15 min)
Modify `frontend/src/components/dashboards/AdminDashboardPage.js`:
```javascript
// Add admin component
import AdminFormReview from "../navigation/Form/AdminFormReview";

// Update mainRoutes array
const mainRoutes = [
  {
    id: "review-forms",
    label: "Review Forms",
    icon: IoDocumentText,
    component: AdminFormReview
  }
  // ... other routes
];
```

### Phase 4: Cleanup (5 minutes)

#### Step 4.1: Delete Old Components
Delete the following files:
- `frontend/src/components/navigation/Form/FormSubmission.js`
- `frontend/src/components/navigation/Form/SubmitForm.js`
- `frontend/src/components/navigation/Form/ViewSubmitted.js`

**Note:** Only 2 new components are created instead of 3:
1. `HTSFormManagement.js` - Combined submit + history with tabs (Staff/Volunteer)
2. `AdminFormReview.js` - Admin review interface

### Phase 5: Testing Checklist

#### Backend Testing
- [ ] Run database migration successfully
- [ ] Test form submission endpoint with Postman
- [ ] Test get my submissions endpoint
- [ ] Test admin get all submissions endpoint
- [ ] Test status update endpoint
- [ ] Verify control number generation is unique
- [ ] Test role-based access (non-admin cannot access admin routes)

#### Frontend Testing
- [ ] Test camera access on desktop
- [ ] Test camera access on mobile
- [ ] Test image capture and preview
- [ ] Test form submission flow
- [ ] Test success message and control number display
- [ ] Test MySubmissions loading states
- [ ] Test MySubmissions empty state
- [ ] Test MySubmissions list display
- [ ] Test AdminFormReview grid view
- [ ] Test AdminFormReview search filter
- [ ] Test AdminFormReview status filter
- [ ] Test AdminFormReview detail modal
- [ ] Test approve/reject workflow
- [ ] Test responsive design on mobile

#### Integration Testing
- [ ] Staff can submit forms and see own submissions
- [ ] Volunteer can submit forms and see own submissions
- [ ] Staff/Volunteer cannot see images or extracted data
- [ ] Admin can see all submissions
- [ ] Admin can see full details including images
- [ ] Admin can approve/reject submissions
- [ ] Dashboard navigation works correctly
- [ ] Logout and login preserves state

## Future Enhancements (AWS Textract Integration)

### Prerequisites
After this refactor is complete, we'll be ready to integrate AWS Textract:

1. **Install AWS SDK**
```bash
npm install @aws-sdk/client-textract @aws-sdk/client-s3
```

2. **Create TextractService**
```javascript
// backend/services/textractService.js
const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");

const textractService = {
  async extractFormData(imageUrl) {
    const client = new TextractClient({ region: process.env.AWS_REGION });
    const command = new AnalyzeDocumentCommand({
      Document: { S3Object: { Bucket: "...", Name: "..." } },
      FeatureTypes: ["FORMS", "TABLES"]
    });
    const response = await client.send(command);
    return parseTextractResponse(response);
  }
};
```

3. **Update Controller**
Add Textract call after image upload in `submitForm`:
```javascript
const extractedData = await textractService.extractFormData(imageUrl);
await htsFormsRepository.updateExtractedData(formId, extractedData);
```

4. **Update AdminFormReview**
Display extracted data in a formatted table/form view.

## Notes
- This plan assumes Firebase Storage or S3 for image uploads (currently storing base64, not production-ready)
- Add proper error handling and loading states throughout
- Consider implementing pagination for admin view with many submissions
- Add real-time updates using WebSockets or polling for status changes
- Implement notification system to alert users when their submission status changes
- Add export functionality for admins (CSV/PDF reports)
- Consider implementing audit logs for admin actions

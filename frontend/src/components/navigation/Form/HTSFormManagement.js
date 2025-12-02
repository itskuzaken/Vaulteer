"use client";
import { useState, useRef, useEffect } from "react";
import { IoCamera, IoClose, IoCheckmark, IoCloudUploadOutline, IoDocumentText, IoTime, IoCheckmarkCircle, IoAlertCircle, IoHourglassOutline, IoAddCircle, IoListOutline } from "react-icons/io5";
import { getAuth } from "firebase/auth";
import Button from "../../ui/Button";
import { API_BASE } from "../../../config/config";
import { encryptFormImages, encryptJSON, generateEncryptionKey, exportKey } from "../../../utils/imageEncryption";
import {
  isCameraSupported,
  getCameraPermission,
  requestCameraPermissionWithFallback,
  stopCameraStream,
  isCameraPermissionDenied,
} from "../../../services/cameraPermissionService";

export default function HTSFormManagement() {
  const [activeTab, setActiveTab] = useState("submit"); // 'submit' or 'history'
  // Submit form state
  const [currentStep, setCurrentStep] = useState("front"); // 'front', 'back', 'result', 'ocr-review', or 'review'
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [controlNumber, setControlNumber] = useState(null);
  const [cameraPermission, setCameraPermission] = useState("prompt"); // "granted", "denied", "prompt", "unsupported"
  const [hasAttemptedCameraRequest, setHasAttemptedCameraRequest] = useState(false);
  const [isRequestingCameraPermission, setIsRequestingCameraPermission] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const metadataTimeoutRef = useRef(null);

  // OCR-first workflow state
  const [extractedData, setExtractedData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOCRReview, setShowOCRReview] = useState(false);
  
  // OCR editing state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Submissions history state
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check camera permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (isCameraSupported()) {
        const permission = await getCameraPermission();
        setCameraPermission(permission);
      } else {
        setCameraPermission("unsupported");
      }
    };
    checkPermission();
  }, []);

  const startCamera = async (side) => {
    setHasAttemptedCameraRequest(true);
    setIsRequestingCameraPermission(true);
    try {
      // Check if camera is supported
      if (!isCameraSupported()) {
        alert(
          "📷 Camera Not Supported\n\n" +
          "Your browser doesn't support camera access.\n\n" +
          "Please:\n" +
          "• Use a modern browser (Chrome, Firefox, Edge, Safari)\n" +
          "• Ensure you're using HTTPS connection\n" +
          "• Update your browser to the latest version"
        );
        return;
      }

      // ALWAYS request camera permission - this triggers the browser's Allow/Block popup
      // The browser will automatically handle if permission was previously granted
      console.log("📷 Requesting camera access...");
      const stream = await requestCameraPermissionWithFallback();
      
      // If we get here, permission was granted
      console.log("✅ Camera access granted by user!");
      setCameraPermission("granted");
      
      // Store stream immediately
      streamRef.current = stream;
      
      // Open modal and set step FIRST, then assign stream after React renders
      setHasAttemptedCameraRequest(false);
      setIsRequestingCameraPermission(false);
      setIsCameraOpen(true);
      setCurrentStep(side);
      setSubmitSuccess(false);
      setIsVideoReady(false);
      
      // Wait for modal to render, then assign stream to video
      console.log("⏳ Waiting for video element to mount...");
      setTimeout(() => {
        if (!videoRef.current) {
          console.error("❌ Video element not found after modal opened!");
          alert("Failed to initialize camera view. Please try again.");
          stopCamera();
          return;
        }
        
        const video = videoRef.current;
        console.log("📹 Video element found, assigning stream...");
        video.srcObject = stream;
        
        // Wait for video to be ready with polling (more reliable than events on mobile)
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          console.log(`[Check ${checkCount}] Video dimensions: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`);
          
          // Check if video has valid dimensions and is ready
          if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
            console.log(`✅ Video ready: ${video.videoWidth}x${video.videoHeight}`);
            setIsVideoReady(true);
            clearInterval(checkInterval);
            
            // Ensure video is playing
            if (video.paused) {
              video.play().catch(err => console.warn("Play error:", err));
            }
          } else if (checkCount >= 30) { // 15 seconds timeout
            console.error("⏱️ Video initialization timeout");
            console.error(`Final state: width=${video.videoWidth}, height=${video.videoHeight}, readyState=${video.readyState}`);
            clearInterval(checkInterval);
            alert("Camera failed to initialize. Please try again or use a different browser.");
            stopCamera();
          }
        }, 500);
        
        // Store interval for cleanup
        metadataTimeoutRef.current = checkInterval;
      }, 100); // Small delay to ensure React has rendered the modal
    } catch (error) {
      console.error("❌ Camera access error:", error);
      
      // Update permission state based on error type
      if (error.userAction === "permission_denied") {
        console.log("🔒 User denied camera permission");
        setCameraPermission("denied");
      }
      
      // Show user-friendly error message from cameraPermissionService via in-app banner
      console.warn(error.message);
      setIsRequestingCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }
    if (metadataTimeoutRef.current) {
      // Clear interval or timeout
      clearInterval(metadataTimeoutRef.current);
      clearTimeout(metadataTimeoutRef.current);
      metadataTimeoutRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsVideoReady(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      
      // Validate video dimensions before capture
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error("❌ Video dimensions are 0x0 - not ready for capture");
        alert("Camera is still loading. Please wait a moment and try again.");
        return;
      }
      
      console.log(`📸 Capturing image: ${video.videoWidth}x${video.videoHeight}`);
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      
      if (currentStep === "front") {
        setFrontImage(imageData);
        stopCamera();
        setCurrentStep("back");
      } else if (currentStep === "back") {
        setBackImage(imageData);
        stopCamera();
        setCurrentStep("result");
      }
    }
  };

  const retakeImage = (side) => {
    if (side === "front") {
      setFrontImage(null);
      startCamera("front");
    } else if (side === "back") {
      setBackImage(null);
      startCamera("back");
    }
  };

  // Helper function to convert base64 data URL to Blob with explicit MIME type
  const dataURLtoBlob = (dataURL, mimeType = 'image/jpeg') => {
    try {
      const base64 = dataURL.split(',')[1];
      const byteString = atob(base64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      
      return new Blob([uint8Array], { type: mimeType });
    } catch (error) {
      console.error("Error converting data URL to blob:", error);
      throw new Error("Failed to convert image data");
    }
  };

  const submitForm = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in to submit a form.");
      return;
    }

    if (!frontImage || !backImage || !testResult) {
      alert("Please complete all steps before submitting.");
      return;
    }

    if (!extractedData) {
      alert("Please analyze images with OCR before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Encrypt images and extracted data with same key (different IVs)
      console.log("[Submit] Encrypting images and extracted OCR data for privacy...");
      console.log("[Submit] Extracted data size:", JSON.stringify(extractedData).length, "bytes");
      
      const encrypted = await encryptFormSubmission(frontImage, backImage, extractedData);
      
      // Validate encryption output
      console.log("[Submit] Encryption complete. Validating encrypted data types...");
      console.log("[Submit] - frontImage type:", typeof encrypted.frontImage, "length:", encrypted.frontImage?.length);
      console.log("[Submit] - backImage type:", typeof encrypted.backImage, "length:", encrypted.backImage?.length);
      console.log("[Submit] - frontImageIV type:", typeof encrypted.frontImageIV, "length:", encrypted.frontImageIV?.length);
      console.log("[Submit] - backImageIV type:", typeof encrypted.backImageIV, "length:", encrypted.backImageIV?.length);
      console.log("[Submit] - extractedDataEncrypted type:", typeof encrypted.extractedDataEncrypted, "length:", encrypted.extractedDataEncrypted?.length);
      console.log("[Submit] - extractedDataIV type:", typeof encrypted.extractedDataIV, "length:", encrypted.extractedDataIV?.length);
      console.log("[Submit] - encryptionKey type:", typeof encrypted.encryptionKey, "length:", encrypted.encryptionKey?.length);
      
      const idToken = await user.getIdToken();
      const payload = {
        frontImageBase64: encrypted.frontImage,
        backImageBase64: encrypted.backImage,
        frontImageIV: encrypted.frontImageIV,
        backImageIV: encrypted.backImageIV,
        extractedDataEncrypted: encrypted.extractedDataEncrypted,
        extractedDataIV: encrypted.extractedDataIV,
        encryptionKey: encrypted.encryptionKey,
        testResult: testResult,
        extractionConfidence: extractedData.confidence
      };
      
      console.log("[Submit] Sending request to backend with payload size:", JSON.stringify(payload).length, "bytes");
      
      const response = await fetch(`${API_BASE}/hts-forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      console.log("[Submit] Response status:", response.status, response.statusText);
      
      const data = await response.json();
      console.log("[Submit] Response data:", data);

      if (data.success) {
        setControlNumber(data.controlNumber);
        setSubmitSuccess(true);
        setFrontImage(null);
        setBackImage(null);
        setTestResult(null);
        setExtractedData(null);
        setShowOCRReview(false);
        setCurrentStep("front");
      } else {
        const errorMsg = `Failed to submit form: ${data.error || 'Unknown error'}${data.details ? '\nDetails: ' + data.details : ''}`;
        console.error("[Submit] Backend error:", errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error("[Submit] Error submitting form:", error);
      console.error("[Submit] Error stack:", error.stack);
      alert(`An error occurred: ${error.message}\n\nPlease check the console for details and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format date object to YYYY-MM-DD for input
  const formatDateForInput = (dateObj) => {
    if (!dateObj) return '';
    if (typeof dateObj === 'string') return dateObj;
    if (dateObj.raw) {
      // Parse DD/MM/YYYY to YYYY-MM-DD
      const parts = dateObj.raw.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return '';
  };

  // Validate edited fields
  const validateEditedFields = () => {
    const errors = {};
    
    // PhilHealth number validation (12 digits)
    if (editableData.philHealthNumber && !/^\d{12}$/.test(editableData.philHealthNumber.replace(/-/g, ''))) {
      errors.philHealthNumber = 'Must be 12 digits';
    }
    
    // Name validation (letters, spaces, hyphens, dots only)
    const namePattern = /^[a-zA-Z\s\-\.]+$/;
    if (editableData.fullName && !namePattern.test(editableData.fullName)) {
      errors.fullName = 'Only letters, spaces, hyphens, and dots allowed';
    }
    if (editableData.firstName && !namePattern.test(editableData.firstName)) {
      errors.firstName = 'Only letters, spaces, hyphens, and dots allowed';
    }
    if (editableData.lastName && !namePattern.test(editableData.lastName)) {
      errors.lastName = 'Only letters, spaces, hyphens, and dots allowed';
    }
    
    // Date validation
    if (editableData.testDate && new Date(editableData.testDate) > new Date()) {
      errors.testDate = 'Test date cannot be in the future';
    }
    if (editableData.birthDate) {
      const birthDate = new Date(editableData.birthDate);
      if (birthDate > new Date()) {
        errors.birthDate = 'Birth date cannot be in the future';
      }
      if (birthDate < new Date('1920-01-01')) {
        errors.birthDate = 'Invalid birth date';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field changes in edit mode
  const handleFieldChange = (fieldName, value) => {
    setEditableData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  // Save edited data
  const saveEditedData = () => {
    if (!validateEditedFields()) {
      alert('Please fix validation errors before saving.');
      return;
    }
    
    // Merge edited fields back into extractedData
    setExtractedData(prev => ({
      ...prev,
      ...editableData,
      // Mark as edited for tracking
      wasEdited: true,
      editedFields: Object.keys(editableData).filter(
        key => editableData[key] !== prev[key]
      )
    }));
    
    setIsEditMode(false);
    alert('Changes saved successfully!');
  };

  // Enter edit mode
  const enterEditMode = () => {
    setEditableData({
      testResult: extractedData.testResult || '',
      fullName: extractedData.fullName || '',
      firstName: extractedData.firstName || '',
      lastName: extractedData.lastName || '',
      testDate: formatDateForInput(extractedData.testDate),
      birthDate: formatDateForInput(extractedData.birthDate),
      philHealthNumber: extractedData.philHealthNumber || '',
      testingFacility: extractedData.testingFacility || ''
    });
    setFieldErrors({});
    setIsEditMode(true);
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditableData(null);
    setFieldErrors({});
  };

  const handleAnalyzeImages = async () => {
    if (!frontImage || !backImage) {
      alert("Please capture both front and back images first.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in to analyze images.");
        return;
      }

      // Convert base64 to blob with explicit MIME type for multipart upload
      console.log("[OCR] Converting images to blobs with MIME type image/jpeg");
      const frontBlob = dataURLtoBlob(frontImage, 'image/jpeg');
      const backBlob = dataURLtoBlob(backImage, 'image/jpeg');

      console.log(`[OCR] Front blob: ${frontBlob.size} bytes, type: ${frontBlob.type}`);
      console.log(`[OCR] Back blob: ${backBlob.size} bytes, type: ${backBlob.type}`);

      const formData = new FormData();
      formData.append('frontImage', frontBlob, 'front.jpg');
      formData.append('backImage', backBlob, 'back.jpg');

      const idToken = await user.getIdToken();
      const response = await fetch(`${API_BASE}/hts-forms/analyze-ocr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setExtractedData(data.data);
        setShowOCRReview(true);
        console.log("[OCR Analysis] Extraction completed with confidence:", data.data?.confidence);
      } else {
        alert(`Failed to analyze images: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error analyzing images:", error);
      alert("Failed to analyze images. Please ensure images are clear and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setControlNumber(null);
    setFrontImage(null);
    setBackImage(null);
    setTestResult(null);
    setExtractedData(null);
    setShowOCRReview(false);
    setCurrentStep("front");
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
        `${API_BASE}/hts-forms/my-submissions`,
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
      {/* Camera Permission Status Banner */}
      {cameraPermission === "granted" && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-4 flex items-start gap-3">
          <IoCheckmarkCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Camera Access Granted ✓
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              Your camera is ready to capture HTS form images. Click the buttons below to start.
            </p>
          </div>
        </div>
      )}
      
      {cameraPermission === "denied" && hasAttemptedCameraRequest && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <IoAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
              Camera Access Blocked 🔒
            </h4>
            <p className="text-sm text-red-800 dark:text-red-200 mb-2">
              Camera permission was denied. To enable camera access:
            </p>
            <ol className="text-sm text-red-800 dark:text-red-200 list-decimal list-inside space-y-1">
              <li>Click the <strong>🔒 lock icon</strong> in your browser&apos;s address bar</li>
              <li>Find <strong>&quot;Camera&quot;</strong> and change to <strong>&quot;Allow&quot;</strong></li>
              <li>Refresh the page or click the capture button again</li>
            </ol>
            <div className="mt-3">
              <Button onClick={() => startCamera(currentStep)} variant="secondary" size="small">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {(cameraPermission === "prompt" || (cameraPermission === "denied" && !hasAttemptedCameraRequest)) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4 flex items-start gap-3">
          <IoCamera className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Camera Permission Required 📷
            </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
              When you click <strong>&quot;Capture Front&quot;</strong>, your browser will show a popup asking for camera permission. 
              Click <strong>&quot;Allow&quot;</strong> to enable the camera (similar to enabling push notifications).
            </p>
            {isRequestingCameraPermission && (
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-2 font-medium">Requesting camera access — a browser popup should appear. If not, check your browser settings or try again.</p>
            )}
          </div>
        </div>
      )}

      {cameraPermission === "unsupported" && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4 flex items-start gap-3">
          <IoAlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Camera Not Supported ⚠️
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your browser doesn&apos;t support camera access. Please use a modern browser (Chrome, Firefox, Safari, or Edge) with HTTPS connection.
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${currentStep === "front" || currentStep === "back" || currentStep === "result" ? "text-primary-red" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${frontImage ? "bg-green-500 text-white" : currentStep === "front" ? "bg-primary-red text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {frontImage ? <IoCheckmark /> : "1"}
            </div>
            <span className="text-sm font-medium">Front</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
          <div className={`flex items-center gap-2 ${currentStep === "back" || currentStep === "result" ? "text-primary-red" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${backImage ? "bg-green-500 text-white" : currentStep === "back" ? "bg-primary-red text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {backImage ? <IoCheckmark /> : "2"}
            </div>
            <span className="text-sm font-medium">Back</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
          <div className={`flex items-center gap-2 ${currentStep === "result" ? "text-primary-red" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${testResult ? "bg-green-500 text-white" : currentStep === "result" ? "bg-primary-red text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {testResult ? <IoCheckmark /> : "3"}
            </div>
            <span className="text-sm font-medium">Result</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {currentStep === "front" && "Capture Front of HTS Form"}
          {currentStep === "back" && "Capture Back of HTS Form"}
          {currentStep === "result" && "Select Test Result"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {currentStep === "front" && "Take a clear photo of the front side of your HTS form"}
          {currentStep === "back" && "Take a clear photo of the back side of your HTS form"}
          {currentStep === "result" && "Select whether the test result is reactive or non-reactive"}
        </p>

        {/* Camera Modal */}
        {isCameraOpen && (currentStep === "front" || currentStep === "back") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6 flex flex-col items-center w-full max-w-md mx-auto">
              <div className="w-full mb-3 sm:mb-4 flex-shrink-0">
                <div className="bg-primary-red/10 border border-primary-red rounded-lg px-3 py-2 text-center">
                  <p className="text-primary-red font-semibold text-sm sm:text-base">
                    📸 Capturing {currentStep === "front" ? "Front" : "Back"} Side of HTS Form
                  </p>
                </div>
              </div>
              <div className="relative w-full mb-4 overflow-hidden bg-gray-900 rounded-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  webkit-playsinline="true"
                  className="w-full object-cover rounded-lg"
                  style={{ aspectRatio: '3/4', maxHeight: '60vh' }}
                />
                {!isVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center text-white">
                      <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-3" />
                      <p className="text-sm">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div className="flex gap-3 sm:gap-4 w-full flex-shrink-0">
                <Button 
                  onClick={captureImage} 
                  variant="primary" 
                  className="gap-2 px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg flex-1"
                  disabled={isRequestingCameraPermission || !isVideoReady}
                >
                  {!isVideoReady ? (
                    <>
                      <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" />
                      <span className="hidden sm:inline">Initializing...</span>
                    </>
                  ) : (
                    <>
                      <IoCamera className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="hidden xs:inline">Capture</span>
                      <span className="xs:hidden">Take Photo</span>
                    </>
                  )}
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="secondary" 
                  className="gap-2 px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg flex-1"
                >
                  <IoClose className="w-5 h-5 sm:w-6 sm:h-6" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Front Image Preview */}
        {!isCameraOpen && currentStep === "front" && !frontImage && (
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-3 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <IoCamera className="w-16 h-16 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Front Side of HTS Form
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click the button below to capture the front side
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => startCamera("front")} 
              variant="primary" 
              className="gap-2 w-full py-4 text-lg font-semibold"
              disabled={cameraPermission === "unsupported" || isRequestingCameraPermission}
            >
              {isRequestingCameraPermission && (
                <>
                  <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2 inline-block" />
                </>
              )}
                {isRequestingCameraPermission ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2 inline-block" />
                    Requesting camera access...
                  </>
                ) : cameraPermission === "prompt" && (
                  <>
                    <IoCamera className="w-6 h-6" />
                    Capture Front (Permission Required)
                  </>
                )}
              {cameraPermission === "denied" && hasAttemptedCameraRequest && (
                <>
                  <IoAlertCircle className="w-6 h-6" />
                  Grant Camera Access
                </>
              )}
              {cameraPermission === "granted" && (
                <>
                  <IoCamera className="w-6 h-6" />
                  Capture Front
                </>
              )}
              {cameraPermission === "unsupported" && (
                <>
                  <IoClose className="w-6 h-6" />
                  Camera Not Available
                </>
              )}
            </Button>
          </div>
        )}

        {/* Back Image - Show front preview and back camera */}
        {currentStep === "back" && !isCameraOpen && (
          <div className="space-y-4">
            {frontImage && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Front Side (Captured)</h3>
                <div className="relative rounded-lg overflow-hidden border border-green-500">
                  <img src={frontImage} alt="Front of form" className="w-full h-auto object-cover" style={{ aspectRatio: '3/4' }} />
                  <div className="absolute top-2 right-2">
                    <Button onClick={() => retakeImage("front")} variant="secondary" size="small">
                      Retake
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {!backImage && (
              <div className="text-center space-y-4">
                <div className="flex flex-col items-center gap-3 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <IoCamera className="w-16 h-16 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Back Side of HTS Form
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click the button below to capture the back side
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => startCamera("back")} 
                  variant="primary" 
                  className="gap-2 w-full py-4 text-lg font-semibold"
                  disabled={cameraPermission === "unsupported"}
                >
                  {isRequestingCameraPermission ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2 inline-block" />
                          Requesting camera access...
                        </>
                  ) : cameraPermission === "denied" && hasAttemptedCameraRequest ? (
                        <>
                          <IoAlertCircle className="w-6 h-6" />
                          Grant Camera Access
                        </>
                      ) : (
                    <>
                      <IoCamera className="w-6 h-6" />
                      Capture Back
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Test Result Selection */}
        {currentStep === "result" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Front Side</h3>
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={frontImage} alt="Front" className="w-full h-auto object-cover" style={{ aspectRatio: '3/4' }} />
                  <Button onClick={() => retakeImage("front")} variant="secondary" size="small" className="absolute top-2 right-2">
                    Retake
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Back Side</h3>
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={backImage} alt="Back" className="w-full h-auto object-cover" style={{ aspectRatio: '3/4' }} />
                  <Button onClick={() => retakeImage("back")} variant="secondary" size="small" className="absolute top-2 right-2">
                    Retake
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 1: Analyze Images with OCR */}
            {!extractedData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                <IoDocumentText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Analyze Images with OCR
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  Extract text from your HTS form images to verify accuracy before submission.
                </p>
                <Button
                  onClick={handleAnalyzeImages}
                  variant="primary"
                  disabled={isAnalyzing}
                  className="gap-2 min-w-[200px]"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <IoDocumentText className="w-5 h-5" />
                      Analyze Images
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: Review OCR Results and Select Test Result */}
            {extractedData && (
              <>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      OCR Analysis Completed
                    </h3>
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    Confidence: <strong>{extractedData.confidence}%</strong>
                  </p>
                  <button
                    onClick={() => setShowOCRReview(true)}
                    className="text-sm text-green-700 dark:text-green-300 underline hover:no-underline"
                  >
                    View extracted data →
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    What is the test result?
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTestResult("non-reactive")}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        testResult === "non-reactive"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <IoCheckmarkCircle className={`w-12 h-12 ${testResult === "non-reactive" ? "text-green-600" : "text-gray-400"}`} />
                        <span className={`font-semibold ${testResult === "non-reactive" ? "text-green-600" : "text-gray-700 dark:text-gray-300"}`}>
                          Non-Reactive
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setTestResult("reactive")}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        testResult === "reactive"
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-red-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <IoAlertCircle className={`w-12 h-12 ${testResult === "reactive" ? "text-red-600" : "text-gray-400"}`} />
                        <span className={`font-semibold ${testResult === "reactive" ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>
                          Reactive
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Mismatch warning */}
                  {testResult && extractedData.testResult && 
                   testResult !== extractedData.testResult.toLowerCase().replace(/[-\s]/g, '-') && (
                    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <IoAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                            Mismatch Detected
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Your selection ({testResult}) doesn&apos;t match the extracted result ({extractedData.testResult}). 
                            Please verify the form carefully.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {testResult && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={submitForm}
                      variant="primary"
                      disabled={isSubmitting}
                      className="gap-2 min-w-[200px]"
                    >
                      <IoCloudUploadOutline className="w-5 h-5" />
                      {isSubmitting ? "Submitting..." : "Submit Form"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📸 Photo Guidelines
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Capture both front and back sides of the form</li>
            <li>• Ensure all form fields are clearly visible</li>
            <li>• Use good lighting conditions</li>
            <li>• Keep the form flat and avoid shadows</li>
            <li>• Make sure text is readable</li>
          </ul>
        </div>

        {cameraPermission === "prompt" && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              📷 Camera Permission Required
            </h3>
            <p className="text-sm text-green-800 dark:text-green-200">
              When you click &quot;Capture Front&quot;, your browser will show an <strong>Allow/Block</strong> popup requesting camera access. 
              Click <strong>&quot;Allow&quot;</strong> to enable the camera for capturing HTS form images. This is similar to enabling push notifications.
            </p>
          </div>
        )}
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
            You haven&apos;t submitted any HTS forms yet.
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
    <>
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

      {/* OCR Review Modal */}
      {showOCRReview && extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IoDocumentText className="w-6 h-6 text-primary-red" />
                {isEditMode ? 'Edit OCR Data' : 'Extracted OCR Data'}
              </h2>
              <button
                onClick={() => {
                  setShowOCRReview(false);
                  setIsEditMode(false);
                  setEditableData(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <IoClose className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Confidence Score */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Overall Confidence
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {extractedData?.confidence?.toFixed(2) ?? 0}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${extractedData.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* View Mode: Read-only Fields */}
              {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {extractedData.testResult && (
                    <div className={`rounded-lg p-4 ${
                      extractedData.confidence < 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300' : 'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Test Result</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {extractedData.testResult}
                      </p>
                    </div>
                  )}
                  {extractedData.fullName && (
                    <div className={`rounded-lg p-4 ${
                      extractedData.confidence < 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300' : 'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {extractedData.fullName}
                      </p>
                    </div>
                  )}
                  {extractedData.testDate && (
                    <div className={`rounded-lg p-4 ${
                      extractedData.confidence < 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300' : 'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Test Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {typeof extractedData.testDate === 'string' ? extractedData.testDate : extractedData.testDate?.raw}
                      </p>
                    </div>
                  )}
                  {extractedData.birthDate && (
                    <div className={`rounded-lg p-4 ${
                      extractedData.confidence < 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300' : 'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Birth Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {typeof extractedData.birthDate === 'string' ? extractedData.birthDate : extractedData.birthDate?.raw}
                      </p>
                    </div>
                  )}
                  {extractedData.philHealthNumber && (
                    <div className={`rounded-lg p-4 ${
                      extractedData.confidence < 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300' : 'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">PhilHealth Number</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {extractedData.philHealthNumber}
                      </p>
                    </div>
                  )}
                  {extractedData.testingFacility && (
                    <div className={`rounded-lg p-4 ${
                      extractedData.confidence < 80 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300' : 'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Testing Facility</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {extractedData.testingFacility}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Mode: Editable Fields */}
              {isEditMode && editableData && (
                <div className="space-y-4">
                  {/* Test Result */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Result
                      {editableData.testResult !== extractedData.testResult && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">Edited</span>
                      )}
                    </label>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="reactive"
                          checked={editableData.testResult === 'reactive'}
                          onChange={(e) => handleFieldChange('testResult', e.target.value)}
                          className="mr-2 w-4 h-4 text-primary-red"
                        />
                        Reactive
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="non-reactive"
                          checked={editableData.testResult === 'non-reactive'}
                          onChange={(e) => handleFieldChange('testResult', e.target.value)}
                          className="mr-2 w-4 h-4 text-primary-red"
                        />
                        Non-Reactive
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original OCR: {extractedData.testResult || 'Not extracted'}</p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                      {editableData.fullName !== extractedData.fullName && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">Edited</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editableData.fullName}
                      onChange={(e) => handleFieldChange('fullName', e.target.value)}
                      placeholder={extractedData.fullName || 'Enter full name'}
                      className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                        fieldErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.fullName}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original OCR: {extractedData.fullName || 'Not extracted'}</p>
                  </div>

                  {/* Name Parts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editableData.firstName}
                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                        placeholder={extractedData.firstName || 'First name'}
                        className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                          fieldErrors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {fieldErrors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editableData.lastName}
                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                        placeholder={extractedData.lastName || 'Last name'}
                        className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                          fieldErrors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {fieldErrors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Test Date
                      </label>
                      <input
                        type="date"
                        value={editableData.testDate}
                        onChange={(e) => handleFieldChange('testDate', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                          fieldErrors.testDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {fieldErrors.testDate && (
                        <p className="text-red-500 text-sm mt-1">{fieldErrors.testDate}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Original OCR: {typeof extractedData.testDate === 'string' ? extractedData.testDate : extractedData.testDate?.raw || 'Not extracted'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Birth Date
                      </label>
                      <input
                        type="date"
                        value={editableData.birthDate}
                        onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                          fieldErrors.birthDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {fieldErrors.birthDate && (
                        <p className="text-red-500 text-sm mt-1">{fieldErrors.birthDate}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Original OCR: {typeof extractedData.birthDate === 'string' ? extractedData.birthDate : extractedData.birthDate?.raw || 'Not extracted'}
                      </p>
                    </div>
                  </div>

                  {/* PhilHealth Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PhilHealth Number
                    </label>
                    <input
                      type="text"
                      value={editableData.philHealthNumber}
                      onChange={(e) => handleFieldChange('philHealthNumber', e.target.value)}
                      placeholder="12-digit number"
                      maxLength="12"
                      className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                        fieldErrors.philHealthNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {fieldErrors.philHealthNumber && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.philHealthNumber}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original OCR: {extractedData.philHealthNumber || 'Not extracted'}</p>
                  </div>

                  {/* Testing Facility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Testing Facility
                    </label>
                    <input
                      type="text"
                      value={editableData.testingFacility}
                      onChange={(e) => handleFieldChange('testingFacility', e.target.value)}
                      placeholder={extractedData.testingFacility || 'Enter testing facility'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original OCR: {extractedData.testingFacility || 'Not extracted'}</p>
                  </div>
                </div>
              )}

              {/* Confidence Warning */}
              {extractedData.confidence < 80 && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <IoAlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-900 dark:text-red-100 text-lg mb-2">
                        Low Confidence Score - Retake Required
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                        The OCR extraction confidence is <strong>{extractedData.confidence?.toFixed(2)}%</strong>, which is below the minimum threshold of 80%.
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        ⚠️ You must retake the images to proceed. Please ensure:
                      </p>
                      <ul className="text-sm text-red-800 dark:text-red-200 mt-2 ml-4 list-disc space-y-1">
                        <li>Good lighting conditions</li>
                        <li>Form is flat and fully visible</li>
                        <li>Text is clear and readable</li>
                        <li>No shadows or glare</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isEditMode ? (
                <div className="flex gap-3 pt-4">
                  {/* Show different buttons based on confidence */}
                  {extractedData.confidence < 80 ? (
                    // Low confidence: Only allow retake
                    <Button
                      onClick={() => {
                        setShowOCRReview(false);
                        setExtractedData(null);
                        setIsEditMode(false);
                        setCurrentStep("front");
                      }}
                      variant="primary"
                      className="w-full gap-2"
                    >
                      <IoCamera className="w-5 h-5" />
                      Retake Images (Required)
                    </Button>
                  ) : (
                    // Good confidence (≥80%): Allow edit and proceed
                    <>
                      <Button
                        onClick={enterEditMode}
                        variant="secondary"
                        className="flex-1"
                      >
                        <IoDocumentText className="w-5 h-5" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOCRReview(false);
                          setIsEditMode(false);
                        }}
                        variant="primary"
                        className="flex-1"
                      >
                        <IoCheckmark className="w-5 h-5" />
                        Looks Good
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOCRReview(false);
                          setExtractedData(null);
                          setIsEditMode(false);
                          setCurrentStep("front");
                        }}
                        variant="secondary"
                        className="flex-1"
                      >
                        <IoCamera className="w-5 h-5" />
                        Retake
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={cancelEditMode}
                    variant="secondary"
                    className="flex-1"
                  >
                    <IoClose className="w-5 h-5" />
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditedData}
                    variant="primary"
                    className="flex-1"
                  >
                    <IoCheckmark className="w-5 h-5" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

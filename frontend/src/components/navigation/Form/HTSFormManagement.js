"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { IoCamera, IoClose, IoCheckmark, IoCloudUploadOutline, IoDocumentText, IoTime, IoCheckmarkCircle, IoAlertCircle, IoHourglassOutline, IoAddCircle, IoListOutline, IoEyeOutline, IoFlashlight } from "react-icons/io5";
import { getAuth } from "firebase/auth";
import Button from "../../ui/Button";
import ImageLightbox from "../../ui/ImageLightbox";
import CameraQualityIndicator from "../../ui/CameraQualityIndicator";
import OCRFieldWarnings from "../../ui/OCRFieldWarnings";
import EnhancedOCRReview from "../../ui/EnhancedOCRReview";
import TemplateBasedOCRReview from "../../ui/TemplateBasedOCRReview";
import AlertModal from "../../ui/AlertModal";
import ConfirmModal from "../../ui/ConfirmModal";
import NextImage from 'next/image';
import { API_BASE } from "../../../config/config";
import { encryptFormImages, encryptJSON, generateEncryptionKey, exportKey, encryptFormSubmission } from "../../../utils/imageEncryption";
import {
  isCameraSupported,
  getCameraPermission,
  requestCameraPermissionWithFallback,
  stopCameraStream,
  isCameraPermissionDenied,
} from "../../../services/cameraPermissionService";
import { validateImageQuality, validateQuality, captureMultipleFrames } from "../../../utils/imageQualityValidator";
import { preprocessImage, dataURLtoBlob as preprocessDataURLtoBlob } from "../../../utils/imagePreprocessor";

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
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isFlashlightSupported, setIsFlashlightSupported] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const metadataTimeoutRef = useRef(null);
  const isMountedRef = useRef(true); // Track component mount status

  // OCR-first workflow state
  const [extractedData, setExtractedData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOCRReview, setShowOCRReview] = useState(false);
  
  // OCR editing state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Submissions history state
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
  });

  // Helper functions for modals
  const showAlert = useCallback((title, message, type = "info", onConfirm = null) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal({
      isOpen: false,
      title: "",
      message: "",
      type: "info",
      onConfirm: null,
    });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, confirmText = "Confirm", cancelText = "Cancel") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
      confirmText: "Confirm",
      cancelText: "Cancel",
    });
  }, []);

  // Helper function to extract meaningful error messages
  const getErrorMessage = useCallback((error) => {
    if (error instanceof Error) {
      return error.message;
    } else if (error instanceof Event) {
      return 'An unexpected error occurred. Please try again.';
    } else if (typeof error === 'string') {
      return error;
    } else if (error?.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }, []);

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
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // Cleanup intervals/timeouts
      if (metadataTimeoutRef.current) {
        clearInterval(metadataTimeoutRef.current);
        clearTimeout(metadataTimeoutRef.current);
        metadataTimeoutRef.current = null;
      }
      
      // Stop camera on unmount
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async (side) => {
    // Check if image already exists for this side
    const existingImage = side === "front" ? frontImage : backImage;
    if (existingImage) {
      return new Promise((resolve) => {
        showConfirm(
          "Replace Image?",
          `An image already exists for the ${side} side. Replace it?`,
          () => {
            closeConfirm();
            resolve(true);
            startCameraInternal(side);
          },
          "Replace",
          "Cancel"
        );
      });
    }
    await startCameraInternal(side);
  };

  const startCameraInternal = async (side) => {
    
    setHasAttemptedCameraRequest(true);
    setIsRequestingCameraPermission(true);
    try {
      // Check if camera is supported
      if (!isCameraSupported()) {
        showAlert(
          "Camera Not Supported",
          "Your browser doesn't support camera access.\n\n" +
          "Please:\n" +
          "• Use a modern browser (Chrome, Firefox, Edge, Safari)\n" +
          "• Ensure you're using HTTPS connection\n" +
          "• Update your browser to the latest version",
          "error"
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
      
      // Use exponential backoff for video element detection
      let videoCheckAttempt = 0;
      const maxVideoCheckAttempts = 10;
      
      const checkVideoElement = () => {
        videoCheckAttempt++;
        
        if (!videoRef.current) {
          if (videoCheckAttempt >= maxVideoCheckAttempts) {
            console.error("❌ Video element not found after multiple attempts!");
            showAlert(
              "Camera Initialization Failed",
              "Failed to initialize camera view. Please try again.",
              "error"
            );
            stopCamera();
            return;
          }
          
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms...
          const delay = Math.min(50 * Math.pow(2, videoCheckAttempt - 1), 1000);
          console.log(`[Attempt ${videoCheckAttempt}] Video element not found, retrying in ${delay}ms...`);
          setTimeout(checkVideoElement, delay);
          return;
        }
        
        const video = videoRef.current;
        console.log("📹 Video element found, assigning stream...");
        video.srcObject = stream;
        
        // Use loadedmetadata event with timeout fallback
        let metadataHandled = false;
        
        const handleMetadata = () => {
          if (metadataHandled) return;
          metadataHandled = true;
          
          console.log(`✅ Video ready: ${video.videoWidth}x${video.videoHeight}`);
          setIsVideoReady(true);
          
          if (metadataTimeoutRef.current) {
            clearTimeout(metadataTimeoutRef.current);
            metadataTimeoutRef.current = null;
          }
          
          // Check if flashlight/torch is supported
          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities = track.getCapabilities();
            if (capabilities.torch) {
              setIsFlashlightSupported(true);
              console.log('💡 Flashlight supported on this device');
            }
          }
          
          // Ensure video is playing
          if (video.paused) {
            video.play().catch(err => console.warn("Play error:", err));
          }
        };
        
        // Listen for loadedmetadata event
        video.addEventListener('loadedmetadata', handleMetadata, { once: true });
        
        // Fallback: Check if metadata already loaded
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          handleMetadata();
        } else {
          // Set timeout as fallback (10 seconds)
          metadataTimeoutRef.current = setTimeout(() => {
            if (!metadataHandled) {
              // Check one more time before giving up
              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                handleMetadata();
              } else {
                console.error("⏱️ Video initialization timeout");
                console.error(`Final state: width=${video.videoWidth}, height=${video.videoHeight}, readyState=${video.readyState}`);
                showAlert(
                  "Camera Initialization Timeout",
                  "Camera failed to initialize. Please try again or use a different browser.",
                  "error"
                );
                stopCamera();
              }
            }
          }, 10000);
        }
      };
      
      // Start checking for video element with initial delay
      setTimeout(checkVideoElement, 50);
    } catch (error) {
      console.error("❌ Camera access error:", error);
      
      // CRITICAL: Clean up camera stream to prevent memory leak
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
      
      // Clear any pending intervals
      if (metadataTimeoutRef.current) {
        clearInterval(metadataTimeoutRef.current);
        metadataTimeoutRef.current = null;
      }
      
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

  const stopCamera = useCallback(async () => {
    try {
      // Stop all tracks
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
        console.log('🛑 Camera stream stopped');
      }
      
      // Clear interval or timeout
      if (metadataTimeoutRef.current) {
        clearInterval(metadataTimeoutRef.current);
        clearTimeout(metadataTimeoutRef.current);
        metadataTimeoutRef.current = null;
      }
      
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset video element
      }
      
      setIsCameraOpen(false);
      setIsVideoReady(false);
      setIsFlashlightOn(false);
      setIsFlashlightSupported(false);
      console.log('✅ Camera stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping camera:', error);
    }
  }, []);

  const toggleFlashlight = useCallback(async () => {
    try {
      if (!streamRef.current) {
        console.warn('⚠️ No camera stream available for flashlight');
        return;
      }

      const track = streamRef.current.getVideoTracks()[0];
      if (!track) {
        console.warn('⚠️ No video track found');
        return;
      }

      // Check if torch is supported
      const capabilities = track.getCapabilities();
      if (!capabilities.torch) {
        console.warn('⚠️ Flashlight not supported on this device');
        showAlert(
          "Flashlight Not Supported",
          "Your device does not support flashlight control.",
          "warning"
        );
        return;
      }

      // Toggle torch
      const newState = !isFlashlightOn;
      await track.applyConstraints({
        advanced: [{ torch: newState }]
      });
      
      setIsFlashlightOn(newState);
      console.log(`💡 Flashlight ${newState ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error('❌ Error toggling flashlight:', error);
      showAlert(
        "Flashlight Error",
        "Failed to toggle flashlight. This feature may not be supported on your device.",
        "error"
      );
    }
  }, [isFlashlightOn, showAlert]);

  const finalizeCaptureImage = useCallback(
    async (step, imageData) => {
      try {
        if (step === "front") {
          setFrontImage(imageData);
          if (stopCamera) stopCamera();
          setCurrentStep("back");
        } else if (step === "back") {
          setBackImage(imageData);
          if (stopCamera) stopCamera();
          setCurrentStep("result");
        }
      } catch (error) {
        console.error('\u274c Finalize capture error:', error);
        const errorMessage = getErrorMessage(error);
        showAlert(
          "Save Failed",
          `Failed to save image: ${errorMessage}\n\nPlease try again.`,
          "error"
        );
      }
    },
    [setFrontImage, setBackImage, stopCamera, setCurrentStep, showAlert, getErrorMessage]
  );

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      showAlert(
        "Camera Not Ready",
        "Camera is still initializing. Please wait a moment...",
        "warning"
      );
      return;
    }
    
    const video = videoRef.current;
    
    // Validate video dimensions before capture
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("❌ Video dimensions are 0x0 - not ready for capture");
      showAlert(
        "Camera Loading",
        "Camera is still loading. Please wait a moment and try again.",
        "warning"
      );
      return;
    }
    
    try {
      console.log(`📸 Starting capture: ${video.videoWidth}x${video.videoHeight}`);
      
      // PRE-CAPTURE VALIDATION: Check current frame quality
      const testCanvas = document.createElement('canvas');
      testCanvas.width = video.videoWidth;
      testCanvas.height = video.videoHeight;
      const testCtx = testCanvas.getContext('2d');
      testCtx.drawImage(video, 0, 0);
      
      const preCheck = await validateQuality(testCanvas);
      
      if (!preCheck.isValid) {
        showAlert(
          "Image Quality Insufficient",
          `${preCheck.message}\n\nPlease adjust and try again.`,
          "warning"
        );
        return;
      }
      
      console.log('[Quality Check] Pre-capture validation passed');
      
      // Use multi-frame capture for best quality
      console.log('[Multi-Frame] Capturing 3 frames...');
      const bestFrame = await captureMultipleFrames(video, 3, 300);
      
      if (!bestFrame) {
        showAlert(
          "Capture Failed",
          "Failed to capture acceptable quality image. Please ensure good lighting and hold camera steady.",
          "error"
        );
        return;
      }
      
      console.log(`[Multi-Frame] Best frame selected with score: ${bestFrame.score.toFixed(2)}`);
      
      // Preprocess image for better OCR (color enhancement, no black & white)
      console.log('[Preprocessing] Enhancing image quality for OCR...');
      const frameDataURL = bestFrame.canvas.toDataURL("image/jpeg", 0.95);
      const processedResult = await preprocessImage(frameDataURL, {
        targetResolution: { width: 1600, height: 2133 },
        enableDeskew: true,
        enableDenoising: true,
        enableContrast: true,
        enableBinarization: false, // Keep in color, no black & white
        quality: 0.95
      });
      const imageData = processedResult.processedImage;
      console.log('[Preprocessing] Enhancement complete:', processedResult.metadata);
      
      // Final quality check with feedback
      const finalQuality = await validateImageQuality(imageData);
      console.log(`[Quality Check] Final score: ${finalQuality.score}/100`);
      
      if (finalQuality.score < 70) {
        return new Promise((resolve) => {
          showConfirm(
            "Low Image Quality",
            `Image Quality: ${finalQuality.score}/100\n\n` +
            `${finalQuality.feedback}\n\n` +
            `Recommendation: Retake image for better OCR accuracy.\n\n` +
            `Continue anyway?`,
            () => {
              closeConfirm();
              resolve(true);
              // Continue with capture
              finalizeCaptureImage(currentStep, imageData);
            },
            "Continue Anyway",
            "Retake"
          );
        });
      }
      
      console.log('[Quality Check] ✅ Image quality is acceptable');
      
      // Save image and proceed
      finalizeCaptureImage(currentStep, imageData);
      
    } catch (error) {
      console.error('❌ Capture error:', error);
      
      // Extract meaningful error message from different error types
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof Event) {
        errorMessage = 'Image processing failed. Please ensure good lighting and try again.';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showAlert(
        "Capture Failed",
        `Failed to capture image: ${errorMessage}\n\nPlease try again.`,
        "error"
      );
    }
  }, [isVideoReady, currentStep, showAlert, showConfirm, closeConfirm, finalizeCaptureImage]);

  const retakeImage = async (side) => {
    try {
      console.log(`🔄 Retaking ${side} image...`);
      
      // CRITICAL: Stop camera first
      await stopCamera();
      
      // Wait for state to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reset image state
      if (side === "front") {
        setFrontImage(null);
      } else if (side === "back") {
        setBackImage(null);
      }
      
      // Start camera for retake
      await startCamera(side);
      
    } catch (error) {
      console.error('❌ Retake error:', error);
      const errorMessage = getErrorMessage(error);
      showAlert(
        "Retake Failed",
        `Failed to retake image: ${errorMessage}\n\nPlease try again.`,
        "error"
      );
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
      showAlert(
        "Login Required",
        "You must be logged in to submit a form.",
        "warning"
      );
      return;
    }

    if (!frontImage || !backImage || !testResult) {
      showAlert(
        "Incomplete Form",
        "Please complete all steps before submitting.",
        "warning"
      );
      return;
    }

    if (!extractedData) {
      showAlert(
        "OCR Analysis Required",
        "Please analyze images with OCR before submitting.",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Encrypt images and extracted data with same key (different IVs)
      // SECURITY: Do not log encryption keys, IVs, or encrypted data
      
      const encrypted = await encryptFormSubmission(frontImage, backImage, extractedData);
      
      // Validate encryption output types (without exposing values)
      if (!encrypted.frontImage || !encrypted.backImage || !encrypted.encryptionKey ||
          !encrypted.frontImageIV || !encrypted.backImageIV || 
          !encrypted.extractedDataEncrypted || !encrypted.extractedDataIV) {
        throw new Error('Encryption failed: Missing required encrypted fields');
      }
      
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
      
      // Retry logic with exponential backoff
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(`${API_BASE}/hts-forms/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json();

          if (!isMountedRef.current) return; // Check if component is still mounted

          if (data.success) {
            setControlNumber(data.controlNumber);
            setSubmitSuccess(true);
            setFrontImage(null);
            setBackImage(null);
            setTestResult(null);
            setExtractedData(null);
            setShowOCRReview(false);
            setCurrentStep("front");
            return; // Success - exit retry loop
          } else {
            const errorMsg = `Failed to submit form: ${data.error || 'Unknown error'}${data.details ? '\nDetails: ' + data.details : ''}`;
            showAlert(
              "Submission Failed",
              errorMsg,
              "error"
            );
            return; // Server responded with error - don't retry
          }
        } catch (error) {
          lastError = error;
          
          if (!isMountedRef.current) return; // Check before showing error
          
          // If this was the last attempt, show error
          if (attempt === maxRetries) {
            const errorMessage = getErrorMessage(error);
            showAlert(
              "Submission Error",
              `Failed after ${maxRetries} attempts: ${errorMessage}\n\nPlease check your connection and try again.`,
              "error"
            );
          } else {
            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return; // Check before showing error
      
      // Catch errors from encryption or token retrieval
      const errorMessage = getErrorMessage(error);
      showAlert(
        "Submission Error",
        `An error occurred: ${errorMessage}\n\nPlease try again.`,
        "error"
      );
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
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
      showAlert(
        "Validation Errors",
        "Please fix validation errors before saving.",
        "warning"
      );
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
    showAlert(
      "Changes Saved",
      "Your changes have been saved successfully!",
      "success"
    );
  };

  // Enter edit mode with ALL 56 fields from DOH HTS Form 2021
  const enterEditMode = () => {
    setEditableData({
      // Test metadata
      testResult: extractedData.testResult || '',
      testDate: formatDateForInput(extractedData.testDate),
      
      // Identity Fields (Q1-7)
      philHealthNumber: extractedData.philHealthNumber || '',
      philSysNumber: extractedData.philSysNumber || '',
      firstName: extractedData.firstName || '',
      middleName: extractedData.middleName || '',
      lastName: extractedData.lastName || '',
      suffix: extractedData.suffix || '',
      fullName: extractedData.fullName || '',
      parentalCode: extractedData.parentalCode || '',
      parentalCodeMother: extractedData.parentalCodeMother || '',
      parentalCodeFather: extractedData.parentalCodeFather || '',
      birthOrder: extractedData.birthOrder || '',
      
      // Demographic Data (Q8-12)
      birthDate: formatDateForInput(extractedData.birthDate),
      age: extractedData.age || '',
      ageMonths: extractedData.ageMonths || '',
      sex: extractedData.sex || '',
      currentResidenceCity: extractedData.currentResidenceCity || '',
      currentResidenceProvince: extractedData.currentResidenceProvince || '',
      permanentResidenceCity: extractedData.permanentResidenceCity || '',
      permanentResidenceProvince: extractedData.permanentResidenceProvince || '',
      placeOfBirthCity: extractedData.placeOfBirthCity || '',
      placeOfBirthProvince: extractedData.placeOfBirthProvince || '',
      nationality: extractedData.nationality || '',
      nationalityOther: extractedData.nationalityOther || '',
      civilStatus: extractedData.civilStatus || '',
      livingWithPartner: extractedData.livingWithPartner || '',
      numberOfChildren: extractedData.numberOfChildren || '',
      isPregnant: extractedData.isPregnant || '',
      
      // Education & Occupation (Q13-16)
      educationalAttainment: extractedData.educationalAttainment || '',
      currentlyInSchool: extractedData.currentlyInSchool || '',
      occupation: extractedData.occupation || '',
      currentlyWorking: extractedData.currentlyWorking || '',
      workedOverseas: extractedData.workedOverseas || '',
      overseasReturnYear: extractedData.overseasReturnYear || '',
      overseasLocation: extractedData.overseasLocation || '',
      overseasCountry: extractedData.overseasCountry || '',
      
      // Risk Assessment (Q17-18)
      riskAssessment: extractedData.riskAssessment || '',
      riskAssessmentSexMale: extractedData.riskAssessmentSexMale || '',
      riskAssessmentSexFemale: extractedData.riskAssessmentSexFemale || '',
      riskAssessmentPaidForSex: extractedData.riskAssessmentPaidForSex || '',
      riskAssessmentReceivedPayment: extractedData.riskAssessmentReceivedPayment || '',
      riskAssessmentSexUnderInfluence: extractedData.riskAssessmentSexUnderInfluence || '',
      riskAssessmentSharedNeedles: extractedData.riskAssessmentSharedNeedles || '',
      riskAssessmentBloodTransfusion: extractedData.riskAssessmentBloodTransfusion || '',
      riskAssessmentOccupationalExposure: extractedData.riskAssessmentOccupationalExposure || '',
      reasonsForTesting: extractedData.reasonsForTesting || '',
      
      // Previous HIV Test (Q19)
      previouslyTested: extractedData.previouslyTested || '',
      previousTestDate: formatDateForInput(extractedData.previousTestDate),
      previousTestProvider: extractedData.previousTestProvider || '',
      previousTestCity: extractedData.previousTestCity || '',
      previousTestResult: extractedData.previousTestResult || '',
      
      // Medical History (Q20-21)
      medicalHistory: extractedData.medicalHistory || '',
      clinicalPicture: extractedData.clinicalPicture || '',
      symptoms: extractedData.symptoms || '',
      whoStaging: extractedData.whoStaging || '',
      
      // Testing Details (Q22-25)
      clientType: extractedData.clientType || '',
      modeOfReach: extractedData.modeOfReach || '',
      testingAccepted: extractedData.testingAccepted || '',
      refusalReason: extractedData.refusalReason || '',
      otherServices: extractedData.otherServices || '',
      testKitBrand: extractedData.testKitBrand || '',
      testKitLotNumber: extractedData.testKitLotNumber || '',
      testKitExpiration: formatDateForInput(extractedData.testKitExpiration),
      
      // HTS Provider (Q26-27)
      testingFacility: extractedData.testingFacility || '',
      facilityAddress: extractedData.facilityAddress || '',
      counselorName: extractedData.counselorName || '',
      counselorRole: extractedData.counselorRole || '',
      counselorSignature: extractedData.counselorSignature || '',
      
      // Consent Fields
      contactNumber: extractedData.contactNumber || '',
      emailAddress: extractedData.emailAddress || ''
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
      showAlert(
        "Missing Images",
        "Please capture both front and back images first.",
        "warning"
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        showAlert(
          "Login Required",
          "You must be logged in to analyze images.",
          "warning"
        );
        return;
      }

      // Preprocess images before OCR for better accuracy
      console.log('[OCR] Preprocessing images for optimal OCR accuracy...');
      
      const [processedFront, processedBack] = await Promise.all([
        preprocessImage(frontImage, {
          targetResolution: { width: 1600, height: 2133 },
          enableDeskew: true,
          enableDenoising: true,
          enableContrast: true,
          enableBinarization: false, // Keep in color
          quality: 0.95
        }),
        preprocessImage(backImage, {
          targetResolution: { width: 1600, height: 2133 },
          enableDeskew: true,
          enableDenoising: true,
          enableContrast: true,
          enableBinarization: false, // Keep in color
          quality: 0.95
        })
      ]);
      
      console.log('[OCR] Preprocessing complete:', {
        front: processedFront.metadata,
        back: processedBack.metadata
      });

      // Convert preprocessed images to blob
      console.log("[OCR] Converting preprocessed images to blobs");
      const frontBlob = preprocessDataURLtoBlob(processedFront.processedImage);
      const backBlob = preprocessDataURLtoBlob(processedBack.processedImage);

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
        // Check if component is still mounted before updating state
        if (!isMountedRef.current) return;
        
        setExtractedData(data.data);
        setShowOCRReview(true);
        console.log("[OCR Analysis] Extraction completed with confidence:", data.data?.confidence);
      } else {
        if (!isMountedRef.current) return;
        
        showAlert(
          "Analysis Failed",
          `Failed to analyze images: ${data.error || 'Unknown error'}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error analyzing images:", error);
      
      if (!isMountedRef.current) return;
      
      const errorMessage = getErrorMessage(error);
      showAlert(
        "Analysis Error",
        `Failed to analyze images: ${errorMessage}\n\nPlease ensure images are clear and try again.`,
        "error"
      );
    } finally {
      if (isMountedRef.current) {
        setIsAnalyzing(false);
      }
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
  }, [stopCamera]);

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
                
                {/* Real-time quality indicator */}
                <CameraQualityIndicator videoRef={videoRef} isActive={isVideoReady} />
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

              <div className="flex flex-col gap-3 w-full flex-shrink-0">
                {/* Flashlight Button - Only show if supported */}
                {isFlashlightSupported && (
                  <Button 
                    onClick={toggleFlashlight} 
                    variant={isFlashlightOn ? "primary" : "secondary"}
                    className="gap-2 px-4 py-2 text-sm w-full"
                    disabled={!isVideoReady}
                  >
                    <IoFlashlight className={`w-5 h-5 ${isFlashlightOn ? 'text-yellow-300' : ''}`} />
                    {isFlashlightOn ? 'Flashlight On' : 'Flashlight Off'}
                  </Button>
                )}
                
                {/* Main Controls */}
                <div className="flex gap-3 sm:gap-4 w-full">
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
                <div className="relative rounded-lg overflow-hidden border border-green-500 group">
                  <NextImage
                    src={frontImage}
                    alt="Front of form"
                    width={900}
                    height={1200}
                    unoptimized
                    className="w-full h-auto object-cover select-none cursor-pointer transition-opacity hover:opacity-90"
                    style={{ aspectRatio: '3/4' }}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                    onClick={() => {
                      setLightboxImages([{url: frontImage, name: 'Front Side', preventDownload: true}]);
                      setLightboxIndex(0);
                      setLightboxImage({url: frontImage, name: 'Front Side'});
                      setLightboxOpen(true);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <IoEyeOutline className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button onClick={(e) => {
                      e.stopPropagation();
                      retakeImage("front");
                    }} variant="secondary" size="small">
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
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <NextImage
                    src={frontImage}
                    alt="Front"
                    width={900}
                    height={1200}
                    unoptimized
                    className="w-full h-auto object-cover select-none cursor-pointer transition-opacity hover:opacity-90"
                    style={{ aspectRatio: '3/4' }}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                    onClick={() => {
                      setLightboxImages([{url: frontImage, name: 'Front Side', preventDownload: true}, {url: backImage, name: 'Back Side', preventDownload: true}]);
                      setLightboxIndex(0);
                      setLightboxImage({url: frontImage, name: 'Front Side'});
                      setLightboxOpen(true);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <IoEyeOutline className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button onClick={(e) => {
                      e.stopPropagation();
                      retakeImage("front");
                    }} variant="secondary" size="small">
                      Retake
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Back Side</h3>
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <NextImage
                    src={backImage}
                    alt="Back"
                    width={900}
                    height={1200}
                    unoptimized
                    className="w-full h-auto object-cover select-none cursor-pointer transition-opacity hover:opacity-90"
                    style={{ aspectRatio: '3/4' }}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                    onClick={() => {
                      setLightboxImages([{url: frontImage, name: 'Front Side', preventDownload: true}, {url: backImage, name: 'Back Side', preventDownload: true}]);
                      setLightboxIndex(1);
                      setLightboxImage({url: backImage, name: 'Back Side'});
                      setLightboxOpen(true);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <IoEyeOutline className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button onClick={(e) => {
                      e.stopPropagation();
                      retakeImage("back");
                    }} variant="secondary" size="small">
                      Retake
                    </Button>
                  </div>
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

      {/* Enhanced OCR Review Modal */}
      {showOCRReview && extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IoDocumentText className="w-6 h-6 text-primary-red" />
                Enhanced OCR Analysis Results
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

            <div className="p-3 sm:p-6">
              <TemplateBasedOCRReview
                extractedData={extractedData}
                onUpdate={(updatedData) => {
                  console.log('Updated data:', updatedData);
                  setExtractedData(updatedData);
                }}
                onAccept={(finalData) => {
                  console.log('Accepted data:', finalData);
                  setExtractedData(finalData || extractedData);
                  setShowOCRReview(false);
                  setCurrentStep('result');
                }}
                onReanalyze={handleAnalyzeImages}
              />
            </div>

            <div className="p-3 sm:p-6 space-y-4">
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

              {/* Low Confidence Field Warnings */}
              <OCRFieldWarnings extractedData={extractedData} />

              {/* View Mode: Read-only Fields */}
              {!isEditMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

              {/* Edit Mode: All 56 Editable Fields */}
              {isEditMode && editableData && (
                <div className="space-y-4 sm:space-y-6 max-h-[65vh] overflow-y-auto px-1">
                  {/* TEST RESULT */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Test Result</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Test Result *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <label className="inline-flex items-center">
                          <input type="radio" value="reactive" checked={editableData.testResult === 'reactive'}
                            onChange={(e) => handleFieldChange('testResult', e.target.value)} className="mr-2" />
                          Reactive
                        </label>
                        <label className="inline-flex items-center">
                          <input type="radio" value="non-reactive" checked={editableData.testResult === 'non-reactive'}
                            onChange={(e) => handleFieldChange('testResult', e.target.value)} className="mr-2" />
                          Non-Reactive
                        </label>
                        <label className="inline-flex items-center">
                          <input type="radio" value="indeterminate" checked={editableData.testResult === 'indeterminate'}
                            onChange={(e) => handleFieldChange('testResult', e.target.value)} className="mr-2" />
                          Indeterminate
                        </label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Date *</label>
                      <input type="date" value={editableData.testDate} onChange={(e) => handleFieldChange('testDate', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                  </div>

                  {/* IDENTITY (Q1-7) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Identity & Registration</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">PhilHealth Number</label>
                        <input type="text" value={editableData.philHealthNumber} onChange={(e) => handleFieldChange('philHealthNumber', e.target.value)}
                          placeholder="12 digits" maxLength="12" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">PhilSys Number</label>
                        <input type="text" value={editableData.philSysNumber} onChange={(e) => handleFieldChange('philSysNumber', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Full Name *</label>
                      <input type="text" value={editableData.fullName} onChange={(e) => handleFieldChange('fullName', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-2">First Name *</label>
                        <input type="text" value={editableData.firstName} onChange={(e) => handleFieldChange('firstName', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Middle Name</label>
                        <input type="text" value={editableData.middleName} onChange={(e) => handleFieldChange('middleName', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Last Name *</label>
                        <input type="text" value={editableData.lastName} onChange={(e) => handleFieldChange('lastName', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Suffix</label>
                        <input type="text" value={editableData.suffix} onChange={(e) => handleFieldChange('suffix', e.target.value)}
                          placeholder="Jr., Sr., III, etc." className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Parental Code (Q5)</label>
                        <input type="text" value={editableData.parentalCode} onChange={(e) => handleFieldChange('parentalCode', e.target.value)}
                          placeholder="Mother+Father initials+Birth order" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Mother&apos;s First Name (2 letters)</label>
                        <input type="text" value={editableData.parentalCodeMother} onChange={(e) => handleFieldChange('parentalCodeMother', e.target.value)}
                          maxLength="2" placeholder="AA" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Father&apos;s First Name (2 letters)</label>
                        <input type="text" value={editableData.parentalCodeFather} onChange={(e) => handleFieldChange('parentalCodeFather', e.target.value)}
                          maxLength="2" placeholder="BB" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Birth Order</label>
                        <input type="number" value={editableData.birthOrder} onChange={(e) => handleFieldChange('birthOrder', e.target.value)}
                          min="1" placeholder="1" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* DEMOGRAPHIC DATA (Q8-12) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Demographic Data</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Birth Date *</label>
                        <input type="date" value={editableData.birthDate} onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Age</label>
                        <input type="number" value={editableData.age} onChange={(e) => handleFieldChange('age', e.target.value)}
                          min="15" max="120" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Age (Months, if &lt;1 year)</label>
                        <input type="number" value={editableData.ageMonths} onChange={(e) => handleFieldChange('ageMonths', e.target.value)}
                          min="0" max="11" placeholder="0-11" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Sex *</label>
                        <select value={editableData.sex} onChange={(e) => handleFieldChange('sex', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-sm font-semibold mb-2">Current Residence (Q8)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <input type="text" value={editableData.currentResidenceCity} onChange={(e) => handleFieldChange('currentResidenceCity', e.target.value)}
                          placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.currentResidenceProvince} onChange={(e) => handleFieldChange('currentResidenceProvince', e.target.value)}
                          placeholder="Province" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-2">Permanent Residence</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editableData.permanentResidenceCity} onChange={(e) => handleFieldChange('permanentResidenceCity', e.target.value)}
                          placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.permanentResidenceProvince} onChange={(e) => handleFieldChange('permanentResidenceProvince', e.target.value)}
                          placeholder="Province" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-2">Place of Birth</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editableData.placeOfBirthCity} onChange={(e) => handleFieldChange('placeOfBirthCity', e.target.value)}
                          placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.placeOfBirthProvince} onChange={(e) => handleFieldChange('placeOfBirthProvince', e.target.value)}
                          placeholder="Province" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Nationality (Q10)</label>
                        <select value={editableData.nationality} onChange={(e) => handleFieldChange('nationality', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="Filipino">Filipino</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Nationality Other (specify)</label>
                        <input type="text" value={editableData.nationalityOther} onChange={(e) => handleFieldChange('nationalityOther', e.target.value)}
                          placeholder="If not Filipino" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Civil Status (Q11)</label>
                        <select value={editableData.civilStatus} onChange={(e) => handleFieldChange('civilStatus', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Separated">Separated</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Divorced">Divorced</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Living with Partner</label>
                        <select value={editableData.livingWithPartner} onChange={(e) => handleFieldChange('livingWithPartner', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Number of Children</label>
                        <input type="number" value={editableData.numberOfChildren} onChange={(e) => handleFieldChange('numberOfChildren', e.target.value)}
                          min="0" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Currently Pregnant (female only)</label>
                        <select value={editableData.isPregnant} onChange={(e) => handleFieldChange('isPregnant', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* EDUCATION & EMPLOYMENT (Q13-16) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Education & Employment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Highest Educational Attainment (Q13)</label>
                        <select value={editableData.educationalAttainment} onChange={(e) => handleFieldChange('educationalAttainment', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="No schooling">No schooling</option>
                          <option value="Elementary">Elementary</option>
                          <option value="Pre-school">Pre-school</option>
                          <option value="Highschool">Highschool</option>
                          <option value="Vocational">Vocational</option>
                          <option value="College">College</option>
                          <option value="Post-Graduate">Post-Graduate</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Currently in School</label>
                        <select value={editableData.currentlyInSchool} onChange={(e) => handleFieldChange('currentlyInSchool', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Occupation (Q14)</label>
                        <input type="text" value={editableData.occupation} onChange={(e) => handleFieldChange('occupation', e.target.value)}
                          placeholder="Main source of income" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Currently Working</label>
                        <select value={editableData.currentlyWorking} onChange={(e) => handleFieldChange('currentlyWorking', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                          <option value="Previous">Previous</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-sm font-semibold mb-2">Overseas Work (Q16)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Worked Overseas (past 5 years)</label>
                          <select value={editableData.workedOverseas} onChange={(e) => handleFieldChange('workedOverseas', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                            <option value="">Select</option>
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3">
                        <input type="text" value={editableData.overseasReturnYear} onChange={(e) => handleFieldChange('overseasReturnYear', e.target.value)}
                          placeholder="Return Year" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.overseasLocation} onChange={(e) => handleFieldChange('overseasLocation', e.target.value)}
                          placeholder="Ship/Land" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.overseasCountry} onChange={(e) => handleFieldChange('overseasCountry', e.target.value)}
                          placeholder="Country" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* RISK ASSESSMENT & TESTING (Q17-19) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Risk Assessment & Testing History</h3>
                    
                    {/* Overall Risk Assessment */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Risk Assessment (Q17) - Complete</label>
                      <textarea value={editableData.riskAssessment} onChange={(e) => handleFieldChange('riskAssessment', e.target.value)}
                        rows="2" placeholder="Overall risk factors" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>

                    {/* Individual Risk Categories */}
                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Individual Risk Categories:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Sex with a MALE</label>
                          <input type="text" value={editableData.riskAssessmentSexMale} onChange={(e) => handleFieldChange('riskAssessmentSexMale', e.target.value)}
                            placeholder="Yes/No + details" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Sex with a FEMALE</label>
                          <input type="text" value={editableData.riskAssessmentSexFemale} onChange={(e) => handleFieldChange('riskAssessmentSexFemale', e.target.value)}
                            placeholder="Yes/No + details" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Paid for sex (cash or kind)</label>
                          <input type="text" value={editableData.riskAssessmentPaidForSex} onChange={(e) => handleFieldChange('riskAssessmentPaidForSex', e.target.value)}
                            placeholder="Yes/No + date" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Received payment for sex</label>
                          <input type="text" value={editableData.riskAssessmentReceivedPayment} onChange={(e) => handleFieldChange('riskAssessmentReceivedPayment', e.target.value)}
                            placeholder="Yes/No + date" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Sex under influence of drugs</label>
                          <input type="text" value={editableData.riskAssessmentSexUnderInfluence} onChange={(e) => handleFieldChange('riskAssessmentSexUnderInfluence', e.target.value)}
                            placeholder="Yes/No + date" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Shared needles (drug injection)</label>
                          <input type="text" value={editableData.riskAssessmentSharedNeedles} onChange={(e) => handleFieldChange('riskAssessmentSharedNeedles', e.target.value)}
                            placeholder="Yes/No + date" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Received blood transfusion</label>
                          <input type="text" value={editableData.riskAssessmentBloodTransfusion} onChange={(e) => handleFieldChange('riskAssessmentBloodTransfusion', e.target.value)}
                            placeholder="Yes/No + date" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Occupational exposure (needlestick)</label>
                          <input type="text" value={editableData.riskAssessmentOccupationalExposure} onChange={(e) => handleFieldChange('riskAssessmentOccupationalExposure', e.target.value)}
                            placeholder="Yes/No + date" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Reasons for Testing (Q18)</label>
                      <textarea value={editableData.reasonsForTesting} onChange={(e) => handleFieldChange('reasonsForTesting', e.target.value)}
                        rows="2" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-sm font-semibold mb-2">Previous HIV Test (Q19)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <select value={editableData.previouslyTested} onChange={(e) => handleFieldChange('previouslyTested', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Ever tested?</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <input type="date" value={editableData.previousTestDate} onChange={(e) => handleFieldChange('previousTestDate', e.target.value)}
                          placeholder="Previous test date" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.previousTestProvider} onChange={(e) => handleFieldChange('previousTestProvider', e.target.value)}
                          placeholder="HTS Provider (Facility/Organization)" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.previousTestCity} onChange={(e) => handleFieldChange('previousTestCity', e.target.value)}
                          placeholder="City/Municipality" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <select value={editableData.previousTestResult} onChange={(e) => handleFieldChange('previousTestResult', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Previous result</option>
                          <option value="Reactive">Reactive</option>
                          <option value="Non-Reactive">Non-Reactive</option>
                          <option value="Indeterminate">Indeterminate</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* MEDICAL HISTORY (Q20-21) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Medical History</h3>
                    <div>
                      <label className="block text-sm font-medium mb-2">Medical History (Q20)</label>
                      <textarea value={editableData.medicalHistory} onChange={(e) => handleFieldChange('medicalHistory', e.target.value)}
                        rows="2" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Clinical Picture (Q21)</label>
                        <select value={editableData.clinicalPicture} onChange={(e) => handleFieldChange('clinicalPicture', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="Asymptomatic">Asymptomatic</option>
                          <option value="Symptomatic">Symptomatic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Symptoms</label>
                        <input type="text" value={editableData.symptoms} onChange={(e) => handleFieldChange('symptoms', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">WHO Staging</label>
                        <select value={editableData.whoStaging} onChange={(e) => handleFieldChange('whoStaging', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="Stage 1">Stage 1</option>
                          <option value="Stage 2">Stage 2</option>
                          <option value="Stage 3">Stage 3</option>
                          <option value="Stage 4">Stage 4</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* TESTING DETAILS (Q22-25) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Testing Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Client Type (Q22)</label>
                        <input type="text" value={editableData.clientType} onChange={(e) => handleFieldChange('clientType', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Mode of Reach (Q23)</label>
                        <input type="text" value={editableData.modeOfReach} onChange={(e) => handleFieldChange('modeOfReach', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Testing Accepted? (Q24) *</label>
                        <select value={editableData.testingAccepted} onChange={(e) => handleFieldChange('testingAccepted', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-2">Refusal Reason</label>
                        <input type="text" value={editableData.refusalReason} onChange={(e) => handleFieldChange('refusalReason', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Other Services Provided</label>
                      <textarea value={editableData.otherServices} onChange={(e) => handleFieldChange('otherServices', e.target.value)}
                        rows="2" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-sm font-semibold mb-2">Test Kit Information (Q25)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <input type="text" value={editableData.testKitBrand} onChange={(e) => handleFieldChange('testKitBrand', e.target.value)}
                          placeholder="Kit Brand" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="text" value={editableData.testKitLotNumber} onChange={(e) => handleFieldChange('testKitLotNumber', e.target.value)}
                          placeholder="Lot Number" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                        <input type="date" value={editableData.testKitExpiration} onChange={(e) => handleFieldChange('testKitExpiration', e.target.value)}
                          placeholder="Expiration" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* HTS PROVIDER (Q26-27) */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">HTS Provider Details</h3>
                    <div>
                      <label className="block text-sm font-medium mb-2">Testing Facility (Q26)</label>
                      <input type="text" value={editableData.testingFacility} onChange={(e) => handleFieldChange('testingFacility', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-sm font-medium mb-2">Complete Mailing Address</label>
                      <input type="text" value={editableData.facilityAddress} onChange={(e) => handleFieldChange('facilityAddress', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Counselor Name (Q27)</label>
                        <input type="text" value={editableData.counselorName} onChange={(e) => handleFieldChange('counselorName', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Counselor Role</label>
                        <select value={editableData.counselorRole} onChange={(e) => handleFieldChange('counselorRole', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                          <option value="">Select</option>
                          <option value="HIV Counselor">HIV Counselor</option>
                          <option value="Medical Technologist">Medical Technologist</option>
                          <option value="CBS Motivator">CBS Motivator</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Counselor Signature</label>
                        <input type="text" value={editableData.counselorSignature} onChange={(e) => handleFieldChange('counselorSignature', e.target.value)}
                          placeholder="Signature captured" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* CONSENT & CONTACT */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900 dark:text-white">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Contact Number</label>
                        <input type="tel" value={editableData.contactNumber} onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                          placeholder="09XXXXXXXXX" className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email Address</label>
                        <input type="email" value={editableData.emailAddress} onChange={(e) => handleFieldChange('emailAddress', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
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

      {/* Image Lightbox for viewing captured forms */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxImage?.url}
        imageName={lightboxImage?.name}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onNavigate={(direction) => {
          const newIndex = direction === "next" ? lightboxIndex + 1 : lightboxIndex - 1;
          if (newIndex >= 0 && newIndex < lightboxImages.length) {
            setLightboxIndex(newIndex);
            setLightboxImage(lightboxImages[newIndex]);
          }
        }}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onConfirm={alertModal.onConfirm}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          closeConfirm();
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </>
  );
}

"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { IoCamera, IoClose, IoCheckmark, IoCloudUploadOutline, IoDocumentText, IoTime, IoCheckmarkCircle, IoAlertCircle, IoHourglassOutline, IoAddCircle, IoListOutline } from "react-icons/io5";
import { getAuth } from "firebase/auth";
import Button from "../../ui/Button";
import { API_BASE } from "../../../config/config";
import { encryptFormImages } from "../../../utils/imageEncryption";
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // OCR-first workflow state
  const [extractedData, setExtractedData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOCRReview, setShowOCRReview] = useState(false);

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
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      // Successful permission grant - reset the attempt flag and set state
      setHasAttemptedCameraRequest(false);
      setIsRequestingCameraPermission(false);
      setIsCameraOpen(true);
      setCurrentStep(side);
      setSubmitSuccess(false);
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
      // Encrypt images AFTER user confirms OCR results
      console.log("[Submit] Encrypting images after OCR confirmation...");
      const encryptedData = await encryptFormImages(frontImage, backImage);
      
      const idToken = await user.getIdToken();
      const response = await fetch(`${API_BASE}/hts-forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          frontImageBase64: encryptedData.frontImage,
          backImageBase64: encryptedData.backImage,
          frontImageIV: encryptedData.frontImageIV,
          backImageIV: encryptedData.backImageIV,
          encryptionKey: encryptedData.encryptionKey,
          testResult: testResult,
          extractedData: extractedData,
          extractionConfidence: extractedData.confidence
        })
      });

      const data = await response.json();

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
        alert(`Failed to submit form: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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

      // Convert base64 to blob for multipart upload
      const frontBlob = await fetch(frontImage).then(r => r.blob());
      const backBlob = await fetch(backImage).then(r => r.blob());

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
        console.log("[OCR Analysis] Extraction completed:", data.data);
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 flex flex-col items-center max-w-2xl w-full mx-4">
              <div className="w-full mb-4">
                <div className="bg-primary-red/10 border border-primary-red rounded-lg px-4 py-2 text-center">
                  <p className="text-primary-red font-semibold">
                    📸 Capturing {currentStep === "front" ? "Front" : "Back"} Side of HTS Form
                  </p>
                </div>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-xl h-auto rounded-lg mb-4 bg-black"
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div className="flex gap-4">
                <Button 
                  onClick={captureImage} 
                  variant="primary" 
                  className="gap-2 px-6 py-3 text-lg"
                  disabled={isRequestingCameraPermission}
                >
                  <IoCamera className="w-6 h-6" />
                  Capture
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="secondary" 
                  className="gap-2 px-6 py-3 text-lg"
                >
                  <IoClose className="w-6 h-6" />
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
                <div className="relative rounded-lg overflow-hidden border border-green-500 aspect-[3/4]">
                  <Image src={frontImage} alt="Front of form" fill className="object-cover" unoptimized />
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
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-[3/4]">
                  <Image src={frontImage} alt="Front" fill className="object-cover" unoptimized />
                  <Button onClick={() => retakeImage("front")} variant="secondary" size="small" className="absolute top-2 right-2">
                    Retake
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Back Side</h3>
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-[3/4]">
                  <Image src={backImage} alt="Back" fill className="object-cover" unoptimized />
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
                Extracted OCR Data
              </h2>
              <button
                onClick={() => setShowOCRReview(false)}
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
                    {extractedData.confidence}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${extractedData.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* Extracted Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extractedData.testResult && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Test Result</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {extractedData.testResult}
                    </p>
                  </div>
                )}
                {extractedData.fullName && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {extractedData.fullName}
                    </p>
                  </div>
                )}
                {extractedData.testDate && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Test Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {extractedData.testDate}
                    </p>
                  </div>
                )}
                {extractedData.birthDate && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Birth Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {extractedData.birthDate}
                    </p>
                  </div>
                )}
                {extractedData.philHealthNumber && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">PhilHealth Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {extractedData.philHealthNumber}
                    </p>
                  </div>
                )}
                {extractedData.testingFacility && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Testing Facility</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {extractedData.testingFacility}
                    </p>
                  </div>
                )}
              </div>

              {/* Confidence Warning */}
              {extractedData.confidence < 80 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <IoAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                        Low Confidence Score
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        The OCR extraction has low confidence. Please verify the data carefully or consider retaking the images.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowOCRReview(false)}
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
                    setCurrentStep("front");
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  <IoCamera className="w-5 h-5" />
                  Retake Images
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

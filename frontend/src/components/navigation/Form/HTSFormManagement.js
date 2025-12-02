"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { IoCamera, IoClose, IoCheckmark, IoCloudUploadOutline, IoDocumentText, IoTime, IoCheckmarkCircle, IoAlertCircle, IoHourglassOutline, IoAddCircle, IoListOutline } from "react-icons/io5";
import { getAuth } from "firebase/auth";
import Button from "../../ui/Button";
import { API_BASE } from "../../../config/config";
import { encryptFormImages } from "../../../utils/imageEncryption";

export default function HTSFormManagement() {
  const [activeTab, setActiveTab] = useState("submit"); // 'submit' or 'history'
  // Submit form state
  const [currentStep, setCurrentStep] = useState("front"); // 'front', 'back', 'result', or 'review'
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [testResult, setTestResult] = useState(null);
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

  const checkCameraPermission = async () => {
    try {
      if (!navigator.permissions || !navigator.permissions.query) {
        // Permissions API not supported, proceed with direct camera access
        return "prompt";
      }

      const permissionStatus = await navigator.permissions.query({ name: "camera" });
      return permissionStatus.state; // "granted", "denied", or "prompt"
    } catch (error) {
      console.log("Permissions API not available, will request directly");
      return "prompt";
    }
  };

  const startCamera = async (side) => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser. Please use HTTPS or a modern browser.");
      }

      // Check current camera permission status
      const permissionStatus = await checkCameraPermission();
      
      if (permissionStatus === "denied") {
        // Permission was previously denied, show instructions
        alert(
          "📷 Camera Permission Required\n\n" +
          "Camera access was previously blocked. To enable:\n\n" +
          "1. Click the 🔒 lock icon (or camera icon) in the address bar\n" +
          "2. Find 'Camera' and change to 'Allow'\n" +
          "3. Refresh the page and click 'Capture' again\n\n" +
          "Or go to:\n" +
          "Chrome Settings → Privacy and security → Site Settings → Camera\n" +
          "→ Add vaulteer.kuzaken.tech to 'Allowed to use your camera'"
        );
        return;
      }

      // Request camera permission (this triggers the browser's Allow/Block popup)
      console.log("📷 Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      console.log("✅ Camera permission granted!");
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsCameraOpen(true);
      setCurrentStep(side);
      setSubmitSuccess(false);
    } catch (error) {
      console.error("Error accessing camera:", error);
      
      // Handle specific permission errors
      let errorMessage = "Unable to access camera. ";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "📷 Camera Permission Denied\n\n" +
          "You clicked 'Block' on the camera permission popup.\n\n" +
          "To enable camera access:\n" +
          "1. Click the 🔒 lock icon (or camera icon) in the address bar\n" +
          "2. Find 'Camera' and select 'Allow'\n" +
          "3. Refresh the page and click 'Capture' again\n\n" +
          "Or go to Chrome Settings → Privacy and security → Site Settings → Camera → " +
          "Add vaulteer.kuzaken.tech to 'Allowed to use your camera'";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "No camera found on this device. Please connect a camera and try again.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Camera is already in use by another application. Please close other apps using the camera.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera doesn't support the requested settings. Trying with default settings...";
        
        // Retry with basic settings
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            streamRef.current = fallbackStream;
          }
          setIsCameraOpen(true);
          setCurrentStep(side);
          setSubmitSuccess(false);
          return; // Success with fallback
        } catch (fallbackError) {
          errorMessage = "Unable to access camera with any settings. " + fallbackError.message;
        }
      } else if (error.name === "SecurityError") {
        errorMessage = "Security error: Camera access is not allowed on this page. Make sure you're using HTTPS (https://vaulteer.kuzaken.tech).";
      } else {
        errorMessage += error.message || "Unknown error occurred.";
      }
      
      alert(errorMessage);
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

    setIsSubmitting(true);

    try {
      // Encrypt images before submission
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
          testResult: testResult
        })
      });

      const data = await response.json();

      if (data.success) {
        setControlNumber(data.controlNumber);
        setSubmitSuccess(true);
        setFrontImage(null);
        setBackImage(null);
        setTestResult(null);
        setCurrentStep("front");
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
    setFrontImage(null);
    setBackImage(null);
    setTestResult(null);
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

        {/* Camera View */}
        {isCameraOpen && (currentStep === "front" || currentStep === "back") && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/60 rounded-lg px-4 py-2 text-white text-sm text-center">
                📸 Capturing {currentStep === "front" ? "Front" : "Back"} Side
              </div>
            </div>
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

        {/* Front Image Preview */}
        {!isCameraOpen && currentStep === "front" && !frontImage && (
          <div className="text-center">
            <Button onClick={() => startCamera("front")} variant="primary" className="gap-2">
              <IoCamera className="w-5 h-5" />
              Capture Front
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
              <div className="text-center">
                <Button onClick={() => startCamera("back")} variant="primary" className="gap-2">
                  <IoCamera className="w-5 h-5" />
                  Capture Back
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
          </div>
        )}
      </div>

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

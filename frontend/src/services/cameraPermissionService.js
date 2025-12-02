/**
 * Camera Permission Service
 * Handles browser camera permissions similar to push notification permissions
 */

/**
 * Check if browser supports camera access
 * @returns {boolean}
 */
export function isCameraSupported() {
  return (
    typeof window !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices
  );
}

/**
 * Check current camera permission status
 * @returns {Promise<string>} Permission status: "granted", "denied", "prompt", or "unsupported"
 */
export async function getCameraPermission() {
  if (!isCameraSupported()) {
    return "unsupported";
  }

  try {
    // Try using Permissions API (not supported in all browsers, especially Safari)
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: "camera" });
      return permissionStatus.state; // "granted", "denied", or "prompt"
    }
  } catch (error) {
    console.log("Permissions API not available for camera, will request directly");
  }

  // Fallback: return "prompt" if we can't check
  return "prompt";
}

/**
 * Request camera permission from user
 * This triggers the browser's native Allow/Block popup
 * Uses simple constraints by default for maximum compatibility (like old implementation)
 * @returns {Promise<MediaStream>} Camera stream if granted
 */
export async function requestCameraPermission() {
  if (!isCameraSupported()) {
    const error = new Error("Camera is not supported in this browser. Please use a modern browser with HTTPS.");
    error.userAction = "unsupported";
    throw error;
  }

  try {
    // Use rear-facing camera (environment) for document scanning with autofocus
    // This is the back camera on mobile devices
    const finalConstraints = { 
      video: { 
        facingMode: { ideal: "environment" }, // "user" = front camera, "environment" = back camera
        focusMode: { ideal: "continuous" }, // Enable continuous autofocus
        // Additional constraints for better document scanning
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: 3/4 } // Portrait orientation for forms
      } 
    };

    // This will trigger the browser's Allow/Block permission popup
    console.log("📷 Requesting camera permission (rear-facing with autofocus)...");
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    console.log("✅ Camera permission granted!");
    
    // Try to enable autofocus on the video track
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const capabilities = videoTrack.getCapabilities();
        console.log("📹 Camera capabilities:", capabilities);
        
        // Apply advanced settings if supported
        const constraints = {};
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          constraints.focusMode = 'continuous';
        }
        if (capabilities.focusDistance) {
          // Set focus distance to infinity (good for documents)
          constraints.focusDistance = capabilities.focusDistance.max || 10;
        }
        
        if (Object.keys(constraints).length > 0) {
          await videoTrack.applyConstraints({ advanced: [constraints] });
          console.log("✅ Applied autofocus constraints:", constraints);
        }
      } catch (constraintError) {
        // Non-critical - camera will still work without advanced features
        console.warn("⚠️ Could not apply advanced camera constraints:", constraintError.message);
      }
    }
    
    return stream;
  } catch (error) {
    console.error("Camera permission error:", error);
    throw handleCameraError(error);
  }
}

/**
 * Handle camera-specific errors with user-friendly messages
 * @param {Error} error - Camera error
 * @returns {Error} Enhanced error with helpful message
 */
function handleCameraError(error) {
  let enhancedError = new Error();
  enhancedError.name = error.name;
  enhancedError.originalError = error;

  switch (error.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      enhancedError.message = 
        "📷 Camera Permission Denied or Blocked\n\n" +
        "The browser rejected camera access. If you didn't see a permission popup, try clicking the 'Capture' button to request access again.\n\n" +
        "If you previously denied the permission, re-enable it in your browser settings:\n" +
        "1. Click the 🔒 lock icon (or camera icon) in the address bar\n" +
        "2. Find 'Camera' and select 'Allow'\n" +
        "3. Refresh the page and request camera access again";
      enhancedError.userAction = "permission_denied";
      break;

    case "NotFoundError":
    case "DevicesNotFoundError":
      enhancedError.message = 
        "📷 No Camera Found\n\n" +
        "No camera device was detected on this device.\n\n" +
        "Please:\n" +
        "• Check if your camera is properly connected\n" +
        "• Try reconnecting your camera\n" +
        "• Check if another application is using the camera";
      enhancedError.userAction = "no_camera";
      break;

    case "NotReadableError":
    case "TrackStartError":
      enhancedError.message = 
        "📷 Camera In Use\n\n" +
        "Your camera is already being used by another application.\n\n" +
        "Please:\n" +
        "• Close other apps that might be using the camera\n" +
        "• Close other browser tabs using the camera\n" +
        "• Restart your browser and try again";
      enhancedError.userAction = "camera_in_use";
      break;

    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      enhancedError.message = 
        "📷 Camera Settings Not Supported\n\n" +
        "Your camera doesn't support the requested settings.\n\n" +
        "Please try again or use a different camera.";
      enhancedError.userAction = "constraint_error";
      break;

    case "SecurityError":
      enhancedError.message = 
        "📷 Security Error\n\n" +
        "Camera access is blocked due to security settings.\n\n" +
        "Please ensure:\n" +
        "• You're using HTTPS (secure connection)\n" +
        "• The page is not in an iframe\n" +
        "• Your browser security settings allow camera access";
      enhancedError.userAction = "security_error";
      break;

    case "AbortError":
      enhancedError.message = 
        "📷 Camera Access Aborted\n\n" +
        "Camera access was interrupted. Please try again.";
      enhancedError.userAction = "retry";
      break;

    default:
      enhancedError.message = 
        "📷 Camera Error\n\n" +
        "Unable to access camera: " + (error.message || "Unknown error") + "\n\n" +
        "Please:\n" +
        "• Check camera permissions in browser settings\n" +
        "• Ensure you're using HTTPS\n" +
        "• Try refreshing the page";
      enhancedError.userAction = "unknown_error";
  }

  return enhancedError;
}

/**
 * Request camera permission with fallback (now simplified)
 * Since we use basic constraints by default, this primarily handles errors gracefully
 * @returns {Promise<MediaStream>} Camera stream
 */
export async function requestCameraPermissionWithFallback() {
  try {
    // Request with basic constraints (matches old implementation)
    return await requestCameraPermission();
  } catch (error) {
    // For any error, just throw the handled error
    // No complex fallback needed since we start with simplest constraints
    throw error;
  }
}

/**
 * Stop camera stream and release resources
 * @param {MediaStream} stream - Camera stream to stop
 */
export function stopCameraStream(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
      console.log("Camera track stopped:", track.kind);
    });
  }
}

/**
 * Check if camera permission was previously denied
 * @returns {Promise<boolean>}
 */
export async function isCameraPermissionDenied() {
  const permission = await getCameraPermission();
  return permission === "denied";
}

/**
 * Check if camera permission was previously granted
 * @returns {Promise<boolean>}
 */
export async function isCameraPermissionGranted() {
  const permission = await getCameraPermission();
  return permission === "granted";
}

/**
 * Get available camera devices
 * @returns {Promise<Array>} List of camera devices
 */
export async function getAvailableCameras() {
  if (!isCameraSupported()) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    return cameras;
  } catch (error) {
    console.error("Error enumerating camera devices:", error);
    return [];
  }
}

/**
 * Test if camera access works (for debugging)
 * @returns {Promise<boolean>}
 */
export async function testCameraAccess() {
  try {
    const stream = await requestCameraPermission();
    stopCameraStream(stream);
    return true;
  } catch (error) {
    console.error("Camera test failed:", error);
    return false;
  }
}

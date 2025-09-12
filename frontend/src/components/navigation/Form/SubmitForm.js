import React, { useRef, useState } from "react";
import Image from "next/image";

export default function SubmitForm() {
  const [imageData, setImageData] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [notification, setNotification] = useState("");

  // Start camera stream
  const handleOpenCamera = async () => {
    setShowCamera(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        alert("Unable to access camera.");
        setShowCamera(false);
      }
    }
  };

  // Capture image from video
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setImageData(dataUrl);
      // Stop camera after capture
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
      setShowCamera(false);
    }
  };

  // Close camera and stop stream
  const handleCloseCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setNotification("HTS Form submitted confidentially!");
    // Reset image after submit if needed
    // setImageData(null);
  };

  // Notification auto-hide
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="flex flex-row gap-6">
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg text-white bg-green-700">
          {notification}
          <button
            className="ml-4 text-white font-bold"
            onClick={() => setNotification("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Container */}
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
          <div className="mb-8 bg-white border-2 bg-opacity-10 p-3 rounded-xl">
            <h1 className="text-2xl font-extrabold text-red-700 tracking-tight">
              Submit HTS Form
            </h1>
          </div>
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <p className="mb-2 text-gray-700">
              Please capture and submit your HTS Form. Your submission is
              confidential.
            </p>
            {/* Capture Button */}
            {!showCamera && (
              <button
                type="button"
                className="bg-[var(--primary-red)] text-white font-bold px-4 py-2 rounded hover:bg-red-800 transition mb-4"
                onClick={handleOpenCamera}
              >
                {imageData ? "Retake Photo" : "Capture HTS Form"}
              </button>
            )}

            {/* Camera Modal */}
            {showCamera && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-xl shadow-xl p-6 flex flex-col items-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-80 h-60 rounded mb-4 bg-black"
                  />
                  <div className="flex gap-4">
                    <button
                      type="button"
                      className="bg-[var(--primary-red)] text-white px-4 py-2 rounded font-bold hover:bg-red-800"
                      onClick={handleCapture}
                    >
                      Capture
                    </button>
                    <button
                      type="button"
                      className="bg-gray-300 text-black px-4 py-2 rounded font-bold hover:bg-gray-400"
                      onClick={handleCloseCamera}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show captured image */}
            {imageData && (
              <div className="mt-6 flex flex-col items-center">
                {/* Use next/image for optimization */}
                <Image
                  src={imageData}
                  alt="Captured HTS Form"
                  width={320}
                  height={240}
                  className="w-80 h-auto rounded shadow mb-2"
                  style={{ objectFit: "contain" }}
                  priority
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <p className="text-green-700 font-semibold mb-2">
                  Image captured. Ready to submit.
                </p>
              </div>
            )}

            {/* Submit Button (disabled if no image) */}
            <button
              type="submit"
              className={`mt-4 w-full bg-[var(--primary-red)] text-white font-bold px-4 py-2 rounded hover:bg-red-800 transition ${
                !imageData ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!imageData}
            >
              Submit Form
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Camera Stabilizer Overlay Component
 * Shows real-time feedback on camera stability, blur, and lighting
 */
import { useState, useEffect, useRef } from 'react';
import { IoCheckmarkCircle, IoWarning, IoCamera } from 'react-icons/io5';

export default function CameraStabilizerOverlay({ 
  videoRef, 
  isActive = false,
  onCaptureReady = null,
  onStabilizerReady = null,
  showDetailedMetrics = false,
  enableAutoCapture = false
}) {
  const [metrics, setMetrics] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const stabilizerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !videoRef?.current) {
      if (stabilizerRef.current) {
        stabilizerRef.current.stop();
      }
      return;
    }

    // Dynamic import to avoid SSR issues
    import('../../utils/cameraStabilizer').then(({ CameraStabilizer }) => {
      stabilizerRef.current = new CameraStabilizer(videoRef.current, {
        updateInterval: 200,
        onUpdate: (newMetrics) => {
          setMetrics(newMetrics);
          
          // Auto-capture countdown when stable
          if (enableAutoCapture && newMetrics.quality.isReadyToCapture && onCaptureReady) {
            if (!countdownTimerRef.current) {
              startCountdown();
            }
          } else {
            cancelCountdown();
          }
        }
      });
      
      stabilizerRef.current.start();
      
      // Notify parent component that stabilizer is ready
      if (onStabilizerReady) {
        onStabilizerReady(stabilizerRef.current);
      }
    });

    return () => {
      if (stabilizerRef.current) {
        stabilizerRef.current.stop();
      }
      cancelCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, videoRef, onCaptureReady, enableAutoCapture, onStabilizerReady]);

  const startCountdown = () => {
    setCountdown(3);
    let count = 3;
    
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        
        if (onCaptureReady) {
          onCaptureReady();
        }
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  if (!isActive || !metrics) return null;

  const { motion, blur, lighting, quality } = metrics;
  const isReady = quality.isReadyToCapture;

  const getStatusIcon = (condition) => {
    if (condition) return <IoCheckmarkCircle className="w-5 h-5 text-green-500" />;
    return <IoWarning className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <>
      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="text-center">
            <div className="text-8xl font-bold text-white mb-4 animate-pulse">
              {countdown}
            </div>
            <div className="text-xl text-white">
              Hold steady...
            </div>
          </div>
        </div>
      )}

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none">
        {/* Main Status Banner */}
        <div className={`rounded-lg shadow-lg backdrop-blur-sm px-4 py-3 mb-3 transition-all duration-300 ${
          isReady 
            ? 'bg-green-500/90 text-white' 
            : 'bg-yellow-500/90 text-gray-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isReady ? (
                <IoCamera className="w-6 h-6 animate-pulse" />
              ) : (
                <IoWarning className="w-6 h-6" />
              )}
              <div>
                <div className="font-bold text-lg">
                  {isReady ? '✨ Ready to Capture!' : '⏳ Stabilizing...'}
                </div>
                <div className="text-sm opacity-90">
                  Quality Score: {quality.overallScore}%
                </div>
              </div>
            </div>
            
            {/* Quality Progress Bar */}
            <div className="w-32 h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isReady ? 'bg-white' : 'bg-gray-700'
                }`}
                style={{ width: `${quality.overallScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        {showDetailedMetrics && (
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg p-4 text-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(motion.isStable)}
                <span className="font-medium">Motion</span>
              </div>
              <span className="text-sm">{motion.recommendation}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(blur.isSharp)}
                <span className="font-medium">Focus</span>
              </div>
              <span className="text-sm">{blur.recommendation}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(lighting.isOptimal)}
                <span className="font-medium">Lighting</span>
              </div>
              <span className="text-sm">{lighting.recommendation}</span>
            </div>
          </div>
        )}

        {/* Simple Status Indicators (when not showing detailed) */}
        {!showDetailedMetrics && !isReady && (
          <div className="flex gap-2">
            <div className={`px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-all duration-300 ${
              motion.isStable 
                ? 'bg-green-500/80 text-white' 
                : 'bg-red-500/80 text-white'
            }`}>
              {motion.isStable ? '✓ Stable' : '⚠ Hold Steady'}
            </div>
            <div className={`px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-all duration-300 ${
              blur.isSharp 
                ? 'bg-green-500/80 text-white' 
                : 'bg-red-500/80 text-white'
            }`}>
              {blur.isSharp ? '✓ Sharp' : '⚠ Focusing'}
            </div>
            <div className={`px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-all duration-300 ${
              lighting.isOptimal 
                ? 'bg-green-500/80 text-white' 
                : 'bg-yellow-500/80 text-gray-900'
            }`}>
              {lighting.isOptimal ? '✓ Bright' : '⚠ Lighting'}
            </div>
          </div>
        )}
      </div>

      {/* Stability Guide Frame */}
      <div className="absolute inset-8 z-30 pointer-events-none">
        <div className={`w-full h-full border-4 rounded-lg transition-all duration-300 ${
          isReady 
            ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]' 
            : 'border-yellow-500 border-dashed'
        }`}>
          {/* Corner Guides */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
        </div>
      </div>
    </>
  );
}

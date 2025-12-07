/**
 * CameraQualityIndicator Component
 * Real-time quality feedback during camera capture
 */
import { useState, useEffect } from 'react';
import { validateImageQuality } from '../../utils/imageQualityValidator';

export default function CameraQualityIndicator({ videoRef, isActive }) {
  const [quality, setQuality] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!isActive || !videoRef?.current) {
      setQuality(null);
      return;
    }

    const checkQuality = async () => {
      if (isChecking) return;
      
      try {
        setIsChecking(true);
        
        // Capture frame from video
        const video = videoRef.current;
        
        // CRITICAL: Null check before accessing video properties
        if (!video || !video.videoWidth || !video.videoHeight) {
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg');
        const qualityCheck = await validateImageQuality(imageData);

        setQuality(qualityCheck);
      } catch (error) {
        console.error('[Quality Indicator] Error checking quality:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Check quality every 2 seconds
    const interval = setInterval(checkQuality, 2000);

    return () => clearInterval(interval);
  }, [isActive, videoRef, isChecking]);

  if (!quality || !isActive) return null;

  const getQualityColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getQualityText = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-xs z-10">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getQualityColor(quality.score)}`} />
        <span className="text-sm font-medium">
          Quality: {getQualityText(quality.score)} ({quality.score}/100)
        </span>
      </div>
      {quality.score < 70 && (
        <div className="text-xs mt-1 text-yellow-300 max-w-xs">
          {quality.feedback}
        </div>
      )}
    </div>
  );
}

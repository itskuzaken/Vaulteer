"use client";

import { useEffect } from "react";
import { IoCloseOutline, IoChevronBackOutline, IoChevronForwardOutline, IoDownloadOutline } from "react-icons/io5";

/**
 * ImageLightbox Component
 * Modal component for viewing full-size images with navigation
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the lightbox is open
 * @param {Function} props.onClose - Callback to close the lightbox
 * @param {string} props.imageUrl - URL of the current image
 * @param {string} props.imageName - Name of the current image
 * @param {Array} props.images - Array of all images {url, name}
 * @param {number} props.currentIndex - Current image index
 * @param {Function} props.onNavigate - Callback to navigate between images
 */
export default function ImageLightbox({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imageName,
  images = [],
  currentIndex = 0,
  onNavigate
}) {
  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle arrow keys for navigation
  useEffect(() => {
    const handleKeyNav = (e) => {
      if (!onNavigate || images.length <= 1) return;
      
      if (e.key === "ArrowLeft") {
        onNavigate("prev");
      } else if (e.key === "ArrowRight") {
        onNavigate("next");
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyNav);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyNav);
    };
  }, [isOpen, onNavigate, images.length]);

  if (!isOpen) return null;

  const hasMultipleImages = images.length > 1;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < images.length - 1;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Top action buttons */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-50 flex gap-1 sm:gap-2">
        {/* Download button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors touch-manipulation"
          aria-label="Download image"
        >
          <IoDownloadOutline className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors touch-manipulation"
          aria-label="Close"
        >
          <IoCloseOutline className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>

      {/* Previous button - Hidden on mobile, shown on desktop if multiple images */}
      {hasMultipleImages && canNavigatePrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("prev");
          }}
          className="hidden sm:flex absolute left-2 sm:left-4 z-50 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors items-center justify-center touch-manipulation"
          aria-label="Previous image"
        >
          <IoChevronBackOutline className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      )}

      {/* Next button - Hidden on mobile, shown on desktop if multiple images */}
      {hasMultipleImages && canNavigateNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("next");
          }}
          className="hidden sm:flex absolute right-2 sm:right-4 z-50 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors items-center justify-center touch-manipulation"
          aria-label="Next image"
        >
          <IoChevronForwardOutline className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      )}

      {/* Image container */}
      <div 
        className="relative w-full max-w-7xl max-h-[85vh] sm:max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={imageName || "Full size image"}
          className="max-w-full max-h-[85vh] sm:max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
        />
        
        {/* Image info and mobile navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 py-3 sm:px-4 sm:py-4 rounded-b-lg">
          {/* Mobile navigation buttons */}
          {hasMultipleImages && (
            <div className="flex sm:hidden items-center justify-center gap-4 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canNavigatePrev) onNavigate("prev");
                }}
                disabled={!canNavigatePrev}
                className={`p-2 rounded-full transition-colors touch-manipulation ${
                  canNavigatePrev 
                    ? 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
                aria-label="Previous image"
              >
                <IoChevronBackOutline className="w-6 h-6" />
              </button>
              
              <span className="text-white text-sm font-medium px-3 py-1 rounded-full bg-white/10">
                {currentIndex + 1} / {images.length}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canNavigateNext) onNavigate("next");
                }}
                disabled={!canNavigateNext}
                className={`p-2 rounded-full transition-colors touch-manipulation ${
                  canNavigateNext 
                    ? 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
                aria-label="Next image"
              >
                <IoChevronForwardOutline className="w-6 h-6" />
              </button>
            </div>
          )}
          
          {/* Image name */}
          <p className="text-white text-xs sm:text-sm font-medium truncate text-center sm:text-left">
            {imageName}
          </p>
          
          {/* Desktop counter */}
          {hasMultipleImages && (
            <p className="hidden sm:block text-white/70 text-xs mt-1">
              {currentIndex + 1} of {images.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

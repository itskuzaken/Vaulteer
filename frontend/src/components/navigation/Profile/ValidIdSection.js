"use client";

import { useState, useEffect } from "react";
import { IoIdCard, IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";
import { getValidIdMetadata, getValidIdDownloadUrl } from "../../../services/profileService";
import ImageLightbox from "../../ui/ImageLightbox";

/* eslint-disable @next/next/no-img-element */

/**
 * ValidIdSection - Displays and manages Valid ID for user profiles
 * 
 * @param {Object} props
 * @param {string} props.userUid - Firebase UID of the profile owner
 * @param {boolean} props.canEdit - Whether current user can edit (admin/staff or owner)
 */
export default function ValidIdSection({ userUid, canEdit = false }) {
  const [validIdData, setValidIdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Lightbox state for Valid ID preview
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch Valid ID metadata on mount
  useEffect(() => {
    if (!userUid) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getValidIdMetadata(userUid);
        setValidIdData(data);
        
        // Prefetch preview URL if Valid ID exists and is an image
        if (data?.hasValidId && data?.mimetype?.startsWith('image/')) {
          try {
            const urlResult = await getValidIdDownloadUrl(userUid);
            if (urlResult?.url) {
              setPreviewUrl(urlResult.url);
            }
          } catch (err) {
            console.warn('Failed to prefetch Valid ID preview:', err);
          }
        }
      } catch (err) {
        console.error("Failed to fetch Valid ID:", err);
        setError(err.message || "Failed to load Valid ID information");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userUid]);

  const fetchValidIdData = async () => {
    if (!userUid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getValidIdMetadata(userUid);
      setValidIdData(data);
      
      // Prefetch preview URL if Valid ID exists and is an image
      if (data?.hasValidId && data?.mimetype?.startsWith('image/')) {
        try {
          const urlResult = await getValidIdDownloadUrl(userUid);
          if (urlResult?.url) {
            setPreviewUrl(urlResult.url);
          }
        } catch (err) {
          console.warn('Failed to prefetch Valid ID preview:', err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Valid ID:", err);
      setError(err.message || "Failed to load Valid ID information");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!validIdData) return;
    
    setPreviewLoading(true);
    try {
      // Use cached preview URL if available, otherwise fetch
      let url = previewUrl;
      if (!url) {
        const result = await getValidIdDownloadUrl(userUid);
        url = result?.url;
        if (url) {
          setPreviewUrl(url);
        }
      }
      
      if (url) {
        if (validIdData.mimetype && validIdData.mimetype.startsWith('image/')) {
          setLightboxOpen(true);
        } else {
          // For non-images, open in new tab
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.error('Error previewing Valid ID:', err);
      setError(err.message || 'Failed to preview Valid ID');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <IoIdCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Valid ID</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <IoIdCard className="w-5 h-5 text-[var(--primary-red)]" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Valid ID</h3>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg mb-3">
          <IoAlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* No Valid ID State */}
      {!validIdData && !error && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <IoIdCard className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No Valid ID uploaded</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            A government-issued ID will be uploaded during the application process.
          </p>
        </div>
      )}

      {/* Valid ID Display */}
      {validIdData && validIdData.hasValidId && (
        <div className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <IoCheckmarkCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 dark:text-green-400 text-sm font-medium">
              Valid ID on file
            </span>
          </div>

          {/* Preview Thumbnail (for images) */}
          {validIdData.mimetype && validIdData.mimetype.startsWith('image/') && (
            <div className="mb-3">
              <button
                type="button"
                onClick={handlePreview}
                className="relative w-full h-32 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex items-center justify-center group hover:border-[var(--primary-red)] transition"
                title="Click to view full size"
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt={validIdData.filename || 'Valid ID'}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                        Click to preview
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {validIdData.filename || 'Valid ID'}
                  </div>
                )}

                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* File Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Filename:</span>
              <span className="text-gray-900 dark:text-white font-medium truncate max-w-[180px]" title={validIdData.filename}>
                {validIdData.filename}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">File Size:</span>
              <span className="text-gray-900 dark:text-white">
                {formatFileSize(validIdData.size)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(validIdData.uploadedAt)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox for Valid ID preview */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={previewUrl}
        imageName={validIdData?.filename || 'Valid ID'}
        images={previewUrl ? [{ url: previewUrl, name: validIdData?.filename || 'Valid ID' }] : []}
        currentIndex={0}
        onNavigate={() => {}}
      />
    </div>
  );
}

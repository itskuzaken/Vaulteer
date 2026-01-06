"use client";

import { useState, useEffect } from "react";
import { IoIdCard, IoDownload, IoTrash, IoRefresh, IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";
import { getValidIdMetadata, getValidIdDownloadUrl, deleteValidId } from "../../../services/profileService";

/**
 * ValidIdSection - Displays and manages Valid ID for user profiles
 * 
 * @param {Object} props
 * @param {string} props.userUid - Firebase UID of the profile owner
 * @param {boolean} props.canEdit - Whether current user can edit (admin/staff or owner)
 * @param {boolean} props.canDelete - Whether current user can delete (admin or owner)
 */
export default function ValidIdSection({ userUid, canEdit = false, canDelete = false }) {
  const [validIdData, setValidIdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch Valid ID metadata on mount
  useEffect(() => {
    if (!userUid) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getValidIdMetadata(userUid);
        setValidIdData(data);
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
    } catch (err) {
      console.error("Failed to fetch Valid ID:", err);
      setError(err.message || "Failed to load Valid ID information");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    
    setDownloading(true);
    try {
      const result = await getValidIdDownloadUrl(userUid);
      
      if (result && result.url) {
        // Open the presigned URL in a new tab for download
        const link = document.createElement("a");
        link.href = result.url;
        link.download = result.filename || "valid-id";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to download Valid ID:", err);
      setError(err.message || "Failed to download Valid ID");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    
    setDeleting(true);
    try {
      await deleteValidId(userUid);
      setValidIdData(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete Valid ID:", err);
      setError(err.message || "Failed to delete Valid ID");
    } finally {
      setDeleting(false);
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IoIdCard className="w-5 h-5 text-[var(--primary-red)]" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Valid ID</h3>
        </div>
        <button
          onClick={fetchValidIdData}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          title="Refresh"
        >
          <IoRefresh className="w-4 h-4" />
        </button>
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--primary-red)] text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <IoDownload className="w-4 h-4" />
              {downloading ? "Downloading..." : "Download"}
            </button>

            {/* Delete Button (if authorized) */}
            {canDelete && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm font-medium"
                  >
                    <IoTrash className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                    >
                      {deleting ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  IoArrowBackOutline,
  IoDocumentTextOutline,
  IoSaveOutline,
  IoCheckmarkCircleOutline,
  IoAttachOutline,
  IoImageOutline,
  IoDocumentOutline,
  IoTrashOutline,
  IoCalendarOutline,
} from "react-icons/io5";
import RichTextEditor from "../../ui/RichTextEditor";
import { useNotify } from "../../ui/NotificationProvider";
import { uploadAttachment } from "../../../services/postService";

/**
 * PostForm Component
 * Reusable form for creating and editing posts (News & Updates, Announcements)
 * 
 * @param {Object} props
 * @param {string} props.mode - 'create' or 'edit'
 * @param {string} props.postType - 'news_update' or 'announcement'
 * @param {Object} props.initialData - Initial form data (for edit mode)
 * @param {Function} props.onSaveDraft - Callback for saving draft
 * @param {Function} props.onPublish - Callback for publishing
 * @param {Function} props.onBack - Callback for back button
 */
export default function PostForm({
  mode = "create",
  postType = "news_update",
  initialData = null,
  onSaveDraft,
  onPublish,
  onBack,
}) {
  const notify = useNotify();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    scheduled_for: "",
    attachments: [],
  });
  const [isScheduled, setIsScheduled] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form with initial data in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        title: initialData.title || "",
        content: initialData.content || "",
        scheduled_for: initialData.scheduled_for
          ? new Date(initialData.scheduled_for).toISOString().slice(0, 16)
          : "",
        attachments: initialData.attachments || [],
      });
      setIsScheduled(!!initialData.scheduled_for);
    }
  }, [mode, initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters long";
    }

    if (!formData.content || formData.content.trim().length < 50) {
      newErrors.content = "Content must be at least 50 characters long";
    }

    if (isScheduled && !formData.scheduled_for) {
      newErrors.scheduled_for = "Please select a schedule date and time";
    }

    if (isScheduled && formData.scheduled_for) {
      const scheduleDate = new Date(formData.scheduled_for);
      if (scheduleDate <= new Date()) {
        newErrors.scheduled_for = "Schedule date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);

    if (postType === "announcement") {
      notify?.push("Announcements cannot have attachments", "error");
      return;
    }

    // Validate file size (5MB)
    const invalidFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      notify?.push(
        "Some files exceed the 5MB size limit and were not uploaded",
        "error"
      );
      return;
    }

    // Validate file types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    const invalidTypes = files.filter(
      (file) => !allowedTypes.includes(file.type)
    );
    if (invalidTypes.length > 0) {
      notify?.push(
        "Some files have invalid type. Only images and PDFs are allowed",
        "error"
      );
      return;
    }

    // Upload files
    setUploadingAttachment(true);
    try {
      const uploadPromises = files.map((file) => uploadAttachment(file));
      const uploadedFiles = await Promise.all(uploadPromises);

      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles],
      }));

      notify?.push("Files uploaded successfully", "success");
    } catch (error) {
      console.error("Error uploading files:", error);
      notify?.push(error.message || "Failed to upload files", "error");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      notify?.push("Please fix the errors before saving", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        post_type: postType,
        status: "draft",
        scheduled_for: isScheduled ? formData.scheduled_for : null,
      };

      await onSaveDraft?.(payload);
      notify?.push("Draft saved successfully", "success");
    } catch (error) {
      console.error("Error saving draft:", error);
      notify?.push(error.message || "Failed to save draft", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) {
      notify?.push("Please fix the errors before publishing", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        post_type: postType,
        status: isScheduled ? "scheduled" : "published",
        scheduled_for: isScheduled ? formData.scheduled_for : null,
      };

      await onPublish?.(payload);
      notify?.push(
        isScheduled
          ? "Post scheduled successfully"
          : "Post published successfully",
        "success"
      );
    } catch (error) {
      console.error("Error publishing post:", error);
      notify?.push(error.message || "Failed to publish post", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const postTypeLabel =
    postType === "news_update" ? "News & Update" : "Announcement";
  
  const iconColor = postType === "news_update" ? "blue" : "purple";

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-7xl">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-4 sm:ring-8 ring-red-100/60 dark:bg-red-900/40 dark:text-red-100 dark:ring-red-900/10`}>
                  <IoDocumentTextOutline className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {mode === "create" ? "Create" : "Edit"} {postTypeLabel}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    {mode === "create" 
                      ? `Fill in the details to create a new ${postTypeLabel.toLowerCase()}`
                      : `Update the details of your ${postTypeLabel.toLowerCase()}`
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 w-full sm:w-auto"
              >
                <IoArrowBackOutline className="h-5 w-5" />
                <span>Back</span>
              </button>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* Form */}
            <div className="space-y-4 sm:space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter post title (min 5 characters)"
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.title ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => handleInputChange("content", value)}
                  placeholder="Write your content here (min 50 characters)..."
                  readOnly={isSubmitting}
                />
                {errors.content && (
                  <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                )}
              </div>

              {/* Attachments (News & Updates only) */}
              {postType === "news_update" && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    <IoAttachOutline className="inline-block w-4 h-4 mr-1" />
                    Attachments (Optional)
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Upload images or PDFs (max 5MB each)
                  </p>

                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="block w-full text-xs sm:text-sm text-gray-500 dark:text-gray-400 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 dark:file:bg-red-700 dark:hover:file:bg-red-800 cursor-pointer"
                    disabled={isSubmitting || uploadingAttachment}
                  />

                  {uploadingAttachment && (
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2">Uploading...</p>
                  )}

                  {/* Attachment List */}
                  {formData.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            {attachment.mimetype?.startsWith("image/") ? (
                              <IoImageOutline className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                            ) : (
                              <IoDocumentOutline className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.originalname || attachment.filename}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(attachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition flex-shrink-0"
                            disabled={isSubmitting}
                          >
                            <IoTrashOutline className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Schedule Toggle */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="schedule-toggle"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="schedule-toggle"
                  className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2"
                >
                  <IoCalendarOutline className="w-4 h-4" />
                  Schedule for later
                </label>
              </div>

              {/* Schedule Date/Time */}
              {isScheduled && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Schedule Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) => handleInputChange("scheduled_for", e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.scheduled_for ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors.scheduled_for && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.scheduled_for}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 order-3 sm:order-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 order-2 sm:order-2"
                  disabled={isSubmitting}
                >
                  <IoSaveOutline className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 order-1 sm:order-3"
                  disabled={isSubmitting}
                >
                  <IoCheckmarkCircleOutline className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{isSubmitting
                    ? "Publishing..."
                    : isScheduled
                    ? "Schedule Post"
                    : "Publish Now"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

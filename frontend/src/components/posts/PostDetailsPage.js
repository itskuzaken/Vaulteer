"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  IoCalendarOutline, 
  IoPersonOutline, 
  IoTimeOutline,
  IoDocumentTextOutline,
  IoAttachOutline,
  IoArrowBackOutline,
  IoCreateOutline,
  IoArchiveOutline,
  IoTrashOutline,
  IoCheckmarkCircleOutline,
  IoImageOutline,
  IoDocumentOutline,
  IoDownloadOutline,
  IoShareSocialOutline,
} from "react-icons/io5";
import { getPostByUid, deletePost, archivePost, unarchivePost } from "@/services/postService";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/ui/RichTextEditor";
import ImageLightbox from "@/components/ui/ImageLightbox";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { normalizeAttachmentUrl } from "../../config/config";

export default function PostDetailsPage({ postUid, currentUser, onBack, onEdit }) {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Action states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [unarchiveModalOpen, setUnarchiveModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!postUid) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        const data = await getPostByUid(postUid);
        setPost(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch post:", err);
        setError(err.message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postUid]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleEdit = () => {
    if (onEdit && post) {
      onEdit(post);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await deletePost(post.post_uid);
      setDeleteModalOpen(false);
      handleBack();
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete post. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setActionLoading(true);
      await archivePost(post.post_uid);
      setArchiveModalOpen(false);
      // Refresh post data
      const data = await getPostByUid(postUid);
      setPost(data);
    } catch (err) {
      console.error("Failed to archive post:", err);
      alert("Failed to archive post. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchive = async () => {
    try {
      setActionLoading(true);
      await unarchivePost(post.post_uid);
      setUnarchiveModalOpen(false);
      // Refresh post data
      const data = await getPostByUid(postUid);
      setPost(data);
    } catch (err) {
      console.error("Failed to unarchive post:", err);
      alert("Failed to unarchive post. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.title,
        url: url,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateReadTime = (content) => {
    if (!content) return 1;
    // Remove HTML tags
    const text = content.replace(/<[^>]*>/g, '');
    // Average reading speed is 200 words per minute
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes || 1;
  };

  const getPostTypeLabel = (postType) => {
    return postType === "news_update" ? "News & Updates" : "Announcement";
  };

  const handleViewImage = (attachment) => {
    // Get all image attachments for navigation
    const imageAttachments = (post.attachments || []).filter((att) => 
      att.mimetype?.startsWith("image/") || 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename)
    );
    const imageIndex = imageAttachments.findIndex((att) => att.url === attachment.url);
    
    setLightboxImages(imageAttachments);
    setLightboxIndex(imageIndex);
    setLightboxImage(attachment);
    setLightboxOpen(true);
  };

  const handleLightboxNavigate = (direction) => {
    const newIndex = direction === "next" ? lightboxIndex + 1 : lightboxIndex - 1;
    if (newIndex >= 0 && newIndex < lightboxImages.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(lightboxImages[newIndex]);
    }
  };

  const isImageAttachment = (attachment) => {
    return attachment.mimetype?.startsWith("image/") || 
           /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.filename);
  };

  if (loading) {
    return (
      <div className="flex justify-center w-full">
        <div className="w-full max-w-5xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex justify-center w-full">
        <div className="w-full max-w-5xl">
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 sm:p-6">
            <p className="text-red-800 dark:text-red-200">{error || "Post not found"}</p>
            <Button
              variant="secondary"
              icon={IoArrowBackOutline}
              onClick={handleBack}
              className="mt-4 text-red-800 dark:text-red-200 hover:underline"
              size="medium"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Only the post author can edit their post
  const canEdit = currentUser && currentUser.user_id && post.author_id && currentUser.user_id == post.author_id;

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-6">
        {/* Header with Back Button and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            icon={IoArrowBackOutline}
            onClick={handleBack}
            className="justify-start"
          >
            Back to Posts
          </Button>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Share Button - Available to all */}
            <Button
              variant="secondary"
              icon={IoShareSocialOutline}
              onClick={handleShare}
              size="medium"
            >
              Share
            </Button>

            {/* Author-only Actions */}
            {canEdit && (
              <>
                {/* Archive/Unarchive Button */}
                {post.status === "archived" ? (
                  <Button
                    variant="primary"
                    icon={IoCheckmarkCircleOutline}
                    onClick={() => setUnarchiveModalOpen(true)}
                    size="medium"
                  >
                    Unarchive
                  </Button>
                ) : post.status !== "draft" && (
                  <Button
                    variant="ghost"
                    icon={IoArchiveOutline}
                    onClick={() => setArchiveModalOpen(true)}
                    size="medium"
                  >
                    Archive
                  </Button>
                )}

                {/* Delete Button - Only for drafts */}
                {post.status === "draft" && (
                  <Button
                    variant="danger"
                    icon={IoTrashOutline}
                    onClick={() => setDeleteModalOpen(true)}
                    size="medium"
                  >
                    Delete
                  </Button>
                )}

                {/* Edit Button */}
                <Button
                  variant="primary"
                  icon={IoCreateOutline}
                  onClick={handleEdit}
                  size="medium"
                >
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Post Content Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Title and Status */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex-1">
                  {post.title}
                </h1>
                <StatusBadge status={post.status} />
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <IoDocumentTextOutline className="h-4 w-4" />
                <span>{getPostTypeLabel(post.post_type)}</span>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3 border-t border-b border-gray-200 dark:border-gray-700 py-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <IoPersonOutline className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{post.author_name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IoTimeOutline className="h-4 w-4 text-gray-400" />
                  <span>{calculateReadTime(post.content)} min read</span>
                </div>
                {post.attachments && post.attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <IoAttachOutline className="h-4 w-4 text-gray-400" />
                    <span>{post.attachments.length} {post.attachments.length === 1 ? 'attachment' : 'attachments'}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-500">
                <div className="flex items-center gap-1.5">
                  <IoCalendarOutline className="h-3.5 w-3.5" />
                  <span>Created {formatDate(post.created_at)}</span>
                </div>
                {post.publish_at && (
                  <div className="flex items-center gap-1.5">
                    <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                    <span>Published {formatDate(post.publish_at)}</span>
                  </div>
                )}
                {post.scheduled_for && post.status === "scheduled" && (
                  <div className="flex items-center gap-1.5">
                    <IoTimeOutline className="h-3.5 w-3.5" />
                    <span>Scheduled for {formatDate(post.scheduled_for)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none">
              <RichTextEditor
                value={post.content || ""}
                readOnly={true}
                className="read-only"
              />
            </div>

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <IoAttachOutline className="h-4 w-4 sm:h-5 sm:w-5" />
                  Attachments ({post.attachments.length})
                </h2>

                {/* Image Gallery */}
                {post.attachments.some(att => isImageAttachment(att)) && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Images</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {post.attachments
                        .filter(att => isImageAttachment(att))
                        .map((attachment, index) => (
                          <div
                            key={index}
                            className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-all"
                            onClick={() => handleViewImage(attachment)}
                          >
                            <div className="aspect-square relative">
                              <Image
                                src={normalizeAttachmentUrl(attachment.url)}
                                alt={attachment.filename || attachment.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                unoptimized
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                              <IoImageOutline className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-xs truncate">
                                {attachment.filename || attachment.name}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Other Files */}
                {post.attachments.some(att => !isImageAttachment(att)) && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Files</p>
                    <div className="space-y-2">
                      {post.attachments
                        .filter(att => !isImageAttachment(att))
                        .map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <IoDocumentOutline className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.filename || attachment.name}
                              </p>
                              {attachment.size && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(attachment.size / 1024).toFixed(2)} KB
                                </p>
                              )}
                            </div>
                            <a
                              href={attachment.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IoDownloadOutline className="h-5 w-5" />
                            </a>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={normalizeAttachmentUrl(lightboxImage?.url)}
        imageName={lightboxImage?.filename || lightboxImage?.name}
        images={lightboxImages.map(img => ({ ...img, url: normalizeAttachmentUrl(img.url) }))}
        currentIndex={lightboxIndex}
        onNavigate={handleLightboxNavigate}
      />

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleArchive}
        title="Archive Post"
        message="Are you sure you want to archive this post? It will be hidden from the main feed but can be restored later."
        confirmText="Archive"
        confirmVariant="primary"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={unarchiveModalOpen}
        onClose={() => setUnarchiveModalOpen(false)}
        onConfirm={handleUnarchive}
        title="Unarchive Post"
        message="Are you sure you want to restore this post? It will be visible in the main feed again."
        confirmText="Unarchive"
        confirmVariant="success"
        loading={actionLoading}
      />
    </div>
  );
}

import { API_BASE } from "../config/config";
import { getIdToken } from "./firebase";

/**
 * Post Service
 * Handles API calls for post management (news_update and announcement)
 */

/**
 * Get all posts with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.post_type - Filter by 'news_update' or 'announcement'
 * @param {string} filters.status - Filter by status
 * @param {number} filters.author_id - Filter by author ID
 * @returns {Promise<Array>} Array of posts
 */
export async function getPosts(filters = {}) {
  const token = await getIdToken();
  const queryParams = new URLSearchParams();

  if (filters.post_type) queryParams.append("post_type", filters.post_type);
  if (filters.status) queryParams.append("status", filters.status);
  if (filters.author_id) queryParams.append("author_id", filters.author_id);

  const queryString = queryParams.toString();
  const url = `${API_BASE}/posts${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch posts");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get a single post by UID
 * @param {string} uid - Post UID
 * @returns {Promise<Object>} Post object
 */
export async function getPost(uid) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts/${uid}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch post");
  }

  const data = await response.json();
  return data.data;
}

// Alias for consistency with other services
export const getPostByUid = getPost;

/**
 * Create a new post
 * @param {Object} postData - Post data
 * @param {string} postData.title - Post title
 * @param {string} postData.content - Post content (HTML from rich text editor)
 * @param {string} postData.post_type - 'news_update' or 'announcement'
 * @param {string} postData.status - 'draft', 'published', 'scheduled'
 * @param {Array} postData.attachments - Array of attachment objects (news_update only)
 * @param {string} postData.scheduled_for - ISO datetime for scheduled posts
 * @returns {Promise<Object>} Created post
 */
export async function createPost(postData) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create post");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update a post
 * @param {string} uid - Post UID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated post
 */
export async function updatePost(uid, updates) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts/${uid}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update post");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Publish a post
 * @param {string} uid - Post UID
 * @returns {Promise<Object>} Published post
 */
export async function publishPost(uid) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts/${uid}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to publish post");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Archive a post
 * @param {string} uid - Post UID
 * @returns {Promise<Object>} Archived post
 */
export async function archivePost(uid) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts/${uid}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to archive post");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Unarchive a post (restore to published status)
 * @param {string} uid - Post UID
 * @returns {Promise<Object>} Unarchived post
 */
export async function unarchivePost(uid) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts/${uid}/unarchive`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to unarchive post");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete a post (only drafts can be deleted)
 * @param {string} uid - Post UID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePost(uid) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE}/posts/${uid}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete post");
  }

  return true;
}

/**
 * Upload an attachment file (for news_update posts)
 * @param {File} file - File to upload
 * @returns {Promise<Object>} Upload result with file URL
 */
export async function uploadAttachment(file) {
  const token = await getIdToken();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/posts/upload-attachment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to upload attachment");
  }

  const data = await response.json();
  return data.data;
}

// Export as a service object for convenience
export const postService = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  archivePost,
  uploadAttachment,
};

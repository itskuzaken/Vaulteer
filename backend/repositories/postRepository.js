const { getPool } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs').promises;
const path = require('path');

/**
 * Post Repository
 * Handles database operations for posts (news_update and announcement)
 */

/**
 * Create a new post
 * @param {Object} postData - Post data
 * @param {string} postData.title - Post title
 * @param {string} postData.content - Post content (HTML from rich text editor)
 * @param {string} postData.post_type - Post type: 'news_update' or 'announcement'
 * @param {string} postData.status - Status: 'draft', 'published', 'scheduled', 'archived'
 * @param {number} postData.author_id - Author user ID
 * @param {Array} postData.attachments - Array of attachment objects (for news_update only)
 * @param {string} postData.scheduled_for - ISO datetime string for scheduled posts
 * @returns {Promise<Object>} Created post with uid
 */
async function create(postData) {
  const uid = uuidv4();
  const {
    title,
    content,
    post_type,
    status = "draft",
    author_id,
    attachments = null,
    scheduled_for = null,
  } = postData;

  const publish_at = status === "published" ? new Date() : null;
  const attachmentsJson =
    attachments && attachments.length > 0 ? JSON.stringify(attachments) : null;

  const [result] = await getPool().query(
    `INSERT INTO posts 
      (uid, title, content, post_type, status, author_id, attachments, publish_at, scheduled_for)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid,
      title,
      content,
      post_type,
      status,
      author_id,
      attachmentsJson,
      publish_at,
      scheduled_for,
    ]
  );

  return {
    post_id: result.insertId,
    uid,
    ...postData,
    publish_at,
  };
}

/**
 * Get all posts with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.post_type - Filter by post type
 * @param {string} filters.status - Filter by status
 * @param {number} filters.author_id - Filter by author
 * @returns {Promise<Array>} Array of posts
 */
async function getAll(filters = {}) {
  let query = `
    SELECT 
      p.post_id,
      p.uid,
      p.title,
      p.content,
      p.post_type,
      p.status,
      p.author_id,
      p.attachments,
      p.publish_at,
      p.scheduled_for,
      p.archived_at,
      p.created_at,
      p.updated_at,
      u.name AS author_name,
      u.email AS author_email
    FROM posts p
    JOIN users u ON p.author_id = u.user_id
    WHERE 1=1
  `;

  const params = [];

  if (filters.post_type) {
    query += ` AND p.post_type = ?`;
    params.push(filters.post_type);
  }

  if (filters.status) {
    query += ` AND p.status = ?`;
    params.push(filters.status);
  }

  if (filters.author_id) {
    query += ` AND p.author_id = ?`;
    params.push(filters.author_id);
  }

  query += ` ORDER BY p.created_at DESC`;

  const [rows] = await getPool().query(query, params);

  // Parse attachments JSON (if needed - mysql2 may already parse JSON columns)
  return rows.map((row) => ({
    ...row,
    attachments: row.attachments 
      ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments)
      : [],
  }));
}

/**
 * Get a single post by UID
 * @param {string} uid - Post UID
 * @returns {Promise<Object|null>} Post object or null
 */
async function getByUid(uid) {
  const [rows] = await getPool().query(
    `SELECT 
      p.post_id,
      p.uid,
      p.title,
      p.content,
      p.post_type,
      p.status,
      p.author_id,
      p.attachments,
      p.publish_at,
      p.scheduled_for,
      p.archived_at,
      p.created_at,
      p.updated_at,
      u.name AS author_name,
      u.email AS author_email
    FROM posts p
    JOIN users u ON p.author_id = u.user_id
    WHERE p.uid = ?`,
    [uid]
  );

  if (rows.length === 0) return null;

  const post = rows[0];
  return {
    ...post,
    attachments: post.attachments 
      ? (typeof post.attachments === 'string' ? JSON.parse(post.attachments) : post.attachments)
      : [],
  };
}

/**
 * Update a post
 * @param {string} uid - Post UID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated post
 */
async function update(uid, updates) {
  const allowedFields = [
    "title",
    "content",
    "post_type",
    "status",
    "attachments",
    "scheduled_for",
    "publish_at",
    "archived_at",
  ];
  const setClause = [];
  const params = [];

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      if (key === "attachments" && updates[key]) {
        params.push(JSON.stringify(updates[key]));
      } else {
        params.push(updates[key]);
      }
    }
  });

  if (setClause.length === 0) {
    throw new Error("No valid fields to update");
  }

  // If status is being changed to published, set publish_at
  if (updates.status === "published" && !updates.publish_at) {
    setClause.push("publish_at = NOW()");
  }

  // If status is being changed to archived, set archived_at
  if (updates.status === "archived" && !updates.archived_at) {
    setClause.push("archived_at = NOW()");
  }

  params.push(uid);

  await getPool().query(
    `UPDATE posts SET ${setClause.join(", ")} WHERE uid = ?`,
    params
  );

  return getByUid(uid);
}

/**
 * Archive a post
 * @param {string} uid - Post UID
 * @returns {Promise<Object>} Archived post
 */
async function archive(uid) {
  await getPool().query(
    `UPDATE posts SET status = 'archived', archived_at = NOW() WHERE uid = ?`,
    [uid]
  );

  return getByUid(uid);
}

/**
 * Delete a post (hard delete)
 * @param {string} uid - Post UID
 * @returns {Promise<boolean>} Success status
 */
async function deletePost(uid) {
  const [result] = await getPool().query(`DELETE FROM posts WHERE uid = ?`, [uid]);

  return result.affectedRows > 0;
}

/**
 * Unarchive a post (restore to published status)
 * @param {string} uid - Post UID
 * @param {number} userId - User ID (for permission check)
 * @returns {Promise<Object>} Unarchived post
 */
async function unarchive(uid, userId) {
  const [result] = await getPool().query(
    `UPDATE posts SET status = 'published', archived_at = NULL, updated_at = NOW() 
     WHERE uid = ? AND author_id = ? AND status = 'archived'`,
    [uid, userId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Post not found or you do not have permission to unarchive it');
  }

  return getByUid(uid);
}

/**
 * Publish a scheduled post (called by scheduler)
 * @param {string} uid - Post UID
 * @returns {Promise<Object>} Published post
 */
async function publish(uid) {
  await getPool().query(
    `UPDATE posts SET status = 'published', publish_at = NOW() WHERE uid = ? AND status = 'scheduled'`,
    [uid]
  );

  return getByUid(uid);
}

/**
 * Get posts scheduled for publishing
 * @returns {Promise<Array>} Array of scheduled posts ready to publish
 */
async function getScheduledForPublishing() {
  const [rows] = await getPool().query(
    `SELECT uid FROM posts 
     WHERE status = 'scheduled' 
     AND scheduled_for <= NOW()`
  );

  return rows;
}

/**
 * Publish all scheduled posts that are ready
 * @returns {Promise<number>} Number of posts published
 */
async function publishScheduledPosts() {
  try {
    const scheduledPosts = await getScheduledForPublishing();
    
    if (scheduledPosts.length === 0) {
      return 0;
    }

    let publishedCount = 0;
    for (const post of scheduledPosts) {
      try {
        await publish(post.uid);
        publishedCount++;
      } catch (error) {
        console.error(`Failed to publish scheduled post ${post.uid}:`, error);
        // Continue with other posts even if one fails
      }
    }

    return publishedCount;
  } catch (error) {
    console.error('Error in publishScheduledPosts:', error);
    throw error;
  }
}

/**
 * Delete attachment file from filesystem
 * @param {string} filePath - Relative file path (e.g., "posts/image-123.jpg")
 * @returns {Promise<boolean>} Success status
 */
async function deleteAttachmentFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '../uploads', filePath);
    await fs.unlink(fullPath);
    console.log(`✓ Deleted attachment file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to delete attachment file: ${filePath}`, error.message);
    // Don't throw - file might already be deleted
    return false;
  }
}

/**
 * Clean up orphaned attachment files
 * Compare existing post with updated attachments and delete removed files
 * @param {string} uid - Post UID
 * @param {Array} newAttachments - New attachments array
 * @returns {Promise<void>}
 */
async function cleanupOrphanedAttachments(uid, newAttachments = []) {
  try {
    const existingPost = await getByUid(uid);
    if (!existingPost || !existingPost.attachments || existingPost.attachments.length === 0) {
      return; // No existing attachments to clean up
    }

    // Get URLs/paths of new attachments
    const newPaths = new Set(newAttachments.map(a => a.url || a.filepath));

    // Find attachments that were removed
    const removedAttachments = existingPost.attachments.filter(
      existing => !newPaths.has(existing.url || existing.filepath)
    );

    // Delete removed files from filesystem
    for (const attachment of removedAttachments) {
      const filePath = attachment.filepath || attachment.url?.replace('/uploads/', '');
      if (filePath) {
        await deleteAttachmentFile(filePath);
      }
    }

    if (removedAttachments.length > 0) {
      console.log(`🗑️  Cleaned up ${removedAttachments.length} orphaned attachment(s) for post ${uid}`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned attachments:', error);
    // Don't throw - file cleanup is not critical to post update
  }
}

module.exports = {
  create,
  getAll,
  getByUid,
  update,
  archive,
  unarchive,
  deletePost,
  publish,
  getScheduledForPublishing,
  publishScheduledPosts,
  cleanupOrphanedAttachments,
  deleteAttachmentFile,
};

const postRepository = require("../repositories/postRepository");
const activityLogService = require("../services/activityLogService");
const notificationService = require("../services/notificationService");

/**
 * Posts Controller
 * Handles HTTP requests for post management (news_update and announcement)
 */

/**
 * Create a new post
 * POST /api/posts
 */
async function createPost(req, res) {
  try {
    const { title, content, post_type, status, attachments, scheduled_for } =
      req.body;
    const author_id = req.authenticatedUser.userId;

    // Validation
    if (!title || title.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 5 characters long",
      });
    }

    if (!content || content.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Content must be at least 50 characters long",
      });
    }

    if (!["news_update", "announcement"].includes(post_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type. Must be 'news_update' or 'announcement'",
      });
    }

    // Announcements should not have attachments
    if (post_type === "announcement" && attachments && attachments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Announcements cannot have attachments",
      });
    }

    const postData = {
      title,
      content,
      post_type,
      status: status || "draft",
      author_id,
      attachments:
        post_type === "news_update" && attachments ? attachments : null,
      scheduled_for: scheduled_for || null,
    };

    const post = await postRepository.create(postData);

    console.log(`📝 Post created: "${title}" | Type: ${post_type} | Status: ${post.status}`);

    // Log activity
    await activityLogService.createLog({
      type: activityLogService.LOG_TYPES.POST,
      action: "CREATE",
      performedBy: {
        userId: author_id,
        name: req.authenticatedUser.name || "Unknown",
        role: req.authenticatedUser.role || "user",
      },
      targetResource: { type: "post", id: post.post_id, name: title },
      description: `Created ${post_type === "news_update" ? "news & update" : "announcement"} post: "${title}"`,
      severity: activityLogService.SEVERITY_LEVELS.INFO,
      metadata: { post_uid: post.uid, status: post.status },
    });

    // Send notifications if post is created as published
    if (post.status === "published") {
      try {
        console.log(`📢 Sending notifications for published ${post_type}: ${title}`);
        const result = await notificationService.notifyAnnouncementPublished(post);
        console.log(`✅ Notifications sent successfully:`, result);
      } catch (notifError) {
        console.error("❌ Error sending post created notifications:", notifError);
        // Don't fail the request if notifications fail
      }
    } else {
      console.log(`⏸️  Post created as ${post.status}, notifications will be sent when published`);
    }

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
}

/**
 * Get all posts with optional filters
 * GET /api/posts?post_type=news_update&status=published
 * 
 * Non-admin/staff users can only see published posts
 * Admin/staff can see all posts
 */
async function getPosts(req, res) {
  try {
    const { post_type, status, author_id } = req.query;
    const userRole = req.authenticatedUser.role?.toLowerCase();

    const filters = {};
    if (post_type) filters.post_type = post_type;
    
    // Non-admin/staff users can only see published posts
    if (!["admin", "staff"].includes(userRole)) {
      filters.status = "published";
    } else if (status) {
      // Admin/staff can filter by any status
      filters.status = status;
    }
    
    if (author_id) filters.author_id = parseInt(author_id, 10);

    const posts = await postRepository.getAll(filters);

    res.status(200).json({
      success: true,
      data: posts,
      count: posts.length,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
}

/**
 * Get a single post by UID
 * GET /api/posts/:uid
 * 
 * Non-admin/staff users can only view published posts
 * Admin/staff can view any post
 */
async function getPost(req, res) {
  try {
    const { uid } = req.params;
    const userRole = req.authenticatedUser.role?.toLowerCase();

    const post = await postRepository.getByUid(uid);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Non-admin/staff users can only view published posts
    if (!["admin", "staff"].includes(userRole) && post.status !== "published") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this post",
      });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch post",
      error: error.message,
    });
  }
}

/**
 * Update a post
 * PUT /api/posts/:uid
 */
async function updatePost(req, res) {
  try {
    const { uid } = req.params;
    const updates = req.body;
    const userId = req.authenticatedUser.userId;

    const existingPost = await postRepository.getByUid(uid);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Only post author can edit (use loose equality to handle type coercion)
    if (existingPost.author_id != userId) {
      console.log('[DEBUG] Author check failed:', {
        existingPostAuthorId: existingPost.author_id,
        existingPostAuthorIdType: typeof existingPost.author_id,
        userId: userId,
        userIdType: typeof userId,
      });
      return res.status(403).json({
        success: false,
        message: "Only the post author can edit this post",
      });
    }

    // Validation
    if (updates.title && updates.title.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 5 characters long",
      });
    }

    if (updates.content && updates.content.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Content must be at least 50 characters long",
      });
    }

    // Announcements should not have attachments
    if (
      existingPost.post_type === "announcement" &&
      updates.attachments &&
      updates.attachments.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Announcements cannot have attachments",
      });
    }

    // Clean up orphaned attachments if attachments are being updated
    if (updates.attachments !== undefined && existingPost.post_type === "news_update") {
      await postRepository.cleanupOrphanedAttachments(uid, updates.attachments);
    }

    const updatedPost = await postRepository.update(uid, updates);

    // Log activity
    await activityLogService.createLog({
      type: activityLogService.LOG_TYPES.POST,
      action: "UPDATE",
      performedBy: {
        userId,
        name: req.authenticatedUser.name || "Unknown",
        role: req.authenticatedUser.role || "user",
      },
      targetResource: { type: "post", id: updatedPost.post_id, name: updatedPost.title },
      description: `Updated ${updatedPost.post_type === "news_update" ? "news & update" : "announcement"} post: "${updatedPost.title}"`,
      severity: activityLogService.SEVERITY_LEVELS.INFO,
      metadata: { post_uid: uid, status: updatedPost.status },
    });

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update post",
      error: error.message,
    });
  }
}

/**
 * Archive a post
 * POST /api/posts/:uid/archive
 */
async function archivePost(req, res) {
  try {
    const { uid } = req.params;
    const userId = req.authenticatedUser.userId;

    const existingPost = await postRepository.getByUid(uid);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const archivedPost = await postRepository.archive(uid);

    // Log activity
    await activityLogService.createLog({
      type: activityLogService.LOG_TYPES.POST,
      action: "ARCHIVE",
      performedBy: {
        userId,
        name: req.authenticatedUser.name || "Unknown",
        role: req.authenticatedUser.role || "user",
      },
      targetResource: { type: "post", id: archivedPost.post_id, name: archivedPost.title },
      description: `Archived ${archivedPost.post_type === "news_update" ? "news & update" : "announcement"} post: "${archivedPost.title}"`,
      severity: activityLogService.SEVERITY_LEVELS.INFO,
      metadata: { post_uid: uid },
    });

    res.status(200).json({
      success: true,
      message: "Post archived successfully",
      data: archivedPost,
    });
  } catch (error) {
    console.error("Error archiving post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive post",
      error: error.message,
    });
  }
}

/**
 * Unarchive a post (restore to published status)
 * PUT /api/posts/:uid/unarchive
 */
async function unarchivePost(req, res) {
  try {
    const { uid } = req.params;
    const userId = req.authenticatedUser.userId;

    const existingPost = await postRepository.getByUid(uid);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (existingPost.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: "Only archived posts can be unarchived",
      });
    }

    const unarchivedPost = await postRepository.unarchive(uid, userId);

    // Log activity
    await activityLogService.createLog({
      type: activityLogService.LOG_TYPES.POST,
      action: "UNARCHIVE",
      performedBy: {
        userId,
        name: req.authenticatedUser.name || "Unknown",
        role: req.authenticatedUser.role || "user",
      },
      targetResource: { type: "post", id: unarchivedPost.post_id, name: unarchivedPost.title },
      description: `Unarchived ${unarchivedPost.post_type === "news_update" ? "news & update" : "announcement"} post: "${unarchivedPost.title}"`,
      severity: activityLogService.SEVERITY_LEVELS.INFO,
      metadata: { post_uid: uid },
    });

    res.status(200).json({
      success: true,
      message: "Post unarchived successfully",
      data: unarchivedPost,
    });
  } catch (error) {
    console.error("Error unarchiving post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unarchive post",
      error: error.message,
    });
  }
}

/**
 * Delete a post (only drafts can be deleted)
 * DELETE /api/posts/:uid
 */
async function deletePost(req, res) {
  try {
    const { uid } = req.params;
    const userId = req.authenticatedUser.userId;

    const existingPost = await postRepository.getByUid(uid);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Only allow deletion of drafts
    if (existingPost.status !== "draft") {
      return res.status(403).json({
        success: false,
        message: "Only draft posts can be deleted. Please archive instead.",
      });
    }

    // Clean up all attachments before deleting post
    if (existingPost.attachments && existingPost.attachments.length > 0) {
      await postRepository.cleanupOrphanedAttachments(uid, []);
    }

    const deleted = await postRepository.deletePost(uid);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete post",
      });
    }

    // Log activity
    await activityLogService.createLog({
      type: activityLogService.LOG_TYPES.POST,
      action: "DELETE",
      performedBy: {
        userId,
        name: req.authenticatedUser.name || "Unknown",
        role: req.authenticatedUser.role || "user",
      },
      targetResource: { type: "post", id: existingPost.post_id, name: existingPost.title },
      description: `Deleted draft ${existingPost.post_type === "news_update" ? "news & update" : "announcement"} post: "${existingPost.title}"`,
      severity: activityLogService.SEVERITY_LEVELS.INFO,
      metadata: { post_uid: uid },
    });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete post",
      error: error.message,
    });
  }
}

/**
 * Publish a post (change status from draft/scheduled to published)
 * POST /api/posts/:uid/publish
 */
async function publishPost(req, res) {
  try {
    const { uid } = req.params;
    const userId = req.authenticatedUser.userId;

    const existingPost = await postRepository.getByUid(uid);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const updatedPost = await postRepository.update(uid, {
      status: "published",
      publish_at: new Date(),
    });

    // Log activity
    await activityLogService.createLog({
      type: activityLogService.LOG_TYPES.POST,
      action: "PUBLISH",
      performedBy: {
        userId,
        name: req.authenticatedUser.name || "Unknown",
        role: req.authenticatedUser.role || "user",
      },
      targetResource: { type: "post", id: updatedPost.post_id, name: updatedPost.title },
      description: `Published ${updatedPost.post_type === "news_update" ? "news & update" : "announcement"} post: "${updatedPost.title}"`,
      severity: activityLogService.SEVERITY_LEVELS.INFO,
      metadata: { post_uid: uid },
    });

    // Send notifications to all active users (in-app + push + email)
    try {
      console.log(`📢 Publishing ${updatedPost.post_type}: "${updatedPost.title}"`);
      const result = await notificationService.notifyAnnouncementPublished(updatedPost);
      console.log(`✅ Publish notifications sent successfully:`, result);
    } catch (notifError) {
      console.error("❌ Error sending post published notifications:", notifError);
      // Don't fail the request if notifications fail
    }

    res.status(200).json({
      success: true,
      message: "Post published successfully",
      data: updatedPost,
    });
  } catch (error) {
    console.error("Error publishing post:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish post",
      error: error.message,
    });
  }
}

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  archivePost,
  unarchivePost,
  deletePost,
  publishPost,
};

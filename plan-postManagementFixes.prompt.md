# Post Management System - Comprehensive Fix Plan

## Overview
This document outlines all identified issues in the post management system and provides detailed implementation plans for each fix. Issues are categorized by severity and priority.

---

## 🔴 CRITICAL PRIORITY

### 1. Missing Post Scheduler Job

**Problem:**
- Backend has `getScheduledPosts()` and `publishScheduledPosts()` methods in `postRepository.js`
- No scheduled post auto-publisher job exists in `backend/jobs/` directory
- `server.js` only starts `applicationDeadlineScheduler`, not a post scheduler
- Scheduled posts never automatically publish at their scheduled time

**Implementation Steps:**
1. Create `backend/jobs/postScheduler.js`:
   ```javascript
   const cron = require('node-cron');
   const postRepository = require('../repositories/postRepository');
   
   function startPostScheduler() {
     // Run every minute to check for posts to publish
     cron.schedule('* * * * *', async () => {
       try {
         const result = await postRepository.publishScheduledPosts();
         if (result.publishedCount > 0) {
           console.log(`[PostScheduler] Published ${result.publishedCount} scheduled posts`);
         }
       } catch (error) {
         console.error('[PostScheduler] Error publishing scheduled posts:', error);
       }
     });
     console.log('[PostScheduler] Started - checking every minute');
   }
   
   module.exports = { startPostScheduler };
   ```

2. Register scheduler in `backend/server.js`:
   ```javascript
   const { startPostScheduler } = require('./jobs/postScheduler');
   
   // After other schedulers
   startPostScheduler();
   ```

3. Test with actual scheduled posts to verify auto-publish works

**Files to Modify:**
- Create: `backend/jobs/postScheduler.js`
- Update: `backend/server.js` (add scheduler initialization)

**Testing:**
- Create a post scheduled for 2 minutes in the future
- Wait and verify it auto-publishes
- Check server logs for scheduler activity
- Verify status changes from "scheduled" to "published"

---

### 2. Missing Unarchive Functionality

**Problem:**
- Users can archive posts but cannot unarchive them
- No `unarchivePost()` method exists in any layer (frontend service, backend controller, repository)
- Once archived, posts are stuck in that state
- UI text mentions "restore" but functionality doesn't exist

**Implementation Steps:**

1. Add to `backend/repositories/postRepository.js`:
   ```javascript
   async unarchivePost(uid, userId) {
     const result = await pool.query(
       'UPDATE posts SET status = ?, updated_at = NOW() WHERE uid = ? AND archived_by = ?',
       ['published', uid, userId]
     );
     if (result.affectedRows === 0) {
       throw new Error('Post not found or you do not have permission to unarchive it');
     }
     return this.getPostByUid(uid);
   }
   ```

2. Add to `backend/controllers/postsController.js`:
   ```javascript
   async unarchivePost(req, res) {
     try {
       const { uid } = req.params;
       const post = await postRepository.unarchivePost(uid, req.user.id);
       res.json({ message: 'Post unarchived successfully', post });
     } catch (error) {
       console.error('Error unarchiving post:', error);
       res.status(500).json({ message: error.message || 'Failed to unarchive post' });
     }
   }
   ```

3. Add route in `backend/routes/posts.js`:
   ```javascript
   router.put('/:uid/unarchive', auth, postsController.unarchivePost);
   ```

4. Add to `frontend/src/services/postService.js`:
   ```javascript
   export async function unarchivePost(uid) {
     const response = await fetch(`${API_BASE_URL}/posts/${uid}/unarchive`, {
       method: 'PUT',
       headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
     });
     if (!response.ok) {
       const error = await response.json();
       throw new Error(error.message || 'Failed to unarchive post');
     }
     return response.json();
   }
   ```

5. Add "Unarchive" action in `Announcements.js` and `NewsUpdates.js`:
   ```javascript
   if (post.status === "archived") {
     actions.push({
       label: "Unarchive",
       icon: IoArrowUndoOutline,
       onClick: () => handleUnarchive(post),
       loading: inlineActionLoading,
     });
   }
   ```

6. Add handler function:
   ```javascript
   const handleUnarchive = useCallback(
     (post) =>
       runInlineMutation(
         () => unarchivePost(post.uid),
         "Post unarchived successfully"
       ),
     [runInlineMutation]
   );
   ```

**Files to Modify:**
- `backend/repositories/postRepository.js` (add unarchivePost method)
- `backend/controllers/postsController.js` (add unarchivePost controller)
- `backend/routes/posts.js` (add unarchive route)
- `frontend/src/services/postService.js` (add unarchivePost function)
- `frontend/src/components/dashboard/posts/Announcements.js` (add action + handler)
- `frontend/src/components/dashboard/posts/NewsUpdates.js` (add action + handler)

**Testing:**
- Archive a published post
- Verify "Unarchive" action appears
- Click unarchive and verify status returns to "published"
- Check database that status changed correctly
- Verify post appears in published tab after unarchive

---

### 3. Delete Button Visibility Bug in ManagePost

**Problem:**
- ManagePost.js shows delete button for ALL posts (lines 527-560 mobile, 460-473 desktop)
- Backend only allows deleting drafts (postsController.js lines 336-365 returns 403 for non-drafts)
- Users see delete button but get error when clicking for published/scheduled/archived posts
- Inconsistent with Announcements/NewsUpdates which correctly show delete only for drafts

**Implementation Steps:**

1. Fix mobile card delete button visibility in `ManagePost.js`:
   ```javascript
   {/* Replace the existing delete button condition */}
   {post.status === "draft" && (
     <button
       onClick={(e) => {
         e.stopPropagation();
         handleDeletePost(post);
       }}
       disabled={actionLoading}
       className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
       title="Delete"
     >
       <IoTrashOutline className="h-5 w-5" />
     </button>
   )}
   ```

2. Fix desktop table delete button visibility in `ManagePost.js`:
   ```javascript
   {/* In the Actions column */}
   {post.status === "draft" && (
     <button
       onClick={() => handleDeletePost(post)}
       disabled={actionLoading}
       className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
       title="Delete"
     >
       <IoTrashOutline className="h-4 w-4" />
     </button>
   )}
   ```

**Files to Modify:**
- `frontend/src/components/dashboard/posts/ManagePost.js` (lines ~527-560 for mobile, ~460-473 for desktop)

**Testing:**
- View posts in different statuses (draft, published, scheduled, archived)
- Verify delete button only shows for draft posts
- Verify edit/publish/archive buttons still work correctly
- Test on both mobile and desktop views

---

## 🔒 SECURITY PRIORITY

### 4. XSS Vulnerability in PostDetailsPage

**Problem:**
- `PostDetailsPage.js` line 189 uses `dangerouslySetInnerHTML` without sanitization
- Rich text content from database rendered directly as HTML
- Malicious users could inject `<script>` tags or other harmful HTML
- No DOMPurify or other sanitization library in use

**Implementation Steps:**

1. Install DOMPurify:
   ```bash
   npm install dompurify
   npm install --save-dev @types/dompurify
   ```

2. Update `PostDetailsPage.js`:
   ```javascript
   import DOMPurify from 'dompurify';
   
   // In the render section, replace dangerouslySetInnerHTML:
   <div
     className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert"
     dangerouslySetInnerHTML={{
       __html: DOMPurify.sanitize(post.content, {
         ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
         ALLOWED_ATTR: ['href', 'target', 'rel'],
       }),
     }}
   />
   ```

3. Consider sanitizing on backend before saving:
   ```javascript
   // In postsController.js createPost and updatePost
   const DOMPurify = require('isomorphic-dompurify');
   const cleanContent = DOMPurify.sanitize(content);
   ```

**Files to Modify:**
- `frontend/package.json` (add dompurify dependency)
- `frontend/src/app/(dashboard)/[role]/posts/[uid]/page.js` (import and use DOMPurify)
- Optional: `backend/controllers/postsController.js` (backend sanitization)

**Testing:**
- Try creating post with `<script>alert('XSS')</script>` in content
- Verify script doesn't execute on view page
- Test allowed HTML tags (bold, italic, links) still render correctly
- Test nested HTML doesn't break sanitization

---

## 🟡 MISSING FEATURES PRIORITY

### 5. Attachment Display Bug

**Problem:**
- Frontend code uses `attachment.name` to display attachment names
- Backend returns `attachment.filename` from database
- Attachment names show as "undefined" in UI
- Inconsistent property naming between frontend and backend

**Implementation Steps:**

Option A (Frontend Fix - Simpler):
1. Update all attachment display code to use `attachment.filename`:
   ```javascript
   // In PostDetailsPage.js and PostForm.js
   <span className="truncate">{attachment.filename}</span>
   ```

Option B (Backend Fix - More consistent):
1. Update backend to return `name` property:
   ```javascript
   // In postRepository.js getPostByUid
   const attachments = attachmentRows.map(row => ({
     ...row,
     name: row.filename, // Add alias
   }));
   ```

**Recommendation:** Use Option A (frontend fix) as it's simpler and backend already has correct schema.

**Files to Modify:**
- `frontend/src/app/(dashboard)/[role]/posts/[uid]/page.js` (PostDetailsPage attachments section)
- `frontend/src/components/dashboard/posts/PostForm.js` (attachment preview)

**Testing:**
- Upload post with attachments
- Verify attachment names display correctly
- Click download and verify correct file downloads
- Test with various file types (PDF, images, documents)

---

### 6. Orphaned File Cleanup

**Problem:**
- When attachments removed from post, files remain on server
- No garbage collection for unused files
- Disk space accumulates over time with orphaned files
- No DELETE endpoint for `/api/posts/attachments/:id`

**Implementation Steps:**

1. Add cleanup endpoint in `backend/routes/posts.js`:
   ```javascript
   router.delete('/attachments/:id', auth, postsController.deleteAttachment);
   ```

2. Add controller in `postsController.js`:
   ```javascript
   async deleteAttachment(req, res) {
     try {
       const { id } = req.params;
       await postRepository.deleteAttachment(id, req.user.id);
       res.json({ message: 'Attachment deleted successfully' });
     } catch (error) {
       console.error('Error deleting attachment:', error);
       res.status(500).json({ message: error.message || 'Failed to delete attachment' });
     }
   }
   ```

3. Add repository method in `postRepository.js`:
   ```javascript
   const fs = require('fs').promises;
   const path = require('path');
   
   async deleteAttachment(attachmentId, userId) {
     const [rows] = await pool.query(
       'SELECT a.*, p.author_id FROM post_attachments a JOIN posts p ON a.post_uid = p.uid WHERE a.id = ?',
       [attachmentId]
     );
     
     if (rows.length === 0) {
       throw new Error('Attachment not found');
     }
     
     const attachment = rows[0];
     if (attachment.author_id !== userId) {
       throw new Error('Permission denied');
     }
     
     // Delete from database
     await pool.query('DELETE FROM post_attachments WHERE id = ?', [attachmentId]);
     
     // Delete physical file
     const filePath = path.join(__dirname, '../uploads', attachment.filepath);
     try {
       await fs.unlink(filePath);
     } catch (err) {
       console.error('Failed to delete file:', err);
       // Don't throw - database cleanup succeeded
     }
   }
   ```

4. Add frontend service method in `postService.js`:
   ```javascript
   export async function deleteAttachment(attachmentId) {
     const response = await fetch(`${API_BASE_URL}/posts/attachments/${attachmentId}`, {
       method: 'DELETE',
       headers: getAuthHeaders(),
     });
     if (!response.ok) {
       const error = await response.json();
       throw new Error(error.message || 'Failed to delete attachment');
     }
     return response.json();
   }
   ```

5. Update `PostForm.js` to call delete when removing attachments:
   ```javascript
   const handleRemoveAttachment = async (index) => {
     const attachment = formData.attachments[index];
     if (attachment.id) {
       try {
         await deleteAttachment(attachment.id);
       } catch (error) {
         console.error('Failed to delete attachment:', error);
       }
     }
     setFormData({
       ...formData,
       attachments: formData.attachments.filter((_, i) => i !== index),
     });
   };
   ```

**Files to Modify:**
- `backend/routes/posts.js` (add delete route)
- `backend/controllers/postsController.js` (add deleteAttachment)
- `backend/repositories/postRepository.js` (add deleteAttachment with file cleanup)
- `frontend/src/services/postService.js` (add deleteAttachment)
- `frontend/src/components/dashboard/posts/PostForm.js` (call delete on remove)

**Testing:**
- Edit post with attachments
- Remove an attachment and save
- Verify file deleted from `backend/uploads/` directory
- Verify database record deleted from `post_attachments` table
- Verify other attachments remain intact

---

### 7. Weak Content Validation

**Problem:**
- Minimum 50 characters validation counts HTML tags
- User can satisfy requirement with `<p><br><br><br><br></p>` (minimal actual content)
- Rich text editors produce verbose HTML (wrapping, formatting tags)
- Should validate actual text content, not HTML source

**Implementation Steps:**

1. Install html-to-text:
   ```bash
   npm install html-to-text
   ```

2. Update validation in `PostForm.js`:
   ```javascript
   import { convert } from 'html-to-text';
   
   const validateForm = () => {
     const errors = {};
     
     if (!formData.title?.trim()) {
       errors.title = 'Title is required';
     }
     
     // Extract plain text from HTML
     const plainText = convert(formData.content || '', {
       wordwrap: false,
       selectors: [
         { selector: 'img', format: 'skip' },
         { selector: 'a', options: { ignoreHref: true } },
       ],
     }).trim();
     
     if (plainText.length < 50) {
       errors.content = `Content must be at least 50 characters (currently ${plainText.length})`;
     }
     
     if (formData.status === 'scheduled' && !formData.scheduled_at) {
       errors.scheduled_at = 'Scheduled date is required';
     }
     
     setValidationErrors(errors);
     return Object.keys(errors).length === 0;
   };
   ```

3. Optional: Add backend validation in `postsController.js`:
   ```javascript
   const { convert } = require('html-to-text');
   
   const plainText = convert(content, { wordwrap: false }).trim();
   if (plainText.length < 50) {
     return res.status(400).json({ 
       message: `Content must contain at least 50 characters of actual text (found ${plainText.length})` 
     });
   }
   ```

**Files to Modify:**
- `frontend/package.json` (add html-to-text)
- `frontend/src/components/dashboard/posts/PostForm.js` (update validateForm)
- Optional: `backend/controllers/postsController.js` (add backend validation)

**Testing:**
- Try submitting post with `<p><br><br></p>` only - should fail
- Try submitting with 50+ chars of HTML tags but <50 chars text - should fail
- Try submitting with 50+ chars actual text - should pass
- Verify error message shows actual character count

---

## 🟢 COMPONENT ARCHITECTURE PRIORITY

### 8. Duplicate Component Functionality

**Problem:**
- `ManagePost.js` provides combined announcement + news management
- `Announcements.js` and `NewsUpdates.js` provide individual management
- Three components doing similar work with slight variations
- Code duplication for filtering, actions, modals
- Unclear which component is "correct" or should be used

**Decision Needed:**
Choose one approach:

**Option A: Deprecate ManagePost.js**
- Keep Announcements.js and NewsUpdates.js as separate pages
- Remove ManagePost.js entirely
- Update navigation to route directly to individual pages
- Pros: Clearer separation, less code duplication
- Cons: Extra navigation step for users managing both types

**Option B: Deprecate Individual Components**
- Keep ManagePost.js as unified management interface
- Remove Announcements.js and NewsUpdates.js
- Update navigation to route to ManagePost with tabs
- Pros: Single interface, faster switching between types
- Cons: More complex single component

**Option C: Keep Both**
- Use ManagePost for quick overview/bulk actions
- Use individual components for focused management
- Clearly document when to use each
- Pros: Flexibility, both workflows supported
- Cons: Most code duplication, maintenance burden

**Recommendation:** Option B (keep ManagePost, deprecate individual components) for simpler maintenance.

**Implementation Steps (if Option B chosen):**
1. Update routing to remove `/announcements` and `/news-updates` routes
2. Update navigation to point to `/posts` with ManagePost
3. Delete `Announcements.js` and `NewsUpdates.js` files
4. Ensure ManagePost has all features from individual components
5. Update tests to use ManagePost instead

**Files to Modify:**
- Navigation configuration
- Routing files
- Delete: `Announcements.js`, `NewsUpdates.js` (if Option B)
- Or delete: `ManagePost.js` (if Option A)

---

## 🟠 ERROR HANDLING & UX PRIORITY

### 9. Missing Error Boundaries

**Problem:**
- No React Error Boundaries in post management components
- Uncaught errors crash entire dashboard
- No graceful degradation or error recovery
- Poor user experience when API fails

**Implementation Steps:**

1. Create `frontend/src/components/ui/ErrorBoundary.js`:
   ```javascript
   'use client';
   
   import { Component } from 'react';
   
   export class ErrorBoundary extends Component {
     constructor(props) {
       super(props);
       this.state = { hasError: false, error: null };
     }
   
     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }
   
     componentDidCatch(error, errorInfo) {
       console.error('Error caught by boundary:', error, errorInfo);
     }
   
     render() {
       if (this.state.hasError) {
         return (
           <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
             <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
               Something went wrong
             </h2>
             <p className="text-red-700 dark:text-red-300 mb-4">
               {this.state.error?.message || 'An unexpected error occurred'}
             </p>
             <button
               onClick={() => this.setState({ hasError: false, error: null })}
               className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
             >
               Try Again
             </button>
           </div>
         );
       }
   
       return this.props.children;
     }
   }
   ```

2. Wrap post components:
   ```javascript
   // In ManagePost.js, Announcements.js, NewsUpdates.js
   import { ErrorBoundary } from '../../ui/ErrorBoundary';
   
   export default function ManagePost(props) {
     return (
       <ErrorBoundary>
         {/* existing component JSX */}
       </ErrorBoundary>
     );
   }
   ```

**Files to Modify:**
- Create: `frontend/src/components/ui/ErrorBoundary.js`
- `frontend/src/components/dashboard/posts/ManagePost.js` (wrap with boundary)
- `frontend/src/components/dashboard/posts/Announcements.js` (wrap with boundary)
- `frontend/src/components/dashboard/posts/NewsUpdates.js` (wrap with boundary)

**Testing:**
- Simulate API error by disconnecting backend
- Verify error boundary catches and displays error
- Click "Try Again" and verify component recovers
- Test with various error scenarios

---

### 10. Global Loading States

**Problem:**
- Individual actions disable all buttons during operation
- `inlineActionLoading` boolean prevents concurrent actions
- User can't edit one post while publishing another
- Poor UX for bulk operations

**Implementation Steps:**

1. Replace boolean with Set of loading UIDs in `Announcements.js`:
   ```javascript
   const [loadingPosts, setLoadingPosts] = useState(new Set());
   
   const runInlineMutation = useCallback(
     async (postUid, mutation, successMessage) => {
       setLoadingPosts(prev => new Set(prev).add(postUid));
       try {
         await mutation();
         if (successMessage) {
           notify?.push(successMessage, "success");
         }
         triggerRefresh();
       } catch (error) {
         console.error("Post action failed", error);
         notify?.push(error?.message || "Action failed", "error");
       } finally {
         setLoadingPosts(prev => {
           const next = new Set(prev);
           next.delete(postUid);
           return next;
         });
       }
     },
     [notify, triggerRefresh]
   );
   
   const managerActionsProvider = useCallback(
     (post) => {
       const isLoading = loadingPosts.has(post.uid);
       // ... return actions with isLoading per post
     },
     [loadingPosts, /* other deps */]
   );
   ```

2. Update action buttons to check specific post loading:
   ```javascript
   actions.push({
     label: "Publish",
     icon: IoCheckmarkCircleOutline,
     onClick: () => handlePublish(post),
     loading: loadingPosts.has(post.uid),
   });
   ```

3. Apply same pattern to `NewsUpdates.js` and `ManagePost.js`

**Files to Modify:**
- `frontend/src/components/dashboard/posts/Announcements.js`
- `frontend/src/components/dashboard/posts/NewsUpdates.js`
- `frontend/src/components/dashboard/posts/ManagePost.js`

**Testing:**
- Start publishing one post
- While it's loading, verify you can edit a different post
- Verify only the specific post's buttons are disabled
- Test concurrent operations don't interfere

---

## 🔵 AUTHORIZATION & PERMISSIONS PRIORITY

### 11. Missing Author-Only Edit Restrictions

**Problem:**
- Any admin/staff can edit any post
- No checks for post ownership
- Backend has `author_id` column but doesn't enforce it
- Potential for unauthorized edits or accidental overwrites

**Decision Needed:**
Should edit/delete be restricted to author only, or allow all admin/staff?

**Option A: Author-Only (More Restrictive)**
- Only post author can edit/delete
- Better audit trail and accountability
- Prevents accidental edits by other admins
- Cons: Less flexible, requires escalation for edits

**Option B: Role-Based (Current Behavior)**
- Any admin/staff can edit any post
- More flexible for team collaboration
- Easier content management with multiple admins
- Cons: Less accountability, potential conflicts

**Implementation Steps (if Option A chosen):**

1. Update backend authorization in `postsController.js`:
   ```javascript
   async updatePost(req, res) {
     try {
       const { uid } = req.params;
       const existingPost = await postRepository.getPostByUid(uid);
       
       if (existingPost.author_id !== req.user.id) {
         return res.status(403).json({ 
           message: 'You can only edit your own posts' 
         });
       }
       
       // ... rest of update logic
     }
   }
   ```

2. Update frontend to hide edit button for non-authors:
   ```javascript
   const managerActionsProvider = useCallback(
     (post) => {
       const actions = [];
       
       // Only show edit if user is author
       if (post.author_id === currentUserId) {
         actions.push({
           label: "Edit",
           icon: IoCreateOutline,
           onClick: () => handleEditClick(post),
         });
       }
       
       // ... rest of actions
     },
     [currentUserId, /* other deps */]
   );
   ```

**Files to Modify:**
- `backend/controllers/postsController.js` (add author check)
- `frontend/src/components/dashboard/posts/Announcements.js` (conditional edit)
- `frontend/src/components/dashboard/posts/NewsUpdates.js` (conditional edit)
- `frontend/src/components/dashboard/posts/ManagePost.js` (conditional edit)

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Create and register post scheduler job
2. ✅ Implement unarchive functionality (all layers)
3. ✅ Fix delete button visibility in ManagePost
4. ✅ Add DOMPurify XSS protection

### Phase 2: Important Fixes (Week 2)
5. ✅ Fix attachment display property name
6. ✅ Implement file cleanup endpoint
7. ✅ Improve content validation with html-to-text

### Phase 3: Enhancements (Week 3)
8. 🤔 Decide on component consolidation strategy
9. ✅ Add Error Boundaries
10. ✅ Implement per-post loading states
11. 🤔 Decide on author-only restrictions

---

## Testing Checklist

### Functional Testing
- [ ] Scheduled posts auto-publish at correct time
- [ ] Can unarchive posts successfully
- [ ] Delete button only shows for drafts
- [ ] XSS attempts are sanitized
- [ ] Attachment names display correctly
- [ ] Removed attachments delete physical files
- [ ] Content validation checks actual text
- [ ] Error boundaries catch and recover from errors
- [ ] Can perform multiple post actions concurrently

### Integration Testing
- [ ] Create → Edit → Publish workflow
- [ ] Create → Schedule → Auto-publish workflow
- [ ] Publish → Archive → Unarchive workflow
- [ ] Create with attachments → Edit → Remove attachments → Verify cleanup
- [ ] Test all workflows with both announcement and news_update types

### Security Testing
- [ ] XSS injection attempts fail
- [ ] File upload restrictions enforced
- [ ] Authorization checks prevent unauthorized edits
- [ ] SQL injection attempts fail (parameterized queries)

### Performance Testing
- [ ] Scheduler doesn't cause performance issues
- [ ] File cleanup doesn't block main thread
- [ ] Multiple concurrent actions don't cause race conditions
- [ ] Large file uploads handle correctly

---

## Notes

- All fixes should include proper error handling
- All database operations should be in transactions where applicable
- All frontend changes should maintain mobile responsiveness
- All changes should respect existing dark mode theming
- Consider adding comprehensive logging for debugging
- Document any breaking changes in commit messages

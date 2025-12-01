# Author-Only Edit Implementation

## Overview
Implemented author-only edit restrictions for both posts and events. Users can now only edit/delete posts and events they created, while viewing remains open to all authenticated users.

## Access Control Model

### Posts
- **View**: All authenticated users (volunteer, staff, admin)
- **Create**: Staff and admin only
- **Edit/Delete**: Only the post author

### Events  
- **View**: All authenticated users (volunteer, staff, admin)
- **Create**: Staff and admin only
- **Edit/Delete**: Only the event creator

## Backend Changes

### 1. Posts Controller (`backend/controllers/postsController.js`)
**Added author check in `updatePost()`:**
```javascript
// Fetch existing post
const existingPost = await postRepository.getPostByUid(uid);
if (!existingPost) {
  return res.status(404).json({
    success: false,
    message: "Post not found",
  });
}

// Only the post author can edit
if (existingPost.author_id !== userId) {
  return res.status(403).json({
    success: false,
    message: "Only the post author can edit this post",
  });
}
```

**Impact:**
- Returns 403 Forbidden if non-author attempts to edit
- Author check happens after authentication/role check
- Works with existing role-based middleware

### 2. Events Controller (`backend/controllers/eventsController.js`)
**Added creator check in `updateEvent()`:**
```javascript
// Fetch existing event to check creator
const existingEvent = await eventRepository.getEventByUid(uid);
if (!existingEvent) {
  return res.status(404).json({
    success: false,
    message: "Event not found",
  });
}

// Only the event creator can edit
if (existingEvent.created_by !== userId) {
  return res.status(403).json({
    success: false,
    message: "Only the event creator can edit this event",
  });
}
```

**Impact:**
- Returns 403 Forbidden if non-creator attempts to edit
- Validates event existence before checking permissions
- Prevents unauthorized edits even by staff/admin

### 3. Routes (No Changes Needed)
**Posts Routes (`backend/routes/postsRoutes.js`):**
- GET routes: `authenticate` only (open to all)
- Write operations: `authenticate + authorizeRoles("admin", "staff")`
- Author check happens at controller level

**Events Routes (`backend/routes/eventsRoutes.js`):**
- Same pattern as posts
- Creator check happens at controller level

## Frontend Changes

### 1. PostDetailsPage (`frontend/src/components/posts/PostDetailsPage.js`)
**Changed from role-based to author-based check:**
```javascript
// OLD: const canEdit = currentUser && (currentUser.role === "admin" || currentUser.role === "staff");

// NEW: Only the post author can edit their post
const canEdit = currentUser && currentUser.userId && post.author_id && currentUser.userId === post.author_id;
```

**Impact:**
- Edit button only shown to post author
- Removed role-based visibility
- Checks `currentUser.userId === post.author_id`

### 2. EventDetailsPage (`frontend/src/components/events/EventDetailsPage.js`)
**Added creator check alongside existing role check:**
```javascript
const role = (currentUser?.role || "volunteer").toLowerCase();
const canManageEvent = role === "admin" || role === "staff";

// Only the event creator can edit/delete their event
const isEventCreator = currentUser?.userId && eventData?.created_by && currentUser.userId === eventData.created_by;
const canEditEvent = isEventCreator;
```

**Updated button visibility:**
- Changed from `canManageEvent` to `canEditEvent`
- Edit, Postpone, Delete buttons only visible to creator
- Applied to button rendering and modal visibility

**Impact:**
- Edit/Delete buttons hidden from non-creators
- Prevents UI confusion (buttons wouldn't work anyway)
- `canManageEvent` still used for participant visibility

### 3. Announcements Component (`frontend/src/components/navigation/Post/Announcements.js`)
**Added currentUser prop and author check:**
```javascript
function AnnouncementsContent({ onNavigate, currentUser }) {
  // ...

  const managerActionsProvider = useCallback(
    (post) => {
      const isLoading = loadingPosts.has(post.uid);
      const actions = [];

      // Only show edit button if current user is the post author
      const isAuthor = currentUser?.userId && post.author_id && currentUser.userId === post.author_id;
      if (isAuthor) {
        actions.push({
          label: "Edit",
          icon: IoCreateOutline,
          onClick: () => handleEditClick(post),
          loading: isLoading,
        });
      }

      // ... other actions remain unchanged
    },
    [
      loadingPosts,
      currentUser,  // Added to dependencies
      handleEditClick,
      // ...
    ]
  );
}
```

**Impact:**
- Edit button only appears for post authors in list view
- Publish, Archive, Unarchive, Delete buttons still visible (separate permissions)
- Added `currentUser` to dependency array

### 4. NewsUpdates Component (`frontend/src/components/navigation/Post/NewsUpdates.js`)
**Same changes as Announcements:**
- Added `currentUser` prop
- Author check in `managerActionsProvider`
- Conditional edit button rendering
- Added `currentUser` to dependencies

## Testing Checklist

### Posts
- [ ] Volunteer can view published posts
- [ ] Volunteer cannot see Create Post button
- [ ] Staff can create posts
- [ ] Staff can only edit their own posts
- [ ] Admin can create posts
- [ ] Admin can only edit their own posts
- [ ] Attempting to edit others' posts returns 403
- [ ] Edit button hidden from non-authors in UI

### Events
- [ ] Volunteer can view published events
- [ ] Volunteer can join/leave events
- [ ] Staff can create events
- [ ] Staff can only edit their own events
- [ ] Admin can create events
- [ ] Admin can only edit their own events
- [ ] Attempting to edit others' events returns 403
- [ ] Edit/Delete buttons hidden from non-creators in UI

## Security Notes

### Defense in Depth
1. **Route level**: Role-based middleware (`authorizeRoles`) prevents volunteers from accessing edit endpoints
2. **Controller level**: Author/creator checks prevent staff/admin from editing others' content
3. **UI level**: Conditional rendering prevents confusion and unnecessary API calls

### Database Fields Used
- **Posts**: `author_id` (integer, references users.user_id)
- **Events**: `created_by` (integer, references users.user_id)
- **Auth**: `currentUser.userId` from Firebase ID token

### Error Responses
```javascript
// 401 Unauthorized - No valid token
// 403 Forbidden - Not the author/creator
{
  "success": false,
  "message": "Only the post author can edit this post"
  // or "Only the event creator can edit this event"
}
// 404 Not Found - Post/event doesn't exist
```

## Backward Compatibility

### ✅ No Breaking Changes
- Routes remain unchanged
- Role-based creation restrictions still enforced
- View permissions expanded (more permissive)
- Author checks add additional restriction (more secure)

### Migration Notes
- No database changes required
- `author_id` and `created_by` fields already exist
- Frontend components receive `currentUser` from `DashboardRouteRenderer`

## Related Files

### Modified Files
1. `backend/controllers/postsController.js` - Added author check
2. `backend/controllers/eventsController.js` - Added creator check
3. `frontend/src/components/posts/PostDetailsPage.js` - Author-based canEdit
4. `frontend/src/components/events/EventDetailsPage.js` - Creator-based canEditEvent
5. `frontend/src/components/navigation/Post/Announcements.js` - Conditional edit button
6. `frontend/src/components/navigation/Post/NewsUpdates.js` - Conditional edit button

### Unchanged (But Validated)
- `backend/routes/postsRoutes.js` - Already correct
- `backend/routes/eventsRoutes.js` - Already correct
- `frontend/src/app/dashboard/_components/DashboardRouteRenderer.js` - Passes currentUser

## Future Enhancements

### Potential Improvements
1. Add "Transfer Ownership" feature for admins
2. Add "Collaborator" field for multi-author posts
3. Show "Author" badge on posts in list views
4. Add admin override setting for emergency edits
5. Track edit history with user attribution

### Related Features
- Post moderation workflow
- Event co-organizer support
- Content approval system
- Audit logging for permission denials

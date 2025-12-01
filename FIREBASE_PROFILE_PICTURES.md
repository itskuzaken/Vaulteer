# Firebase Profile Pictures Implementation

## Overview

The application now fetches user profile pictures from Firebase Storage based on the user's UID. This provides a centralized way to manage profile pictures across the application.

## Implementation Details

### 1. Firebase Storage Setup

**Storage Path Structure:**
```
firebase-storage/
└── profile-pictures/
    ├── {uid1}          (e.g., actual image file)
    ├── {uid2}
    └── {uid3}
```

**Note:** Profile pictures should be uploaded to Firebase Storage under the path `profile-pictures/{uid}` where `{uid}` is the user's Firebase Authentication UID.

### 2. Service Layer (`frontend/src/services/firebase.js`)

#### New Export: `storage`
```javascript
export const storage = getStorage(app);
```
Exports the Firebase Storage instance for use throughout the application.

#### New Function: `getProfilePictureUrl(uid)`

**Purpose:** Fetches the download URL for a user's profile picture from Firebase Storage.

**Parameters:**
- `uid` (string): Firebase user UID

**Returns:**
- `Promise<string|null>`: Download URL if found, null if not found or on error

**Usage:**
```javascript
import { getProfilePictureUrl } from '@/services/firebase';

const url = await getProfilePictureUrl(userUid);
if (url) {
  // Use the URL
}
```

**Error Handling:**
- Returns `null` if file doesn't exist (not treated as error)
- Logs error and returns `null` for other errors
- Non-blocking: won't crash the app if Firebase Storage is unreachable

### 3. ProfileHeader Component

**Changes Made:**
1. Added React hooks: `useState`, `useEffect`
2. Imported `getProfilePictureUrl` from Firebase service
3. Added state variables:
   - `firebaseProfilePicture`: Stores the Firebase Storage URL
   - `loadingProfilePic`: Loading state for the profile picture

**Profile Picture Priority (in order):**
1. Firebase Storage URL (`firebaseProfilePicture`)
2. Database profile_picture field (`userData?.profile_picture`)
3. Firebase Auth photoURL (`user?.photoURL`)
4. Fallback to initials avatar

**Loading State:**
- Shows an animated skeleton loader while fetching from Firebase Storage
- Prevents layout shift during load

### 4. ModernDashboardLayout Component

**Changes Made:**
1. Imported `getProfilePictureUrl` from Firebase service
2. Added state variable: `firebaseProfilePic`
3. Fetches profile picture on mount and updates `avatarSrc`

**Fallback Chain:**
1. Firebase Storage URL
2. Firebase Auth photoURL
3. Default profile picture (`/default-profile.png`)

## Firebase Storage Rules

⚠️ **IMPORTANT:** You must configure Storage Rules to avoid CORS errors!

To allow users to read their profile pictures, add these rules to Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to profile pictures (recommended to avoid CORS)
    match /profile-pictures/{imageId} {
      allow read: if true;  // Public read - allows anyone to view profile pictures
      
      // Allow users to upload/update their own profile picture
      // imageId can be: uid.jpg, uid.png, uid.jpeg, uid.webp, or just uid
      allow write: if request.auth != null 
                   && request.auth.uid == imageId.split('.')[0]  // Extract UID from filename
                   && request.resource.size < 5 * 1024 * 1024  // 5MB limit
                   && request.resource.contentType.matches('image/.*');  // Images only
    }
  }
}
```

**How to apply:**
1. Go to Firebase Console → Storage → Rules tab
2. Replace existing rules with the above
3. Click **Publish**

**Note:** `allow read: if true` is recommended to avoid CORS issues on local development and production. Profile pictures are not sensitive data.

## Uploading Profile Pictures

### Option 1: Manual Upload via Firebase Console
1. Go to Firebase Console → Storage
2. Navigate to `profile-pictures/` folder (create if doesn't exist)
3. Upload image with filename as the user's UID (no extension in path)
4. Example: Upload `john-doe.jpg` and rename to just the UID

### Option 2: Programmatic Upload (Future Implementation)

Create a profile picture upload component:

```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';

async function uploadProfilePicture(uid, file) {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File must be less than 5MB');
  }

  // Upload to Firebase Storage
  const storageRef = ref(storage, `profile-pictures/${uid}`);
  await uploadBytes(storageRef, file);
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  // Optionally update database
  await updateUserProfilePicture(uid, downloadURL);
  
  return downloadURL;
}
```

### Option 3: Backend Integration

Update the backend to accept profile picture uploads:

```javascript
// backend/routes/profileRoutes.js
const multer = require('multer');
const { getStorage } = require('firebase-admin/storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

router.post('/profile/picture', authenticate, upload.single('profile'), async (req, res) => {
  try {
    const uid = req.user.uid;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const bucket = getStorage().bucket();
    const blob = bucket.file(`profile-pictures/${uid}`);
    
    await blob.save(file.buffer, {
      metadata: { contentType: file.mimetype }
    });

    await blob.makePublic(); // Optional: make publicly readable
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/profile-pictures/${uid}`;
    
    // Update database
    await pool.query(
      'UPDATE users SET profile_picture = ? WHERE uid = ?',
      [publicUrl, uid]
    );

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});
```

## Testing

### Test Cases

1. **User with Firebase Storage profile picture:**
   - Upload image to `profile-pictures/{uid}`
   - Verify it displays in ProfileHeader and Dashboard

2. **User without Firebase Storage picture:**
   - Remove Firebase Storage image
   - Verify fallback to database `profile_picture` or Firebase Auth `photoURL`

3. **User with no profile picture:**
   - Remove all profile pictures
   - Verify initials avatar displays

4. **Loading state:**
   - Slow network simulation
   - Verify skeleton loader appears during fetch

5. **Error handling:**
   - Disconnect from Firebase
   - Verify app doesn't crash and shows fallback

## Migration Notes

### Existing Users
- No migration required
- Existing database `profile_picture` URLs still work as fallback
- Firebase Auth `photoURL` (from Google Sign-In) still works as fallback

### Performance Considerations
- Profile pictures are fetched on component mount
- Uses Firebase CDN for fast global delivery
- Caching handled automatically by Firebase SDK and browser
- No impact on initial page load (loaded asynchronously)

## Future Enhancements

1. **Image Upload UI:**
   - Add profile picture upload button in ProfileHeader
   - Implement drag-and-drop upload
   - Add image cropping/resizing

2. **Image Optimization:**
   - Generate thumbnails (128x128, 256x256, 512x512)
   - Use responsive images with `srcset`
   - Implement lazy loading for list views

3. **Caching Strategy:**
   - Cache Firebase Storage URLs in localStorage
   - Implement cache invalidation on upload
   - Use service worker for offline support

4. **Admin Panel:**
   - Allow admins to upload profile pictures for users
   - Batch upload functionality
   - Profile picture moderation tools

## Troubleshooting

### CORS errors or profile picture not showing

**Most common issue:** Firebase Storage Rules not allowing public reads

**Quick Fix:**
1. Go to Firebase Console → Storage → Rules
2. Add `allow read: if true;` for `profile-pictures/` path
3. Click Publish
4. Clear browser cache and refresh

**Other checks:**

1. Check Firebase Storage Rules:
   ```bash
   firebase storage:rules:get
   ```

2. Verify file exists in Storage:
   - Firebase Console → Storage → profile-pictures/{uid}.jpg (or .png, .jpeg, .webp)

3. Check browser console for errors:
   - CORS errors = Storage rules issue
   - `storage/object-not-found` = File doesn't exist or wrong filename
   - `storage/unauthorized` = Rules don't allow read access

4. Verify filename format:
   - Must be: `profile-pictures/{uid}.jpg` (with extension)
   - Or: `profile-pictures/{uid}` (without extension)
   - UID must match Firebase Auth UID exactly

5. Test direct URL in browser:
   ```
   https://storage.googleapis.com/my-firebase-efa7a.appspot.com/profile-pictures/{uid}.jpg
   ```
   If you see the image, it's working. If not, file doesn't exist or rules block it.

### Upload fails

1. Check file size (must be < 5MB)
2. Verify file type (must be image/*)
3. Check Firebase Storage quota
4. Verify Firebase Storage Rules allow writes

## Environment Variables

Ensure these Firebase config variables are set:

```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Note: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` must be set for Firebase Storage to work.

## Security Considerations

1. **Read Access:** Profile pictures can be public (recommended) or restricted to authenticated users
2. **Write Access:** Only the user should be able to upload/update their own profile picture
3. **File Validation:** Always validate file type and size on both client and server
4. **Malware Scanning:** Consider implementing virus scanning for uploaded files
5. **Content Moderation:** Implement content moderation for inappropriate images

## Summary

The Firebase profile picture integration provides:
- ✅ Centralized profile picture management
- ✅ Fast global CDN delivery
- ✅ Graceful fallbacks (database, Firebase Auth, initials)
- ✅ Non-blocking async loading
- ✅ Loading states for better UX
- ✅ Flexible upload options (manual, programmatic, backend)
- ✅ Backward compatible with existing profile pictures

# Firebase Storage CORS Fix Guide

## Problem

Getting CORS errors when trying to fetch profile pictures from Firebase Storage:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'http://192.168.1.16:3000' has been blocked by CORS policy
```

## Root Causes

1. **Firebase Storage Rules** - Not configured to allow public reads
2. **File doesn't exist** - Trying to access a file that hasn't been uploaded
3. **Wrong file path** - File uploaded with different name/extension

## Solutions

### Solution 1: Configure Firebase Storage Rules (REQUIRED)

1. **Go to Firebase Console:**
   - Navigate to https://console.firebase.google.com
   - Select your project: `my-firebase-efa7a`
   - Go to **Storage** → **Rules** tab

2. **Update Storage Rules:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to profile pictures
    match /profile-pictures/{imageId} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.uid == imageId.split('.')[0]
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

**What this does:**
- ✅ Allows **anyone** to read profile pictures (no CORS issues)
- ✅ Only allows authenticated users to upload their own picture
- ✅ Limits file size to 5MB
- ✅ Only allows image file types

3. **Click "Publish"** to apply the rules

### Solution 2: Upload Profile Pictures Correctly

Your profile picture files should be uploaded with these naming conventions:

**Supported formats:**
- `profile-pictures/y793gwT0jifKwXgrFZMAE3S0jLH2.jpg`
- `profile-pictures/y793gwT0jifKwXgrFZMAE3S0jLH2.jpeg`
- `profile-pictures/y793gwT0jifKwXgrFZMAE3S0jLH2.png`
- `profile-pictures/y793gwT0jifKwXgrFZMAE3S0jLH2.webp`
- `profile-pictures/y793gwT0jifKwXgrFZMAE3S0jLH2` (no extension)

**To upload via Firebase Console:**

1. Go to Firebase Console → Storage
2. Click on the root bucket
3. Create folder: `profile-pictures`
4. Upload your image
5. Rename it to: `{UID}.jpg` (or .png, .jpeg, etc.)

**Example for user `y793gwT0jifKwXgrFZMAE3S0jLH2`:**
- File name: `y793gwT0jifKwXgrFZMAE3S0jLH2.jpg`
- Full path: `profile-pictures/y793gwT0jifKwXgrFZMAE3S0jLH2.jpg`

### Solution 3: Test File Exists

You can verify the file exists by visiting this URL directly in your browser:

```
https://firebasestorage.googleapis.com/v0/b/my-firebase-efa7a.appspot.com/o/profile-pictures%2Fy793gwT0jifKwXgrFZMAE3S0jLH2.jpg?alt=media
```

Replace `.jpg` with the correct extension. If you see the image, the file exists and rules are working.

### Solution 4: Environment Variables Check

Ensure your `.env.local` has the correct storage bucket:

```env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-firebase-efa7a.appspot.com
```

**Note:** It should be `.appspot.com`, NOT `.firebasestorage.app`

If it's wrong, update it and restart your dev server:
```bash
npm run dev
```

## Quick Fix Script

If you want to quickly upload a test profile picture via Node.js:

```javascript
// upload-test-profile-pic.js
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'my-firebase-efa7a.appspot.com'
});

async function uploadProfilePicture(uid, imagePath) {
  const bucket = admin.storage().bucket();
  const destination = `profile-pictures/${uid}.jpg`;
  
  await bucket.upload(imagePath, {
    destination: destination,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    }
  });
  
  // Make it publicly readable
  await bucket.file(destination).makePublic();
  
  console.log(`Uploaded: ${destination}`);
  console.log(`URL: https://storage.googleapis.com/${bucket.name}/${destination}`);
}

// Usage
uploadProfilePicture('y793gwT0jifKwXgrFZMAE3S0jLH2', './path/to/image.jpg');
```

## Testing

After applying fixes, test with these steps:

1. **Clear browser cache** (important!)
2. **Restart your dev server**
3. **Open browser console** (F12)
4. **Navigate to profile page**
5. **Check for errors**

If still seeing errors, check:
- ✅ Storage rules are published
- ✅ File exists with correct name
- ✅ File is in `profile-pictures/` folder
- ✅ Storage bucket name is correct in .env.local

## Alternative: Use Firebase Auth photoURL

If you're using Google Sign-In, users already have a `photoURL` from their Google account. The app will automatically fall back to this:

```javascript
// ProfileHeader.js already does this:
const profilePicUrl = firebaseProfilePicture || 
                      userData?.profile_picture || 
                      user?.photoURL ||  // ← Google profile picture
                      "/default-profile.png";
```

So even if Firebase Storage isn't working, Google profile pictures will still display!

## Debugging Commands

Check what files exist in Storage:

```javascript
import { ref, listAll } from 'firebase/storage';
import { storage } from '@/services/firebase';

async function listProfilePictures() {
  const listRef = ref(storage, 'profile-pictures');
  const result = await listAll(listRef);
  result.items.forEach((item) => {
    console.log('Found:', item.fullPath);
  });
}
```

## Summary

**Most common fix:** Update Firebase Storage Rules to allow public reads

**Quick test:** 
1. Go to Firebase Console → Storage → Rules
2. Change `allow read: if false;` to `allow read: if true;`
3. Click Publish
4. Refresh your app

That should resolve 90% of CORS issues!

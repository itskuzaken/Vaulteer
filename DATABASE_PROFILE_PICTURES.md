# Database Profile Pictures Implementation Guide

## Overview

Profile pictures are now stored in the `users` table's `profile_picture` column as URLs. This approach is simpler than Firebase Storage and avoids CORS issues.

## Database Schema

The `users` table already has a `profile_picture` column:

```sql
`profile_picture` varchar(255) DEFAULT NULL COMMENT 'URL or path to user profile picture'
```

## Profile Picture Priority

The application uses this fallback chain:

1. **Database `profile_picture`** - Custom uploaded profile picture URL
2. **Firebase Auth `photoURL`** - Profile picture from Google Sign-In
3. **Initials Avatar** - Fallback showing user's first initial

## Implementation

### Frontend Components

Both `ProfileHeader.js` and `ModernDashboardLayout.js` now use:

```javascript
// ProfileHeader.js
const profilePicUrl = userData?.profile_picture || 
                      user?.photoURL || 
                      "/default-profile.png";

// ModernDashboardLayout.js
useEffect(() => {
  if (dbProfile?.user?.profile_picture) {
    setAvatarSrc(dbProfile.user.profile_picture);
  } else if (user?.photoURL) {
    setAvatarSrc(user.photoURL);
  } else {
    setAvatarSrc("/default-profile.png");
  }
}, [dbProfile?.user?.profile_picture, user?.photoURL]);
```

### Backend API

The backend already returns `profile_picture` in profile endpoints:

```javascript
// backend/routes/profileRoutes.js
SELECT u.user_id, u.uid, u.name, u.email, u.status, 
       u.profile_picture, r.role
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.uid = ?
```

## Storing Profile Pictures

### Option 1: External Image URLs (Recommended)

Store profile picture URLs from image hosting services:

**Supported Services:**
- **Imgur** - `https://i.imgur.com/xxxxx.jpg`
- **Cloudinary** - `https://res.cloudinary.com/user/image/upload/v123/profile.jpg`
- **Google Photos** - From Firebase Auth Google Sign-In
- **Any CDN** - Any publicly accessible image URL

**Update via SQL:**
```sql
UPDATE users 
SET profile_picture = 'https://i.imgur.com/example.jpg'
WHERE uid = 'user-firebase-uid';
```

### Option 2: Upload to Backend (Future Implementation)

Create an upload endpoint to store files locally:

**Backend Route:**
```javascript
// backend/routes/profileRoutes.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/profile-pictures/',
  filename: (req, file, cb) => {
    const uid = req.user.uid;
    const ext = path.extname(file.originalname);
    cb(null, `${uid}${ext}`);
  }
});

const upload = multer({
  storage: storage,
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
    const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;
    
    await pool.query(
      'UPDATE users SET profile_picture = ? WHERE uid = ?',
      [fileUrl, uid]
    );

    res.json({ 
      success: true, 
      url: fileUrl 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});
```

**Frontend Component:**
```javascript
// components/ProfilePictureUpload.js
import { useState } from 'react';

export default function ProfilePictureUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('profile', file);

      const response = await fetch('/api/profile/picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getIdToken()}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onUploadSuccess(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        id="profile-picture-input"
      />
      <label
        htmlFor="profile-picture-input"
        className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {uploading ? 'Uploading...' : 'Upload Profile Picture'}
      </label>
    </div>
  );
}
```

### Option 3: Base64 Encoding (Not Recommended)

Store small images directly as Base64 in database:

**Pros:** 
- No external dependencies
- Simple implementation

**Cons:**
- ❌ Increases database size significantly
- ❌ Slower query performance
- ❌ 255 char limit on varchar column (need to change to TEXT)
- ❌ No caching benefits

```sql
-- If you really want to use Base64, modify column:
ALTER TABLE users 
MODIFY COLUMN profile_picture TEXT;

-- Store Base64:
UPDATE users 
SET profile_picture = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
WHERE uid = 'user-uid';
```

## Best Practices

### Image Optimization

Before storing URLs, ensure images are optimized:

1. **Resize to appropriate dimensions:**
   - Profile pictures: 256x256px or 512x512px
   - Thumbnails: 128x128px

2. **Compress images:**
   - Use tools like TinyPNG, ImageOptim
   - Target: < 200KB per image

3. **Use modern formats:**
   - WebP (best compression)
   - JPEG (universal compatibility)
   - PNG (if transparency needed)

### Security Considerations

1. **Validate URLs on backend:**
```javascript
function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
           /\.(jpg|jpeg|png|gif|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}
```

2. **Sanitize uploads:**
   - Validate file type and size
   - Rename files to prevent path traversal
   - Scan for malware if accepting uploads

3. **Set proper permissions:**
   - Upload directory: readable by web server
   - Files: 644 permissions (read for all, write for owner)

### Performance Optimization

1. **Use CDN for external URLs:**
   - Faster global delivery
   - Reduced server load
   - Better caching

2. **Implement lazy loading:**
```javascript
<Image
  src={profilePicture}
  alt="Profile"
  loading="lazy"
  width={128}
  height={128}
/>
```

3. **Add cache headers (if self-hosting):**
```javascript
// backend/server.js
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',
  etag: true
}));
```

## Migration from Firebase Storage

If you already have images in Firebase Storage, migrate them:

### Script to Update Database from Firebase

```javascript
// scripts/migrate-profile-pictures.js
const admin = require('firebase-admin');
const mysql = require('mysql2/promise');

admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json'),
  storageBucket: 'my-firebase-efa7a.appspot.com'
});

async function migrateProfilePictures() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'vaulteer_db'
  });

  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'profile-pictures/' });

  for (const file of files) {
    try {
      // Extract UID from filename
      const filename = file.name.replace('profile-pictures/', '');
      const uid = filename.split('.')[0];

      // Make file public and get URL
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

      // Update database
      await pool.query(
        'UPDATE users SET profile_picture = ? WHERE uid = ?',
        [publicUrl, uid]
      );

      console.log(`Migrated: ${uid}`);
    } catch (error) {
      console.error(`Error migrating ${file.name}:`, error);
    }
  }

  await pool.end();
  console.log('Migration complete!');
}

migrateProfilePictures();
```

Run with: `node scripts/migrate-profile-pictures.js`

## Testing

### Manual Testing

1. **Set a profile picture URL:**
```sql
UPDATE users 
SET profile_picture = 'https://i.imgur.com/sample.jpg'
WHERE email = 'test@example.com';
```

2. **View profile page and verify image loads**

3. **Test fallback to Google photoURL:**
```sql
UPDATE users 
SET profile_picture = NULL
WHERE email = 'test@example.com';
-- Should show Google profile picture from Firebase Auth
```

4. **Test initials fallback:**
```sql
-- User with no profile_picture and no Google sign-in
-- Should show initials avatar
```

### Automated Testing

```javascript
describe('Profile Picture Display', () => {
  it('should display database profile picture', () => {
    const user = { profile_picture: 'https://example.com/pic.jpg' };
    render(<ProfileHeader comprehensiveData={{ user }} />);
    expect(screen.getByAltText(/profile/i)).toHaveAttribute('src', user.profile_picture);
  });

  it('should fallback to Firebase Auth photoURL', () => {
    const user = { profile_picture: null };
    const authUser = { photoURL: 'https://google.com/photo.jpg' };
    render(<ProfileHeader comprehensiveData={{ user }} user={authUser} />);
    expect(screen.getByAltText(/profile/i)).toHaveAttribute('src', authUser.photoURL);
  });

  it('should show initials when no picture available', () => {
    const user = { name: 'John Doe', profile_picture: null };
    render(<ProfileHeader comprehensiveData={{ user }} user={{}} />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Profile picture not displaying

1. **Check database value:**
```sql
SELECT uid, name, profile_picture 
FROM users 
WHERE email = 'user@example.com';
```

2. **Verify URL is accessible:**
   - Open URL in browser
   - Check for 404 or CORS errors
   - Ensure URL is publicly accessible

3. **Check console for errors:**
   - Image load failures
   - Network errors
   - CORS issues (if self-hosting)

4. **Verify fallback chain:**
   - Database `profile_picture` should be checked first
   - Then Firebase Auth `photoURL`
   - Finally initials avatar

### CORS errors with self-hosted images

If hosting images on your backend:

```javascript
// backend/server.js
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static('uploads'));
```

## Summary

✅ **Simplified Implementation**
- No Firebase Storage configuration needed
- No CORS issues
- Direct database queries

✅ **Flexible Storage Options**
- External CDN URLs (recommended)
- Self-hosted uploads
- Google Sign-In photos

✅ **Graceful Fallbacks**
- Database → Firebase Auth → Initials
- Never shows broken images

✅ **Easy to Manage**
- Simple SQL updates
- Standard image URLs
- No special SDK required

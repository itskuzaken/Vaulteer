import { useState, useEffect } from 'react';
import Image from 'next/image';
import { presignBadgeUpload, validateBadgeUpload, confirmBadge, deleteBadge, getBadgePreviewUrl } from '../../../services/achievementService';

export default function BadgeUpload({ achievementId, currentKey, onUpdated, tier = 'single', label = null }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Load preview URL when component mounts or currentKey changes
  useEffect(() => {
    let mounted = true;
    setPreviewUrl(null);
    if (!currentKey) return;
    (async () => {
      try {
        const data = await getBadgePreviewUrl(achievementId, tier);
        if (!mounted) return;
        setPreviewUrl(data?.url || null);
      } catch (err) {
        if (!mounted) return;
        setPreviewUrl(null);
      }
    })();
    return () => { mounted = false; };
  }, [achievementId, currentKey, tier]);

  const handleFile = async (file) => {
    setError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only images are allowed');
      return;
    }

    let localPreviewUrl = null;
    setUploading(true);
    try {
      // Show immediate local preview while upload proceeds
      try {
        localPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(localPreviewUrl);
      } catch (e) {
        // ignore - some environments may not support object URLs
      }

      const presign = await presignBadgeUpload(achievementId, file.type, tier);
      if (!presign || !presign.uploadUrl || !presign.s3Key) throw new Error('Presign failed');

      let didUpload = false;
      try {
        const putRes = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error('Upload to S3 failed');

        const row = await validateBadgeUpload(achievementId, presign.s3Key, tier);
        if (onUpdated) onUpdated(row);
        try { const data = await getBadgePreviewUrl(achievementId, tier); setPreviewUrl(data?.url || null); } catch (e) {}
        didUpload = true;
      } catch (e) {
        try {
          const row = await (await import('../../../services/achievementService')).uploadBadge(achievementId, file, tier);
          if (onUpdated) onUpdated(row);
          try { const data = await getBadgePreviewUrl(achievementId, tier); setPreviewUrl(data?.url || null); } catch (err) {}
          didUpload = true;
        } catch (err2) {
          throw err2;
        }
      }
      if (!didUpload) throw new Error('Upload failed');
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (localPreviewUrl) {
        try { URL.revokeObjectURL(localPreviewUrl); } catch (e) {}
      }
    }
  };

  const handleConfirmByKey = async (key) => {
    setError(null);
    setUploading(true);
    try {
      const row = await confirmBadge(achievementId, key, tier);
      if (onUpdated) onUpdated(row);
    } catch (err) {
      setError(err?.message || 'Confirm failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setUploading(true);
    try {
      await deleteBadge(achievementId, tier);
      if (onUpdated) onUpdated(null);
    } catch (err) {
      setError(err?.message || 'Delete failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. Upload Button Area */}
      <div>
        <label className={`
            flex items-center justify-center gap-2 w-full px-4 py-2 
            bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-700 
            rounded-md text-sm font-medium 
            hover:bg-gray-50 dark:hover:bg-gray-700 
            cursor-pointer transition-colors
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
          <input 
            type="file" 
            accept="image/*" 
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])} 
            className="hidden" 
          />
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          <span>{uploading ? 'Uploading...' : (currentKey ? 'Replace Badge' : 'Upload Badge')}</span>
        </label>
      </div>

      {/* 2. Preview and Actions Area */}
      {currentKey && (
        <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
          {/* Badge Image */}
          <div className="flex-none bg-white dark:bg-black rounded p-1 border border-gray-100 dark:border-gray-800">
            {previewUrl ? (
              <div className="w-12 h-12 relative">
                <Image src={previewUrl} alt={`${tier} badge`} width={48} height={48} unoptimized className="object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center text-xs text-gray-400">...</div>
            )}
          </div>

          {/* Vertical Action Buttons */}
          <div className="flex flex-col gap-1 w-full">
            <button 
              type="button"
              onClick={() => handleConfirmByKey(currentKey)} 
              disabled={uploading}
              className="px-2 py-1 text-xs font-medium text-center bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            >
              Confirm
            </button>
            <button 
              type="button"
              onClick={handleDelete} 
              disabled={uploading}
              className="px-2 py-1 text-xs font-medium text-center bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
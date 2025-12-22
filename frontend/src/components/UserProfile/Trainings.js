import { useState } from 'react';
import { removeDuplicates } from './ProfileUtils';
import ImageLightbox from '../ui/ImageLightbox';
import { getCertificateDownloadUrl } from '../../services/profileService';

export default function Trainings({ 
  userUid,
  trainings, 
  certificates = [],
  isEditing, 
  editedTrainings, 
  onChange 
}) {
  const handleTrainingToggle = (trainingId) => {
    const currentTrainings = editedTrainings || [];
    const isSelected = currentTrainings.includes(trainingId);
    
    if (isSelected) {
      onChange(currentTrainings.filter(id => id !== trainingId));
    } else {
      onChange([...currentTrainings, trainingId]);
    }
  };

  // List of available trainings (this should ideally come from backend)
  const availableTrainings = [
    { training_id: 1, training_name: 'HIV Testing' },
    { training_id: 2, training_name: 'Peer Counseling' },
    { training_id: 3, training_name: 'First Aid Training' },
    { training_id: 4, training_name: 'Community Outreach' },
    { training_id: 5, training_name: 'Mental Health Awareness' },
    { training_id: 6, training_name: 'Youth Leadership' },
    { training_id: 7, training_name: 'Substance Abuse Prevention' },
    { training_id: 8, training_name: 'Sexual Health Education' },
  ];

  const uniqueTrainings = removeDuplicates(trainings || [], 'training_id');

  // Lightbox state for certificate preview
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [previewLoadingIndex, setPreviewLoadingIndex] = useState(null);

  const handleCertificatePreview = async (index) => {
    try {
      const cert = certificates[index];
      if (!cert) return;

      setPreviewLoadingIndex(index);

      // Prefer cached previewUrl if available (prefetched by UserProfile), otherwise fetch
      let url = cert.previewUrl;
      if (!url) {
        try {
          url = await getCertificateDownloadUrl(userUid, cert.id);
        } catch (err) {
          console.warn('Failed to get presigned URL for certificate:', err);
          throw err;
        }
      }

      if (cert.mimetype && cert.mimetype.startsWith('image/')) {
        setLightboxImages([{ url, name: cert.filename || cert.trainingName || 'certificate' }]);
        setLightboxIndex(0);
        setLightboxOpen(true);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Error previewing certificate:', err);
      alert(err.message || 'Failed to preview certificate');
    } finally {
      setPreviewLoadingIndex(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        Trainings & Certifications
      </h3>

      {isEditing ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Select the trainings you have completed:
          </p>
          {availableTrainings.map((training) => {
            const isSelected = (editedTrainings || []).includes(training.training_id);
            return (
              <label
                key={training.training_id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleTrainingToggle(training.training_id)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {training.training_name}
                </span>
                {isSelected && (
                  <svg className="w-5 h-5 text-purple-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
      ) : uniqueTrainings.length > 0 ? (
        <>
          <ul className="space-y-2">
            {uniqueTrainings.map((training) => (
              <li
                key={`training-${training.training_id}`}
                className="flex items-center gap-2 text-gray-900 dark:text-white"
              >
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{training.training_name}</span>
              </li>
            ))}
          </ul>

          {/* Certificates thumbnails */}
          {Array.isArray(certificates) && certificates.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Certificates</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {certificates.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCertificatePreview(idx)}
                    className="w-full h-16 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded overflow-hidden flex items-center justify-center p-1 relative"
                    title={c.trainingName || c.filename}
                  >
                    {c.previewUrl ? (
                      <img
                        src={c.previewUrl}
                        alt={c.filename || c.trainingName || 'certificate'}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{(c.trainingName || c.filename || 'file').slice(0, 20)}</div>
                    )}

                    {previewLoadingIndex === idx && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-sm">No trainings completed yet</p>
      )}

      {/* Image lightbox for certificate preview */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxImages[lightboxIndex]?.url}
        imageName={lightboxImages[lightboxIndex]?.name}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onNavigate={(dir) => {
          if (dir === 'next') setLightboxIndex((i) => Math.min(i + 1, lightboxImages.length - 1));
          if (dir === 'prev') setLightboxIndex((i) => Math.max(i - 1, 0));
        }}
      />
    </div>
  );
}

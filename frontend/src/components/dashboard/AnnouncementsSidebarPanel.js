'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { postService } from '@/services/postService';
import DashboardSectionCard from '@/components/ui/DashboardSectionCard';

export default function AnnouncementsSidebarPanel() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await postService.getPosts({
        post_type: 'announcement',
        status: 'published'
      });
      
      // Sort by created_at descending (most recent first)
      const sortedAnnouncements = (response.data || []).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setAnnouncements(sortedAnnouncements.slice(0, 5)); // Show top 5
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementClick = (announcementUid) => {
    router.push(`/announcements/${announcementUid}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const AnnouncementIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );

  return (
    <DashboardSectionCard
      title="Announcements"
      icon={AnnouncementIcon}
      action={
        announcements.length > 0 ? (
          <button
            onClick={() => router.push('/announcements')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All
          </button>
        ) : null
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-400">
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            Try Again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-sm">No announcements</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.uid}
              onClick={() => handleAnnouncementClick(announcement.uid)}
              className="group cursor-pointer rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm p-3 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-gray-500/5 hover:-translate-y-0.5"
            >
              {/* Header with date */}
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
                  📢 Announcement
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(announcement.created_at)}
                </span>
              </div>

                {/* Title */}
                <h4 className="text-sm font-semibold text-white mb-1.5 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {announcement.title}
                </h4>

                {/* Content preview */}
                {announcement.content && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                    {truncateText(announcement.content)}
                  </p>
                )}

                {/* Footer with author */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white">
                      {announcement.author_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      {announcement.author_name || 'Admin'}
                    </span>
                  </div>
                  
                  <svg 
                    className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
          ))}
        </div>
      )}
    </DashboardSectionCard>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { postService } from '@/services/postService';
import DashboardSectionCard from '@/components/ui/DashboardSectionCard';

export default function NewsUpdatesCarousel() {
  const router = useRouter();
  const [newsUpdates, setNewsUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNewsUpdates();
  }, []);

  const fetchNewsUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await postService.getPosts({
        post_type: 'news_update',
        status: 'published'
      });
      
      // Sort by created_at descending (most recent first)
      const sortedNews = (response.data || []).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setNewsUpdates(sortedNews.slice(0, 10)); // Limit to 10 most recent
    } catch (err) {
      console.error('Error fetching news updates:', err);
      setError('Failed to load news updates');
    } finally {
      setLoading(false);
    }
  };

  const handleNewsClick = (newsUid) => {
    router.push(`/news/${newsUid}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const truncateText = (text, maxLength = 120) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const NewsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );

  return (
    <DashboardSectionCard
      title="News & Updates"
      icon={NewsIcon}
      action={
        newsUpdates.length > 0 ? (
          <button
            onClick={() => router.push('/news')}
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
        <div className="text-center py-8 text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchNewsUpdates}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Try Again
          </button>
        </div>
      ) : newsUpdates.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p>No news updates available</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
          {newsUpdates.map((news) => (
            <div
              key={news.uid}
              onClick={() => handleNewsClick(news.uid)}
              className="w-72 sm:w-80 md:w-96 flex-shrink-0 snap-start group cursor-pointer"
            >
              <div className="h-full rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-4 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
                {/* Header with date */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-medium">
                    {formatDate(news.created_at)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {news.title}
                </h3>

                {/* Content preview */}
                {news.content && (
                  <p className="text-sm text-gray-400 line-clamp-3 mb-3">
                    {truncateText(news.content)}
                  </p>
                )}

                {/* Author info */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                      {news.author_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="text-xs text-gray-400">
                      {news.author_name || 'Admin'}
                    </span>
                  </div>
                  
                  <svg 
                    className="w-5 h-5 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSectionCard>
  );
}

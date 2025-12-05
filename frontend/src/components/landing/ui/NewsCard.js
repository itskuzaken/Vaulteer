"use client";
import Image from 'next/image';
import { IoCalendarOutline, IoTimeOutline, IoArrowForward } from 'react-icons/io5';

export default function NewsCard({ 
  title, 
  excerpt, 
  category, 
  date, 
  readTime, 
  image, 
  slug,
  featured = false 
}) {
  const categoryColors = {
    'Announcements': 'bg-bagani-blue text-white',
    'Events': 'bg-bagani-yellow text-gray-900',
    'Programs': 'bg-bagani-red text-white',
    'Community': 'bg-green-600 text-white',
    'General': 'bg-bagani-gray text-white',
  };

  const handleClick = () => {
    // Navigate to news detail page or open modal
    console.log('Navigate to:', slug);
  };

  return (
    <article 
      className={`group cursor-pointer bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
        featured ? 'md:col-span-2 md:flex' : ''
      }`}
      onClick={handleClick}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${
        featured ? 'md:w-1/2 h-64 md:h-auto' : 'h-48'
      }`}>
        <Image
          src={image || '/placeholder-news.jpg'}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            categoryColors[category] || categoryColors['General']
          }`}>
            {category}
          </span>
        </div>

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-bagani-red text-white backdrop-blur-sm">
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-6 flex flex-col ${featured ? 'md:w-1/2' : ''}`}>
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <IoCalendarOutline className="w-4 h-4" />
            {new Date(date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
          {readTime && (
            <span className="flex items-center gap-1">
              <IoTimeOutline className="w-4 h-4" />
              {readTime} min read
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`font-bold text-gray-900 dark:text-white mb-3 group-hover:text-bagani-red transition-colors ${
          featured ? 'text-2xl md:text-3xl' : 'text-xl'
        }`}>
          {title}
        </h3>

        {/* Excerpt */}
        <p className={`text-gray-600 dark:text-gray-300 mb-4 flex-1 ${
          featured ? 'text-base md:text-lg' : 'text-sm'
        }`}>
          {excerpt}
        </p>

        {/* Read More Link */}
        <button className="inline-flex items-center gap-2 text-bagani-red font-semibold text-sm group-hover:gap-3 transition-all">
          Read More
          <IoArrowForward className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

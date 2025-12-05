"use client";
import { IoCheckmark } from 'react-icons/io5';

export default function CategoryFilter({ categories, activeCategory, onCategoryChange }) {
  const categoryConfig = [
    { id: 'all', label: 'All News', color: 'bg-gray-600 hover:bg-gray-700' },
    { id: 'announcements', label: 'Announcements', color: 'bg-bagani-blue hover:bg-bagani-blue-dark' },
    { id: 'events', label: 'Events', color: 'bg-bagani-yellow hover:bg-yellow-600' },
    { id: 'programs', label: 'Programs', color: 'bg-bagani-red hover:bg-bagani-red-dark' },
    { id: 'community', label: 'Community', color: 'bg-green-600 hover:bg-green-700' },
  ];

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {categoryConfig.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium text-white
            transition-all duration-300 transform hover:scale-105
            ${activeCategory === cat.id 
              ? `${cat.color} shadow-lg ring-2 ring-white ring-offset-2` 
              : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500'
            }
            flex items-center gap-2
          `}
        >
          {activeCategory === cat.id && <IoCheckmark className="w-4 h-4" />}
          {cat.label}
          {categories && categories[cat.id] && (
            <span className="ml-1 px-2 py-0.5 bg-white/30 rounded-full text-xs">
              {categories[cat.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

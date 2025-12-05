"use client";
import { useState } from 'react';
import SectionHeading from '../ui/SectionHeading';
import NewsCard from '../ui/NewsCard';
import CategoryFilter from '../ui/CategoryFilter';
import { IoSearch } from 'react-icons/io5';

export default function NewsUpdatesSection() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample news data (replace with API fetch later)
  const newsData = [
    {
      id: 1,
      title: 'Youth Leadership Training Program Launches February 15',
      excerpt: 'We are excited to announce our new Youth Leadership Training Program designed to empower young leaders in our community with essential skills for success.',
      category: 'Programs',
      date: '2024-02-01',
      readTime: 4,
      image: '/news/youth-training.jpg',
      slug: 'youth-leadership-training-2024',
      featured: true,
    },
    {
      id: 2,
      title: 'Town Hall Meeting: Community Input Needed',
      excerpt: 'Join us this Saturday at 3 PM for our monthly town hall meeting. Your voice matters in shaping our community programs.',
      category: 'Announcements',
      date: '2024-02-05',
      readTime: 2,
      image: '/news/town-hall.jpg',
      slug: 'town-hall-february-2024',
    },
    {
      id: 3,
      title: 'Volunteer Appreciation Day: Thank You!',
      excerpt: 'We want to extend our heartfelt gratitude to all our amazing volunteers who dedicate their time and energy to make our community stronger.',
      category: 'Community',
      date: '2024-02-03',
      readTime: 3,
      image: '/news/volunteers.jpg',
      slug: 'volunteer-appreciation-day-2024',
    },
    {
      id: 4,
      title: 'Free Digital Literacy Workshop - Register Now',
      excerpt: 'Learn essential digital skills in our upcoming free workshop. Perfect for seniors and anyone looking to improve their tech knowledge.',
      category: 'Events',
      date: '2024-02-08',
      readTime: 3,
      image: '/news/digital-workshop.jpg',
      slug: 'digital-literacy-workshop-2024',
    },
    {
      id: 5,
      title: 'Community Garden Project Update',
      excerpt: 'Our community garden has reached a major milestone! Check out what we have accomplished together and how you can get involved.',
      category: 'Community',
      date: '2024-01-30',
      readTime: 5,
      image: '/news/community-garden.jpg',
      slug: 'community-garden-update-2024',
    },
    {
      id: 6,
      title: 'New After-School Program for Elementary Students',
      excerpt: 'We are launching a new after-school program offering homework help, arts and crafts, and recreational activities for elementary school children.',
      category: 'Programs',
      date: '2024-01-28',
      readTime: 4,
      image: '/news/after-school.jpg',
      slug: 'after-school-program-2024',
    },
  ];

  // Filter news based on category and search
  const filteredNews = newsData.filter(news => {
    const matchesCategory = activeCategory === 'all' || 
      news.category.toLowerCase() === activeCategory.toLowerCase();
    
    const matchesSearch = searchQuery === '' || 
      news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Count news by category
  const categoryCounts = newsData.reduce((acc, news) => {
    const cat = news.category.toLowerCase();
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, { all: newsData.length });

  return (
    <section id="news" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="News & Updates"
          subtitle="Stay informed about the latest happenings, programs, and events in our community"
          accent="bagani-blue"
        />

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <IoSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search news and updates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-bagani-blue focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex justify-center">
            <CategoryFilter 
              categories={categoryCounts}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>
        </div>

        {/* News Grid */}
        {filteredNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((news) => (
              <NewsCard 
                key={news.id}
                {...news}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No news found matching your search criteria.
            </p>
          </div>
        )}

        {/* Load More Button (optional) */}
        {filteredNews.length >= 6 && (
          <div className="text-center mt-12">
            <button className="px-8 py-3 bg-bagani-blue text-white rounded-lg font-semibold hover:bg-bagani-blue-dark transition-colors shadow-lg hover:shadow-xl">
              Load More News
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

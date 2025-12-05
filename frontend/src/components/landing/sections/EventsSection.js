"use client";
import { useState } from 'react';
import SectionHeading from '../ui/SectionHeading';
import EventCard from '../ui/EventCard';
import { IoCalendarOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5';

export default function EventsSection() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'

  // Sample events data (replace with API later)
  const events = [
    {
      id: 1,
      title: 'Town Hall Community Meeting',
      date: '2024-02-10',
      time: '3:00 PM - 5:00 PM',
      location: 'Bagani Community Center Main Hall',
      description: 'Join us for our monthly town hall meeting to discuss community initiatives, upcoming programs, and provide feedback.',
      attendees: 45,
      image: '/events/town-hall.jpg',
      category: 'Community Meeting',
      rsvpLink: '/rsvp/town-hall'
    },
    {
      id: 2,
      title: 'Youth Leadership Workshop',
      date: '2024-02-15',
      time: '10:00 AM - 2:00 PM',
      location: 'Training Room A',
      description: 'Interactive workshop focusing on communication skills, team building, and project management for young leaders.',
      attendees: 28,
      image: '/events/youth-workshop.jpg',
      category: 'Workshop',
      rsvpLink: '/rsvp/youth-workshop'
    },
    {
      id: 3,
      title: 'Community Garden Kickoff',
      date: '2024-02-17',
      time: '9:00 AM - 12:00 PM',
      location: 'Community Garden Plot',
      description: 'Start the season with us! Learn about planting, get your garden plot, and meet fellow gardening enthusiasts.',
      attendees: 62,
      image: '/events/garden-kickoff.jpg',
      category: 'Community Event',
      rsvpLink: '/rsvp/garden-kickoff'
    },
    {
      id: 4,
      title: 'Digital Literacy Class: Beginners',
      date: '2024-02-20',
      time: '6:00 PM - 8:00 PM',
      location: 'Computer Lab',
      description: 'Free introductory class covering basic computer skills, email, and internet browsing. All ages welcome!',
      attendees: 15,
      image: '/events/digital-class.jpg',
      category: 'Workshop',
      rsvpLink: '/rsvp/digital-class'
    },
    {
      id: 5,
      title: 'Family Fun Day',
      date: '2024-02-24',
      time: '1:00 PM - 6:00 PM',
      location: 'Bagani Community Center & Outdoor Area',
      description: 'Bring the whole family for games, food, entertainment, and community bonding. Free admission!',
      attendees: 120,
      image: '/events/family-fun.jpg',
      category: 'Community Event',
      rsvpLink: '/rsvp/family-fun'
    },
    {
      id: 6,
      title: 'Senior Social Hour',
      date: '2024-02-22',
      time: '2:00 PM - 4:00 PM',
      location: 'Senior Lounge',
      description: 'Weekly social gathering for seniors with refreshments, games, and great conversation.',
      attendees: 32,
      image: '/events/senior-social.jpg',
      category: 'Social Event',
      rsvpLink: '/rsvp/senior-social'
    },
  ];

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <section id="events" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="Upcoming Events"
          subtitle="Join us for exciting community events, workshops, and gatherings"
          accent="bagani-blue"
        />

        {/* View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-bagani-blue shadow-md'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-gray-600 text-bagani-blue shadow-md'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Calendar View
            </button>
          </div>
        </div>

        {/* Events Grid View */}
        {viewMode === 'grid' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="max-w-5xl mx-auto">
            {/* Calendar Header */}
            <div className="bg-bagani-blue text-white rounded-t-xl p-4 flex items-center justify-between">
              <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <IoChevronBack className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-bold">February 2024</h3>
              <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <IoChevronForward className="w-6 h-6" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-b-xl border border-gray-200 dark:border-gray-700 p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days (Simplified - replace with actual calendar logic) */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 29 }, (_, i) => i + 1).map(day => {
                  const hasEvent = events.some(e => new Date(e.date).getDate() === day);
                  return (
                    <div 
                      key={day}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                        hasEvent 
                          ? 'bg-bagani-red text-white font-bold cursor-pointer hover:bg-bagani-red-dark' 
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {day}
                      {hasEvent && <div className="w-1 h-1 bg-bagani-yellow rounded-full mt-1" />}
                    </div>
                  );
                })}
              </div>

              {/* Events List Below Calendar */}
              <div className="mt-6 space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Events This Month</h4>
                {sortedEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <div className="flex-shrink-0 w-12 h-12 bg-bagani-red text-white rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs font-bold">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 dark:text-white">{event.title}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Want to stay updated on all our events?
          </p>
          <button className="px-8 py-3 bg-bagani-blue text-white rounded-lg font-semibold hover:bg-bagani-blue-dark transition-colors shadow-lg hover:shadow-xl transform hover:scale-105">
            <IoCalendarOutline className="inline w-5 h-5 mr-2" />
            Subscribe to Event Calendar
          </button>
        </div>
      </div>
    </section>
  );
}

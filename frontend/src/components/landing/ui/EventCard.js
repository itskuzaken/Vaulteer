"use client";
import { IoCalendarOutline, IoLocationOutline, IoTimeOutline, IoPeopleOutline } from 'react-icons/io5';

export default function EventCard({ 
  title, 
  date, 
  time, 
  location, 
  description, 
  attendees, 
  image,
  category = 'Community Event',
  rsvpLink 
}) {
  const eventDate = new Date(date);
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Date Badge + Image */}
      <div className="relative h-48 bg-gradient-to-br from-bagani-blue to-bagani-red overflow-hidden">
        {image && (
          <div className="absolute inset-0">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        )}
        
        {/* Date Badge */}
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-bagani-red text-white text-center px-3 py-1">
            <span className="text-xs font-bold">{month}</span>
          </div>
          <div className="px-3 py-2 text-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{day}</span>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-bagani-yellow text-gray-900 rounded-full text-xs font-bold uppercase">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-bagani-red transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <IoTimeOutline className="w-4 h-4 text-bagani-red" />
            <span>{time}</span>
          </div>
          
          {location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <IoLocationOutline className="w-4 h-4 text-bagani-red" />
              <span>{location}</span>
            </div>
          )}
          
          {attendees && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <IoPeopleOutline className="w-4 h-4 text-bagani-red" />
              <span>{attendees} attending</span>
            </div>
          )}
        </div>

        {/* RSVP Button */}
        {rsvpLink && (
          <button className="w-full px-4 py-2 bg-bagani-red text-white rounded-lg font-semibold text-sm hover:bg-bagani-red-dark transition-colors">
            RSVP Now
          </button>
        )}
      </div>
    </div>
  );
}

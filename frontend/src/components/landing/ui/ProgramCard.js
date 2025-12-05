"use client";
import Image from 'next/image';
import { IoArrowForward } from 'react-icons/io5';

export default function ProgramCard({ 
  icon, 
  title, 
  description, 
  features = [], 
  link,
  color = 'bagani-red' 
}) {
  const colorClasses = {
    'bagani-red': {
      bg: 'bg-bagani-red',
      bgLight: 'bg-bagani-red/10',
      text: 'text-bagani-red',
      hover: 'group-hover:bg-bagani-red',
    },
    'bagani-blue': {
      bg: 'bg-bagani-blue',
      bgLight: 'bg-bagani-blue/10',
      text: 'text-bagani-blue',
      hover: 'group-hover:bg-bagani-blue',
    },
    'bagani-yellow': {
      bg: 'bg-bagani-yellow',
      bgLight: 'bg-bagani-yellow/10',
      text: 'text-bagani-yellow',
      hover: 'group-hover:bg-bagani-yellow',
    },
  };

  const colors = colorClasses[color] || colorClasses['bagani-red'];

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      {/* Icon */}
      <div className={`w-16 h-16 ${colors.bgLight} rounded-xl flex items-center justify-center mb-4 transition-colors ${colors.hover}`}>
        {typeof icon === 'string' ? (
          <span className={`text-3xl ${colors.text} group-hover:text-white transition-colors`}>
            {icon}
          </span>
        ) : (
          <div className={`text-3xl ${colors.text} group-hover:text-white transition-colors`}>
            {icon}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className={`text-xl font-bold text-gray-900 dark:text-white mb-3 ${colors.text}`}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
        {description}
      </p>

      {/* Features */}
      {features.length > 0 && (
        <ul className="space-y-2 mb-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className={`w-1.5 h-1.5 ${colors.bg} rounded-full mt-1.5 flex-shrink-0`} />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Link */}
      {link && (
        <button className={`inline-flex items-center gap-2 ${colors.text} font-semibold text-sm group-hover:gap-3 transition-all mt-2`}>
          Learn More
          <IoArrowForward className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

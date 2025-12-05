"use client";

export default function SectionHeading({ 
  title, 
  subtitle, 
  centered = true,
  accent = 'bagani-red' 
}) {
  const accentColors = {
    'bagani-red': 'text-bagani-red',
    'bagani-blue': 'text-bagani-blue',
    'bagani-yellow': 'text-bagani-yellow',
  };

  return (
    <div className={`mb-12 ${centered ? 'text-center' : ''}`}>
      {/* Accent Line */}
      <div className={`${centered ? 'mx-auto' : ''} w-20 h-1 bg-gradient-to-r from-${accent} to-${accent}-light rounded-full mb-4`} />
      
      {/* Title */}
      <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4`}>
        {title.split(' ').map((word, index) => {
          // Highlight last word with accent color
          const isLastWord = index === title.split(' ').length - 1;
          return (
            <span key={index} className={isLastWord ? accentColors[accent] : ''}>
              {word}{' '}
            </span>
          );
        })}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}

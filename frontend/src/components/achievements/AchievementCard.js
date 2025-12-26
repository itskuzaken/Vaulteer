/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { computeProgressPercent, selectBadgeUrl } from '../../utils/achievementUtils';

export default function AchievementCard({ achievement, onClick, onImageError }) {
  const progress = computeProgressPercent(achievement, { current_count: achievement.current_count, earned: achievement.earned });
  const badgeUrl = selectBadgeUrl(achievement, achievement.badge_level || 'single');
  const alt = `${achievement.achievement_name} badge ${achievement.badge_level ? `— ${achievement.badge_level}` : ''}`.trim();

  const handleImgError = () => {
    // signal parent to attempt presign/refresh of badge url
    if (typeof onImageError === 'function') {
      const keys = achievement.badge_s3_keys ? Object.values(achievement.badge_s3_keys).filter(Boolean) : (achievement.badge_s3_key ? [achievement.badge_s3_key] : []);
      onImageError(keys, achievement);
    }
  };

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(achievement)}
      className="widget-card p-4 flex items-start gap-4 hover:shadow-md focus:shadow-outline focus:outline-none"
      aria-pressed={achievement.earned ? "true" : "false"}
      aria-label={`Open ${achievement.achievement_name} details`}
    >
      <div className="w-16 h-16 flex-shrink-0 inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
        {badgeUrl ? (

          <img src={badgeUrl} alt={alt} role="img" loading="lazy" className="w-full h-full object-contain" onError={handleImgError} />
        ) : (
          <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 2 L15 8 L22 9 L17 14 L18 21 L12 18 L6 21 L7 14 L2 9 L9 8 Z" stroke="currentColor" strokeWidth="1" fill="currentColor" />
          </svg>
        )}
      </div>

      <div className="flex-1 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{achievement.achievement_name}</h3>
          {achievement.earned && <span className="text-xs text-green-600 dark:text-green-400">Earned</span>}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{achievement.achievement_description}</p>
        <div className="mt-3">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-full">
            <div className="bg-primary-red h-2 rounded-full" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} role="progressbar" />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{progress}%</div>
        </div>
      </div>
    </button>
  );
}

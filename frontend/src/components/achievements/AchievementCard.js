/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { computeSequentialProgress, selectBadgeUrl, getNextTierTarget } from '../../utils/achievementUtils';

// Tier order: bronze (unstarted) → silver (after bronze) → gold (after silver)
const TIER_ORDER = ['bronze', 'silver', 'gold'];

// Tier configuration for consistent styling with dark mode support
const TIER_STYLES = {
  bronze: {
    ring: 'ring-2 ring-[var(--tier-bronze-ring)]',
    bg: 'bg-[var(--tier-bronze-bg)]',
    pill: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
    label: 'Bronze'
  },
  silver: {
    ring: 'ring-2 ring-[var(--tier-silver-ring)]',
    bg: 'bg-[var(--tier-silver-bg)]',
    pill: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/30',
    label: 'Silver'
  },
  gold: {
    ring: 'ring-2 ring-[var(--tier-gold-ring)]',
    bg: 'bg-[var(--tier-gold-bg)]',
    pill: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30',
    label: 'Gold'
  },
  single: {
    ring: 'ring-1 ring-gray-200 dark:ring-gray-700',
    bg: 'bg-gray-50 dark:bg-gray-800',
    pill: '',
    label: ''
  }
};

/**
 * Determine the current tier based on sequential progression.
 * Bronze = unstarted (0 progress), Silver = after bronze threshold, Gold = after silver threshold
 */
function getCurrentTier(achievement) {
  const thresholds = achievement.thresholds || {};
  const currentCount = achievement.current_count || 0;
  
  // Check from highest tier down
  if (thresholds.gold && currentCount >= thresholds.gold) return 'gold';
  if (thresholds.silver && currentCount >= thresholds.silver) return 'silver';
  if (thresholds.bronze && currentCount >= thresholds.bronze) return 'bronze';
  
  // If no thresholds met, user is working towards bronze (unstarted state)
  return 'bronze';
}

export function AchievementCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-start gap-4 animate-pulse">
      <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 skeleton" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 skeleton" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full skeleton" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 skeleton" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full skeleton" />
      </div>
    </div>
  );
}

export default function AchievementCard({ achievement, onClick, onImageError }) {
  const currentCount = achievement.current_count || 0;
  const hasTiers = achievement.thresholds && Object.keys(achievement.thresholds).some(k => ['bronze', 'silver', 'gold'].includes(k));
  const progress = hasTiers ? computeSequentialProgress(achievement, currentCount) : (achievement.earned ? 100 : 0);
  const nextTier = hasTiers ? getNextTierTarget(achievement, currentCount) : null;
  const currentTier = getCurrentTier(achievement);
  const badgeUrl = selectBadgeUrl(achievement, currentTier);
  const tierStyle = TIER_STYLES[currentTier] || TIER_STYLES.single;
  const alt = `${achievement.achievement_name} badge — ${tierStyle.label}`.trim();
  const isUnstarted = currentCount === 0;

  const handleImgError = () => {
    if (typeof onImageError === 'function') {
      const keys = achievement.badge_s3_keys ? Object.values(achievement.badge_s3_keys).filter(Boolean) : (achievement.badge_s3_key ? [achievement.badge_s3_key] : []);
      onImageError(keys, achievement);
    }
  };

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(achievement)}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md dark:hover:border-gray-700 p-4 flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-primary-red transition-all text-left"
      aria-pressed={achievement.earned ? "true" : "false"}
      aria-label={`Open ${achievement.achievement_name} details`}
    >
      {/* Badge container - larger with tier ring */}
      <div className={`relative w-20 h-20 shrink-0 inline-flex items-center justify-center rounded-xl overflow-hidden ${tierStyle.ring} ${tierStyle.bg} ${isUnstarted ? 'grayscale opacity-60' : ''}`}>
        {badgeUrl ? (
          <img 
            src={badgeUrl} 
            alt={alt} 
            role="img" 
            loading="lazy" 
            className="w-full h-full object-contain p-1" 
            onError={handleImgError} 
          />
        ) : (
          <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 2 L15 8 L22 9 L17 14 L18 21 L12 18 L6 21 L7 14 L2 9 L9 8 Z" stroke="currentColor" strokeWidth="1" fill="currentColor" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row with name, tier pill, and earned status */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{achievement.achievement_name}</h3>
          {tierStyle.pill && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tierStyle.pill}`}>
              {tierStyle.label}
            </span>
          )}
          {achievement.earned && (
            <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Earned
            </span>
          )}
        </div>
        
        {/* Description */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{achievement.achievement_description}</p>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-full overflow-hidden">
            <div 
              className="bg-primary-red h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }} 
              aria-valuenow={progress} 
              aria-valuemin={0} 
              aria-valuemax={100} 
              role="progressbar" 
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            {nextTier ? (
              <>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentCount} / {nextTier.threshold} to {nextTier.label}
                </span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {progress}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">All tiers earned!</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">100%</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

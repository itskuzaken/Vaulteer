/* eslint-disable @next/next/no-img-element */
"use client";

import React from 'react';
import ModalShell from '../modals/ModalShell';
import { computeSequentialProgress, selectBadgeUrl } from '../../utils/achievementUtils';
import { IoLockClosed, IoCheckmarkCircle, IoTrophy } from 'react-icons/io5';

// Tier order: bronze (unstarted) → silver (after bronze) → gold (after silver)
const TIER_ORDER = ['bronze', 'silver', 'gold'];

const TIER_CONFIG = {
  bronze: {
    label: 'Bronze',
    bg: 'bg-[var(--tier-bronze-bg)]',
    border: 'border-[var(--tier-bronze-border)]',
    text: 'text-[var(--tier-bronze-text)]',
    ring: 'ring-2 ring-[var(--tier-bronze-ring)]',
  },
  silver: {
    label: 'Silver',
    bg: 'bg-[var(--tier-silver-bg)]',
    border: 'border-[var(--tier-silver-border)]',
    text: 'text-[var(--tier-silver-text)]',
    ring: 'ring-2 ring-[var(--tier-silver-ring)]',
  },
  gold: {
    label: 'Gold',
    bg: 'bg-[var(--tier-gold-bg)]',
    border: 'border-[var(--tier-gold-border)]',
    text: 'text-[var(--tier-gold-text)]',
    ring: 'ring-2 ring-[var(--tier-gold-ring)]',
  }
};

/**
 * Determine earned tiers based on sequential progression.
 * Must earn bronze before silver, silver before gold.
 */
function getEarnedTiers(thresholds, currentCount) {
  const earned = [];
  for (const tier of TIER_ORDER) {
    const threshold = thresholds[tier];
    if (threshold && currentCount >= threshold) {
      earned.push(tier);
    } else {
      break; // Stop at first unearned tier (sequential requirement)
    }
  }
  return earned;
}

/**
 * Get the next tier the user is working towards.
 */
function getNextTier(thresholds, currentCount) {
  for (const tier of TIER_ORDER) {
    const threshold = thresholds[tier];
    if (threshold && currentCount < threshold) {
      return tier;
    }
  }
  return null; // All tiers earned
}

function TierBadge({ tier, badgeUrl, isEarned, isCurrent, threshold, currentCount, onImageError }) {
  const config = TIER_CONFIG[tier];
  const isLocked = !isEarned && !isCurrent;
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Badge container */}
      <div 
        className={`
          relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all
          ${isEarned ? `${config.border} ${config.bg} ${config.ring}` : ''}
          ${isCurrent && !isEarned ? `${config.border} ${config.bg} border-dashed` : ''}
          ${isLocked ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 grayscale opacity-60' : ''}
        `}
      >
        {badgeUrl ? (
          <img 
            src={badgeUrl} 
            alt={`${config.label} tier badge`}
            className={`w-full h-full object-contain p-2 ${isLocked ? 'blur-[1px]' : ''}`}
            onError={onImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IoTrophy className={`w-10 h-10 ${isLocked ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`} />
          </div>
        )}
        
        {/* Lock overlay for locked tiers */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-gray-900/30">
            <div className="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm">
              <IoLockClosed className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        )}
        
        {/* Checkmark for earned tiers */}
        {isEarned && (
          <div className="absolute -top-1 -right-1">
            <IoCheckmarkCircle className="w-6 h-6 text-green-500 dark:text-green-400 bg-white dark:bg-gray-900 rounded-full" />
          </div>
        )}
      </div>
      
      {/* Tier label */}
      <span className={`text-sm font-medium ${isEarned ? config.text : isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
        {config.label}
      </span>
      
      {/* Threshold info */}
      {threshold && (
        <span className={`text-xs ${isEarned ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {isEarned ? '✓ Earned' : `${currentCount || 0} / ${threshold}`}
        </span>
      )}
    </div>
  );
}

function ProgressConnector({ isComplete }) {
  return (
    <div className="flex-1 h-1 mx-2 mt-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
      <div 
        className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-500 dark:bg-green-400 w-full' : 'w-0'}`} 
      />
    </div>
  );
}

export default function AchievementDetailModal({ achievement, isOpen, onClose, onImageError }) {
  if (!achievement) return null;
  
  const currentCount = achievement.current_count || 0;
  const thresholds = achievement.thresholds || {};
  const badgeUrls = achievement.badge_s3_url_map || {};
  const hasTiers = Object.keys(thresholds).some(k => TIER_ORDER.includes(k));
  const progress = hasTiers ? computeSequentialProgress(achievement, currentCount) : (achievement.earned ? 100 : 0);
  
  // Sequential progression: must earn bronze → silver → gold in order
  const earnedTiers = getEarnedTiers(thresholds, currentCount);
  const nextTier = getNextTier(thresholds, currentCount);

  const handleImgError = () => {
    if (typeof onImageError === 'function') {
      const keys = achievement.badge_s3_keys 
        ? Object.values(achievement.badge_s3_keys).filter(Boolean) 
        : (achievement.badge_s3_key ? [achievement.badge_s3_key] : []);
      onImageError(keys, achievement);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={achievement.achievement_name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Tier progression row */}
        {hasTiers ? (
          <div className="flex items-start justify-center px-4">
            {TIER_ORDER.map((tier, index) => {
              const isEarned = earnedTiers.includes(tier);
              const isCurrent = nextTier === tier;
              
              return (
                <React.Fragment key={tier}>
                  {index > 0 && <ProgressConnector isComplete={isEarned} />}
                  <TierBadge
                    tier={tier}
                    badgeUrl={badgeUrls[tier]}
                    isEarned={isEarned}
                    isCurrent={isCurrent}
                    threshold={thresholds[tier]}
                    currentCount={currentCount}
                    onImageError={handleImgError}
                  />
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          // Single badge display for non-tiered achievements
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
              {selectBadgeUrl(achievement, 'single') ? (
                <img 
                  src={selectBadgeUrl(achievement, 'single')} 
                  alt={`${achievement.achievement_name} badge`}
                  className="w-full h-full object-contain p-2"
                  onError={handleImgError}
                />
              ) : (
                <IoTrophy className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">{achievement.achievement_description}</p>
        </div>

        {/* Progress section */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-red rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {currentCount !== undefined && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {currentCount} actions completed
            </div>
          )}
        </div>

        {/* Earning criteria - sequential progression */}
        {hasTiers && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">How to Earn</h4>
            <ul className="space-y-2">
              {TIER_ORDER.map((tier, index) => {
                const threshold = thresholds[tier];
                if (!threshold) return null;
                const isEarned = earnedTiers.includes(tier);
                const config = TIER_CONFIG[tier];
                const prevTier = index > 0 ? TIER_ORDER[index - 1] : null;
                
                return (
                  <li key={tier} className={`flex items-center gap-3 text-sm ${isEarned ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {isEarned ? (
                      <IoCheckmarkCircle className="w-5 h-5 shrink-0" />
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 ${config.border}`} />
                    )}
                    <span>
                      <strong className={config.text}>{config.label}:</strong>{' '}
                      {prevTier ? `After ${TIER_CONFIG[prevTier].label}, complete ` : 'Complete '}
                      {threshold} {threshold === 1 ? 'action' : 'actions'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

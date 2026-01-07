"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import AchievementCard, { AchievementCardSkeleton } from './AchievementCard';
import AchievementDetailModal from './AchievementDetailModal';
import { getUserAchievementsFull, presignBadgeUrls } from '../../services/achievementCatalogService';
import { getCurrentUser } from '../../services/userService';
import { IoTrophy, IoCheckmarkCircle, IoTime, IoLockClosed, IoApps } from 'react-icons/io5';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: IoApps },
  { key: 'earned', label: 'Earned', icon: IoCheckmarkCircle },
  { key: 'in-progress', label: 'In Progress', icon: IoTime },
  { key: 'unstarted', label: 'Unstarted', icon: IoLockClosed },
];

function FilterTabs({ activeFilter, onFilterChange, counts }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {FILTER_TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeFilter === key;
        const count = counts[key] || 0;
        
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${isActive 
                ? 'bg-primary-red text-white shadow-sm' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ filter }) {
  const messages = {
    all: 'No achievements available yet.',
    earned: 'You haven&apos;t earned any achievements yet. Keep participating to unlock them!',
    'in-progress': 'No achievements in progress. Start participating in activities to make progress!',
    unstarted: 'Great job! You&apos;ve started working on all available achievements.',
  };

  return (
    <div className="text-center py-12">
      <IoTrophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-400">{messages[filter] || messages.all}</p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <AchievementCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function AchievementCatalog() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const me = await getCurrentUser();
        const userId = me?.id || me?.user_id || me?.userId;
        if (!userId) throw new Error('Unable to determine current user');
        const res = await getUserAchievementsFull(userId);
        const data = res?.data || res || [];
        if (mounted) setAchievements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[AchievementCatalog] load failed', err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Calculate filter counts
  const counts = useMemo(() => {
    const result = { all: achievements.length, earned: 0, 'in-progress': 0, unstarted: 0 };
    
    achievements.forEach(ach => {
      if (ach.earned) {
        result.earned++;
      } else if ((ach.current_count || 0) > 0) {
        result['in-progress']++;
      } else {
        result.unstarted++;
      }
    });
    
    return result;
  }, [achievements]);

  // Filter achievements based on active filter
  const filteredAchievements = useMemo(() => {
    switch (activeFilter) {
      case 'earned':
        return achievements.filter(ach => ach.earned);
      case 'in-progress':
        return achievements.filter(ach => !ach.earned && (ach.current_count || 0) > 0);
      case 'unstarted':
        return achievements.filter(ach => !ach.earned && (ach.current_count || 0) === 0);
      default:
        return achievements;
    }
  }, [achievements, activeFilter]);

  // Handle card click
  const handleCardClick = useCallback((achievement) => {
    setSelected(achievement);
    setModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    // Delay clearing selected to allow exit animation
    setTimeout(() => setSelected(null), 200);
  }, []);

  // Handle image error (presign refresh)
  const handleImageError = useCallback(async (keys, achievement) => {
    try {
      if (!keys || keys.length === 0) return;
      const res = await presignBadgeUrls(keys);
      const data = res?.data || res || {};
      
      setAchievements((prev) => prev.map((p) => {
        if ((p.achievement_id || p.badge_code) !== (achievement.achievement_id || achievement.badge_code)) return p;
        const newMap = { ...(p.badge_s3_url_map || {}) };
        for (const k of Object.values(p.badge_s3_keys || {})) {
          if (data[k]) {
            const tierEntry = Object.entries(p.badge_s3_keys || {}).find(([, v]) => v === k);
            if (tierEntry) newMap[tierEntry[0]] = data[k];
          }
        }
        return { ...p, badge_s3_url_map: newMap };
      }));
      
      // Also update selected if it matches
      if (selected && (selected.achievement_id || selected.badge_code) === (achievement.achievement_id || achievement.badge_code)) {
        setSelected(prev => {
          if (!prev) return prev;
          const newMap = { ...(prev.badge_s3_url_map || {}) };
          for (const k of Object.values(prev.badge_s3_keys || {})) {
            if (data[k]) {
              const tierEntry = Object.entries(prev.badge_s3_keys || {}).find(([, v]) => v === k);
              if (tierEntry) newMap[tierEntry[0]] = data[k];
            }
          }
          return { ...prev, badge_s3_url_map: newMap };
        });
      }
    } catch (err) {
      console.error('[AchievementCatalog] presign failed', err);
    }
  }, [selected]);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load achievements</p>
          <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* Filter tabs */}
      {!loading && (
        <FilterTabs 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter} 
          counts={counts} 
        />
      )}

      {/* Content */}
      {loading ? (
        <LoadingGrid />
      ) : filteredAchievements.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((ach) => (
            <AchievementCard 
              key={ach.achievement_id || ach.badge_code} 
              achievement={ach} 
              onClick={handleCardClick} 
              onImageError={handleImageError} 
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <AchievementDetailModal 
        achievement={selected} 
        isOpen={modalOpen}
        onClose={handleModalClose} 
        onImageError={handleImageError}
      />
    </div>
  );
}

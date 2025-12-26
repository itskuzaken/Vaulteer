"use client";

import React, { useEffect, useState } from 'react';
import AchievementCard from './AchievementCard';
import AchievementDetailModal from './AchievementDetailModal';
import { getUserAchievementsFull, presignBadgeUrls } from '../../services/achievementCatalogService';
import { getCurrentUser } from '../../services/userService';

export default function AchievementCatalog() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

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

  if (loading) return <div className="p-4">Loading achievements…</div>;
  if (error) return <div className="p-4 text-red-600">Failed to load achievements</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Achievements</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map((ach) => (
          <AchievementCard key={ach.achievement_id || ach.badge_code} achievement={ach} onClick={setSelected} onImageError={async (keys, achievement) => {
            try {
              if (!keys || keys.length === 0) return;
              const res = await presignBadgeUrls(keys);
              const data = res?.data || res || {};
              // update achievements state with new urls
              setAchievements((prev) => prev.map((p) => {
                if ((p.achievement_id || p.badge_code) !== (achievement.achievement_id || achievement.badge_code)) return p;
                const newMap = { ...(p.badge_s3_url_map || {} ) };
                for (const k of Object.values(p.badge_s3_keys || {})) {
                  if (data[k]) {
                    // attempt to map k back to tier
                    const tierEntry = Object.entries(p.badge_s3_keys || {}).find(([,v]) => v === k);
                    if (tierEntry) newMap[tierEntry[0]] = data[k];
                  }
                }
                return { ...p, badge_s3_url_map: newMap };
              }));
            } catch (err) {
              console.error('[AchievementCatalog] presign failed', err);
            }
          }} />
        ))}
      </div>

      {selected && (
        <AchievementDetailModal achievement={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

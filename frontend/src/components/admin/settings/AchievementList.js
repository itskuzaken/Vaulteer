import { useState, useEffect } from 'react';
import Image from 'next/image';
import { fetchAchievements, deleteAchievement, getBadgePreviewUrl } from '../../../services/achievementService';
import AchievementEditor from './AchievementEditor';
import Button from '../../ui/Button';

function BadgePreview({ achievementId, row }) {
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    let mounted = true;
    setPreviews({});

    const determineTiers = () => {
      // If a single legacy key is present, show it as 'single'
      if (row?.badge_s3_key) return ['single'];

      // If JSON map exists, prefer ordered tiers bronze/silver/gold, otherwise show all keys up to 3
      if (row?.badge_s3_keys) {
        try {
          const keys = typeof row.badge_s3_keys === 'string' ? JSON.parse(row.badge_s3_keys) : row.badge_s3_keys;
          const ordered = ['bronze', 'silver', 'gold'];
          const found = ordered.filter((t) => keys[t]);
          if (found.length > 0) return found;
          // fallback to first up to 3 keys
          const firstKeys = Object.keys(keys).slice(0, 3);
          return firstKeys.length ? firstKeys : ['single'];
        } catch (e) {
          return ['single'];
        }
      }

      // If achievement_icon exists, show as single
      if (row?.achievement_icon) return ['single'];

      return [];
    };

    (async () => {
      const tiers = determineTiers();
      if (tiers.length === 0) return;

      const res = {};
      await Promise.all(tiers.map(async (t) => {
        try {
          const data = await getBadgePreviewUrl(achievementId, t);
          if (!mounted) return;
          if (data?.url) res[t] = data.url;
        } catch (e) {
          // ignore individual tier failures
        }
      }));

      if (!mounted) return;
      setPreviews(res);
    })();

    return () => { mounted = false; };
  }, [achievementId, row]);

  const tiersToShow = Object.keys(previews);
  // Sort them to ensure Bronze -> Silver -> Gold order if present
  const order = { single: 0, bronze: 1, silver: 2, gold: 3 };
  tiersToShow.sort((a, b) => (order[a] || 99) - (order[b] || 99));

  return (
    <div className="flex items-center gap-2">
      {tiersToShow.length > 0 ? (
        <div className="flex items-center gap-2">
          {tiersToShow.map((t) => (
            <div key={t} className="w-8 h-8 relative">
              <Image
                src={previews[t]}
                alt={`badge preview ${t}`}
                title={t}
                width={32}
                height={32}
                unoptimized
                className="object-contain rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">—</div>
      )}
    </div>
  );
}

export default function AchievementList() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = async () => {
    console.log('[AchievementList] load() invoked');
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAchievements();
      console.log('[AchievementList] fetchAchievements returned', rows);
      setAchievements(rows);
    } catch (err) {
      console.error('[AchievementList] fetchAchievements failed', err);
      setError(err?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (row) => { setEditing(row); setShowEditor(true); };
  const handleCreate = () => { setEditing(null); setShowEditor(true); };

  const handleSaved = (row) => {
    // Refresh list
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete achievement? This will only deactivate it.')) return;
    await deleteAchievement(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold">Achievements</h3>
        <Button variant="secondary" onClick={handleCreate}>Create</Button>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && achievements.length === 0 && (
        <div className="text-sm text-gray-500">No achievements configured.</div>
      )}

      {!loading && achievements.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Points</th>
                {/* Min-width added to Badge column to prevent overlap */}
                <th className="px-4 py-3 font-medium min-w-30">Badge/s</th> 
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {achievements.map((a) => (
                <tr key={a.achievement_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{a.achievement_name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.badge_code}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.tier_points && typeof a.tier_points === 'object' ? (
                      <div className="flex flex-col text-xs gap-0.5">
                        {Object.entries(a.tier_points).map(([k, v]) => (
                           <span key={k} className="whitespace-nowrap">
                             <span className="capitalize text-gray-400">{k}:</span> {v}
                           </span>
                        ))}
                      </div>
                    ) : (
                      (a.achievement_points || 0)
                    )}
                  </td>
                  {/* Badge Cell: whitespace-nowrap ensures icons stay in a row */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <BadgePreview achievementId={a.achievement_id} row={a} />
                  </td>
                  {/* Actions Cell: aligned right, no wrapping */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-start gap-2">
                      <button onClick={() => handleEdit(a)} className="px-3 py-1 bg-white dark:bg-gray-800 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">Edit</button>
                      <button onClick={() => handleDelete(a.achievement_id)} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showEditor && (
        <AchievementEditor isOpen={showEditor} onClose={() => setShowEditor(false)} achievement={editing} onSaved={handleSaved} />
      )}
    </div>
  );
}
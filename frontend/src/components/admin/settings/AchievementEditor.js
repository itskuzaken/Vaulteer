"use client";

import { useState, useEffect } from 'react';
import { createAchievement, updateAchievement, updateAchievementThresholds } from '../../../services/achievementService';
import BadgeUpload from './BadgeUpload';
import ModalShell from '../../modals/ModalShell';
import { getAchievement } from '../../../services/achievementService';

export default function AchievementEditor({ isOpen, onClose, achievement = null, onSaved }) {
  const [form, setForm] = useState({ badge_code: '', achievement_name: '', achievement_description: '', achievement_points: 0, criteria: '', tier_points: {}, thresholds: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fullAchievement, setFullAchievement] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [isTiered, setIsTiered] = useState(false);

  function validateThresholdsLocal({ bronze, silver, gold }) {
    const b = Number(bronze);
    const s = Number(silver);
    const g = Number(gold);
    if (![b, s, g].every((v) => Number.isFinite(v) && v >= 0)) return 'Values must be non-negative numbers';
    if (!(b < s && s < g)) return 'Thresholds must satisfy bronze < silver < gold';
    return null;
  }

  // helper: generate slug for badge_code
  const slugify = (s) => s ? s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : '';

  useEffect(() => {
    if (achievement) {
      setForm({
        badge_code: achievement.badge_code || '',
        achievement_name: achievement.achievement_name || '',
        achievement_description: achievement.achievement_description || '',
        achievement_points: achievement.achievement_points || 0,
        criteria: achievement.criteria ? JSON.stringify(achievement.criteria) : '',
        tier_points: achievement.tier_points || {},
        thresholds: achievement.thresholds || null,
      });
      setIsTiered(!!(achievement.thresholds && Object.keys(achievement.thresholds).length));
    } else {
      setForm({ badge_code: '', achievement_name: '', achievement_description: '', achievement_points: 0, criteria: '', tier_points: {}, thresholds: null });
      setIsTiered(false);
    }
    // If editing an existing achievement, fetch its full details (including badge keys)
    let mounted = true;
    if (achievement && achievement.achievement_id) {
      (async () => {
        setLoadingFull(true);
        try {
          const row = await getAchievement(achievement.achievement_id);
          if (!mounted) return;
          setFullAchievement(row || achievement);
          // ensure isTiered matches fetched thresholds
          setIsTiered(!!(row && row.thresholds && Object.keys(row.thresholds).length));
          // prefer authoritative tier_points and thresholds from full row
          setForm((f) => ({ ...f, tier_points: (row && row.tier_points) || f.tier_points, thresholds: (row && row.thresholds) || f.thresholds }));
        } catch (e) {
          // non-fatal
          setFullAchievement(achievement);
        } finally {
          if (mounted) setLoadingFull(false);
        }
      })();
    } else {
      setFullAchievement(null);
    }
    return () => { mounted = false; };
  }, [achievement]);

  // Auto-generate badge_code from name when creating
  useEffect(() => {
    if (!achievement) {
      if (!form.badge_code && form.achievement_name) {
        const g = slugify(form.achievement_name);
        if (g) setForm((s) => ({ ...s, badge_code: g }));
      }
    }
  }, [form.achievement_name, achievement, form.badge_code]);

  if (!isOpen) return null;

  const badgeCodePattern = /^[a-z0-9_]+$/;
  const badgeCodeValid = form.badge_code && badgeCodePattern.test(form.badge_code);
  const nameValid = form.achievement_name && form.achievement_name.trim().length > 0;
  const isSaveDisabled = saving || !badgeCodeValid || !nameValid;

  const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleTierPointsChange = (tier) => (e) => {
    const copy = { ...(form.tier_points || {}) };
    copy[tier] = e.target.value === '' ? undefined : Number(e.target.value);
    setForm({ ...form, tier_points: copy });
  };

  const handleThresholdChange = (tier) => (e) => {
    const copy = form.thresholds ? { ...form.thresholds } : { bronze: '', silver: '', gold: '' };
    copy[tier] = e.target.value === '' ? undefined : Number(e.target.value);
    setForm({ ...form, thresholds: copy });
  };

  const handleTypeToggle = (val) => {
    setIsTiered(val === 'tiered');
    if (val !== 'tiered') setForm({ ...form, thresholds: null });
    else setForm((f) => ({ ...f, thresholds: f.thresholds || { bronze: '', silver: '', gold: '' } }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        badge_code: form.badge_code,
        achievement_name: form.achievement_name,
        achievement_description: form.achievement_description,
        achievement_points: Number(form.achievement_points) || 0,
      };
      if (form.criteria) {
        try {
          payload.criteria = JSON.parse(form.criteria);
        } catch (e) {
          throw new Error('Criteria must be valid JSON');
        }
      }

      // Include tier_points if provided (permit empty/null to remove)
      if (form.tier_points && Object.keys(form.tier_points).length) {
        // strip undefined values
        const cleaned = {};
        Object.entries(form.tier_points).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') cleaned[k] = Number(v);
        });
        // For updates include directly; for create, we'll patch after creation
        payload.tier_points = Object.keys(cleaned).length ? cleaned : null;
      }

      // For thresholds (tiered achievements) we will send separately via dedicated endpoint
      const thresholdsToSet = form.thresholds && Object.keys(form.thresholds || {}).length ? Object.entries(form.thresholds).reduce((acc,[k,v]) => { if (v !== undefined && v !== null && v !== '') acc[k]=Number(v); return acc; }, {}) : null;

      let row;
      if (achievement && achievement.achievement_id) {
        // For update, include tier_points if present
        row = await updateAchievement(achievement.achievement_id, payload);
        if (isTiered && thresholdsToSet) {
          await updateAchievementThresholds(achievement.achievement_id, thresholdsToSet);
        }
      } else {
        // Create first, then set thresholds and tier_points with follow-ups
        row = await createAchievement(payload);
        if (row && row.achievement_id) {
          if (isTiered && thresholdsToSet) {
            await updateAchievementThresholds(row.achievement_id, thresholdsToSet);
          }
          // If tier_points provided (payload may have it), ensure it's saved via patch (some APIs may require it)
          if (payload.tier_points) {
            await updateAchievement(row.achievement_id, { tier_points: payload.tier_points });
            // refresh row
            row = await getAchievement(row.achievement_id);
          }
        }
      }
      if (onSaved) onSaved(row);
      onClose();
    } catch (err) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Use the shared ModalShell for accessibility and responsive behavior
  return (
    <ModalShell
      isOpen={isOpen}
      title={achievement ? 'Edit Achievement' : 'Create Achievement'}
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} disabled={isSaveDisabled} className={`px-4 py-2 ${isSaveDisabled ? 'bg-gray-200 text-gray-500' : 'bg-primary-red text-white'} rounded`}>{saving ? 'Saving…' : (isSaveDisabled ? 'Complete required fields' : 'Save')}</button>
        </>
      )}
    >
      {/* Make editor body scrollable and constrain height so modal fits small screens */}
      <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Badge Code</label>
          <input className="mt-1 block w-full" value={form.badge_code} onChange={handleChange('badge_code')} />
          {!badgeCodeValid && <p className="text-xs text-red-600 mt-1">Badge code must be lowercase letters, numbers or underscores.</p>}
          <p className="text-xs text-gray-500 mt-1">Badge code is used in mappings and links — avoid changing it after release.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input className="mt-1 block w-full" value={form.achievement_name} onChange={handleChange('achievement_name')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="mt-1 block w-full" rows={3} value={form.achievement_description} onChange={handleChange('achievement_description')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Points</label>
          <input type="number" className="mt-1 block w-40" value={form.achievement_points} onChange={handleChange('achievement_points')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <div className="mt-1 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="type" checked={!isTiered} onChange={() => handleTypeToggle('single')} />
              <span>Single</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="type" checked={isTiered} onChange={() => handleTypeToggle('tiered')} />
              <span>Tiered (bronze/silver/gold)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Choose whether this achievement supports multiple tiers. If tiered, set thresholds and per-tier points below.</p>
        </div>

        {isTiered && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bronze threshold</label>
                <input type="number" className="mt-1 block w-28" value={(form.thresholds && form.thresholds.bronze) || ''} onChange={handleThresholdChange('bronze')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Silver threshold</label>
                <input type="number" className="mt-1 block w-28" value={(form.thresholds && form.thresholds.silver) || ''} onChange={handleThresholdChange('silver')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gold threshold</label>
                <input type="number" className="mt-1 block w-28" value={(form.thresholds && form.thresholds.gold) || ''} onChange={handleThresholdChange('gold')} />
              </div>
            </div>
          </div>
        )}


        <div>
          <label className="block text-sm font-medium text-gray-700">Criteria (JSON)</label>
          <textarea className="mt-1 block w-full font-mono text-sm" rows={4} value={form.criteria} onChange={handleChange('criteria')} />
          <p className="text-xs text-gray-500 mt-1">Examples: {`{ "type": "EVENT_ATTEND", "min": 2 }`}</p>
        </div>

        {/* Badge uploads: only available after achievement exists */}
        {(!achievement || !achievement.achievement_id) && (
          <div className="text-xs text-gray-500">Badge uploads will be available after you save the achievement. You can set thresholds and per-tier points now and they will be applied after creation.</div>
        )}

        {achievement && achievement.achievement_id && (
          <div>
            <h4 className="text-sm font-medium">Badges</h4>
              <p className="text-xs text-gray-500">Upload badges per tier. If the achievement supports thresholds, upload bronze/silver/gold, otherwise use single.</p>
              <p className="text-xs text-gray-400 mt-1">💡 <strong>Tip:</strong> Configure per-tier points below to award different point values for bronze/silver/gold (or use <em>single</em> for one-tier achievements). If empty, the main <em>Points</em> value will be used as a fallback.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              {(() => {
                const source = fullAchievement || achievement || {};
                const tiers = source.thresholds ? ['bronze', 'silver', 'gold'] : ['single'];
                const keys = source.badge_s3_keys || {};
                return tiers.map((t) => (
                  <div key={t} className="p-2 border rounded">
                    <div className="text-xs font-medium capitalize mb-2">{t === 'single' ? 'Badge' : t}</div>
                    <BadgeUpload
                      achievementId={achievement.achievement_id}
                      tier={t}
                      label={t}
                      currentKey={keys[t] || (t === 'single' ? (source.badge_s3_key || source.achievement_icon) : null)}
                      onUpdated={(row) => { if (onSaved) onSaved(row); }}
                    />
                    <div className="mt-2">
                      <label className="block text-xs font-medium">Points for {t}</label>
                      <input type="number" className="mt-1 block w-28" value={(form.tier_points && form.tier_points[t]) || ''} onChange={handleTierPointsChange(t)} />
                    </div>
                  </div>
                ));
              })()}
              {loadingFull && <div className="text-xs text-gray-500 mt-2">Loading badge previews…</div>}
            </div>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </ModalShell>
  );
}

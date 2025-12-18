import { useEffect, useState } from 'react';
import { createAchievementMapping, updateAchievementMapping } from '../../../services/achievementMappingsService';
import { fetchAchievements } from '../../../services/achievementService';

export default function AchievementMappingForm({ mapping = null, onClose, onSaved }) {
  const [achievementId, setAchievementId] = useState(mapping?.achievement_id || '');
  const [eventType, setEventType] = useState(mapping?.event_type || '');
  const [triggerAction, setTriggerAction] = useState(mapping?.trigger_action || 'EVENT_ATTEND');
  const [targetRole, setTargetRole] = useState(mapping?.target_role || 'volunteer');
  const [isActive, setIsActive] = useState(mapping?.is_active === 0 ? false : true);
  const [achievements, setAchievements] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAchievements().then(setAchievements).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        achievement_id: Number(achievementId),
        event_type: eventType || null,
        trigger_action: triggerAction,
        target_role: targetRole,
        is_active: isActive ? 1 : 0,
      };

      if (mapping?.mapping_id) {
        await updateAchievementMapping(mapping.mapping_id, payload);
      } else {
        await createAchievementMapping(payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">{mapping ? 'Edit mapping' : 'Create mapping'}</h4>
          <button type="button" onClick={onClose} className="text-gray-500">Close</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Achievement</label>
            <select value={achievementId} onChange={(e) => setAchievementId(e.target.value)} className="w-full px-3 py-2 rounded border">
              <option value="">Select achievement</option>
              {achievements.map(a => (
                <option key={a.achievement_id} value={a.achievement_id}>{a.achievement_name} ({a.badge_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700">Event Type (optional)</label>
            <input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. community_meeting" className="w-full px-3 py-2 rounded border" />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Trigger Action</label>
            <select value={triggerAction} onChange={(e) => setTriggerAction(e.target.value)} className="w-full px-3 py-2 rounded border">
              <option>EVENT_ATTEND</option>
              <option>EVENT_REGISTER</option>
              <option>EVENT_HOST_PUBLISHED</option>
              <option>EVENT_CANCEL</option>
              <option>ANY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700">Target Role</label>
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full px-3 py-2 rounded border">
              <option value="volunteer">volunteer</option>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
              <option value="any">any</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded bg-red-600 text-white">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

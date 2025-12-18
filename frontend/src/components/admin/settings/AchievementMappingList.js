import { useEffect, useState } from 'react';
import { IoPencil, IoTrash, IoAddCircle } from 'react-icons/io5';
import { fetchAchievementMappings, deleteAchievementMapping } from '../../../services/achievementMappingsService';
import Button from '../../ui/Button';
import AchievementMappingForm from './AchievementMappingForm';

export default function AchievementMappingList() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAchievementMappings({});
      setMappings(data);
      setError(null);
    } catch (err) {
      // Store full error object so UI can make decisions based on status
      setError(err || new Error('Failed to load mappings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onEdit = (map) => { setEditing(map); setShowForm(true); };
  const onDelete = async (map) => {
    if (!confirm('Delete mapping?')) return;
    try {
      await deleteAchievementMapping(map.mapping_id);
      await load();
      setError(null);
    } catch (err) {
      setError(err || new Error('Delete failed'));
    }
  };

  const onCreatedOrUpdated = async () => {
    setShowForm(false);
    setEditing(null);
    await load();
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Event Achievement Mappings</h3>
        <Button variant="primary" icon={IoAddCircle} onClick={() => { setEditing(null); setShowForm(true); }}>Add mapping</Button>
      </div>

      {/* Help / guidance */}
      <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
        <strong>Note:</strong> Mappings are evaluated <em>after</em> normal threshold-based achievements. If multiple mappings apply, event-specific mappings take precedence over event-type mappings. By default, mappings are scoped to <code>volunteer</code> (use <em>Target Role</em> to change). See admin docs for examples.
      </div>

      {error && (error.status === 401 || (typeof error.message === 'string' && error.message.toLowerCase().includes('not authenticated'))) ? (
        <div className="rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-200">
          <p className="mb-2">You must be signed in as an administrator to view and manage mappings.</p>
          <p className="text-xs text-gray-600">If you are signed in but still see this message, try signing out and signing back in to refresh your session.</p>
        </div>
      ) : (
        error && <p className="text-sm text-red-600">{error.message || String(error)}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-2">
          {mappings.length === 0 && <p className="text-sm text-gray-500">No mappings configured.</p>}
          {mappings.map((m) => (
            <div key={m.mapping_id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{m.achievement_name} <span className="text-xs ml-2 text-gray-500">{m.badge_code}</span></div>
                <div className="text-sm text-gray-500">Trigger: {m.trigger_action} • Role: {m.target_role} • Event Type: {m.event_type || 'any'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button title="Edit" onClick={() => onEdit(m)} className="p-2 rounded hover:bg-gray-100"><IoPencil /></button>
                <button title="Delete" onClick={() => onDelete(m)} className="p-2 rounded hover:bg-gray-100 text-red-600"><IoTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AchievementMappingForm
          mapping={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={onCreatedOrUpdated}
        />
      )}
    </div>
  );
}
